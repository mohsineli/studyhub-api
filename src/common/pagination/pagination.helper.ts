export function buildPagination(page = 1, limit = 12): { take: number; skip: number } {
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
