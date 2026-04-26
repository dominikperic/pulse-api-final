/** Split "customer.email", "items[0].sku" into key / index segments. */
export function parsePath(path) {
  if (!path || typeof path !== 'string') return [];
  return path.split('.').flatMap((seg) => {
    const m = /^(.+)\[(\d+)\]$/.exec(seg);
    if (m) return [m[1], Number(m[2])];
    return [seg];
  });
}

/** Read value from object/array by path. */
export function getByPath(root, path) {
  const parts = parsePath(path);
  let cur = root;
  for (const p of parts) {
    if (cur == null) return undefined;
    cur = cur[p];
  }
  return cur;
}
