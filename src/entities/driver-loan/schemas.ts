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
  /**
   * What this money actually is. All three subtract identically; they differ in
   * meaning. Defaults to 'advance' because every row predating the column is
   * one -- there were no genuine loans in the data.
   */
  kind: z.enum(['advance', 'loan', 'salary']).catch('advance').default('advance'),
});

export type DriverLoan = z.infer<typeof driverLoanSchema>;

export const driverLoansResponseSchema = z.array(driverLoanSchema);

/* -------------------------------------------------------------------------- */
/* Form shape                                                                  */
/* -------------------------------------------------------------------------- */

export const loanFormSchema = z.object({
  amount: z.coerce.number().positive('Enter a valid amount'),
  kind: z.enum(['advance', 'loan', 'salary']).default('advance'),
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
    kind?: 'advance' | 'loan' | 'salary';
  };
}
