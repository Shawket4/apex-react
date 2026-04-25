import { apiClient } from '@/shared/api/client';
import {
  companiesResponseSchema,
  dropOffsResponseSchema,
  terminalsResponseSchema,
  type CompaniesResponse,
  type DropOffsResponse,
  type TerminalsResponse,
} from './schemas';

export const mappingApi = {
  async companies(): Promise<CompaniesResponse> {
    const { data } = await apiClient.get('/api/mappings/companies');
    return companiesResponseSchema.parse(data);
  },

  async terminals(company: string): Promise<TerminalsResponse> {
    const { data } = await apiClient.get(
      `/api/mappings/terminals/${encodeURIComponent(company)}`,
    );
    return terminalsResponseSchema.parse(data);
  },

  async dropOffs(company: string, terminal: string): Promise<DropOffsResponse> {
    const { data } = await apiClient.get(
      `/api/mappings/dropoffs/${encodeURIComponent(company)}/${encodeURIComponent(terminal)}`,
    );
    return dropOffsResponseSchema.parse(data);
  },
};
