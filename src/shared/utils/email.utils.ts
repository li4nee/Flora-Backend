import { Injectable } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';
import { LoggerService } from '../config/loggerService.config';

@Injectable()
export class EmailService {
  constructor(
    private readonly mailerService: MailerService,
    private readonly logger: LoggerService,
  ) {}

  async sendOtpEmail(to: string, otp: string, type: 'verify' | 'reset') {
    const subject = type === 'verify' ? 'Verify Your Email — Flora' : 'Reset Your Password — Flora';

    const html =
      type === 'verify'
        ? `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px; background: #fdf2f8; border-radius: 12px;">
        <h2 style="color: #be185d; margin-bottom: 8px;">Welcome to Flora 🌸</h2>
        <p style="color: #4a4a4a; font-size: 15px;">Use the code below to verify your email address:</p>
        <div style="background: #ffffff; border: 2px dashed #f472b6; border-radius: 8px; padding: 16px; text-align: center; margin: 24px 0;">
          <span style="font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #be185d;">${otp}</span>
        </div>
        <p style="color: #6b7280; font-size: 13px;">This code expires in <strong>10 minutes</strong>. If you didn't create a Flora account, you can safely ignore this email.</p>
      </div>
    `
        : `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px; background: #fdf2f8; border-radius: 12px;">
        <h2 style="color: #be185d; margin-bottom: 8px;">Password Reset — Flora 🌸</h2>
        <p style="color: #4a4a4a; font-size: 15px;">Use the code below to reset your password:</p>
        <div style="background: #ffffff; border: 2px dashed #f472b6; border-radius: 8px; padding: 16px; text-align: center; margin: 24px 0;">
          <span style="font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #be185d;">${otp}</span>
        </div>
        <p style="color: #6b7280; font-size: 13px;">This code expires in <strong>10 minutes</strong>. If you didn't request a password reset, you can safely ignore this email.</p>
      </div>
    `;

    try {
      await this.mailerService.sendMail({
        to,
        subject,
        html,
      });
      this.logger.info(`OTP email (${type}) sent to ${to}`);
    } catch (error) {
      this.logger.error(`Failed to send OTP email (${type}) to ${to}`, error);
      throw error;
    }
  }
}
