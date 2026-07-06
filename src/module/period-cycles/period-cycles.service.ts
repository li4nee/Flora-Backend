import { Injectable } from '@nestjs/common';
import { PeriodCycles } from './entities/periodCycles.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository } from 'typeorm';
import { InvalidInputError } from '../../shared/typings/error.typings';
import { PeriodCycleHistoryGetDto } from './dto/periodCycleHistoryGet.dto';
import { PeriodCycleStartLogDto } from './dto/periodCycleStart.dto';
import { parseISO } from 'date-fns/parseISO';
import { differenceInDays } from 'date-fns/differenceInDays';
import { addYears } from 'date-fns/addYears';
import { User } from '../user/entities/user.entity';
import { endOfDay, startOfDay } from 'date-fns';
@Injectable()
export class PeriodCyclesService {
  constructor(
    @InjectRepository(PeriodCycles)
    private readonly periodCyclesRepo: Repository<PeriodCycles>,
  ) {}

  async logPeriodStart(userId: string, dto: PeriodCycleStartLogDto): Promise<PeriodCycles> {
    const startDate = parseISO(dto.periodStartDate);
    const oneYearAgo = addYears(new Date(), -1);
    if (startDate < oneYearAgo) {
      throw new InvalidInputError('The period start date cannot be more than 1 year before today.');
    }
    const previousCycles = await this.findMostRecentNCycles(userId, 1);
    const previous = previousCycles.length > 0 ? previousCycles[0] : null;

    let cycleLength: number | null = null;
    if (previous) {
      cycleLength = differenceInDays(startDate, new Date(previous.startDate));
      if (cycleLength == null || cycleLength <= 0) {
        throw new InvalidInputError('The new period start date must be after the previous cycle start date.');
      }
      await this.updateTheEndDateOfCycle(previous, dto.periodStartDate);
    }
    return this.createCycle(userId, dto.periodStartDate, cycleLength ?? undefined, dto.notes);
  }

  async findMostRecentNCycles(userId: string, n: number): Promise<PeriodCycles[]> {
    return this.periodCyclesRepo.find({
      where: { user: { id: userId } },
      order: { startDate: 'DESC' },
      take: n,
    });
  }

