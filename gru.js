class GRUEvaluator {
  static evaluate(dataset) {
    const stockMetrics = dataset.stocks.map((stock) => {
      const total = stock.predictions.length;
      const correct = stock.predictions.reduce((sum, row) => sum + (row.predicted === row.actual ? 1 : 0), 0);
      const accuracy = total ? correct / total : 0;
      return {
        symbol: stock.symbol,
        company: stock.company,
        accuracy,
        total,
        correct,
        timeline: stock.predictions.map((row) => ({
          date: row.date,
          predicted: row.predicted,
          actual: row.actual,
          correct: row.predicted === row.actual
        }))
      };
    }).sort((a, b) => b.accuracy - a.accuracy);

    const aggregateCorrect = stockMetrics.reduce((sum, stock) => sum + stock.correct, 0);
    const aggregateTotal = stockMetrics.reduce((sum, stock) => sum + stock.total, 0);
    const datasetAccuracy = aggregateTotal ? aggregateCorrect / aggregateTotal : 0;

    return {
      stockMetrics,
      datasetAccuracy,
      topStock: stockMetrics[0] ?? null,
      metadata: dataset.metadata ?? {}
    };
  }
}

window.GRUEvaluator = GRUEvaluator;
