/**
 * props.route.routes
 * @param router [{}]
 * @param pathname string
 */
export const sorters = {
  operationsSorter: {
    alpha: (a, b) => a.get('path').localeCompare(b.get('path')),
    method: (a, b) => a.get('method').localeCompare(b.get('method')),
  },
  tagsSorter: {
    alpha: (a, b) => a.localeCompare(b),
  },
};
