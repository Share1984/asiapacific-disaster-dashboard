export interface TrendPoint {
  x: number;
  y: number;
}

export function computeLinearRegression(points: TrendPoint[]): {
  slope: number;
  intercept: number;
} {
  const n = points.length;
  if (n === 0) {
    return { slope: 0, intercept: 0 };
  }
  if (n === 1) {
    return { slope: 0, intercept: points[0].y };
  }

  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumX2 = 0;

  for (const point of points) {
    sumX += point.x;
    sumY += point.y;
    sumXY += point.x * point.y;
    sumX2 += point.x * point.x;
  }

  const denominator = n * sumX2 - sumX * sumX;
  if (denominator === 0) {
    return { slope: 0, intercept: sumY / n };
  }

  const slope = (n * sumXY - sumX * sumY) / denominator;
  const intercept = (sumY - slope * sumX) / n;

  return { slope, intercept };
}

export function trendValue(
  year: number,
  regression: { slope: number; intercept: number },
): number {
  return regression.slope * year + regression.intercept;
}

export function addTrendField<T extends { year: number }>(
  data: T[],
  valueKey: keyof T & string,
  trendKey: string,
): Array<T & Record<string, number>> {
  if (data.length === 0) {
    return [];
  }

  const points = data.map((row) => ({
    x: row.year,
    y: Number(row[valueKey] ?? 0),
  }));
  const regression = computeLinearRegression(points);

  return data.map((row) => ({
    ...row,
    [trendKey]: trendValue(row.year, regression),
  }));
}

export function addMultiTrendFields<T extends { year: number }>(
  data: T[],
  valueKeys: string[],
  trendSuffix = "Trend",
): Array<T & Record<string, number>> {
  if (data.length === 0) {
    return [];
  }

  const regressions = valueKeys.map((key) => ({
    key,
    trendKey: `${key}${trendSuffix}`,
    regression: computeLinearRegression(
      data.map((row) => ({
        x: row.year,
        y: Number((row as Record<string, number>)[key] ?? 0),
      })),
    ),
  }));

  return data.map((row) => {
    const trendValues: Record<string, number> = {};
    for (const { trendKey, regression } of regressions) {
      trendValues[trendKey] = trendValue(row.year, regression);
    }
    return { ...row, ...trendValues };
  });
}
