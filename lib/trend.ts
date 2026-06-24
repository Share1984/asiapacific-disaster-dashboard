export interface TrendPoint {
  x: number;
  y: number;
}

/** Years included in trend regression and trend line display (2026 excluded as partial-year data). */
export const TREND_MAX_YEAR = 2025;

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

function regressionPointsForTrend<T extends { year: number }>(
  data: T[],
  getY: (row: T) => number,
): TrendPoint[] {
  return data
    .filter((row) => row.year <= TREND_MAX_YEAR)
    .map((row) => ({
      x: row.year,
      y: getY(row),
    }));
}

function trendValueForYear(
  year: number,
  regression: { slope: number; intercept: number },
): number | null {
  if (year > TREND_MAX_YEAR) {
    return null;
  }
  return trendValue(year, regression);
}

export function addTrendField<T extends { year: number }>(
  data: T[],
  valueKey: keyof T & string,
  trendKey: string,
): Array<T & Record<string, number | null>> {
  if (data.length === 0) {
    return [];
  }

  const points = regressionPointsForTrend(data, (row) =>
    Number(row[valueKey] ?? 0),
  );
  const regression = computeLinearRegression(points);

  return data.map((row) => ({
    ...row,
    [trendKey]: trendValueForYear(row.year, regression),
  }));
}

export function addMultiTrendFields<T extends { year: number }>(
  data: T[],
  valueKeys: string[],
  trendSuffix = "Trend",
): Array<T & Record<string, number | null>> {
  if (data.length === 0) {
    return [];
  }

  const regressions = valueKeys.map((key) => ({
    key,
    trendKey: `${key}${trendSuffix}`,
    regression: computeLinearRegression(
      regressionPointsForTrend(data, (row) =>
        Number((row as Record<string, number>)[key] ?? 0),
      ),
    ),
  }));

  return data.map((row) => {
    const trendValues: Record<string, number | null> = {};
    for (const { trendKey, regression } of regressions) {
      trendValues[trendKey] = trendValueForYear(row.year, regression);
    }
    return { ...row, ...trendValues };
  });
}
