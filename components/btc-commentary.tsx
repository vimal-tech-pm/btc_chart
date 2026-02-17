"use client";

import useSWR from "swr";
import {
  ArrowDown,
  ArrowUp,
  AlertTriangle,
  Target,
  Info,
  Activity,
} from "lucide-react";

interface ApiResponse {
  latestRP: number;
  latestRPDate: string;
  latestSTH: number | null;
  latestLTH: number | null;
  latestPrice: number;
  updatedAt: string;
  source: string;
}

const BAND_MULTIPLIERS = [
  {
    label: "3.2x RP",
    mult: 3.2,
    color: "bg-red-500/20 text-red-400 border-red-500/30",
    description: "Extreme overheated zone",
  },
  {
    label: "2.4x RP",
    mult: 2.4,
    color: "bg-orange-500/20 text-orange-400 border-orange-500/30",
    description: "Euphoria / distribution zone",
  },
  {
    label: "1.7x RP (Mean)",
    mult: 1.7,
    color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
    description: "Fair value / historical mean",
  },
  {
    label: "1.25x RP",
    mult: 1.25,
    color: "bg-green-500/20 text-green-400 border-green-500/30",
    description: "Decision line (correction vs capitulation)",
    highlight: true,
  },
  {
    label: "1.0x RP",
    mult: 1.0,
    color: "bg-purple-500/20 text-purple-400 border-purple-500/30",
    description: "Cost-basis floor zone",
  },
  {
    label: "0.8x RP",
    mult: 0.8,
    color: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
    description: "Severe capitulation zone (rare)",
  },
];

function determineBand(
  price: number,
  rp: number
): { zone: string; sentiment: string } {
  const ratio = price / rp;
  if (ratio >= 3.2)
    return { zone: "above 3.2x RP", sentiment: "Extreme Overheated" };
  if (ratio >= 2.4)
    return { zone: "between 2.4x-3.2x RP", sentiment: "Euphoria" };
  if (ratio >= 1.7)
    return { zone: "between 1.7x-2.4x RP", sentiment: "Above Fair Value" };
  if (ratio >= 1.25)
    return { zone: "between 1.25x-1.7x RP", sentiment: "Bull Trend" };
  if (ratio >= 1.0)
    return { zone: "between 1.0x-1.25x RP", sentiment: "Caution" };
  if (ratio >= 0.8)
    return { zone: "between 0.8x-1.0x RP", sentiment: "Capitulation Risk" };
  return { zone: "below 0.8x RP", sentiment: "Deep Capitulation" };
}

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to fetch");
  return res.json();
};

