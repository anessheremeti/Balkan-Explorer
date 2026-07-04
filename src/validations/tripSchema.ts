import { z } from 'zod';
import { isDestinationAllowed, ALLOWED_COUNTRIES } from '../constants/allowedDestinations';

export const tripSchema = z.object({
  starting_location: z.string().min(1, 'Starting location is required'),
  destination: z
    .string()
    .min(1, 'Destination is required')
    .refine(isDestinationAllowed, {
      message: `Only destinations in ${ALLOWED_COUNTRIES.join(', ')} are supported`,
    }),
  starting_date: z
    .string()
    .min(1, 'Departure date is required')
    .refine(
      date => date >= new Date().toISOString().split('T')[0],
      { message: 'Departure date cannot be in the past' }
    ),
  returning_date: z.string().min(1, 'Return date is required'),
  budget_total: z.number().positive('Budget must be greater at least 500'),
  travelers: z.number().int().min(1).max(20).optional(),
  travel_style: z.string().optional(),
  currency: z.string().optional(),
}).refine(
  ({ starting_date, returning_date }) => returning_date > starting_date,
  { message: 'Return date must be after departure date', path: ['returning_date'] }
);

export type TripFormData = z.infer<typeof tripSchema>;
