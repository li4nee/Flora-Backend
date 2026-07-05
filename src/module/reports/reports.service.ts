import { Injectable } from '@nestjs/common';
import { PeriodCyclesService } from '../period-cycles/period-cycles.service';
import { DailyLogsAndSymptomsService } from '../daily-logs-symptoms/daily-logs-symptoms.service';
import { mean, stdDev } from 'src/shared/utils/base.utils';
import { CycleData } from '../predictions/cyclePredictionEngine';
import { BayesianPredictionEngine } from '../predictions/bayesianPredictionEngine';
import { format } from 'date-fns';
import { DailyLogInsights } from '../daily-logs-symptoms/daily-logs-symptoms.service';
const PDFDocument = require('pdfkit');

@Injectable()
export class ReportsService {
  constructor(
    private readonly periodCyclesService: PeriodCyclesService,
    private readonly dailyLogsService: DailyLogsAndSymptomsService,
  ) {}

  async getUserReport(userId: string) {
    const cycles = await this.periodCyclesService.findMostRecentNCycles(userId, 12);

    if (cycles.length === 0) {
      return {
        summary: null,
        recentTrends: null,
        currentCycleInsights: null,
        message: 'No cycle data available to generate a report.',
      };
    }

    const cycleLengths = cycles.filter((c) => c.cycleLength != null).map((c) => c.cycleLength!);
    const periodLengths = cycles.filter((c) => c.periodLength != null).map((c) => c.periodLength!);

    const avgCycleLength = cycleLengths.length > 0 ? mean(cycleLengths) : null;
    const avgPeriodLength = periodLengths.length > 0 ? mean(periodLengths) : null;
    const cycleVariation = cycleLengths.length > 1 ? stdDev(cycleLengths, avgCycleLength!) : 0;

    let regularityStatus: 'very_regular' | 'regular' | 'irregular' = 'irregular';
    const isRegular = cycleVariation < 8;

    if (cycleLengths.length >= 3) {
      if (cycleVariation < 3) regularityStatus = 'very_regular';
      else if (cycleVariation < 8) regularityStatus = 'regular';
    } else if (cycleLengths.length >= 1) {
      regularityStatus = 'regular';
    }

    const formattedCycles: CycleData[] = cycles
      .filter((c) => c.cycleLength != null && c.cycleLength > 0)
      .map((c) => ({
        length: c.cycleLength!,
        startDate: new Date(c.startDate),
      }))
      .slice()
      .reverse();

    const lastPeriod = cycles[0];
    const insights = await this.dailyLogsService.getInsightsForCycle(userId, new Date(lastPeriod.startDate));
    const prediction = BayesianPredictionEngine.predict(
      formattedCycles,
      insights.topSymptoms,
      new Date(lastPeriod.startDate),
      insights,
    );

    const currentInsights = await this.dailyLogsService.getInsightsForCycle(userId, prediction.currentCycleStart);

    return {
      summary: {
        avgCycleLength: avgCycleLength ? Math.round(avgCycleLength * 10) / 10 : null,
        avgPeriodLength: avgPeriodLength ? Math.round(avgPeriodLength * 10) / 10 : null,
        cycleVariation: Math.round(cycleVariation * 10) / 10,
        regularityStatus,
        isRegular,
        totalCyclesLogged: cycles.length,
        longestCycle: cycleLengths.length > 0 ? Math.max(...cycleLengths) : null,
        shortestCycle: cycleLengths.length > 0 ? Math.min(...cycleLengths) : null,
      },
      recentTrends: {
        cycleLengths: cycleLengths.slice(0, 12).reverse(),
        periodLengths: periodLengths.slice(0, 12).reverse(),
        dates: cycles
          .slice(0, 12)
          .map((c) => c.startDate)
          .reverse(),
      },
      currentCycleInsights: currentInsights,
      dataStatus: {
        isEstimated: prediction.isEstimated,
        lastLoggedDate: lastPeriod.startDate,
        estimatedCyclesForward: prediction.estimatedCyclesForward,
      },
    };
  }

