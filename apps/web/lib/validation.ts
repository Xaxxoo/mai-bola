import { z } from 'zod';

export const loginSchema = z.object({ phone: z.string().min(10, 'Enter a valid phone number'), password: z.string().min(1, 'Password is required') });
export const payoutAmountSchema = z.object({ amount: z.number().positive('Enter an amount').min(1000, 'Minimum withdrawal is ₦1,000') });
export const bankDestinationSchema = z.object({ bankCode: z.string().min(1, 'Select a bank'), accountNumber: z.string().regex(/^\d{10}$/, 'Enter a valid 10-digit account number') });
export const mobileDestinationSchema = z.object({ providerCode: z.string().min(1, 'Select a provider'), phone: z.string().min(10, 'Enter a valid phone number') });
