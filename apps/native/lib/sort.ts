/** Stable insertion sort — used for DnD reorder and widget/tag ordering */
export const sortItems = <T>(
  items: T[],
  compare: (left: T, right: T) => number
): T[] => {
  const result = [...items];
  for (let index = 1; index < result.length; index += 1) {
    const item = result[index];
    let cursor = index - 1;
    while (cursor >= 0 && compare(result[cursor] as T, item as T) > 0) {
      result[cursor + 1] = result[cursor] as T;
      cursor -= 1;
    }
    result[cursor + 1] = item as T;
  }
  return result;
};

/** Convert DnD positions record to ordered ID array */
export const getOrderedIdsFromPositions = (
  positions?: Record<string, number>
): string[] =>
  sortItems(
    Object.entries(positions ?? {}),
    (left, right) => left[1] - right[1]
  ).map(([id]) => id);
