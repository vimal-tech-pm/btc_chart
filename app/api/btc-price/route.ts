import { NextResponse } from "next/server";

// ── Live on-chain data sources (all free, no auth required) ──────────────────

/**
 * BGeometrics – free Bitcoin on-chain JSON files
 * Returns arrays of [timestampMs, value] pairs with daily granularity going
 * back to ~2011.
 */
async function fetchBGeometricsMetric(
  metric: string
): Promise<[number, number][] | null> {
  try {
    const res = await fetch(
      `https://charts.bgeometrics.com/files/${metric}.json`,
      {
        headers: { "User-Agent": "Mozilla/5.0", Accept: "application/json" },
        signal: AbortSignal.timeout(15000),
        next: { revalidate: 3600 }, // cache 1 hour
      }
    );
    if (!res.ok) return null;
    const json: [number, number][] = await res.json();
    if (!Array.isArray(json) || json.length === 0) return null;
    return json;
  } catch {
    return null;
  }
}

/**
 * Blockchain.info – free BTC historical market price (UNIX seconds → USD)
 */
async function fetchBlockchainInfoPrices(): Promise<
  { x: number; y: number }[] | null
> {
  try {
    const res = await fetch(
      "https://api.blockchain.info/charts/market-price?timespan=all&format=json&cors=true",
      {
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(15000),
        next: { revalidate: 3600 },
      }
    );
    if (!res.ok) return null;
    const json = await res.json();
    if (json.status === "ok" && Array.isArray(json.values)) {
      return json.values as { x: number; y: number }[];
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * CoinPaprika – free live BTC spot price
 */
async function fetchLivePrice(): Promise<number | null> {
  try {
    const res = await fetch(
      "https://api.coinpaprika.com/v1/tickers/btc-bitcoin",
      {
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(8000),
      }
    );
    if (!res.ok) return null;
    const json = await res.json();
    return json?.quotes?.USD?.price ?? null;
  } catch {
    return null;
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Given the raw [timestampMs, value][] array from BGeometrics, build a Map
 * keyed by the start-of-day timestamp (ms) for O(1) lookups.
 */
function buildDayMap(raw: [number, number][]): Map<number, number> {
  const map = new Map<number, number>();
  for (const [ts, val] of raw) {
    // Normalise to midnight UTC
    const day = new Date(ts);
    day.setUTCHours(0, 0, 0, 0);
    map.set(day.getTime(), val);
  }
  return map;
}

/**
 * For a given timestamp (ms) find the closest RP value in the dayMap.
 * Falls back to the last known value if exact day is missing.
 */
function lookupRP(
  dayMap: Map<number, number>,
  sortedKeys: number[],
  timestampMs: number
): number | null {
  // Normalise to midnight
  const d = new Date(timestampMs);
  d.setUTCHours(0, 0, 0, 0);
  const dayTs = d.getTime();

  const exact = dayMap.get(dayTs);
  if (exact !== undefined) return exact;

  // Binary-search for the closest earlier key
  let lo = 0;
  let hi = sortedKeys.length - 1;
  let best = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (sortedKeys[mid] <= dayTs) {
      best = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  if (best >= 0) return dayMap.get(sortedKeys[best]) ?? null;
  return null;
}

// ── Route handler ────────────────────────────────────────────────────────────

export async function GET() {
  try {
    // Fire all network requests in parallel
    const [realizedPriceRaw, sthRPRaw, lthRPRaw, historicalPrices, livePrice] =
      await Promise.all([
        fetchBGeometricsMetric("realized_price"),
        fetchBGeometricsMetric("sth_realized_price"),
        fetchBGeometricsMetric("lth_realized_price"),
        fetchBlockchainInfoPrices(),
        fetchLivePrice(),
      ]);

    if (!realizedPriceRaw || realizedPriceRaw.length < 100) {
      return NextResponse.json(
        { error: "Failed to fetch on-chain realized price data" },
        { status: 502 }
      );
    }

    if (!historicalPrices || historicalPrices.length < 100) {
      return NextResponse.json(
        { error: "Failed to fetch historical BTC price data" },
        { status: 502 }
      );
    }

    // Build lookup maps for realized price data
    const rpMap = buildDayMap(realizedPriceRaw);
    const rpKeys = [...rpMap.keys()].sort((a, b) => a - b);

    const sthMap = sthRPRaw && sthRPRaw.length > 0 ? buildDayMap(sthRPRaw) : null;
    const sthKeys = sthMap && sthMap.size > 0 ? [...sthMap.keys()].sort((a, b) => a - b) : null;

    const lthMap = lthRPRaw && lthRPRaw.length > 0 ? buildDayMap(lthRPRaw) : null;
    const lthKeys = lthMap && lthMap.size > 0 ? [...lthMap.keys()].sort((a, b) => a - b) : null;

    // Filter to 2018+ and sample
    const startDate = Date.UTC(2018, 0, 1) / 1000;
    const filtered = historicalPrices.filter(
      (d) => d.x >= startDate && d.y > 0
    );
    const sampled = filtered.filter((_, i) => i % 4 === 0);
    const lastHistorical = filtered[filtered.length - 1];
    if (
      sampled.length > 0 &&
      sampled[sampled.length - 1].x !== lastHistorical.x
    ) {
      sampled.push(lastHistorical);
    }

    // Build chart data with live RP values
    const chartData = sampled.map((d) => {
      const tsMs = d.x * 1000;
      const rp = lookupRP(rpMap, rpKeys, tsMs) ?? 0;
      const sthRP =
        sthMap && sthKeys ? lookupRP(sthMap, sthKeys, tsMs) : null;
      const lthRP =
        lthMap && lthKeys ? lookupRP(lthMap, lthKeys, tsMs) : null;

      return {
        date: tsMs,
        price: Math.round(d.y),
        rp: Math.round(rp),
        rp_0_8: Math.round(rp * 0.8),
        rp_1_25: Math.round(rp * 1.25),
        rp_1_7: Math.round(rp * 1.7),
        rp_2_4: Math.round(rp * 2.4),
        rp_3_2: Math.round(rp * 3.2),
        sth_rp: sthRP ? Math.round(sthRP) : null,
        lth_rp: lthRP ? Math.round(lthRP) : null,
      };
    });

    // Latest RP value (last entry in on-chain data)
    const latestRPEntry = realizedPriceRaw[realizedPriceRaw.length - 1];
    const latestRP = Math.round(latestRPEntry[1]);
    const latestRPDate = new Date(latestRPEntry[0]).toISOString();

    const latestSTH = sthRPRaw && sthRPRaw.length > 0
      ? Math.round(sthRPRaw[sthRPRaw.length - 1][1])
      : null;
    const latestLTH = lthRPRaw && lthRPRaw.length > 0
      ? Math.round(lthRPRaw[lthRPRaw.length - 1][1])
      : null;

    // Current live price
    const currentPrice =
      livePrice ??
      lastHistorical?.y ??
      chartData[chartData.length - 1]?.price ??
      0;

    // Append or update last point with live price
    if (livePrice && chartData.length > 0) {
      const now = Date.now();
      const lastChartTs = chartData[chartData.length - 1].date;
      const rp = lookupRP(rpMap, rpKeys, now) ?? latestRP;
      const sthRP =
        sthMap && sthKeys ? lookupRP(sthMap, sthKeys, now) : latestSTH;
      const lthRP =
        lthMap && lthKeys ? lookupRP(lthMap, lthKeys, now) : latestLTH;

      const livePoint = {
        date: now,
        price: Math.round(livePrice),
        rp: Math.round(rp),
        rp_0_8: Math.round(rp * 0.8),
        rp_1_25: Math.round(rp * 1.25),
        rp_1_7: Math.round(rp * 1.7),
        rp_2_4: Math.round(rp * 2.4),
        rp_3_2: Math.round(rp * 3.2),
        sth_rp: sthRP ? Math.round(sthRP) : null,
        lth_rp: lthRP ? Math.round(lthRP) : null,
      };

      if (now - lastChartTs > 12 * 60 * 60 * 1000) {
        chartData.push(livePoint);
      } else {
        chartData[chartData.length - 1] = livePoint;
      }
    }

    return NextResponse.json({
      data: chartData,
      latestRP,
      latestRPDate,
      latestSTH,
      latestLTH,
      latestPrice: Math.round(currentPrice),
      updatedAt: new Date().toISOString(),
      source: "BGeometrics (on-chain) + Blockchain.info (full history) + CoinPaprika (live)",
      priceNote: "Historical BTC price is daily average from Blockchain.info; live spot price from CoinPaprika",
      dataPoints: chartData.length,
    });
  } catch (error) {
    console.error("BTC price data error:", error);
    return NextResponse.json(
      { error: "Internal server error fetching BTC data" },
      { status: 500 }
    );
  }
}
