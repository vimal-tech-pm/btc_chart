import { BTCRealizedBandsChart } from "@/components/btc-realized-bands-chart";
import { BTCCommentary } from "@/components/btc-commentary";

export default function Page() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="border-b border-neutral-800 bg-neutral-900/50 px-4 py-4 md:px-8 md:py-6">
        <div className="mx-auto max-w-6xl">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10 md:h-10 md:w-10">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                className="h-5 w-5 text-amber-500 md:h-6 md:w-6"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M11.767 19.089c4.924.868 6.14-6.025 1.216-6.894m-1.216 6.894L5.86 18.047m5.908 1.042-.347 1.97m1.563-8.864c4.924.869 6.14-6.025 1.215-6.893m-1.215 6.893-3.94-.694m5.155-6.2L8.29 4.26m5.908 1.042.348-1.97M7.48 20.364l3.126-17.727" />
              </svg>
            </div>
            <div>
              <h1 className="text-balance text-base font-bold tracking-tight text-neutral-100 md:text-xl">
                Bitcoin Realized Pricing Bands
              </h1>
              <p className="text-xs text-neutral-500 md:text-sm">
                On-chain valuation framework &middot; CryptoQuant / Axel Adler
                Jr
              </p>
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-6 md:px-8 md:py-10">
        {/* Chart Section */}
        <section className="mb-8 rounded-xl border border-neutral-800 bg-neutral-900/60 p-3 md:p-6">
          <BTCRealizedBandsChart />
        </section>

        {/* Commentary Grid */}
        <section className="grid gap-6 md:grid-cols-2">
          <BTCCommentary />
        </section>

        {/* Footer */}
        <footer className="mt-10 border-t border-neutral-800 pt-6 text-center">
          <p className="text-[10px] text-neutral-600 md:text-xs">
            Live data from BGeometrics (on-chain realized price, STH/LTH RP),
            Blockchain.info (historical price), and CoinPaprika (live spot
            price). Framework based on Axel Adler Jr&apos;s Bitcoin Realized
            Pricing Bands.
          </p>
          <p className="mt-1 text-[10px] text-neutral-700 md:text-xs">
            All data refreshes automatically. This is not financial advice.
            Always do your own research.
          </p>
        </footer>
      </div>
    </main>
  );
}
