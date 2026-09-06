/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║  GRIDS THAT SURVIVE THE ADMIN PANEL                                      ║
 * ║                                                                          ║
 * ║  Every list on the site — packages, promises, quotes, mediums, delivery  ║
 * ║  options — is now edited from /admin, so its length is no longer known   ║
 * ║  when the layout is written. A hard-coded `lg:grid-cols-4` looks right   ║
 * ║  with exactly four packages and broken with three or five.               ║
 * ║                                                                          ║
 * ║  `gridColumns()` picks a column count from the actual number of items.   ║
 * ║                                                                          ║
 * ║  ⚠️ The class strings below are written out in full on purpose. Tailwind ║
 * ║  scans source text, so a computed string like `lg:grid-cols-${n}` would  ║
 * ║  never be generated and the grid would silently collapse to one column.  ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

const COLUMNS: Record<number, string> = {
  1: 'sm:grid-cols-1 lg:grid-cols-1',
  2: 'sm:grid-cols-2 lg:grid-cols-2',
  3: 'sm:grid-cols-2 lg:grid-cols-3',
  4: 'sm:grid-cols-2 lg:grid-cols-4',
};

/** Two-up on phones — used where the items are short enough to pair. */
const COLUMNS_DENSE: Record<number, string> = {
  1: 'grid-cols-1',
  2: 'grid-cols-2',
  3: 'grid-cols-2 lg:grid-cols-3',
  4: 'grid-cols-2 lg:grid-cols-4',
};

/**
 * How many columns to use for `count` items, never more than `max`.
 *
 * Above `max` it prefers a narrower grid when that avoids stranding a single
 * item on the last row: five cards read better as 3 + 2 than as 4 + 1.
 */
export function columnCount(count: number, max = 4): number {
  if (count <= 0) return 1;
  if (count <= max) return count;

  for (let cols = max; cols >= 2; cols -= 1) {
    const remainder = count % cols;
    if (remainder === 0 || remainder >= 2) return cols;
  }

  return max;
}

/** Responsive grid classes for a list of `count` items. */
export function gridColumns(count: number, max = 4): string {
  return COLUMNS[columnCount(count, max)] ?? COLUMNS[4];
}

/** As above, but two-up on phones rather than stacked. */
export function gridColumnsDense(count: number, max = 4): string {
  return COLUMNS_DENSE[columnCount(count, max)] ?? COLUMNS_DENSE[4];
}
