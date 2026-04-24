import { z } from 'zod';

/* -------------------------------------------------------------------------- */
/* Wire shape — matches the Go backend response for GET /api/GetDriverLoans   */
/* -------------------------------------------------------------------------- */

export const driverLoanSchema = z.object({
  ID: z.coerce.number(),
  CreatedAt: z.string().optional().nullable(),
  UpdatedAt: z.string().optional().nullable(),
  DeletedAt: z.string().optional().nullable(),
  driver_id: z.coerce.number(),
  date: z.string(),
  amount: z.coerce.number(),
  method: z.string().optional().default(''),
  is_paid: z.coerce.boolean().optional().default(false),
});

export type DriverLoan = z.infer<typeof driverLoanSchema>;

export const driverLoansResponseSchema = z.array(driverLoanSchema);

/* -------------------------------------------------------------------------- */
/* Form shape                                                                  */
/* -------------------------------------------------------------------------- */

export const loanFormSchema = z.object({
  amount: z.coerce.number().positive('Enter a valid amount'),
  date: z.string().min(1, 'Select a date'),
  method: z.string().min(1, 'Enter a payment method'),
});

export type LoanFormValues = z.infer<typeof loanFormSchema>;

/* -------------------------------------------------------------------------- */
/* API payload — POST /api/RegisterDriverLoan                                 */
/* -------------------------------------------------------------------------- */

export interface AddLoanPayload {
  driver_id: number;
  loan: {
    date: string;
    amount: number;
    method: string;
  };
}
