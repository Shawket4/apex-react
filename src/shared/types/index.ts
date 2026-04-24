export interface DateRange {
  startDate: Date | null;
  endDate: Date | null;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface SelectOption<T = string | number> {
  value: T;
  label: string;
  description?: string;
  disabled?: boolean;
}

export type AsyncStatus = 'idle' | 'pending' | 'success' | 'error';
