# InvestorHQ — SMSF Property Investment Modeller

A production-grade, institutional-quality SMSF Property Investment Financial Modeller built as a single-page React application for Australian Self-Managed Superannuation Fund (SMSF) trustees and their advisers.

## Features

- **Fund Setup** — Configure SMSF structure, manage 1-6 members, track contributions against caps
- **Fund Expenses** — Model all ongoing fund costs with benchmarking
- **Property Analyser** — Full property acquisition modelling with stamp duty calculators for all 8 Australian states/territories, loan structure, rental income, and acquisition costs
- **Cash Flow Model** — Complete annual fund P&L with waterfall charts
- **Holding Period Projections** — 10-30 year projections with interactive growth assumptions and 5 chart types
- **Multi-Property Portfolio Builder** — Model adding properties as equity builds with equity release logic
- **Scenario Analysis & Stress Testing** — Side-by-side scenario comparison, tornado sensitivity analysis, fan charts
- **Compliance Checklist** — 36-item interactive compliance tracker with progress ring
- **Assessment & Recommendation** — Auto-generated weighted readiness score with PASS/CONDITIONAL/FAIL badges
- **Reports & Export** — PDF generation (summary and detailed), scenario save/load via localStorage

## Tech Stack

- React 18 with hooks
- Tailwind CSS
- Recharts for data visualisation
- Framer Motion for animations
- Lucide React for icons
- jsPDF + html2canvas for PDF export
- localStorage for scenario persistence

## Setup

```bash
cd smsf-modeller
npm install
npm start
```

The app runs at `http://localhost:3000`.

## Build for Production

```bash
npm run build
```

Deploy the `build/` folder to Vercel, Netlify, or any static hosting.

## Calculation Engine

- **Stamp duty** — Actual bracket tables for NSW, VIC, QLD, SA, WA, TAS, ACT, NT
- **PMT** — Standard mortgage payment formula (P&I and Interest Only)
- **Amortisation** — Year-by-year schedule with IO-to-PI transition support
- **Contribution caps** — $30k concessional, $120k non-concessional (2024-25)
- **Pension drawdowns** — Age-based ATO minimum rates
- **Property growth** — Compound growth projections
- **Equity release** — Available equity at target LVR

## Disclaimer

This tool is for educational and illustrative purposes only. It does not constitute financial, legal, or tax advice. Always consult a licensed financial adviser, SMSF specialist, and solicitor before proceeding with any SMSF property investment.
