import { z } from 'zod';

export const envSchema = z.object({
  VITE_API_BASE_URL: z.string().min(1, 'VITE_API_BASE_URL is required'),
});

export function parseEnv(source: unknown) {
  const result = envSchema.safeParse(source);

  if (!result.success) {
    const issues = result.error.issues
      .map((issue) => `- ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');
    throw new Error(`Invalid environment variables:\n${issues}`);
  }

  return result.data;
}

export const env = parseEnv(import.meta.env);
