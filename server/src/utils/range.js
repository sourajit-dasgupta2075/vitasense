export const RANGE_MINUTES = {
  "1m": 1,
  "10m": 10,
  "1h": 60,
  "24h": 24 * 60
};

export const DEFAULT_RANGE = "1h";

export function resolveRange(rawRange) {
  const range = typeof rawRange === "string" ? rawRange : DEFAULT_RANGE;
  return RANGE_MINUTES[range] ? range : DEFAULT_RANGE;
}

export function getRangeWindow(range) {
  return RANGE_MINUTES[resolveRange(range)];
}