export function BTCCommentary() {
  const { data: apiData, isLoading } = useSWR<ApiResponse>(
    "/api/btc-price",
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 300000 }
  );

  if (isLoading || !apiData) {
    return (
      <div className="space-y-6">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="h-48 animate-pulse rounded-xl border border-neutral-800 bg-neutral-900/80"
          />
        ))}
      </div>
    );
  }

  const rp = apiData.latestRP;
  const price = apiData.latestPrice;
  const rpDate = new Date(apiData.latestRPDate).toLocaleDateString("en-US", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  const bands = BAND_MULTIPLIERS.map((b) => ({
    ...b,
    value: Math.round(rp * b.mult),
  }));

  const { zone, sentiment } = determineBand(price, rp);
  const priceToRP = (price / rp).toFixed(2);
  const key125 = Math.round(rp * 1.25);
  const key08 = Math.round(rp * 0.8);

  return (
    <div className="space-y-6">
      {/* Live Position Indicator */}
      <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 md:p-6">
        <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-amber-400 md:text-base">
          <Activity className="h-4 w-4" />
          Live Position: {sentiment}
        </h3>
        <p className="text-xs leading-relaxed text-neutral-300 md:text-sm">
          BTC is currently at{" "}
          <span className="font-semibold text-amber-400">
            ${price.toLocaleString()}
          </span>
          , which is{" "}
          <span className="font-semibold text-purple-400">{priceToRP}x</span>{" "}
          the Realized Price, placing it {zone}. The key{" "}
          <span className="font-semibold text-green-400">
            1.25x RP band is at ${key125.toLocaleString()}
          </span>
          .
          {price > key125
            ? " Price is holding above this critical decision line, consistent with a bull market structure."
            : ` Price is below this decision line, which historically increases the probability of a move toward Realized Price itself (~$${rp.toLocaleString()}).`}
        </p>
      </div>

      {/* Band Reference Table */}
      <div className="rounded-xl border border-neutral-800 bg-neutral-900/80 p-4 md:p-6">
        <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-neutral-200 md:text-base">
          <Target className="h-4 w-4 text-amber-500" />
          Realized Price Bands
        </h3>
        <p className="mb-4 text-xs leading-relaxed text-neutral-400 md:text-sm">
          Based on live Realized Price of{" "}
          <span className="font-semibold text-purple-400">
            ${rp.toLocaleString()}
          </span>{" "}
          (as of {rpDate}, via BGeometrics on-chain data)
        </p>
        <div className="space-y-2">
          {bands.map((band) => {
            const isCurrentBand =
              band.highlight &&
              price <= Math.round(rp * 1.7) &&
              price >= Math.round(rp * 1.0);
            return (
              <div
                key={band.label}
                className={`flex items-center justify-between rounded-lg border px-3 py-2.5 md:px-4 ${
                  band.highlight
                    ? "border-green-500/40 bg-green-500/10"
                    : "border-neutral-800 bg-neutral-800/40"
                } ${isCurrentBand ? "ring-1 ring-amber-500/30" : ""}`}
              >
                <div className="flex flex-col gap-0.5">
                  <span
                    className={`text-xs font-semibold md:text-sm ${
                      band.highlight ? "text-green-400" : "text-neutral-300"
                    }`}
                  >
                    {band.label}
                  </span>
                  <span className="text-[10px] text-neutral-500 md:text-xs">
                    {band.description}
                  </span>
                </div>
                <span
                  className={`rounded-md px-2 py-1 text-xs font-bold md:text-sm ${band.color}`}
                >
                  ${band.value.toLocaleString()}
                </span>
              </div>
            );
          })}
        </div>

        {/* STH/LTH extra info */}
        {(apiData.latestSTH || apiData.latestLTH) && (
          <div className="mt-4 space-y-2 border-t border-neutral-800 pt-4">
            <p className="text-[10px] font-semibold text-neutral-500 uppercase md:text-xs">
              Holder Cohort Realized Prices
            </p>
            {apiData.latestSTH && (
              <div className="flex items-center justify-between rounded-lg border border-pink-500/20 bg-pink-500/5 px-3 py-2.5 md:px-4">
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs font-semibold text-pink-400 md:text-sm">
                    STH Realized Price
                  </span>
                  <span className="text-[10px] text-neutral-500 md:text-xs">
                    Short-term holder cost basis ({"<"}155 days)
                  </span>
                </div>
                <span className="rounded-md bg-pink-500/20 px-2 py-1 text-xs font-bold text-pink-400 md:text-sm">
                  ${apiData.latestSTH.toLocaleString()}
                </span>
              </div>
            )}
            {apiData.latestLTH && (
              <div className="flex items-center justify-between rounded-lg border border-blue-500/20 bg-blue-500/5 px-3 py-2.5 md:px-4">
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs font-semibold text-blue-400 md:text-sm">
                    LTH Realized Price
                  </span>
                  <span className="text-[10px] text-neutral-500 md:text-xs">
                    Long-term holder cost basis ({">"}155 days)
                  </span>
                </div>
                <span className="rounded-md bg-blue-500/20 px-2 py-1 text-xs font-bold text-blue-400 md:text-sm">
                  ${apiData.latestLTH.toLocaleString()}
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Key Insight - now dynamic */}
      <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 md:p-6">
        <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-amber-400 md:text-base">
          <AlertTriangle className="h-4 w-4" />
          Key Insight
        </h3>
        <p className="text-xs leading-relaxed text-neutral-300 md:text-sm">
          {price >= key125 ? (
            <>
              BTC is trading above the{" "}
              <span className="font-semibold text-green-400">
                1.25x RP band (~${key125.toLocaleString()})
              </span>
              . This level historically acts as the &quot;decision line&quot;
              between a standard correction and a deeper capitulation event.
              Holding above it is consistent with a healthy bull trend. Watch for
              a weekly close below for early warning signals.
            </>
          ) : price >= rp ? (
            <>
              BTC has lost the{" "}
              <span className="font-semibold text-green-400">
                1.25x RP band (~${key125.toLocaleString()})
              </span>
              . Historically, this increases the probability of a move toward
              Realized Price itself (~${rp.toLocaleString()}). This zone between
              RP and 1.25x RP is a decision area where the market determines
              whether this is a correction or the start of a deeper downturn.
            </>
          ) : (
            <>
              BTC is trading below Realized Price (~${rp.toLocaleString()}),
              meaning the aggregate market is in unrealized loss. This is
              historically rare and has marked major accumulation zones. The
              severe capitulation floor at{" "}
              <span className="font-semibold text-cyan-400">
                0.8x RP (~${key08.toLocaleString()})
              </span>{" "}
              represents the ultimate bear case.
            </>
          )}
        </p>
      </div>

      {/* How to Use */}
      <div className="rounded-xl border border-neutral-800 bg-neutral-900/80 p-4 md:p-6">
        <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-neutral-200 md:text-base">
          <Info className="h-4 w-4 text-blue-400" />
          How to Use These Bands
        </h3>
        <div className="space-y-3">
          <div className="flex items-start gap-3 rounded-lg bg-neutral-800/40 p-3">
            <ArrowUp className="mt-0.5 h-4 w-4 shrink-0 text-green-400" />
            <div>
              <p className="text-xs font-medium text-green-400 md:text-sm">
                BTC holds / reclaims 1.25x RP (~${key125.toLocaleString()})
              </p>
              <p className="text-[10px] leading-relaxed text-neutral-400 md:text-xs">
                Many investors treat this level as an initial accumulation zone
                (small size first). This signals a standard correction within a
                bull trend.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3 rounded-lg bg-neutral-800/40 p-3">
            <ArrowDown className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
            <div>
              <p className="text-xs font-medium text-red-400 md:text-sm">
                BTC loses 1.25x RP (weekly close below ~$
                {key125.toLocaleString()})
              </p>
              <p className="text-[10px] leading-relaxed text-neutral-400 md:text-xs">
                Next major zone becomes RP (~${rp.toLocaleString()}) where
                scaling heavier is historically attractive. Reserve dry powder
                for 0.8x RP (~${key08.toLocaleString()}) in case of panic.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Data Sources */}
      <div className="rounded-xl border border-neutral-800 bg-neutral-900/80 p-4 md:p-6">
        <h3 className="mb-2 text-xs font-semibold text-neutral-400 md:text-sm">
          Data Sources (all live)
        </h3>
        <ul className="space-y-1 text-[10px] text-neutral-500 md:text-xs">
          <li>
            BTC Price: CoinPaprika (live spot) + Blockchain.info (full historical daily average)
          </li>
          <li>
            Realized Price: BGeometrics on-chain data (updated daily, ${rp.toLocaleString()} as of {rpDate})
          </li>
          <li>
            STH/LTH Realized Prices: BGeometrics on-chain data (updated daily)
          </li>
          <li>
            Original framework: CryptoQuant / Axel Adler Jr
          </li>
        </ul>
        <p className="mt-3 text-[10px] italic text-neutral-600 md:text-xs">
          All data refreshes automatically. This is a market-structure heuristic,
          not financial advice.
        </p>
      </div>
    </div>
  );
}
