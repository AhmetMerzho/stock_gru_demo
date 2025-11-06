# Multi-Stock GRU Prediction Demo

This repository contains a static demonstration web app that visualises prediction quality for a pre-trained GRU model across multiple equities. The app is fully client-side and works seamlessly when published to GitHub Pages.

## Getting started

Open `index.html` in any modern browser or serve the repository with your preferred static file host. The landing page lets you:

- Choose between curated datasets that bundle engineered features and synthetic GRU outputs.
- Upload your own JSON or CSV dataset export to evaluate it locally in the browser.
- Inspect global metrics such as the best-performing stock and average dataset accuracy.
- Explore a stock-by-stock accuracy ranking and interactive prediction timelines.
- Drill into each prediction via the sortable data table.

Because everything runs client-side, no additional build step is required.

## Custom datasets

Click **Upload Dataset** in the control panel to analyse your own GRU predictions. You can upload either a JSON document with
the same structure as the bundled datasets or a CSV file with the columns `symbol`, `date`, `predicted`, and `actual` (plus
optional `company`, `dataset_label`, `dataset_description`, `feature_window`, and `features`).

```json
{
  "metadata": {
    "label": "Custom GRU run",
    "description": "Optional notes for the UI",
    "featureWindow": 12,
    "features": ["Open", "Close"]
  },
  "stocks": [
    {
      "symbol": "AAPL",
      "company": "Apple Inc.",
      "predictions": [
        { "date": "2023-01-01", "predicted": 1, "actual": 1 }
      ]
    }
  ]
}
```

Each stock entry should include a `symbol` and a `predictions` array containing binary `predicted` and `actual` values. The
metadata block is optional, but providing it lets the UI surface richer descriptions.

For CSV uploads, provide one row per prediction. Use `up`/`down`, `true`/`false`, or `1`/`0` in the `predicted` and `actual`
columns. All predictions for the same stock symbol will be grouped automatically, and optional metadata columns will populate
the summary cards if present.
