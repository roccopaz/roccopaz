# Amazon Weekly Dashboard

> Weekly Amazon seller KPI dashboard — track revenue, advertising, inventory, and profitability at a glance.

<!-- Screenshot placeholder — replace with actual screenshot -->
<!-- ![Dashboard Preview](images/dashboard-preview.png) -->

## Features

- **14 KPI Cards** — Units Sold, Revenue, TACoS, CPC, CTR, Conversion Rate, Sessions, Review Count, Inventory On Hand, Ad Spend, Profit Estimate, ASP, Weeks of Inventory, WoW Revenue Change
- **Week-over-Week Tracking** — Green/red indicators show metric direction with percentage change
- **Interactive Charts** — Revenue & Units trend, Ad Performance (TACoS/CPC/CTR), Inventory levels (Chart.js)
- **CSV Import/Export** — Upload weekly data via CSV or enter manually
- **localStorage Persistence** — Data survives page refreshes, no backend needed
- **Dark Mode** — Professional dark theme, fully responsive
- **GitHub Pages Ready** — Static HTML/CSS/JS, zero build tools

## Quick Start

1. Clone the repo
2. Open `index.html` in your browser
3. Click **Load Sample Data** to see the dashboard in action, or add your own data

### CSV Format

```csv
week,units_sold,revenue,ad_spend,tacos,cpc,ctr,conversion_rate,sessions,review_count,inventory_on_hand,profit_estimate,avg_selling_price
2026-03-16,142,4970.00,620.00,12.47,0.82,0.45,12.8,1109,387,840,1490.00,35.00
```

## Tech Stack

`HTML` `CSS` `JavaScript` `Chart.js` `localStorage`

## Roadmap

- [ ] Amazon SP-API integration for automated data pull
- [ ] Multi-product support
- [ ] Date range filtering
- [ ] PDF export for weekly reports

---

*Built by [Rocco Paz](https://github.com/roccopaz) with AI-assisted development using Claude Code*
