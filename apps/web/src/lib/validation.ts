import { z } from '@tnsi/validation';
import { practiceContentTypeEnum } from '@tnsi/db/schema';

export const practiceContentType = z.enum(practiceContentTypeEnum.enumValues);

export const checkInSchema = z.object({
  moodScore: z.number().int().min(1).max(5),
  capacityScore: z.number().int().min(1).max(5),
  notes: z.string().max(2000).optional(),
  completedAt: z.string().datetime().optional(),
});

export type CheckInInput = z.infer<typeof checkInSchema>;

export const practiceCompletionSchema = z.object({
  progressPct: z.number().min(0).max(1).optional(),
  positionSeconds: z.number().int().min(0).optional(),
  completed: z.boolean().optional(),
  playCount: z.number().int().min(0).optional(),
});

export type PracticeCompletionInput = z.infer<typeof practiceCompletionSchema>;

export const practiceIdParam = z.object({
  id: z.string().uuid(),
});

export type PracticeIdParam = z.infer<typeof practiceIdParam>;
