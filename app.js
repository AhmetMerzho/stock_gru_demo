(() => {
  const datasetSelect = document.getElementById('dataset-select');
  const featureSelect = document.getElementById('feature-select');
  const runButton = document.getElementById('run-btn');
  const uploadButton = document.getElementById('upload-btn');
  const uploadInput = document.getElementById('dataset-upload');
  const metricLayout = document.getElementById('metric-layout');
  const emptyState = document.getElementById('empty-state');
  const chartsContainer = document.getElementById('charts');
  const predictionTable = document.getElementById('prediction-table');
  const predictionTableBody = predictionTable.querySelector('tbody');
  const timelineTitle = document.getElementById('timeline-title');
  const topStockSymbol = document.getElementById('top-stock-symbol');
  const topStockAccuracy = document.getElementById('top-stock-accuracy');
  const datasetAccuracy = document.getElementById('dataset-accuracy');
  const datasetName = document.getElementById('dataset-name');
  const featureWindow = document.getElementById('feature-window');
  const featureDescription = document.getElementById('feature-description');

  let accuracyChart = null;
  let timelineChart = null;
  let currentEvaluation = null;
  let currentDatasetMeta = null;

  const state = {
    datasetId: null,
    selectedFeature: 'all'
  };

  function formatPercent(value) {
    return `${(value * 100).toFixed(1)}%`;
  }

  function renderAccuracyChart(stockMetrics) {
    const ctx = document.getElementById('accuracy-chart');
    const labels = stockMetrics.map((stock) => stock.symbol);
    const data = stockMetrics.map((stock) => Number((stock.accuracy * 100).toFixed(2)));
    if (accuracyChart) {
      accuracyChart.destroy();
    }

    accuracyChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: 'Accuracy (%)',
            data,
            backgroundColor: '#2563eb',
            borderRadius: 8,
            maxBarThickness: 36
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        indexAxis: 'y',
        scales: {
          x: {
            beginAtZero: true,
            max: 100,
            ticks: {
              callback: (value) => `${value}%`
            },
            grid: {
              color: 'rgba(15, 23, 42, 0.08)'
            }
          },
          y: {
            grid: {
              display: false
            }
          }
        },
        plugins: {
          tooltip: {
            callbacks: {
              label(context) {
                const stock = stockMetrics[context.dataIndex];
                return `${stock.company}: ${formatPercent(stock.accuracy)} (${stock.correct}/${stock.total} correct)`;
              }
            }
          },
          legend: { display: false }
        },
        onClick(event, elements) {
          if (!elements.length) return;
          const index = elements[0].index;
          const stock = stockMetrics[index];
          renderTimelineChart(stock);
          highlightTableRows(stock.symbol);
        }
      }
    });
  }

  function renderTimelineChart(stock) {
    const ctx = document.getElementById('timeline-chart');
    const labels = stock.timeline.map((item) => item.date);
    const values = stock.timeline.map((item) => (item.correct ? 1 : 0));
    const backgroundColor = stock.timeline.map((item) => (item.correct ? '#1d4ed8' : '#dc2626'));

    if (timelineChart) {
      timelineChart.destroy();
    }

    timelineTitle.textContent = `${stock.symbol} Prediction Timeline`;

    timelineChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: 'Prediction Result',
            data: values,
            backgroundColor,
            borderRadius: 6,
            maxBarThickness: 24
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: {
            grid: { display: false },
            ticks: {
              maxRotation: 0,
              minRotation: 0,
              autoSkip: true,
              autoSkipPadding: 12
            }
          },
          y: {
            display: false,
            min: 0,
            max: 1
          }
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label(context) {
                const row = stock.timeline[context.dataIndex];
                const predictedLabel = row.predicted ? 'Up' : 'Down';
                const actualLabel = row.actual ? 'Up' : 'Down';
                const result = row.correct ? 'Correct' : 'Incorrect';
                return `${row.date}: ${result} (predicted ${predictedLabel}, actual ${actualLabel})`;
              }
            }
          }
        }
      }
    });
  }

  function renderPredictionTable(stockMetrics) {
    const rows = stockMetrics.flatMap((stock) =>
      stock.timeline.map((row) => ({
        symbol: stock.symbol,
        date: row.date,
        predicted: row.predicted,
        actual: row.actual,
        correct: row.correct
      }))
    ).sort((a, b) => a.date.localeCompare(b.date));

    predictionTableBody.innerHTML = '';

    rows.forEach((row) => {
      const tr = document.createElement('tr');
      tr.dataset.symbol = row.symbol;
      tr.innerHTML = `
        <td>${row.date}</td>
        <td>${row.symbol}</td>
        <td>${row.predicted ? 'Up' : 'Down'}</td>
        <td>${row.actual ? 'Up' : 'Down'}</td>
        <td style="font-weight:600; color:${row.correct ? '#15803d' : '#b91c1c'}">${row.correct ? 'Correct' : 'Incorrect'}</td>
      `;
      predictionTableBody.appendChild(tr);
    });

    predictionTable.hidden = rows.length === 0;
  }

  function highlightTableRows(symbol) {
    Array.from(predictionTableBody.children).forEach((row) => {
      row.classList.toggle('active', row.dataset.symbol === symbol);
    });
  }

  function updateMetrics(evaluation, metadata) {
    const { topStock, datasetAccuracy: accuracy } = evaluation;

    if (topStock) {
      topStockSymbol.textContent = `${topStock.symbol}`;
      topStockAccuracy.textContent = `Accuracy: ${formatPercent(topStock.accuracy)} (${topStock.correct}/${topStock.total})`;
      highlightTableRows(topStock.symbol);
    } else {
      topStockSymbol.textContent = '–';
      topStockAccuracy.textContent = 'Accuracy: –';
    }

    datasetAccuracy.textContent = formatPercent(accuracy);
    datasetName.textContent = metadata?.label ?? 'Dataset summary';
    featureWindow.textContent = metadata?.featureWindow ? `${metadata.featureWindow} steps` : '–';
    featureDescription.textContent = metadata?.description ?? metadata?.notes ?? 'Select a dataset to view the engineered features.';
  }

  async function populateDatasets(selectedId = state.datasetId) {
    try {
      const datasets = await DataLoader.listDatasets();
      datasetSelect.innerHTML = '';
      datasetSelect.appendChild(new Option('Select a dataset…', '', true, false));
      datasetSelect.options[0].disabled = true;

      datasets.forEach((dataset) => {
        const option = new Option(dataset.name, dataset.id);
        option.datasetDescription = dataset.description;
        option.datasetFeatureWindow = dataset.featureWindow;
        option.datasetFeatures = (dataset.features || []).join(', ');
        datasetSelect.appendChild(option);
      });

      datasetSelect.disabled = false;

      if (selectedId && datasetSelect.querySelector(`option[value="${selectedId}"]`)) {
        datasetSelect.value = selectedId;
      }
    } catch (error) {
      datasetSelect.innerHTML = '';
      datasetSelect.appendChild(new Option('Failed to load datasets', ''));
      datasetSelect.disabled = true;
      console.error(error);
    }
  }

  function updateFeatureSelect(option) {
    featureSelect.innerHTML = '';
    const features = option?.datasetFeatures?.split(',').map((item) => item.trim()).filter(Boolean) ?? [];
    if (!features.length) {
      featureSelect.appendChild(new Option('No feature metadata', 'all', true, true));
      featureSelect.disabled = true;
      return;
    }

    featureSelect.appendChild(new Option(`All features (${features.join(', ')})`, 'all', true, true));
    features.forEach((feature) => {
      featureSelect.appendChild(new Option(feature, feature));
    });
    featureSelect.disabled = false;
    state.selectedFeature = 'all';
  }

  async function runEvaluation() {
    if (!state.datasetId) return;

    runButton.disabled = true;
    runButton.textContent = 'Running…';

    try {
      const dataset = await DataLoader.loadDataset(state.datasetId);
      currentDatasetMeta = dataset.metadata;
      currentEvaluation = GRUEvaluator.evaluate(dataset);

      metricLayout.hidden = false;
      chartsContainer.hidden = false;
      emptyState.hidden = true;

      renderAccuracyChart(currentEvaluation.stockMetrics);
      const stockForTimeline = currentEvaluation.stockMetrics[0] ?? null;
      if (stockForTimeline) {
        renderTimelineChart(stockForTimeline);
      }
      renderPredictionTable(currentEvaluation.stockMetrics);
      updateMetrics(currentEvaluation, currentDatasetMeta);
    } catch (error) {
      console.error(error);
      alert('Unable to evaluate the GRU predictions. Please check the console for details.');
    } finally {
      runButton.disabled = false;
      runButton.textContent = 'Run Prediction';
    }
  }

  async function handleDatasetUpload(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const payload = JSON.parse(text);
      const datasetName = file.name.replace(/\.[^.]+$/, '');
      const entry = DataLoader.registerCustomDataset(datasetName, payload);
      await populateDatasets(entry.id);
      datasetSelect.dispatchEvent(new Event('change', { bubbles: true }));
    } catch (error) {
      console.error(error);
      alert('Unable to load that dataset. Please confirm it is a valid JSON export.');
    } finally {
      event.target.value = '';
    }
  }

  datasetSelect.addEventListener('change', (event) => {
    const option = event.target.selectedOptions[0];
    state.datasetId = option?.value || null;
    currentEvaluation = null;
    metricLayout.hidden = true;
    chartsContainer.hidden = true;
    predictionTable.hidden = true;
    emptyState.hidden = false;
    updateFeatureSelect(option);
    if (option) {
      featureDescription.textContent = option.datasetDescription || 'Run the evaluation to view engineered feature notes.';
      featureWindow.textContent = option.datasetFeatureWindow ? `${option.datasetFeatureWindow} steps` : '–';
    }
    runButton.disabled = !state.datasetId;
  });

  featureSelect.addEventListener('change', (event) => {
    state.selectedFeature = event.target.value;
  });

  runButton.addEventListener('click', () => {
    if (!state.datasetId) return;
    runEvaluation();
  });

  predictionTableBody.addEventListener('click', (event) => {
    const row = event.target.closest('tr');
    if (!row || !currentEvaluation) return;
    const stock = currentEvaluation.stockMetrics.find((item) => item.symbol === row.dataset.symbol);
    if (stock) {
      renderTimelineChart(stock);
      highlightTableRows(stock.symbol);
    }
  });

  if (uploadButton && uploadInput) {
    uploadButton.addEventListener('click', () => {
      uploadInput.click();
    });

    uploadInput.addEventListener('change', handleDatasetUpload);
  }

  populateDatasets();
})();
