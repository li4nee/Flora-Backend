import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DailyLog } from './entities/dailyLogs.entity';
import { DailySymptom } from './entities/dailySymptoms.entity';
import { PeriodCycles } from '../period-cycles/entities/periodCycles.entity';
import { Repository } from 'typeorm';
import { InvalidInputError } from 'src/shared/typings/error.typings';
import { DailyLogCreateDto, DailyLogSymptomCreateDto } from './dto/createDailyLog.dto';
import { PeriodCyclesService } from '../period-cycles/period-cycles.service';
import { differenceInDays, format } from 'date-fns';
import { DailyLogUpdateDto } from './dto/updateDailyLog.dto';
import { DailyLogQueryDto, SymptomSortMode } from './dto/queryDailyLog.dto';
import { subYears } from 'date-fns/subYears';
@Injectable()
export class DailyLogsAndSymptomsService {
  constructor(
    @InjectRepository(DailyLog)
    private readonly dailyLogRepo: Repository<DailyLog>,
    @InjectRepository(DailySymptom)
    private readonly dailySymptomRepo: Repository<DailySymptom>,

    private readonly periodCycleService: PeriodCyclesService,
  ) {}

  private calcCycleDay(logDate: string, cycleStartDate: string): number | undefined {
    const start = new Date(cycleStartDate);
    const log = new Date(logDate);
    const diffDays = differenceInDays(log, start);
    if (diffDays < 0) return undefined;
    return diffDays + 1;
  }

  private resolveLogDate(logDate?: string): string {
    return logDate ?? format(new Date(), 'yyyy-MM-dd');
  }

  private async findDailyLog(
    where: { id?: string; logDate?: string; user: { id: string } },
    relations?: { dailySymptoms?: boolean; periodCycle?: boolean },
  ): Promise<DailyLog | null> {
    return this.dailyLogRepo.findOne({ where, relations });
  }

  private async selectOnlyId(where: { id?: string; logDate?: string; user: { id: string } }) {
    return this.dailyLogRepo.findOne({ where, select: { id: true } });
  }

  async findDailyLogById(
    id: string,
    userId: string,
    relations?: { dailySymptoms?: boolean; periodCycle?: boolean },
  ): Promise<DailyLog | null> {
    return this.findDailyLog({ id, user: { id: userId } }, relations);
  }

  async findDailyLogByDate(
    logDate: string,
    userId: string,
    relations?: { dailySymptoms?: boolean; periodCycle?: boolean },
  ): Promise<DailyLog | null> {
    return this.findDailyLog({ logDate, user: { id: userId } }, relations);
  }

  private createDailyLogEntity(dto: DailyLogCreateDto, userId: string, periodCycle: PeriodCycles): DailyLog {
    const log = this.dailyLogRepo.create({
      logDate: this.resolveLogDate(dto.logDate),
      flow: dto.flow,
      notes: dto.notes,
      basalBodyTemp: dto.basalBodyTemp,
      weightKg: dto.weightKg,
      cervicalMucus: dto.cervicalMucus,
      stressLevel: dto.stressLevel,
      energyLevel: dto.energyLevel,
      moodLevel: dto.moodLevel,
      libidoLevel: dto.libidoLevel,
      medications: dto.medications,
      tookContraceptive: dto.tookContraceptive,
      user: { id: userId },
      periodCycle,
    });

    if (periodCycle.startDate) {
      log.cycleDay = this.calcCycleDay(log.logDate, periodCycle.startDate);
    }

    return log;
  }

  private createSymptoms(symptoms?: DailyLogSymptomCreateDto[]): DailySymptom[] {
    if (!symptoms?.length) return [];

    return symptoms.map((s) =>
      this.dailySymptomRepo.create({
        symptomType: s.symptomType,
        severity: s.severity,
      }),
    );
  }

