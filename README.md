# Bitcoin Realized Pricing Bands

A live, interactive chart that helps you understand where Bitcoin's price sits relative to its on-chain valuation — using the Realized Price framework popularized by CryptoQuant and Axel Adler Jr.

![Bitcoin Realized Pricing Bands](https://img.shields.io/badge/Bitcoin-On--Chain%20Analytics-orange)

## What Is This?

This tool visualizes Bitcoin's price against **Realized Price bands** — a valuation framework based on the actual cost basis of all Bitcoin holders on-chain.

### Why Does It Matter?

Unlike traditional price charts, this shows you:

- **Where we are in the cycle** — Is Bitcoin overheated or undervalued?
- **Key decision levels** — Historical zones where major tops and bottoms have formed
- **Holder behavior** — What short-term traders vs long-term holders paid for their Bitcoin

### The Bands Explained

| Band | Meaning |
|------|---------|
| **3.2x RP** | 🔴 Extreme overheated zone — historically marks cycle tops |
| **2.4x RP** | 🟠 Euphoria / distribution — smart money often sells here |
| **1.7x RP** | 🟡 Fair value — the historical average |
| **1.25x RP** | 🟢 **Decision line** — above = bull trend, below = correction risk |
| **1.0x RP** | 🟣 Realized Price — the average cost basis of all BTC |
| **0.8x RP** | 🔵 Deep capitulation — rare, historically great buying zone |

### What is "Realized Price"?

**Realized Price** is the average price at which every Bitcoin last moved on-chain. Think of it as the collective "break-even" point for all holders. When price falls below it, the average holder is underwater.

## Features

- 📊 **Three view modes**: Realized Bands, Holder Cohorts (STH/LTH), or Complete view
- 🔄 **Live data**: Automatically refreshes from free, public APIs
- 📱 **Mobile friendly**: Works on any device
- 🌙 **Dark theme**: Easy on the eyes

## Data Sources

All data is fetched live from free, public APIs (no API keys required):

- **On-chain metrics**: [BGeometrics](https://charts.bgeometrics.com/) — Realized Price, STH RP, LTH RP
- **Historical price**: [Blockchain.info](https://www.blockchain.com/charts) — Daily BTC price since 2018
- **Live spot price**: [CoinPaprika](https://coinpaprika.com/) — Real-time BTC/USD

---

## For Developers

### Tech Stack

- [Next.js 16](https://nextjs.org/) with App Router
- [React 19](https://react.dev/)
- [Recharts](https://recharts.org/) for charting
- [SWR](https://swr.vercel.app/) for data fetching
- [Tailwind CSS](https://tailwindcss.com/) + [shadcn/ui](https://ui.shadcn.com/)

### Getting Started

```bash
# Clone the repo
git clone https://github.com/vimal-tech-pm/btc_chart.git
cd btc_chart

# Install dependencies (use --legacy-peer-deps due to date-fns version conflict)
npm install --legacy-peer-deps

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server with Turbo |
| `npm run build` | Create production build |
| `npm run start` | Run production build locally |
| `npm run lint` | Run Next.js linter |

### Project Structure

```
app/
├── api/btc-price/route.ts   # API endpoint aggregating all data sources
├── page.tsx                  # Main page
└── layout.tsx               # Root layout

components/
├── btc-realized-bands-chart.tsx  # Main chart component
├── btc-commentary.tsx            # Dynamic market analysis
└── ui/                           # shadcn/ui components
```

---

## Disclaimer

This is an educational tool for visualizing on-chain data. It is **not financial advice**. Always do your own research before making investment decisions.

## Credits

- Framework concept: [Axel Adler Jr](https://twitter.com/AxelAdlerJr) / [CryptoQuant](https://cryptoquant.com/)
- On-chain data: [BGeometrics](https://charts.bgeometrics.com/)

## License

MIT
