export function paginate(value: string | undefined, total: number, pageSize = 25) {
  const parsed = Number(value);
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const requested = Number.isSafeInteger(parsed) && parsed > 0 ? parsed : 1;
  const page = Math.min(requested, pages);
  return { page, pages, skip: (page - 1) * pageSize, take: pageSize, total };
}