  async findDailyLogsByQuery(query: DailyLogQueryDto, userId: string) {
    const qb = this.dailyLogRepo.createQueryBuilder('log').where('log.userId = :userId', { userId });

    // minimal fields
    const selectFields = ['log.id', 'log.logDate', 'log.cycleDay'];

    const optionalFieldsMap = {
      flow: 'log.flow',
      stressLevel: 'log.stressLevel',
      energyLevel: 'log.energyLevel',
      moodLevel: 'log.moodLevel',
      libidoLevel: 'log.libidoLevel',
      basalBodyTemp: 'log.basalBodyTemp',
      weightKg: 'log.weightKg',
      cervicalMucus: 'log.cervicalMucus',
      tookContraceptive: 'log.tookContraceptive',
    };

    // auto-select any optional field that is filtered
    for (const [key, column] of Object.entries(optionalFieldsMap)) {
      if (query[key as keyof DailyLogQueryDto] !== undefined) selectFields.push(column);
    }

    // text search fields
    if (query.searchNotes) selectFields.push('log.notes');
    if (query.searchMedications) selectFields.push('log.medications');

    qb.select([...new Set(selectFields)]); // unique

    // date filters
    if (query.from) qb.andWhere('log.logDate >= :from', { from: query.from });
    if (query.to) qb.andWhere('log.logDate <= :to', { to: query.to });

    // periodCycle filter
    if (query.periodCycleId) qb.andWhere('log.periodCycleId = :cycleId', { cycleId: query.periodCycleId });

    // log filters
    if (query.flow) qb.andWhere('log.flow = :flow', { flow: query.flow });
    if (query.cervicalMucus) qb.andWhere('log.cervicalMucus = :cervicalMucus', { cervicalMucus: query.cervicalMucus });
    if (query.stressLevelMin !== undefined) qb.andWhere('log.stressLevel >= :minStress', { minStress: query.stressLevelMin });
    if (query.stressLevelMax !== undefined) qb.andWhere('log.stressLevel <= :maxStress', { maxStress: query.stressLevelMax });

    // text search
    if (query.searchNotes) qb.andWhere('log.notes ILIKE :notes', { notes: `%${query.searchNotes}%` });
    if (query.searchMedications)
      qb.andWhere('log.medications @> :medication', { medication: JSON.stringify([query.searchMedications]) });

    // symptom filters + sorting
    let needsAggregation = false;
    if (query.symptomTypes?.length || query.symptomSeverity || query.symptomSortMode) {
      qb.leftJoin('log.dailySymptoms', 'symptom');
      qb.addSelect('symptom.symptomType');
      qb.addSelect('symptom.severity');
      if (query.symptomTypes?.length) qb.andWhere('symptom.symptomType IN (:...types)', { types: query.symptomTypes });
      if (query.symptomSeverity) qb.andWhere('symptom.severity = :severity', { severity: query.symptomSeverity });

      if (query.symptomSortMode) {
        needsAggregation = true;
        qb.addSelect('MAX(symptom.severity)', 'maxSeverity').addSelect('COUNT(symptom.id)', 'symptomCount').groupBy('log.id');

        switch (query.symptomSortMode) {
          case SymptomSortMode.MAX_SEVERITY:
            qb.orderBy('"maxSeverity"', query.order);
            break;
          case SymptomSortMode.COUNT:
            qb.orderBy('"symptomCount"', query.order);
            break;
          case SymptomSortMode.SPECIFIC:
            if (!query.sortSymptomType) throw new InvalidInputError('sortSymptomType required for SPECIFIC mode');
            qb.leftJoin('log.dailySymptoms', 'specificSymptom', 'specificSymptom.symptomType = :symptomType', {
              symptomType: query.sortSymptomType,
            }).addSelect('specificSymptom.severity', 'specificSeverity');
            qb.orderBy('"specificSeverity"', query.order);
            break;
        }
      }
    }

    // normal sorting if no symptom sort
    if (!query.symptomSortMode && query.sortBy) {
      qb.orderBy(`log.${query.sortBy}`, query.order);
      // also select the field used in sorting
      if (!selectFields.includes(`log.${query.sortBy}`)) qb.addSelect(`log.${query.sortBy}`);
    }

    // pagination
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    qb.skip((page - 1) * limit).take(limit);

    // execute
    let logs: unknown[];
    let total: number;
    if (needsAggregation) {
      logs = await qb.getRawMany();
      // total count ignoring aggregation
      total = await this.dailyLogRepo.createQueryBuilder('log').where('log.userId = :userId', { userId }).getCount();
    } else {
      [logs, total] = await qb.getManyAndCount();
    }

    return { logs, meta: { total, page, limit } };
  }

  async createDailyLogsAndSymptoms(dto: DailyLogCreateDto, userId: string): Promise<DailyLog> {
    const logDate = this.resolveLogDate(dto.logDate);

    const logDateObj = new Date(logDate);
    const oneYearAgo = subYears(new Date(), 1);
    if (logDateObj < oneYearAgo) {
      throw new InvalidInputError('Log date cannot be more than 1 year in the past');
    }

    const existing = await this.findDailyLogByDate(logDate, userId);
    if (existing) {
      throw new InvalidInputError(`Log already exists for this user on this date: ${logDate}`);
    }

    const periodCycle = await this.periodCycleService.findActiveCycleForUserOnDate(userId, logDate, dto.periodCycleId);
    if (!periodCycle) {
      throw new InvalidInputError('Invalid period cycle');
    }
    const log = this.createDailyLogEntity(dto, userId, periodCycle);
    const symptoms = this.createSymptoms(dto.dailySymptoms);
    log.dailySymptoms = symptoms;
    return this.dailyLogRepo.save(log);
  }

  async updateDailyLog(id: string, dto: DailyLogUpdateDto, userId: string): Promise<DailyLog | null> {
    const log = await this.findDailyLogById(id, userId, { dailySymptoms: true });
    if (!log) {
      throw new InvalidInputError('Daily log not found or unauthorized');
    }
    if (dto.flow !== undefined) log.flow = dto.flow;
    if (dto.notes !== undefined) log.notes = dto.notes;
    if (dto.basalBodyTemp !== undefined) log.basalBodyTemp = dto.basalBodyTemp;
    if (dto.weightKg !== undefined) log.weightKg = dto.weightKg;
    if (dto.cervicalMucus !== undefined) log.cervicalMucus = dto.cervicalMucus;
    if (dto.stressLevel !== undefined) log.stressLevel = dto.stressLevel;
    if (dto.energyLevel !== undefined) log.energyLevel = dto.energyLevel;
    if (dto.moodLevel !== undefined) log.moodLevel = dto.moodLevel;
    if (dto.libidoLevel !== undefined) log.libidoLevel = dto.libidoLevel;
    if (dto.medications !== undefined) log.medications = dto.medications;
    if (dto.tookContraceptive !== undefined) log.tookContraceptive = dto.tookContraceptive;

    if (dto.dailySymptoms) {
      log.dailySymptoms = this.createSymptoms(dto.dailySymptoms);
    }
    return this.dailyLogRepo.save(log);
  }

  async removeDailyLog(id: string, userId: string): Promise<void> {
    const result = await this.dailyLogRepo.delete({ id, user: { id: userId } });
    if (result.affected === 0) {
      throw new InvalidInputError('Daily log not found or unauthorized');
    }
    return void 0;
  }
}
