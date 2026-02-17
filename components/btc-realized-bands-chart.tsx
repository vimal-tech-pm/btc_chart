"use client";

import { useState } from "react";
import useSWR from "swr";
import {
  Line,
  LineChart,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

interface ChartDataPoint {
  date: number;
  price: number;
  rp: number;
  rp_0_8: number;
  rp_1_25: number;
  rp_1_7: number;
  rp_2_4: number;
  rp_3_2: number;
  sth_rp: number | null;
  lth_rp: number | null;
}

interface ApiResponse {
  data: ChartDataPoint[];
  latestRP: number;
  latestRPDate: string;
  latestSTH: number | null;
  latestLTH: number | null;
  latestPrice: number;
  updatedAt: string;
  source: string;
  priceNote?: string;
}

type ViewMode = "bands" | "holders" | "complete";

const VIEW_LABELS: Record<ViewMode, string> = {
  bands: "Realized Bands",
  holders: "Holder Cohorts",
  complete: "Complete",
};

const VIEW_DESCRIPTIONS: Record<ViewMode, string> = {
  bands: "BTC Price + Realized Price multiplier bands",
  holders: "BTC Price + Short-Term & Long-Term Holder cost basis",
  complete: "All on-chain valuation lines combined",
};

const COLORS = {
  price: "#f59e0b",
  rp: "#7c6fb5",
  rp_0_8: "#4aa8c7",
  rp_1_25: "#7ab648",
  rp_1_7: "#b0a060",
  rp_2_4: "#c47840",
  rp_3_2: "#a03030",
  sth_rp: "#e879a0",
  lth_rp: "#60a5fa",
};

function formatPrice(val: number): string {
  if (val >= 1000) return `$${(val / 1000).toFixed(0)}K`;
  return `$${val}`;
}

function formatDateShort(timestamp: number): string {
  const d = new Date(timestamp);
  return d.getFullYear().toString();
}

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{
    dataKey: string;
    value: number;
    color: string;
    name: string;
  }>;
  label?: number;
}) {
  if (!active || !payload || !label) return null;

  const date = new Date(label);
  const dateStr = date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div className="rounded-lg border border-neutral-700 bg-neutral-900 p-3 shadow-xl">
      <p className="mb-2 text-xs font-medium text-neutral-400">{dateStr}</p>
      {payload
        .filter((entry) => entry.value != null)
        .map((entry) => (
          <div key={entry.dataKey} className="flex items-center gap-2 py-0.5">
            <div
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-xs text-neutral-300">{entry.name}:</span>
            <span className="text-xs font-semibold text-neutral-100">
              ${entry.value.toLocaleString()}
            </span>
          </div>
        ))}
    </div>
  );
}

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to fetch");
  return res.json();
};

