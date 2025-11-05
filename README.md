# Multi-Stock GRU Prediction Demo

This repository contains a static demonstration web app that visualises prediction quality for a pre-trained GRU model across multiple equities. The app is fully client-side and works seamlessly when published to GitHub Pages.

## Getting started

Open `index.html` in any modern browser or serve the repository with your preferred static file host. The landing page lets you:

- Choose between curated datasets that bundle engineered features and synthetic GRU outputs.
- Upload your own JSON dataset export to evaluate it locally in the browser.
- Inspect global metrics such as the best-performing stock and average dataset accuracy.
- Explore a stock-by-stock accuracy ranking and interactive prediction timelines.
- Drill into each prediction via the sortable data table.

Because everything runs client-side, no additional build step is required.

## Custom datasets

Click **Upload Dataset** in the control panel to analyse your own GRU predictions. The file must be a JSON document with the
same structure as the bundled datasets:

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
