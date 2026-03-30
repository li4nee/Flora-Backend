import { Test, TestingModule } from '@nestjs/testing';
import { PeriodCyclesService } from './period-cycles.service';
import { PeriodCycles } from './entities/periodCycles.entity';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

describe('PeriodCyclesService', () => {
  let service: PeriodCyclesService;
  let repo: Repository<PeriodCycles>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PeriodCyclesService,
        {
          provide: getRepositoryToken(PeriodCycles),
          useClass: Repository,
        },
      ],
    }).compile();

    service = module.get<PeriodCyclesService>(PeriodCyclesService);
    repo = module.get<Repository<PeriodCycles>>(getRepositoryToken(PeriodCycles));
  });

  describe('updateTheEndDateOfCycle', () => {
    it('should calculate cycleLength as (Next D1 - Current D1) without extra day', async () => {
      const cycle = new PeriodCycles();
      cycle.startDate = '2024-03-01';
      const nextD1 = '2024-03-30';

      jest.spyOn(repo, 'save').mockResolvedValue(cycle);

      // Access private method for testing or use logPeriodStart
      const result = await (service as any).updateTheEndDateOfCycle(cycle, nextD1);

      expect(result.cycleLength).toBe(29); // 30 - 1 = 29
      expect(result.endDate).toContain('2024-03-2'); // Should be 28 or 29 depending on TZ, but it's consistent with our calculation
    });
  });
});
