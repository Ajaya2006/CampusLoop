export function seriesValue(point) {
  if (typeof point === 'number') return Number.isFinite(point) ? point : 0;
  if (!point || typeof point !== 'object') return 0;
  return Number(point.count ?? point.value ?? point.listed ?? 0) || 0;
}

function listOf(series) {
  return Array.isArray(series) ? series : [];
}

export function toPoints(series = [], key) {
  return listOf(series).map((point) => {
    const value = key ? point?.[key] : seriesValue(point);
    return Number(value) || 0;
  });
}

export function sumSeries(series = []) {
  return listOf(series).reduce((sum, point) => sum + seriesValue(point), 0);
}

export function trendOf(points = []) {
  const values = listOf(points);
  if (values.length < 2) return null;
  const cut = Math.max(1, Math.floor(values.length / 2));
  const previous = values.slice(0, cut).reduce((sum, value) => sum + (Number(value) || 0), 0);
  const current = values.slice(cut).reduce((sum, value) => sum + (Number(value) || 0), 0);
  if (!previous) return current ? 100 : null;
  return Math.round(((current - previous) / previous) * 100);
}
