/**
 * Checks whether a sale is considered "active" (not cancelled).
 * Cancelled sales should be excluded from metrics, targets, and dashboards.
 */
export function isActiveSale(sale: { metadata?: unknown } | null | undefined): boolean {
    if (!sale) return false;
    const meta = sale.metadata as Record<string, unknown> | undefined;
    return meta?.booking_status !== 'cancelled';
}

/**
 * Filters an array of sales to only include active (non-cancelled) entries.
 */
export function filterActiveSales<T extends { metadata?: unknown }>(sales: T[]): T[] {
    return sales.filter(isActiveSale);
}