  async generatePdfReport(userId: string): Promise<Buffer> {
    const reportData = await this.getUserReport(userId);
    const cycles = await this.periodCyclesService.findMostRecentNCycles(userId, 12);

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({
        size: 'A4',
        margin: 50,
        info: {
          Title: 'Flora Health Report',
          Author: 'Flora App',
        },
      });

      const buffers: Buffer[] = [];
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', reject);

      // --- Colors ---
      const colors = {
        primary: '#be185d',
        secondary: '#9d174d',
        accent: '#f472b6',
        bg: '#fdf2f8',
        textMain: '#1f2937',
        textMuted: '#4b5563',
        textLight: '#9ca3af',
        border: '#fce7f3',
        success: '#059669',
        danger: '#e11d48',
      };

      // --- Branding / Header ---
      doc.fillColor(colors.primary).fontSize(28).text('Flora', 50, 45);
      doc.fillColor(colors.textMuted).fontSize(12).text('Clinical Health Report', 50, 78);
      doc.fontSize(9).text(`Generated on: ${format(new Date(), 'PPpp')}`, 50, 92);
      doc.moveTo(50, 110).lineTo(545, 110).strokeColor(colors.accent).lineWidth(0.5).stroke();

      if (!reportData.summary) {
        doc.fontSize(14).text('No data available.', 50, 150);
        doc.end();
        return;
      }

      // --- Summary Row ---
      const summaryY = 125;
      const boxWidth = 115;
      const boxHeight = 50;

      const drawStatBox = (x: number, y: number, label: string, value: string) => {
        doc.roundedRect(x, y, boxWidth, boxHeight, 6).fillAndStroke(colors.bg, colors.border);
        doc
          .fillColor(colors.secondary)
          .fontSize(8)
          .text(label.toUpperCase(), x + 5, y + 10, { width: boxWidth - 10, align: 'center' });
        doc
          .fillColor(colors.primary)
          .fontSize(14)
          .text(value, x + 5, y + 24, { width: boxWidth - 10, align: 'center' });
      };

      drawStatBox(50, summaryY, 'Avg Cycle', `${reportData.summary.avgCycleLength} d`);
      drawStatBox(175, summaryY, 'Avg Period', `${reportData.summary.avgPeriodLength} d`);
      drawStatBox(300, summaryY, 'Variation', `±${reportData.summary.cycleVariation} d`);
      drawStatBox(425, summaryY, 'Status', reportData.summary.regularityStatus.replace('_', ' '));

      // --- Cycle Trend Chart ---
      const chartY = 200;
      doc.fillColor(colors.primary).fontSize(13).text('Cycle Length Trends (Last 12 Cycles)', 50, chartY);

      const chartWidth = 495;
      const chartHeight = 80;
      const barGap = 12;
      const displayedCycles = cycles.slice().reverse();
      const maxCyclesToShow = 12;
      const barWidth = (chartWidth - (maxCyclesToShow - 1) * barGap) / maxCyclesToShow;
      const maxVal = Math.max(...displayedCycles.map((c) => c.cycleLength || 28), 35);

      displayedCycles.forEach((c, i) => {
        const val = c.cycleLength || 0;
        const barH = (val / maxVal) * chartHeight;
        const barX = 50 + i * (barWidth + barGap);
        const barY = chartY + 25 + (chartHeight - barH);

        doc.roundedRect(barX, barY, barWidth, Math.max(barH, 2), 2).fill(val > 35 || val < 21 ? colors.danger : colors.accent);

        if (val > 0) {
          doc
            .fillColor(colors.textMuted)
            .fontSize(7)
            .text(val.toString(), barX, barY - 10, { width: barWidth, align: 'center' });
        }
      });
      doc
        .moveTo(50, chartY + 25 + chartHeight)
        .lineTo(545, chartY + 25 + chartHeight)
        .strokeColor(colors.border)
        .stroke();

      // --- Symptom & Lifestyle Row ---
      const analysisY = 325;

      // Symptoms
      doc.fillColor(colors.primary).fontSize(13).text('Symptom Frequency', 50, analysisY);
      if (reportData.currentCycleInsights?.topSymptoms && reportData.currentCycleInsights.topSymptoms.length > 0) {
        let currentSymptomY = analysisY + 25;
        const barMaxW = 150;

        reportData.currentCycleInsights.topSymptoms.forEach((s) => {
          doc
            .fillColor(colors.textMain)
            .fontSize(8)
            .text(s.symptomType, 50, currentSymptomY + 3);
          const freqW = (s.count / Math.max(reportData.summary.totalCyclesLogged, 1)) * barMaxW;
          doc.rect(130, currentSymptomY, barMaxW, 10).fill(colors.bg);
          doc.rect(130, currentSymptomY, Math.max(freqW, 2), 10).fill(colors.accent);
          doc
            .fillColor(colors.textMuted)
            .fontSize(7)
            .text(`${s.count} logs (Avg: ${s.avgSeverity}/5)`, 285, currentSymptomY + 2);
          currentSymptomY += 15;
        });
      } else {
        doc
          .fillColor(colors.textLight)
          .fontSize(9)
          .text('Insufficient symptom data for analysis.', 50, analysisY + 25);
      }

      // Lifestyle
      const lifeX = 350;
      doc.fillColor(colors.primary).fontSize(13).text('Lifestyle Analysis', lifeX, analysisY);
      const drawInsightRow = (y: number, label: string, val: number | null) => {
        doc.fillColor(colors.textMuted).fontSize(9).text(label, lifeX, y);
        const textVal = val ? `${Math.round(val * 10) / 10}/5` : 'N/A';
        doc.fillColor(colors.textMain).text(textVal, lifeX + 100, y, { align: 'right', width: 40 });
        doc.rect(lifeX, y + 12, 140, 3).fill(colors.bg);
        if (val) doc.rect(lifeX, y + 12, (val / 5) * 140, 3).fill(colors.primary);
      };

      drawInsightRow(analysisY + 25, 'Stress Level', reportData.currentCycleInsights.avgStress);
      drawInsightRow(analysisY + 50, 'Energy Level', reportData.currentCycleInsights.avgEnergy);
      drawInsightRow(analysisY + 75, 'Sleep/Mood Stability', reportData.currentCycleInsights.avgMood);

      // --- Clinical Observations ---
      const obsY = 460;
      doc
        .moveTo(50, obsY - 10)
        .lineTo(545, obsY - 10)
        .strokeColor(colors.border)
        .lineWidth(0.5)
        .stroke();
      doc.fillColor(colors.primary).fontSize(13).text('Clinical Interpretation', 50, obsY);

      let observations = '';
      if (reportData.summary.cycleVariation > 7) {
        observations += '• High cycle variation observed. Recommend investigation for hormonal imbalance. ';
      } else {
        observations += '• Cycle regularity is within normal clinical parameters. ';
      }

      if (reportData.currentCycleInsights.highStressDays > 5) {
        observations += '• High stress frequency noted; possible impact on cycle regularity. ';
      }

      if (reportData.currentCycleInsights.bbtShiftDetected) {
        observations += '• BBT thermal shift recorded, indicative of ovulation. ';
      }

      doc
        .fillColor(colors.textMain)
        .fontSize(9)
        .text(observations || '• Patterns within normal ranges.', 50, obsY + 22, { width: 495, lineGap: 3 });

      // --- Detailed Log Table ---
      doc.fillColor(colors.primary).fontSize(13).text('Detailed Cycle History', 50, 540);
      const tableTop = 565;
      const itemHeight = 16;

      doc.fillColor(colors.bg).rect(50, tableTop, 495, itemHeight).fill();
      doc.fillColor(colors.primary).fontSize(8);
      doc.text('START DATE', 60, tableTop + 4);
      doc.text('CYCLE LEN', 200, tableTop + 4);
      doc.text('PERIOD LEN', 350, tableTop + 4);
      doc.text('STATUS', 480, tableTop + 4);

      let currentTableY = tableTop + itemHeight;
      cycles.slice(0, 10).forEach((cycle, index) => {
        if (index % 2 === 1) doc.fillColor('#fafafa').rect(50, currentTableY, 495, itemHeight).fill();
        doc.fillColor(colors.textMain).fontSize(8);
        doc.text(format(new Date(cycle.startDate), 'PPP'), 60, currentTableY + 4);
        doc.text(cycle.cycleLength ? `${cycle.cycleLength} d` : '--', 200, currentTableY + 4);
        doc.text(cycle.periodLength ? `${cycle.periodLength} d` : '--', 350, currentTableY + 4);

        if (cycle.cycleLength && reportData.summary.avgCycleLength) {
          const diff = Math.abs(cycle.cycleLength - reportData.summary.avgCycleLength);
          doc
            .fillColor(diff > 7 ? colors.danger : colors.success)
            .text(diff > 7 ? 'Irregular' : 'Normal', 480, currentTableY + 4);
        }
        currentTableY += itemHeight;
      });

      // --- Footer ---
      doc.moveTo(50, 770).lineTo(545, 770).strokeColor(colors.border).lineWidth(1).stroke();
      doc
        .fontSize(7)
        .fillColor(colors.textLight)
        .text(
          'LEGAL NOTICE: This report is generated from user-logged data to facilitate physician consultation. It is not a standalone diagnostic tool.',
          50,
          780,
          { width: 495, align: 'center' },
        );

      doc.end();
    });
  }
}
