import type { ApiResponse } from '../types/interfaces';

export const ok = <T>(data: T, message?: string): ApiResponse<T> => ({
  success: true,
  data,
  message,
});
