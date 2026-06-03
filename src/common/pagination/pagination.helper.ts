import { PAGINATION } from '../constants/defaults';

export function buildPagination(page: number = PAGINATION.DEFAULT_PAGE, limit: number = PAGINATION.DEFAULT_LIMIT): { take: number; skip: number } {
  return { take: limit, skip: (page - 1) * limit };
}

export function wrapPaginated<T>(
  data: T[],
  total: number,
  page: number,
  limit: number,
): { data: T[]; total: number; page: number; limit: number } {
  return { data, total, page, limit };
}
