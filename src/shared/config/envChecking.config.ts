import { z } from 'zod';
export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production']),
  PORT: z.string().default('4000'),

  POSTGRES_HOST: z.string(),
  POSTGRES_PORT: z.string().default('5432'),
  POSTGRES_USER: z.string(),
  POSTGRES_PASSWORD: z.string(),
  POSTGRES_DB: z.string(),
  POSTGRES_SSL: z
    .string()
    .default('false')
    .transform((val) => val === 'true'),

  JWT_SECRET: z.string(),
  JWT_EXPIRES_IN: z.string(),
  JWT_REFRESH_SECRET: z.string(),
  JWT_REFRESH_EXPIRES_IN: z.string(),

  SMTP_HOST: z.string(),
  SMTP_PORT: z.string().default('587'),
  SMTP_USER: z.string(),
  SMTP_PASSWORD: z.string(),
  SMTP_FROM: z.string().default('Flora <noreply@flora.app>'),

  FIREBASE_PROJECT_ID: z.string(),
  FIREBASE_CLIENT_EMAIL: z.string(),
  FIREBASE_PRIVATE_KEY: z.string(),
});

export type EnvConfig = z.infer<typeof envSchema>;
