export const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

export function circleTouchesRect(point, rect, radius = 6) {
  const x = Math.max(rect.x, Math.min(rect.x + rect.w, point.x));
  const y = Math.max(rect.y, Math.min(rect.y + rect.h, point.y));
  return (point.x - x) ** 2 + (point.y - y) ** 2 < radius ** 2;
}

export function canStand(point, map, radius = 6) {
  return Number.isFinite(point.x) && Number.isFinite(point.y) &&
    point.x >= radius && point.y >= radius &&
    point.x <= map.width - radius && point.y <= map.height - radius &&
    !map.collisions.some(rect => circleTouchesRect(point, rect, radius));
}

export function moveSafely(from, dx, dy, map, radius = 6) {
  const point = {...from};
  const steps = Math.max(1, Math.ceil(Math.hypot(dx, dy) / 2));
  for (let i = 0; i < steps; i++) {
    const next = {x: point.x + dx / steps, y: point.y + dy / steps};
    if (canStand(next, map, radius)) { Object.assign(point, next); continue; }
    if (canStand({x: point.x + dx / steps, y: point.y}, map, radius)) point.x += dx / steps;
    if (canStand({x: point.x, y: point.y + dy / steps}, map, radius)) point.y += dy / steps;
  }
  return point;
}

export function clearSegment(from, to, map) {
  const steps = Math.max(1, Math.ceil(distance(from, to) / 3));
  for (let i = 0; i <= steps; i++) {
    if (!canStand({x: from.x + (to.x - from.x) * i / steps,
      y: from.y + (to.y - from.y) * i / steps}, map)) return false;
  }
  return true;
}

function nearbyCell(point, map, step) {
  const cx = Math.round(point.x / step), cy = Math.round(point.y / step);
  for (let ring = 0; ring <= 7; ring++) {
    const candidates = [];
    for (let y = cy - ring; y <= cy + ring; y++) for (let x = cx - ring; x <= cx + ring; x++) {
      if (ring && Math.max(Math.abs(x - cx), Math.abs(y - cy)) !== ring) continue;
      const candidate = {x: x * step, y: y * step};
      if (canStand(candidate, map)) candidates.push(candidate);
    }
    candidates.sort((a, b) => distance(a, point) - distance(b, point));
    if (candidates.length) return candidates[0];
  }
  return null;
}

// A small grid search, followed by visibility smoothing. Paths never cut corners.
export function findPath(from, target, map, step = 8) {
  if (!canStand(from, map)) return null;
  const start = nearbyCell(from, map, step), end = nearbyCell(target, map, step);
  if (!start || !end || !clearSegment(from, start, map)) return null;
  const width = Math.ceil(map.width / step) + 1;
  const key = point => Math.round(point.y / step) * width + Math.round(point.x / step);
  const queue = [start], parents = new Map([[key(start), null]]), points = new Map([[key(start), start]]);
  let cursor = 0;
  while (cursor < queue.length && !parents.has(key(end))) {
    const current = queue[cursor++];
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const next = {x: current.x + dx * step, y: current.y + dy * step};
      const id = key(next);
      if (parents.has(id) || !canStand(next, map) || !clearSegment(current, next, map)) continue;
      parents.set(id, key(current)); points.set(id, next); queue.push(next);
    }
  }
  if (!parents.has(key(end))) return null;
  const raw = [];
  for (let id = key(end); id !== null; id = parents.get(id)) raw.push(points.get(id));
  raw.reverse();
  if (canStand(target, map) && clearSegment(end, target, map)) raw.push({...target});
  const result = [];
  let current = from, index = 0;
  while (index < raw.length) {
    let last = index;
    while (last + 1 < raw.length && clearSegment(current, raw[last + 1], map)) last++;
    result.push(raw[last]); current = raw[last]; index = last + 1;
  }
  return result;
}

export function nearestApproach(from, object, map) {
  return object.approaches.map(point => ({point, path: findPath(from, point, map)}))
    .filter(option => option.path)
    .map(option => ({...option, length: option.path.reduce((sum, point, i, path) =>
      sum + distance(i ? path[i - 1] : from, point), 0)}))
    .sort((a, b) => a.length - b.length)[0] || null;
}
