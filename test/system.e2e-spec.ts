import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { GlobalExceptionFilter } from '../src/shared/filters/globalException.filter';
import { ResponseInterceptor } from '../src/shared/interceptor/response.interceptor';
import { LoggerService } from '../src/shared/config/loggerService.config';
import { EmailService } from '../src/shared/utils/email.utils';
import { PushNotificationService } from '../src/shared/utils/pushNotification.utils';



class FakeEmailService {
  public readonly captured = new Map<string, string>();

  async sendOtpEmail(to: string, otp: string, type: 'verify' | 'reset') {
    this.captured.set(`${to}:${type}`, otp);
  }
}

class FakePushNotificationService {
  async sendToTokens() {
    return { invalidTokens: [] };
  }
}

describe('System / Integration Tests (ST-1 .. ST-9)', () => {
  let app: INestApplication<App>;
  let server: App;
  let fakeEmail: FakeEmailService;

  const uniqueSuffix = `${Date.now()}-${Math.floor(Math.random() * 10000)}`;
  const email = `flora.e2e.${uniqueSuffix}@example.com`;
  const password = 'StrongPass1@';
  const newPassword = 'EvenStrongerPass2@';

  let accessToken: string;
  let refreshTokenBeforeReset: string;
  let firstCycleId: string;

  beforeAll(async () => {
    fakeEmail = new FakeEmailService();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(EmailService)
      .useValue(fakeEmail)
      .overrideProvider(PushNotificationService)
      .useValue(new FakePushNotificationService())
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    app.useGlobalFilters(new GlobalExceptionFilter(app.get(LoggerService)));
    app.useGlobalInterceptors(new ResponseInterceptor());
    app.setGlobalPrefix('/api/v1');
    await app.init();
    server = app.getHttpServer();
  }, 30000);

  afterAll(async () => {
    await app.close();
  });

  async function waitForCapturedOtp(key: string, timeoutMs = 3000): Promise<string> {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      const otp = fakeEmail.captured.get(key);
      if (otp) return otp;
      await new Promise((r) => setTimeout(r, 50));
    }
    throw new Error(`OTP for ${key} was not captured within ${timeoutMs}ms`);
  }

  // ST-1: Register with a valid email and strong password -> account created, OTP emailed
  it('registers with a valid email and strong password, and emails a verification OTP', async () => {
    const res = await request(server)
      .post('/api/v1/auth/register')
      .send({
        email,
        password,
        profile: { firstName: 'Flora', lastName: 'Tester', dateOfBirth: '2000-01-01' },
      })
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.message).toMatch(/registered successfully/i);

    const otp = await waitForCapturedOtp(`${email}:verify`);
    expect(otp).toMatch(/^\d{6}$/);
  });

  // ST-2: Attempt login before verifying email -> rejected with a clear message
  it('rejects login before the email is verified', async () => {
    const res = await request(server).post('/api/v1/auth/login').send({ email, password }).expect(401);

    expect(res.body.errorCode).toBe('EMAIL_NOT_VERIFIED');
    expect(res.body.message).toMatch(/verify your email/i);
  });

  // ST-3: Verify email with a correct OTP, then log in -> verification succeeds, tokens issued
  it('verifies the email with the correct OTP, then logs in and receives tokens', async () => {
    const otp = fakeEmail.captured.get(`${email}:verify`)!;

    await request(server).post('/api/v1/auth/verify-email').send({ email, otp }).expect(201);

    const loginRes = await request(server).post('/api/v1/auth/login').send({ email, password }).expect(201);

    expect(loginRes.body.data.accessToken).toEqual(expect.any(String));
    expect(loginRes.body.data.refreshToken).toEqual(expect.any(String));

    accessToken = loginRes.body.data.accessToken;
    refreshTokenBeforeReset = loginRes.body.data.refreshToken;
  });

  // ST-4: Access a protected endpoint with an invalid/expired token -> rejected; valid token -> succeeds
  it('rejects an invalid bearer token on a protected endpoint, then succeeds with a real one', async () => {
    await request(server).get('/api/v1/users/me').set('Authorization', 'Bearer not-a-real-token').expect(401);

    const res = await request(server).get('/api/v1/users/me').set('Authorization', `Bearer ${accessToken}`).expect(200);

    expect(res.body.data.email).toBe(email);
  });

  // ST-5: Log a period start followed by a later start -> previous cycle closed, cycle length computed
  it('logs a period start, then a later start, closing the previous cycle with a computed cycle length', async () => {
    const firstStart = await request(server)
      .post('/api/v1/period-cycles/period/start')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ periodStartDate: '2026-01-01' })
      .expect(201);

    firstCycleId = firstStart.body.data.id;

    await request(server)
      .post('/api/v1/period-cycles/period/start')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ periodStartDate: '2026-01-29' })
      .expect(201);

    const historyRes = await request(server)
      .get('/api/v1/period-cycles/history')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    const closedCycle = historyRes.body.data.find((c: { id: string }) => c.id === firstCycleId);
    expect(closedCycle.endDate).not.toBeNull();
    expect(closedCycle.cycleLength).toBe(28);
  });

  // ST-6: Create two daily logs for the same date -> second attempt rejected as a duplicate
  it('rejects a second daily log for the same date as a duplicate', async () => {
    await request(server)
      .post('/api/v1/daily-logs')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ logDate: '2026-01-29T00:00:00.000Z', flow: 2, stressLevel: 3, sleepHours: 6 })
      .expect(201);

    const dup = await request(server)
      .post('/api/v1/daily-logs')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ logDate: '2026-01-29T00:00:00.000Z', flow: 1 })
      .expect(400);

    expect(dup.body.message).toMatch(/already exists/i);
  });

  // ST-7: Request a prediction after logging several cycles -> dates, phase and confidence returned
  it('returns a prediction with dates, phase and confidence after cycles are logged', async () => {
    const res = await request(server)
      .get('/api/v1/predictions/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(res.body.data.nextPeriodDate).toBeDefined();
    expect(res.body.data.ovulationDate).toBeDefined();
    expect(res.body.data.currentPhase).toEqual(expect.any(String));
    expect(['very_low', 'low', 'medium', 'high']).toContain(res.body.data.confidence);
  });

  // ST-8: Request the PDF report -> a branded PDF is generated and downloaded
  it('downloads a branded clinical PDF report', async () => {
    const res = await request(server)
      .get('/api/v1/reports/me/pdf')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(res.headers['content-type']).toBe('application/pdf');
    expect((res.body as Buffer).subarray(0, 4).toString('utf-8')).toBe('%PDF');
  });

  // ST-9: Reset a forgotten password via OTP -> password updated, existing sessions invalidated
  it('resets a forgotten password via OTP and invalidates existing sessions', async () => {
    await request(server).post('/api/v1/auth/forgot-password').send({ email }).expect(201);

    const resetOtp = await waitForCapturedOtp(`${email}:reset`);

    await request(server).post('/api/v1/auth/reset-password').send({ email, otp: resetOtp, newPassword }).expect(201);

    // the refresh token issued before the reset must no longer work
    await request(server).post('/api/v1/auth/refresh').send({ refreshToken: refreshTokenBeforeReset }).expect(403);

    // the new password logs in fine
    const res = await request(server).post('/api/v1/auth/login').send({ email, password: newPassword }).expect(201);
    expect(res.body.data.accessToken).toEqual(expect.any(String));
  });
});
