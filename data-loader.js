class DataLoader {
  static _customDatasets = new Map();

  static _splitCsvLine(line) {
    const cells = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i += 1) {
      const char = line[i];

      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i += 1;
        } else {
          inQuotes = !inQuotes;
        }
        continue;
      }

      if (char === ',' && !inQuotes) {
        cells.push(current.trim());
        current = '';
        continue;
      }

      current += char;
    }

    cells.push(current.trim());
    return cells;
  }

  static _parseBinaryValue(value, field, lineNumber) {
    const normalized = String(value ?? '')
      .trim()
      .toLowerCase();

    if (!normalized) {
      throw new Error(`Missing ${field} value on row ${lineNumber}.`);
    }

    if (['1', 'true', 'up', 'rise', 'yes'].includes(normalized)) {
      return 1;
    }
    if (['0', 'false', 'down', 'fall', 'no'].includes(normalized)) {
      return 0;
    }

    const numeric = Number(normalized);
    if (!Number.isNaN(numeric)) {
      if (numeric === 1) return 1;
      if (numeric === 0) return 0;
    }

    throw new Error(`Invalid ${field} value "${value}" on row ${lineNumber}. Expected 0/1, true/false, or up/down.`);
  }

  static _parseFeatureList(value) {
    if (!value) return [];
    return String(value)
      .split(/[|;,]/)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  static parseCsvDataset(text, datasetName) {
    if (!text || !text.trim()) {
      throw new Error('CSV file is empty.');
    }

    const rawLines = text
      .replace(/\r\n?/g, '\n')
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    if (!rawLines.length) {
      throw new Error('CSV file does not contain any rows.');
    }

    const headerLine = rawLines.shift();
    const headers = this._splitCsvLine(headerLine);
    const headerLookup = new Map(headers.map((header, index) => [header.toLowerCase(), index]));

    const getIndex = (...candidates) => {
      for (const candidate of candidates) {
        if (headerLookup.has(candidate.toLowerCase())) {
          return headerLookup.get(candidate.toLowerCase());
        }
      }
      return -1;
    };

    const symbolIndex = getIndex('symbol');
    const dateIndex = getIndex('date');
    const predictedIndex = getIndex('predicted', 'prediction');
    const actualIndex = getIndex('actual', 'target');

    if ([symbolIndex, dateIndex, predictedIndex, actualIndex].some((index) => index === -1)) {
      throw new Error('CSV must include "symbol", "date", "predicted", and "actual" columns.');
    }

    const companyIndex = getIndex('company', 'name');
    const labelIndex = getIndex('dataset_label', 'label');
    const descriptionIndex = getIndex('dataset_description', 'description', 'notes');
    const featureWindowIndex = getIndex('feature_window', 'featurewindow');
    const featuresIndex = getIndex('features', 'feature_names', 'featureNames');

    const stocks = new Map();
    const metadata = { label: datasetName || 'Custom dataset' };

    rawLines.forEach((line, lineNumber) => {
      const values = this._splitCsvLine(line);

      const symbol = values[symbolIndex]?.trim();
      const date = values[dateIndex]?.trim();

      if (!symbol) {
        throw new Error(`Missing stock symbol on row ${lineNumber + 2}.`);
      }
      if (!date) {
        throw new Error(`Missing date for ${symbol} on row ${lineNumber + 2}.`);
      }

      const predicted = this._parseBinaryValue(values[predictedIndex], 'predicted', lineNumber + 2);
      const actual = this._parseBinaryValue(values[actualIndex], 'actual', lineNumber + 2);

      const company = companyIndex !== -1 ? values[companyIndex]?.trim() : '';
      const label = labelIndex !== -1 ? values[labelIndex]?.trim() : '';
      const description = descriptionIndex !== -1 ? values[descriptionIndex]?.trim() : '';
      const windowValue = featureWindowIndex !== -1 ? values[featureWindowIndex]?.trim() : '';
      const featureValue = featuresIndex !== -1 ? values[featuresIndex]?.trim() : '';

      if (label) {
        metadata.label = label;
      }
      if (description) {
        metadata.description = description;
      }
      if (windowValue) {
        const parsedWindow = Number(windowValue);
        if (!Number.isNaN(parsedWindow) && parsedWindow > 0) {
          metadata.featureWindow = parsedWindow;
        }
      }
      if (featureValue) {
        metadata.features = this._parseFeatureList(featureValue);
      }

      if (!stocks.has(symbol)) {
        stocks.set(symbol, {
          symbol,
          company: company || symbol,
          predictions: []
        });
      }

      const stockEntry = stocks.get(symbol);
      if (company && !stockEntry.company) {
        stockEntry.company = company;
      }

      stockEntry.predictions.push({
        date,
        predicted,
        actual
      });
    });

    const stockList = Array.from(stocks.values()).map((stock) => ({
      ...stock,
      predictions: stock.predictions.sort((a, b) => a.date.localeCompare(b.date))
    }));

    if (!stockList.length) {
      throw new Error('CSV did not include any stock prediction rows.');
    }

    return {
      metadata,
      stocks: stockList
    };
  }

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
