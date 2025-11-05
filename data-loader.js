class DataLoader {
  static _customDatasets = new Map();

  static async listDatasets() {
    if (!this._baseDatasets) {
      const response = await fetch('data/index.json', { cache: 'no-cache' });
      if (!response.ok) {
        throw new Error(`Unable to load dataset catalogue (HTTP ${response.status}).`);
      }
      const data = await response.json();
      this._baseDatasets = Array.isArray(data.datasets) ? data.datasets : [];
    }

    const base = this._baseDatasets.map((dataset) => ({ ...dataset }));
    const custom = Array.from(this._customDatasets.values()).map(({ entry }) => ({ ...entry }));
    return [...base, ...custom];
  }

  static normalizePayload(payload) {
    const stocks = Array.isArray(payload?.stocks) ? payload.stocks : [];
    return {
      metadata: payload?.metadata ?? {},
      stocks: stocks.map((stock) => ({
        symbol: stock.symbol,
        company: stock.company ?? stock.symbol,
        predictions: Array.isArray(stock.predictions)
          ? stock.predictions.map((row) => ({
              date: row.date,
              predicted: Number(row.predicted),
              actual: Number(row.actual)
            }))
          : []
      }))
    };
  }

  static async loadDataset(id) {
    if (!id) {
      throw new Error('A dataset id must be provided.');
    }

    if (this._customDatasets.has(id)) {
      return this._customDatasets.get(id).dataset;
    }

    const response = await fetch(`data/${id}.json`, { cache: 'no-cache' });
    if (!response.ok) {
      throw new Error(`Unable to load dataset "${id}" (HTTP ${response.status}).`);
    }
    const payload = await response.json();
    return this.normalizePayload(payload);
  }

  static registerCustomDataset(name, payload) {
    const dataset = this.normalizePayload(payload);
    if (!dataset.stocks.length) {
      throw new Error('A dataset must include at least one stock entry.');
    }

    const metadata = dataset.metadata ?? {};
    const features = Array.isArray(metadata.features)
      ? metadata.features
      : Array.isArray(metadata.featureNames)
      ? metadata.featureNames
      : [];

    const entry = {
      id: `custom-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
      name: metadata.label || name || 'Custom dataset',
      description: metadata.description || metadata.notes || 'Uploaded custom dataset',
      featureWindow: metadata.featureWindow ?? null,
      features
    };

    this._customDatasets.set(entry.id, { entry, dataset });
    return { ...entry };
  }
}

window.DataLoader = DataLoader;
