import { apiClient } from '@/shared/api/client';
import {
  driverAnalyticsResponseSchema,
  type DriverAnalyticsParams,
  type DriverAnalyticsResponse,
} from './schemas';

export const driverAnalyticsApi = {
  async get(params: DriverAnalyticsParams): Promise<DriverAnalyticsResponse> {
    const { data } = await apiClient.get('/api/trips/watanya/driver-analytics', {
      params: {
        start_date: params.startDate,
        end_date: params.endDate,
      },
    });
    return driverAnalyticsResponseSchema.parse(data);
  },
};
