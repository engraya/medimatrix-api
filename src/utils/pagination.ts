export const paging = (q: { page: number; limit: number }) => ({
  skip: (q.page - 1) * q.limit,
  take: q.limit,
});
export const pageMeta = (q: { page: number; limit: number }, total: number) => ({
  page: q.page,
  limit: q.limit,
  total,
  totalPages: Math.ceil(total / q.limit),
});
