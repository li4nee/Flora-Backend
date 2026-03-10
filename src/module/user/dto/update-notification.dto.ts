import { IsBoolean, IsOptional, IsString, Matches } from 'class-validator';

export class UpdateNotificationDto {
  @IsOptional()
  @IsBoolean()
  periodNotification?: boolean;

  @IsOptional()
  @IsBoolean()
  fertilityNotification?: boolean;

  @IsOptional()
  @IsBoolean()
  dailyLogNotification?: boolean;

  /**
   * Time string in HH:MM format (24h) in UTC, e.g. "08:00", "20:30".
   * Set to null to clear the reminder time.
   */
  @IsOptional()
  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, {
    message: 'reminderTimeInUTC must be in HH:MM format in UTC (e.g. "08:00")',
  })
  reminderTimeInUTC?: string | null;
}
