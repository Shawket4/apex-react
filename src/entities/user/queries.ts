import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as api from './api';

export const userKeys = {
  all: ['users'] as const,
  list: () => [...userKeys.all, 'list'] as const,
};

/**
 * Hook to fetch all users.
 */
export function useUsers() {
  return useQuery({
    queryKey: userKeys.list(),
    queryFn: api.fetchUsers,
  });
}

/**
 * Hook to register a new user.
 */
export function useRegisterUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.registerUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.all });
    },
  });
}

/**
 * Hook to update an existing user.
 */
export function useUpdateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.updateUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.all });
    },
  });
}

/**
 * Hook to delete a user.
 */
export function useDeleteUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.deleteUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.all });
    },
  });
}
