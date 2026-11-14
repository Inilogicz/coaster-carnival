import { z } from 'zod';
import { daysInMonth } from './zodiac';

const phone = z.string().trim().regex(/^[+0-9 ()-]{7,25}$/, 'Enter a phone number with 7–25 characters, using numbers, spaces, +, brackets or hyphens.');

export const GENDERS = ['Female', 'Male', 'Non-binary', 'Self-described', 'Prefer not to say'] as const;

export const registrationSchema = z
  .object({
    ticketTypeId: z.string().min(1, 'Choose a ticket.'),
    fullName: z.string().trim().min(2, 'Please enter your name.').max(100),
    email: z.string().trim().toLowerCase().pipe(z.email('Enter a valid email address.').max(254)),
    phone,
    gender: z.enum(GENDERS, { message: 'Select your gender.' }),
    birthMonth: z.coerce.number().int().min(1).max(12),
    birthDay: z.coerce.number().int().min(1).max(31),
    emergencyContact: phone,
    instagram: z
      .string()
      .trim()
      .regex(/^@?[A-Za-z0-9_.]{1,30}$/, 'Use a valid Instagram handle: letters, numbers, periods and underscores.')
      .optional()
      .or(z.literal('').transform(() => undefined)),
    termsAccepted: z.union([z.literal('on'), z.literal(true)], { message: 'Please accept the no-refund policy.' }),
  })
  .refine((v) => v.birthDay <= daysInMonth(v.birthMonth), { message: 'Choose a valid birthday.', path: ['birthDay'] });

export type RegistrationInput = z.infer<typeof registrationSchema>;

// One verified buyer pays for up to ten individually assigned guests.
export const bookingSchema = registrationSchema.safeExtend({
  guests: z.array(z.object(registrationSchema.shape).omit({ email: true, ticketTypeId: true, termsAccepted: true }).refine((v) => v.birthDay <= daysInMonth(v.birthMonth), { message: 'Choose a valid guest birthday.', path: ['birthDay'] })).max(9).default([]),
});
export type BookingInput = z.infer<typeof bookingSchema>;
