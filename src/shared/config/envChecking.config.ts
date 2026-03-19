import { z } from 'zod';
export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production']),
  PORT: z.string().default('4000'),

  POSTGRES_HOST: z.string(),
  POSTGRES_PORT: z.string().default('5432'),
  POSTGRES_USER: z.string(),
  POSTGRES_PASSWORD: z.string(),
  POSTGRES_DB: z.string(),

  JWT_SECRET: z.string(),
  JWT_EXPIRES_IN: z.string(),
  JWT_REFRESH_SECRET: z.string(),
  JWT_REFRESH_EXPIRES_IN: z.string(),
});

export type EnvConfig = z.infer<typeof envSchema>;
