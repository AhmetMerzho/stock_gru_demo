class DataLoader {
  static async listDatasets() {
    if (!this._datasets) {
      const response = await fetch('data/index.json', { cache: 'no-cache' });
      if (!response.ok) {
        throw new Error(`Unable to load dataset catalogue (HTTP ${response.status}).`);
      }
      const data = await response.json();
      this._datasets = Array.isArray(data.datasets) ? data.datasets : [];
    }
    return this._datasets.map((dataset) => ({ ...dataset }));
  }

  static async loadDataset(id) {
    if (!id) {
      throw new Error('A dataset id must be provided.');
    }
    const response = await fetch(`data/${id}.json`, { cache: 'no-cache' });
    if (!response.ok) {
      throw new Error(`Unable to load dataset "${id}" (HTTP ${response.status}).`);
    }
    const payload = await response.json();
    const stocks = Array.isArray(payload.stocks) ? payload.stocks : [];
    return {
      metadata: payload.metadata ?? {},
      stocks: stocks.map((stock) => ({
        symbol: stock.symbol,
        company: stock.company ?? stock.symbol,
        predictions: Array.isArray(stock.predictions) ? stock.predictions.map((row) => ({
          date: row.date,
          predicted: Number(row.predicted),
          actual: Number(row.actual)
        })) : []
      }))
    };
  }
}

window.DataLoader = DataLoader;
