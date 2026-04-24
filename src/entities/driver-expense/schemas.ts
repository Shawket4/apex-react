import { z } from 'zod';

/* -------------------------------------------------------------------------- */
/* Wire shape — matches the Go backend response for GET /api/GetDriverExpenses */
/* -------------------------------------------------------------------------- */

export const driverExpenseSchema = z.object({
  ID: z.coerce.number(),
  CreatedAt: z.string().optional().nullable(),
  UpdatedAt: z.string().optional().nullable(),
  DeletedAt: z.string().optional().nullable(),
  driver_id: z.coerce.number(),
  date: z.string(),
  cost: z.coerce.number(),
  category: z.string().optional().default(''),
  description: z.string().optional().default(''),
  payment_method: z.string().optional().default(''),
  is_paid: z.coerce.boolean().optional().default(false),
});

export type DriverExpense = z.infer<typeof driverExpenseSchema>;

export const driverExpensesResponseSchema = z.array(driverExpenseSchema);

/* -------------------------------------------------------------------------- */
/* Form shape                                                                  */
/* -------------------------------------------------------------------------- */

export const expenseFormSchema = z.object({
  cost: z.coerce.number().positive('Enter a valid amount'),
  date: z.string().min(1, 'Select a date'),
  category: z.string().optional().default(''),
  description: z.string().optional().default(''),
  payment_method: z.string().optional().default('Cash'),
});

export type ExpenseFormValues = z.infer<typeof expenseFormSchema>;

/* -------------------------------------------------------------------------- */
/* API payload — POST /api/RegisterDriverExpense                              */
/* -------------------------------------------------------------------------- */

export interface AddExpensePayload {
  expense: {
    driver_id: number;
    cost: number;
    date: string;
    category: string;
    description: string;
    payment_method: string;
  };
}

/* -------------------------------------------------------------------------- */
/* Constants                                                                   */
/* -------------------------------------------------------------------------- */

export const EXPENSE_CATEGORIES = [
  'Fuel',
  'Maintenance',
  'Repairs',
  'Insurance',
  'Tickets',
  'Tolls',
  'Parking',
  'Meals',
  'Accommodation',
  'Phone',
  'Equipment',
  'Supplies',
  'Training',
  'Other',
] as const;

export const PAYMENT_METHODS = [
  'Cash',
  'Credit Card',
  'Debit Card',
  'Mobile Payment',
  'Bank Transfer',
  'Company Card',
  'Reimbursement',
  'Other',
] as const;
