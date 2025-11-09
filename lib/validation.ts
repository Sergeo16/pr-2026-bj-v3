import { z } from 'zod';

export const voteSchema = z.object({
  fullName: z.string().min(1).max(200).trim(),
  duoId: z.number().int().positive(),
  departementId: z.number().int().positive(),
  communeId: z.number().int().positive(),
  arrondissementId: z.number().int().positive(),
  villageId: z.number().int().positive(),
  centreId: z.number().int().positive(),
  count: z.number().int().min(0),
});

export type VoteInput = z.infer<typeof voteSchema>;

export function sanitizeString(input: string): string {
  return input
    .trim()
    .replace(/[<>]/g, '')
    .substring(0, 200);
}

export function sanitizeNumber(input: unknown): number {
  const num = Number(input);
  if (isNaN(num) || !isFinite(num)) {
    throw new Error('Invalid number');
  }
  return Math.floor(Math.abs(num));
}

