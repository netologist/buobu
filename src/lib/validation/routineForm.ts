import { z } from 'zod';

const recurrenceTypeSchema = z.enum(['daily', 'weekly', 'monthly', 'yearly', 'custom']);
const routineTypeSchema = z.enum(['task', 'event', 'payment']);
const paymentTypeSchema = z.enum(['income', 'expense']);

/** Base schema without cross-field rules — used as the zodResolver schema so react-hook-form
 *  handles field-level validation. Cross-field rules (e.g. event time required) are enforced
 *  synchronously inside the submit handler via setError so they work reliably in tests. */
export const routineFormBaseSchema = z.object({
    title: z.string().trim().min(1, 'Title is required'),
    description: z.string().optional().default(''),
    routineType: routineTypeSchema,
    recurrenceType: recurrenceTypeSchema,
    interval: z.number().int().min(1, 'Interval must be at least 1'),
    daysOfWeek: z.array(z.number().int().min(0).max(6)).default([]),
    dayOfMonth: z.number().int().min(1).max(31).optional(),
    monthOfYear: z.number().int().min(1).max(12).optional(),
    endDate: z.string().optional().default(''),
    eventTime: z.string().optional().default(''),
    paymentAmount: z.number().positive('Amount must be greater than 0').optional(),
    paymentType: paymentTypeSchema,
    paymentNote: z.string().optional().default(''),
    boardId: z.string().trim().min(1, 'Select a board before creating a routine'),
    swimlaneId: z.string().trim().min(1, 'Select a lane before creating a routine'),
    timeblockId: z.string().nullable().optional(),
  });

export const routineFormSchema = routineFormBaseSchema.superRefine((data, ctx) => {
    if (data.routineType === 'event' && !data.eventTime) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['eventTime'],
        message: 'Event time is required',
      });
    }

    if (data.routineType === 'payment' && data.paymentAmount == null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['paymentAmount'],
        message: 'Amount is required',
      });
    }

    if (data.recurrenceType === 'weekly' && data.daysOfWeek.length === 0 && !data.timeblockId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['daysOfWeek'],
        message: 'Select at least one weekday',
      });
    }

    if ((data.recurrenceType === 'monthly' || data.recurrenceType === 'yearly') && data.dayOfMonth == null && !data.timeblockId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['dayOfMonth'],
        message: 'Day of month is required',
      });
    }

    if (data.recurrenceType === 'yearly' && data.monthOfYear == null && !data.timeblockId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['monthOfYear'],
        message: 'Month is required',
      });
    }
  });

/** Output type (after zod defaults/transforms) — used in submit handlers */
export type RoutineFormValues = z.output<typeof routineFormSchema>;
/** Input type (before defaults) — used as useForm TFieldValues in @hookform/resolvers v5 */
export type RoutineFormInput = z.input<typeof routineFormSchema>;
