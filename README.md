# AdLens

A private, in-browser dashboard for ad campaign data. Drop in a CSV export and get KPIs, plain language insights, and charts in seconds. Nothing is uploaded anywhere.

It is the web version of my [Campaign Analyzer](https://github.com/devrajraisal/campaign-analyzer) command line tool, rebuilt with React and strict TypeScript.

> The sample data is **synthetic**. It comes from a seeded random generator and is built to contain a few realistic problems. It is not real campaign data.

## Why it is private

Marketing data is often confidential, so the tool never asks you to trust it. The built page includes a Content Security Policy with `connect-src 'none'`, which makes the browser itself refuse every network request from the page. You can check this yourself:

1. Open the app and look at the `<meta http-equiv="Content-Security-Policy">` tag in the page source.
2. Open the browser developer tools, go to the Network tab, load a file, and watch that no request is made.

The source code also contains no `fetch`, no `XMLHttpRequest`, no cookies, and no storage calls.

## Features

- Drag and drop a CSV, or try the built in sample
- Recognises common export column names, and shows a column matching dialog when it does not
- KPIs: spend, impressions, clicks, CTR, CPC, CPM, conversions, cost per result, conversion rate, revenue, and ROAS
- Insights from simple, transparent rules, with thresholds you can change in the page
- Daily trend chart, spend by campaign, and ROAS or cost per result by campaign, all drawn as SVG with no chart library
- Sortable campaign table
- Skipped rows are reported, never hidden
- JSON download of the analysis
- Keyboard friendly, labelled controls, chart descriptions for screen readers, and light and dark themes

## Quick start

You need Node.js 20 or newer.

```bash
git clone https://github.com/devrajraisal/adlens.git
cd adlens
npm install
npm run dev
```

Open the address that Vite prints, then choose "Try it with sample data".

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run build` | Type check and build into `dist` |
| `npm run preview` | Serve the build locally |
| `npm run typecheck` | Run the TypeScript compiler |
| `npm run lint` | Run the linter |
| `npm test` | Run the tests |

## Your CSV

Required columns: `date`, `campaign`, `impressions`, `clicks`, `spend`.
Optional columns: `ad_set`, `reach`, `conversions`, `revenue`.

Header names are matched without caring about case, and common export headings such as `Campaign name`, `Link clicks`, `Amount spent (USD)`, and `Results` are recognised. These names are based on common ad platform exports and have not been checked against every real export, so if a header is not recognised, the app asks you to match it by hand.

Things to know:

- Dates must look like `2026-10-01` (or `2026/10/01`). A date such as `03/04/2026` is refused on purpose, because it could mean March 4 or April 3.
- Values such as `$1,234.50`, `Rs. 12,500`, and `USD 12.50` are read correctly. A number with a European decimal comma, such as `1.234,50`, is not supported.
- Unreadable rows are skipped, and the page lists how many.
- Files up to 20 MB are accepted.

## Insights

| Insight | Rule | Default |
| --- | --- | --- |
| Best and weakest return | Compares campaigns with a meaningful share of spend, by ROAS, or by cost per result when there is no revenue | 5% of spend |
| No conversions | A campaign with a meaningful share of spend and zero conversions, in a file that tracks conversions | 5% of spend |
| Week on week trend | Last 7 days against the 7 before, using cost per result, or CTR without conversions. Needs 14 days | 15% change |
| High frequency | Impressions divided by reach over the last 7 days, per campaign | above 3 |

The rules do not test for statistical significance, so a small campaign with few clicks can swing by chance. Treat insights as prompts for a closer look.

## Project structure

```
src/
  lib/          Pure logic: CSV loading, metrics, insights, dates, sample data
  components/   Charts, cards, table, upload, and the column matching dialog
  App.tsx       State and page layout
  types.ts      Shared types
```

The logic in `lib` has no React in it, so it is tested on its own.

## Design decisions

- **Strict TypeScript.** `strict` and `noUncheckedIndexedAccess` are on, so array lookups must handle a missing value.
- **Missing values are `null`.** Every rate is `null` when its denominator is zero, so the screen shows `n/a` and the JSON export never contains `NaN` or `Infinity`.
- **Dates stay as text.** A date is kept as `YYYY-MM-DD` and compared as a UTC day number, so time zones and daylight saving cannot move a day.
- **No guessing on ambiguous input.** Dates that could mean two things are refused, and the page says how to fix the file.
- **Charts are plain SVG.** There is no chart library, so the bundle stays small (about 84 kB gzipped, including React) and every chart carries a text description.
- **The privacy claim is enforced.** The browser blocks all network requests through the CSP, so privacy does not depend on trusting the code.

## Tests

The suite has 79 tests covering the CSV loader, number and date parsing, metrics, insights, the sample generator, and the whole interface with Testing Library: upload, column matching, sorting, changing rules, and escaping of text from the file.

A test caught a real bug while this was built: `Rs. 12,500` was read as `0.125`, because the dot in "Rs." was treated as a decimal point. The parser now removes a leading currency label first, and the tests cover it.

```bash
npm test
```

## Deploy

The repository includes a manual GitHub Pages workflow. Turn Pages on under Settings, Pages, Source: GitHub Actions, then run "Deploy to GitHub Pages" from the Actions tab. The build uses relative paths, so it also works on any static host.

## Limits

- The interface is tested with Testing Library in a simulated browser. I have not tested it by hand in every browser.
- The insights are simple rules, not statistics.
- It handles one currency per file. The currency label is only text and nothing is converted.

## License

MIT. See the `LICENSE` file.
