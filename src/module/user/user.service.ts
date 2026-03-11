import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { Repository } from 'typeorm';
import { Profile } from './entities/profile.entity';
import { AuthRegisterProfileDto } from '../auth/dto/registerProfile.dto';
import { UserUpdateEmailDto, UserUpdatePasswordDto } from './dto/update-user.dto';
import { InvalidInputError } from 'src/shared/typings/error.typings';
import { PasswordUtils } from 'src/shared/utils/password.utils';
import { UserUpdateProfileDto } from './dto/update-profile.dto';
import { Notification } from '../notifications/entities/notifications.entity';
import { UserUpdateNotificationDto } from './dto/update-notification.dto';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly passwordUtils: PasswordUtils,
  ) {}

  private async findByEmailBase(email: string, includeProfile = false): Promise<User | null> {
    return this.userRepo.findOne({
      where: { email },
      relations: includeProfile ? ['profile'] : [],
    });
  }

  private async findByIdBase(id: string, includeProfile = false, includeNotification = false): Promise<User | null> {
    const relations: string[] = [];
    if (includeProfile) relations.push('profile');
    if (includeNotification) relations.push('notification');

    return this.userRepo.findOne({
      where: { id },
      relations,
    });
  }

  private async userExistsBase(key: keyof User, value: string): Promise<boolean> {
    const result: Record<string, unknown> | undefined = await this.userRepo
      .createQueryBuilder('user')
      .select('1')
      .where(`user.${key} = :value`, { value })
      .getRawOne();
    return !!result;
  }

  private async getUserPasswordBase(where: { id?: string; email?: string }): Promise<User | null> {
    const qb = this.userRepo.createQueryBuilder('user').select(['user.id', 'user.password']);

    if (where.id) {
      qb.where('user.id = :id', { id: where.id });
    }

    if (where.email) {
      qb.where('user.email = :email', { email: where.email });
    }

    return qb.getOne();
  }

  async getUserPasswordById(id: string): Promise<User | null> {
    return this.getUserPasswordBase({ id });
  }

  async getUserPasswordByEmail(email: string): Promise<User | null> {
    return this.getUserPasswordBase({ email });
  }

  async userExistsByEmail(email: string): Promise<boolean> {
    return this.userExistsBase('email', email);
  }

  async userExistsById(id: string): Promise<boolean> {
    return this.userExistsBase('id', id);
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.findByEmailBase(email);
  }

  async findByEmailAndRelationWithProfile(email: string): Promise<User | null> {
    return this.findByEmailBase(email, true);
  }

  async findById(id: string): Promise<User | null> {
    return this.findByIdBase(id);
  }

  async findByIdAndRelationWithProfile(id: string): Promise<User | null> {
    return this.findByIdBase(id, true);
  }

  async findByIdAndRelationWithNotification(id: string): Promise<User | null> {
    return this.findByIdBase(id, false, true);
  }

  async findByIdAndRelationWithProfileAndNotification(id: string): Promise<User | null> {
    return this.findByIdBase(id, true, true);
  }

  async create(email: string, hashedPassword: string, profile: AuthRegisterProfileDto): Promise<User> {
    const user = new User();
    user.email = email;
    user.password = hashedPassword;

    const newProfile = new Profile();
    newProfile.firstName = profile.firstName;
    newProfile.lastName = profile.lastName;
    newProfile.dateOfBirth = profile?.dateOfBirth ? new Date(profile.dateOfBirth) : null;
    newProfile.averageCycleLength = profile?.averageCycleLength;
    newProfile.averagePeriodLength = profile?.averagePeriodLength;
    user.profile = newProfile;

    const notification = new Notification();
    user.notification = notification;

    return this.userRepo.save(user);
  }

  async updateEmail(userId: string, dto: UserUpdateEmailDto): Promise<User> {
    const user = await this.getUserPasswordById(userId);
    if (!user) throw new InvalidInputError('User not found');

    const passwordValid = await this.passwordUtils.comparePassword(dto.currentPassword, user.password);
    if (!passwordValid) throw new InvalidInputError('Current password is incorrect');

    const emailTaken = await this.userExistsByEmail(dto.newEmail);
    if (emailTaken) throw new InvalidInputError('Email is already in use');

    user.email = dto.newEmail;
    user.isEmailVerified = false;
    return this.userRepo.save(user);
  }

  async updatePassword(userId: string, dto: UserUpdatePasswordDto): Promise<User> {
    const user = await this.getUserPasswordById(userId);

    if (!user) throw new InvalidInputError('User not found');

    const passwordValid = await this.passwordUtils.comparePassword(dto.currentPassword, user.password);
    if (!passwordValid) throw new InvalidInputError('Current password is incorrect');

    user.password = await this.passwordUtils.hashPassword(dto.newPassword);
    return this.userRepo.save(user);
  }

  async updateProfile(userId: string, dto: UserUpdateProfileDto): Promise<User> {
    const user = await this.findByIdAndRelationWithProfile(userId);

    if (!user) throw new InvalidInputError('User not found');
    if (!user.profile) throw new InvalidInputError('User profile not found');

    if (dto.firstName !== undefined) user.profile.firstName = dto.firstName;
    if (dto.lastName !== undefined) user.profile.lastName = dto.lastName;
    if (dto.averageCycleLength !== undefined) user.profile.averageCycleLength = dto.averageCycleLength;
    if (dto.averagePeriodLength !== undefined) user.profile.averagePeriodLength = dto.averagePeriodLength;
    if (dto.dateOfBirth !== undefined) user.profile.dateOfBirth = dto.dateOfBirth ? new Date(dto.dateOfBirth) : null;

    return this.userRepo.save(user);
  }

  async updateNotifications(userId: string, dto: UserUpdateNotificationDto): Promise<User> {
    const user = await this.findByIdAndRelationWithNotification(userId);

    if (!user) throw new InvalidInputError('User not found');

    const notificationSettings = user.notification;
    if (!notificationSettings) throw new InvalidInputError('User notification settings not found');

    notificationSettings.dailyLogNotification = dto.dailyLogNotification ?? notificationSettings.dailyLogNotification;
    notificationSettings.fertilityNotification = dto.fertilityNotification ?? notificationSettings.fertilityNotification;
    notificationSettings.periodNotification = dto.periodNotification ?? notificationSettings.periodNotification;
    notificationSettings.reminderTimeInUTC = dto.reminderTimeInUTC ?? notificationSettings.reminderTimeInUTC;

    return this.userRepo.save(user);
  }
}