export function BTCRealizedBandsChart() {
  const [viewMode, setViewMode] = useState<ViewMode>("complete");

  const {
    data: apiData,
    error,
    isLoading,
  } = useSWR<ApiResponse>("/api/btc-price", fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 300000,
  });

  const chartData = apiData?.data ?? [];

  const hasSTH = chartData.some((d) => d.sth_rp != null);
  const hasLTH = chartData.some((d) => d.lth_rp != null);

  // Determine which lines are visible per view mode
  const showBands = viewMode === "bands" || viewMode === "complete";
  const showHolders = viewMode === "holders" || viewMode === "complete";

  if (isLoading) {
    return (
      <div className="flex h-[400px] items-center justify-center md:h-[520px]">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-neutral-700 border-t-amber-500" />
          <p className="text-sm text-neutral-500">
            Loading live on-chain data...
          </p>
        </div>
      </div>
    );
  }

  if (error && !apiData) {
    return (
      <div className="flex h-[400px] items-center justify-center md:h-[520px]">
        <p className="text-sm text-red-400">
          Failed to load BTC data. Please refresh.
        </p>
      </div>
    );
  }

  const years: number[] = [];
  const currentYear = new Date().getFullYear();
  const dataStartYear = chartData.length > 0
    ? new Date(chartData[0].date).getUTCFullYear() + 1
    : 2019;
  for (let y = dataStartYear; y <= currentYear + 1; y++) {
    years.push(Date.UTC(y, 0, 1));
  }

  // Compute dynamic Y-axis domain from actual data
  const allValues = chartData.flatMap((d) => {
    const vals = [d.price, d.rp_3_2, d.rp_0_8];
    if (d.sth_rp != null) vals.push(d.sth_rp);
    if (d.lth_rp != null) vals.push(d.lth_rp);
    return vals;
  }).filter((v) => v > 0);

  const dataMax = allValues.length > 0 ? Math.max(...allValues) : 200000;
  const dataMin = allValues.length > 0 ? Math.min(...allValues) : 2000;

  // Round to clean boundaries for the log scale
  const LOG_TICKS_POOL = [
    500, 1000, 2000, 4000, 6000, 8000, 10000, 20000, 40000,
    60000, 80000, 100000, 150000, 200000, 300000, 400000, 500000, 750000, 1000000,
  ];

  // Floor the min down one step, ceiling the max up one step
  const yMin = LOG_TICKS_POOL.filter((t) => t <= dataMin).pop() ?? 500;
  const yMax = LOG_TICKS_POOL.find((t) => t >= dataMax * 1.15) ?? 1000000;
  const yTicks = LOG_TICKS_POOL.filter((t) => t >= yMin && t <= yMax);

  return (
    <div className="w-full">
      {/* View Mode Tabs */}
      <div className="mb-5 flex flex-col gap-3">
        <div className="flex items-center gap-1.5 rounded-lg bg-neutral-800/60 p-1" role="tablist" aria-label="Chart view mode">
          {(Object.keys(VIEW_LABELS) as ViewMode[]).map((mode) => (
            <button
              key={mode}
              role="tab"
              aria-selected={viewMode === mode}
              onClick={() => setViewMode(mode)}
              className={`flex-1 rounded-md px-3 py-2 text-xs font-medium transition-all md:text-sm ${
                viewMode === mode
                  ? "bg-neutral-700 text-amber-400 shadow-sm"
                  : "text-neutral-500 hover:text-neutral-300"
              }`}
            >
              {VIEW_LABELS[mode]}
            </button>
          ))}
        </div>
        <p className="px-1 text-[10px] text-neutral-500 md:text-xs">
          {VIEW_DESCRIPTIONS[viewMode]}
        </p>
      </div>

      {/* Legend */}
      <div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-1 px-2 text-[10px] md:text-xs">
        {/* BTC Price -- always visible */}
        <span className="flex items-center gap-1">
          <span
            className="inline-block h-1 w-4 rounded"
            style={{ backgroundColor: COLORS.price }}
          />
          <span className="text-neutral-400">BTC Price</span>
        </span>

        {/* RP band legends */}
        {showBands && (
          <>
            <span className="flex items-center gap-1">
              <span
                className="inline-block h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: "#ef444460" }}
              />
              <span className="text-neutral-400">Red Alert</span>
            </span>
            <span className="flex items-center gap-1">
              <span
                className="inline-block h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: "#22c55e60" }}
              />
              <span className="text-neutral-400">Green Alert</span>
            </span>
            <span className="flex items-center gap-1">
              <span
                className="inline-block h-1 w-4 rounded"
                style={{ backgroundColor: COLORS.rp_3_2 }}
              />
              <span className="text-neutral-400">3.2x RP</span>
            </span>
            <span className="flex items-center gap-1">
              <span
                className="inline-block h-1 w-4 rounded"
                style={{ backgroundColor: COLORS.rp_2_4 }}
              />
              <span className="text-neutral-400">2.4x RP</span>
            </span>
            <span className="flex items-center gap-1">
              <span
                className="inline-block h-1 w-4 rounded"
                style={{ backgroundColor: COLORS.rp }}
              />
              <span className="text-neutral-400">Realized Price</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block h-1 w-4 rounded border border-dashed border-neutral-400" />
              <span className="text-neutral-400">1.7x RP (Mean)</span>
            </span>
            <span className="flex items-center gap-1">
              <span
                className="inline-block h-1 w-4 rounded"
                style={{ backgroundColor: COLORS.rp_0_8 }}
              />
              <span className="text-neutral-400">0.8x RP</span>
            </span>
            <span className="flex items-center gap-1">
              <span
                className="inline-block h-1 w-4 rounded"
                style={{ backgroundColor: COLORS.rp_1_25 }}
              />
              <span className="text-neutral-400">1.25x RP</span>
            </span>
          </>
        )}

        {/* Holder cohort legends */}
        {showHolders && hasSTH && (
          <span className="flex items-center gap-1">
            <span
              className="inline-block h-1 w-4 rounded"
              style={{ backgroundColor: COLORS.sth_rp }}
            />
            <span className="text-neutral-400">STH RP</span>
          </span>
        )}
        {showHolders && hasLTH && (
          <span className="flex items-center gap-1">
            <span
              className="inline-block h-1 w-4 rounded"
              style={{ backgroundColor: COLORS.lth_rp }}
            />
            <span className="text-neutral-400">LTH RP</span>
          </span>
        )}
      </div>

      <ResponsiveContainer
        width="100%"
        height={400}
        className="md:!h-[520px]"
      >
        <LineChart
          data={chartData}
          margin={{ top: 10, right: 12, left: 0, bottom: 10 }}
        >
          <defs>
            <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.1} />
              <stop offset="100%" stopColor="#f59e0b" stopOpacity={0} />
            </linearGradient>
          </defs>

          <XAxis
            dataKey="date"
            type="number"
            domain={["dataMin", "dataMax"]}
            ticks={years}
            tickFormatter={formatDateShort}
            stroke="#525252"
            tick={{ fill: "#a3a3a3", fontSize: 11 }}
            axisLine={{ stroke: "#404040" }}
            tickLine={{ stroke: "#404040" }}
          />
          <YAxis
            scale="log"
            domain={[yMin, yMax]}
            ticks={yTicks}
            tickFormatter={formatPrice}
            stroke="#525252"
            tick={{ fill: "#a3a3a3", fontSize: 10 }}
            axisLine={{ stroke: "#404040" }}
            tickLine={{ stroke: "#404040" }}
            width={52}
          />

          <Tooltip content={<CustomTooltip />} />

          {/* ── RP Band lines (visible in "bands" and "complete") ── */}
          {showBands && (
            <Line
              type="monotone"
              dataKey="rp_3_2"
              stroke={COLORS.rp_3_2}
              strokeWidth={1.5}
              dot={false}
              name="3.2x RP"
              activeDot={false}
            />
          )}
          {showBands && (
            <Line
              type="monotone"
              dataKey="rp_2_4"
              stroke={COLORS.rp_2_4}
              strokeWidth={1.5}
              dot={false}
              name="2.4x RP"
              activeDot={false}
            />
          )}
          {showBands && (
            <Line
              type="monotone"
              dataKey="rp_1_7"
              stroke={COLORS.rp_1_7}
              strokeWidth={1.5}
              strokeDasharray="5 3"
              dot={false}
              name="1.7x RP (Mean)"
              activeDot={false}
            />
          )}
          {showBands && (
            <Line
              type="monotone"
              dataKey="rp_1_25"
              stroke={COLORS.rp_1_25}
              strokeWidth={2}
              dot={false}
              name="1.25x RP"
              activeDot={false}
            />
          )}
          {showBands && (
            <Line
              type="monotone"
              dataKey="rp"
              stroke={COLORS.rp}
              strokeWidth={2}
              dot={false}
              name="Realized Price"
              activeDot={false}
            />
          )}
          {showBands && (
            <Line
              type="monotone"
              dataKey="rp_0_8"
              stroke={COLORS.rp_0_8}
              strokeWidth={1.5}
              dot={false}
              name="0.8x RP"
              activeDot={false}
            />
          )}

          {/* ── Holder Cohort lines (visible in "holders" and "complete") ── */}
          {showHolders && hasSTH && (
            <Line
              type="monotone"
              dataKey="sth_rp"
              stroke={COLORS.sth_rp}
              strokeWidth={viewMode === "holders" ? 2 : 1}
              strokeDasharray={viewMode === "holders" ? undefined : "3 2"}
              dot={false}
              name="STH Realized Price"
              activeDot={false}
              connectNulls
            />
          )}
          {showHolders && hasLTH && (
            <Line
              type="monotone"
              dataKey="lth_rp"
              stroke={COLORS.lth_rp}
              strokeWidth={viewMode === "holders" ? 2 : 1}
              strokeDasharray={viewMode === "holders" ? undefined : "3 2"}
              dot={false}
              name="LTH Realized Price"
              activeDot={false}
              connectNulls
            />
          )}

          {/* ── BTC Price (always visible) ── */}
          <Line
            type="monotone"
            dataKey="price"
            stroke="#f59e0b"
            strokeWidth={2}
            dot={false}
            name="BTC Price"
            activeDot={{ r: 4, fill: "#f59e0b" }}
          />
        </LineChart>
      </ResponsiveContainer>

      {/* Current values bar */}
      {apiData && (
        <div className="mt-4 space-y-3">
          <div className="flex flex-wrap items-center justify-center gap-4 rounded-lg bg-neutral-800/50 px-4 py-3 text-xs md:text-sm">
            {/* BTC Price -- always shown */}
            <div className="flex items-center gap-2">
              <span className="text-neutral-400">BTC Price:</span>
              <span className="font-semibold text-amber-400">
                ${apiData.latestPrice.toLocaleString()}
              </span>
            </div>

            {/* RP band values */}
            {showBands && (
              <>
                <div className="flex items-center gap-2">
                  <span className="text-neutral-400">Realized Price:</span>
                  <span className="font-semibold text-purple-400">
                    ${apiData.latestRP.toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-neutral-400">1.25x RP:</span>
                  <span className="font-semibold text-green-400">
                    ${Math.round(apiData.latestRP * 1.25).toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-neutral-400">0.8x RP:</span>
                  <span className="font-semibold text-cyan-400">
                    ${Math.round(apiData.latestRP * 0.8).toLocaleString()}
                  </span>
                </div>
              </>
            )}

            {/* Holder cohort values */}
            {showHolders && apiData.latestSTH && (
              <div className="flex items-center gap-2">
                <span className="text-neutral-400">STH RP:</span>
                <span className="font-semibold text-pink-400">
                  ${apiData.latestSTH.toLocaleString()}
                </span>
              </div>
            )}
            {showHolders && apiData.latestLTH && (
              <div className="flex items-center gap-2">
                <span className="text-neutral-400">LTH RP:</span>
                <span className="font-semibold text-blue-400">
                  ${apiData.latestLTH.toLocaleString()}
                </span>
              </div>
            )}
          </div>
          <div className="flex flex-col items-center gap-1 text-[10px] text-neutral-600">
            <div className="flex flex-wrap items-center justify-center gap-2">
              <span>
                Data: {apiData.source}
              </span>
              <span>|</span>
              <span>
                RP as of{" "}
                {new Date(apiData.latestRPDate).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </span>
              <span>|</span>
              <span>
                Updated{" "}
                {new Date(apiData.updatedAt).toLocaleTimeString("en-US", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>
            {apiData.priceNote && (
              <span className="text-neutral-600/70">{apiData.priceNote}</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