  async getCycleHistory(
    userId: string,
    dto: PeriodCycleHistoryGetDto,
  ): Promise<{ data: PeriodCycles[]; meta: { page: number; limit: number; total: number; totalPages: number } }> {
    const page = dto.page ?? 1;
    const limit = dto.limit ?? 10;

    if (dto.periodCycleId) {
      const cycle = await this.findPeriodCycleById(userId, dto.periodCycleId);
      if (!cycle) throw new InvalidInputError('No period cycle found with the given ID for this user.');
      return {
        data: cycle ? [cycle] : [],
        meta: {
          page,
          limit,
          total: cycle ? 1 : 0,
          totalPages: 1,
        },
      };
    }

    const qb = this.periodCyclesRepo
      .createQueryBuilder('cycle')
      .select(['cycle.id', 'cycle.startDate', 'cycle.endDate', 'cycle.cycleLength', 'cycle.periodLength'])
      .where('cycle.userId = :userId', { userId });

    if (dto.startDateFrom) {
      qb.andWhere('cycle.startDate >= :startDateFrom', {
        startDateFrom: dto.startDateFrom,
      });
    }

    if (dto.startDateTo) {
      qb.andWhere('cycle.startDate <= :startDateTo', {
        startDateTo: dto.startDateTo,
      });
    }
    if (dto.cycleLengthMin !== undefined) {
      qb.andWhere('cycle.cycleLength >= :cycleLengthMin', {
        cycleLengthMin: dto.cycleLengthMin,
      });
    }

    if (dto.cycleLengthMax !== undefined) {
      qb.andWhere('cycle.cycleLength <= :cycleLengthMax', {
        cycleLengthMax: dto.cycleLengthMax,
      });
    }

    if (dto.periodLengthMin !== undefined) {
      qb.andWhere('cycle.periodLength >= :periodLengthMin', {
        periodLengthMin: dto.periodLengthMin,
      });
    }

    if (dto.periodLengthMax !== undefined) {
      qb.andWhere('cycle.periodLength <= :periodLengthMax', {
        periodLengthMax: dto.periodLengthMax,
      });
    }

    if (dto.notesSearch) {
      qb.addSelect('cycle.notes');
      qb.andWhere(':notesSearch ILIKE ANY (cycle.notes)', {
        notesSearch: `%${dto.notesSearch}%`,
      });
    }

    qb.orderBy('cycle.startDate', dto.order)
      .skip((page - 1) * limit)
      .take(limit);

    const [data, total] = await qb.getManyAndCount();

    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async logPeriodEnd(userId: string, cycleId: string, endDateStr: string, notes?: string): Promise<PeriodCycles> {
    const cycle = await this.findPeriodCycleById(userId, cycleId);
    if (!cycle) {
      throw new InvalidInputError('No period cycle found with the given ID for this user.');
    }

    const endDate = parseISO(endDateStr);
    const startDate = parseISO(cycle.startDate);

    if (endDate < startDate) {
      throw new InvalidInputError('The period end date cannot be before the start date.');
    }

    const periodLength = differenceInDays(endDate, startDate) + 1; // +1 to include the start date
    cycle.periodLength = periodLength;
    if (notes) {
      if (Array.isArray(cycle.notes) && cycle.notes.length > 0) {
        cycle.notes = [...cycle.notes, notes];
      } else {
        cycle.notes = [notes];
      }
    }
    return this.periodCyclesRepo.save(cycle);
  }

  async findPeriodCycleById(userId: string, cycleId: string): Promise<PeriodCycles | null> {
    return this.periodCyclesRepo.findOne({ where: { id: cycleId, user: { id: userId } } });
  }

  async deleteCycle(userId: string, cycleId: string): Promise<void> {
    const result = await this.periodCyclesRepo
      .createQueryBuilder('cycle')
      .leftJoin('cycle.user', 'user')
      .delete()
      .from(PeriodCycles)
      .where('cycle.id = :cycleId', { cycleId })
      .andWhere('user.id = :userId', { userId })
      .execute();

    if (result.affected === 0) {
      throw new InvalidInputError('No period cycle found with the given ID for this user.');
    }
  }

  async findActiveCycleForUserOnDate(userId: string, dateStr: string, cycleId?: string): Promise<PeriodCycles | null> {
    const date = parseISO(dateStr);
    const start = startOfDay(date);
    const end = endOfDay(date);

    const qb = this.periodCyclesRepo
      .createQueryBuilder('cycle')
      .where('cycle.userId = :userId', { userId })
      .andWhere('cycle.startDate <= :end', { end }) // cycle should start before or on this date
      .andWhere(
        new Brackets(
          (qb) =>
            qb
              .where('cycle.endDate IS NULL') // ongoing cycles
              .orWhere('cycle.endDate >= :start', { start }), // ended after this date
        ),
      );

    if (cycleId) {
      qb.andWhere('cycle.id = :cycleId', { cycleId });
    }

    return qb.getOne();
  }

  private async createCycle(userId: string, startDate: string, cycleLength?: number, notes?: string): Promise<PeriodCycles> {
    const periodCycle = new PeriodCycles();
    periodCycle.user = { id: userId } as User;
    periodCycle.startDate = startDate;
    if (cycleLength) {
      periodCycle.cycleLength = cycleLength;
    }
    if (notes) {
      periodCycle.notes = [notes];
    }
    return this.periodCyclesRepo.save(periodCycle);
  }

  private async updateTheEndDateOfCycle(cycle: PeriodCycles, endDate: string): Promise<PeriodCycles> {
    cycle.endDate = new Date(parseISO(endDate).getTime() - 24 * 60 * 60 * 1000).toISOString();
    cycle.cycleLength = differenceInDays(parseISO(endDate), parseISO(cycle.startDate));
    return this.periodCyclesRepo.save(cycle);
  }
}
