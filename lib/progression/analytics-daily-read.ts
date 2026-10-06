/** Bounded pagination: never present a truncated journal as complete. */
export async function readAnalyticsPages<T>(
  read: (
    from: number,
    to: number,
  ) => PromiseLike<{ data: T[] | null; error: unknown }>,
  pageSize = 500,
  maxRows = 10000,
): Promise<{ data: T[]; error: unknown; truncated: boolean }> {
  const rows: T[] = [];
  try {
    for (let from = 0; from < maxRows; from += pageSize) {
      const result = await read(from, Math.min(from + pageSize, maxRows) - 1);
      if (result.error)
        return { data: [], error: result.error, truncated: false };
      rows.push(...(result.data ?? []));
      if ((result.data?.length ?? 0) < pageSize)
        return { data: rows, error: null, truncated: false };
    }
    return { data: rows, error: null, truncated: true };
  } catch (error) {
    return { data: [], error, truncated: false };
  }
}
