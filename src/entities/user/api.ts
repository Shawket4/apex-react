import { apiClient } from '@/shared/api/client';
import type { User, UserCreateInput, UserUpdateInput } from './schemas';

/**
 * Fetches all users from the system.
 */
export const fetchUsers = async () => {
  const { data } = await apiClient.get<User[]>('/api/FetchUsers');
  return data;
};

/**
 * Registers a new user.
 */
export const registerUser = async (input: UserCreateInput) => {
  const { data } = await apiClient.post<User>('/api/RegisterUser', input);
  return data;
};

/**
 * Updates an existing user's details or password.
 */
export const updateUser = async (input: UserUpdateInput) => {
  const { data } = await apiClient.patch('/api/UpdateUser', input);
  return data;
};

/**
 * Permanently deletes a user by ID.
 */
export const deleteUser = async (id: number) => {
  await apiClient.delete(`/api/DeleteUser/${id}`);
};
