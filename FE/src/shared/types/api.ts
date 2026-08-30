export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string | Record<string, unknown> | null;
}

export interface PaginationParams {
  page_id?: number;
  page_size?: number;
  search?: string;
  status?: string;
}

export interface PaginatedResult<T> {
  items: T[];
  total?: number;
  page_id: number;
  page_size: number;
}
