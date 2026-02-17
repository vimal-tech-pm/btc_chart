# AGENTS.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Commands

```bash
npm run dev      # Start dev server with Turbo (http://localhost:3000)
npm run build    # Production build
npm run lint     # Run Next.js linter
npm run start    # Run production build locally
```

Note: The project uses pnpm lockfile but pnpm may not be installed. Use `npm install --legacy-peer-deps` to handle peer dependency conflicts (date-fns v4 vs react-day-picker requirement).

## Architecture

This is a Next.js 16 app displaying Bitcoin on-chain valuation data using Realized Price bands.

### Data Flow

1. **API Route** (`app/api/btc-price/route.ts`) - Aggregates data from three free, no-auth APIs:
   - BGeometrics: On-chain metrics (realized_price, sth_realized_price, lth_realized_price)
   - Blockchain.info: Historical BTC market price
   - CoinPaprika: Live spot price
   
   Returns chart data with calculated RP multiplier bands (0.8x, 1.0x, 1.25x, 1.7x, 2.4x, 3.2x).

2. **Chart Component** (`components/btc-realized-bands-chart.tsx`) - Main visualization using Recharts with:
   - Three view modes: "Realized Bands", "Holder Cohorts", "Complete"
   - Log-scale Y-axis with dynamic tick calculation
   - SWR for data fetching with 5-min deduplication

3. **Commentary Component** (`components/btc-commentary.tsx`) - Dynamic market analysis that:
   - Determines current band zone based on price/RP ratio
   - Displays calculated band values from live RP data
   - Shows STH/LTH realized prices when available

### Key Concepts

- **Realized Price (RP)**: Average cost basis of all BTC on-chain
- **STH RP**: Short-term holder (<155 days) cost basis
- **LTH RP**: Long-term holder (>155 days) cost basis
- **1.25x RP**: Critical "decision line" - above indicates bull trend, below suggests correction risk

### UI Components

Uses shadcn/ui components in `components/ui/` (Radix-based). The chart uses Recharts directly, not the shadcn chart wrapper.
