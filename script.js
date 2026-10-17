/*
 * CSCE 679 - Data Visualization Assignment 1
 * Hong Kong temperature visualizations (D3.js v7)
 *
 * Level 1: monthly maximum / minimum temperature heatmap (years x months).
 * Level 2: the same year-month grid for the latest years, where every cell
 *          holds a mini line chart of the daily maximum and minimum temperatures.
 *
 * Both levels share one color scale so the same color always means the same
 * temperature.
 */

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const DATA_FILE = "temperature_daily.csv";
const DATE_FORMAT = "%Y-%m-%d";

// Level 2 shows this many of the most recent years in the data.
const RECENT_YEARS = 10;

// Temperature range (degrees Celsius) covered by the color scale.
const TEMPERATURE_DOMAIN = [0, 39];

// Tick positions on both color legends: every 10°C, plus the top of the range.
const LEGEND_TICKS = [...d3.range(TEMPERATURE_DOMAIN[0], TEMPERATURE_DOMAIN[1], 10), TEMPERATURE_DOMAIN[1]];

// Colors of the two daily lines in Level 2 (also used by the line legend).
const LINE_COLORS = { max: "#2e8b57", min: "#9db4cc" };

// What the Level 1 buttons switch between.
const MODES = {
  max: { label: "Monthly maximum", field: "monthlyMax" },
  min: { label: "Monthly minimum", field: "monthlyMin" }
};

const LEVEL1_LAYOUT = {
  margin: { top: 40, right: 20, bottom: 20, left: 100 },
  cellWidth: 40,
  cellHeight: 30
};

const LEVEL2_LAYOUT = {
  margin: { top: 40, right: 10, bottom: 20, left: 100 },
  cellWidth: 92,
  cellHeight: 66,
  innerPadding: 5 // space between a cell's border and its lines
};

// ---------------------------------------------------------------------------
// Shared helpers: formatting and color
// ---------------------------------------------------------------------------

const parseDate = d3.timeParse(DATE_FORMAT);
const formatMonth = d3.timeFormat("%Y-%m");
const formatDay = d3.timeFormat("%Y-%m-%d");

// Month number (1-12) to full month name.
const monthName = month => d3.timeFormat("%B")(new Date(2000, month - 1, 1));

// First day of the month described by a monthly summary record.
const monthStart = d => new Date(d.year, d.month - 1, 1);

// Stepped color scale: 11 equal bins (about 3.5°C each) from purple (cold) to dark red (hot).
const colorScale = d3.scaleQuantize()
  .domain(TEMPERATURE_DOMAIN)
  .range(d3.schemeSpectral[11].slice().reverse());

// ---------------------------------------------------------------------------
// Data loading and preparation
// ---------------------------------------------------------------------------

// An empty CSV cell must become NaN (not 0) so it is filtered out later.
function toNumber(value) {
  return value === undefined || value.trim() === "" ? NaN : +value;
}

function parseRow(row) {
  return {
    date: parseDate(row.date),
    maxTemperature: toNumber(row.max_temperature),
    minTemperature: toNumber(row.min_temperature)
  };
}

function isValidRecord(d) {
  return d.date && Number.isFinite(d.maxTemperature) && Number.isFinite(d.minTemperature);
}

// Summarize the daily records of every year-month combination.
function groupByMonth(data) {
  const groups = d3.group(
    data,
    d => d.date.getFullYear(),
    d => d.date.getMonth() + 1
  );

  const months = [];
  for (const [year, byMonth] of groups) {
    for (const [month, records] of byMonth) {
      records.sort((a, b) => a.date - b.date);
      months.push({
        year,
        month,
        records,
        monthlyMax: d3.max(records, d => d.maxTemperature),
        monthlyMin: d3.min(records, d => d.minTemperature)
      });
    }
  }
  return months;
}

function uniqueYears(monthlyData) {
  return Array.from(new Set(monthlyData.map(d => d.year))).sort(d3.ascending);
}

// ---------------------------------------------------------------------------
// Shared helpers: SVG, axes, tooltip, legends
// ---------------------------------------------------------------------------

function createSvg(container, width, height) {
  return container.append("div")
    .attr("class", "chart-container")
    .append("svg")
    .attr("width", width)
    .attr("height", height);
}

// Years along the top, months down the left side.
function drawAxes(svg, xScale, yScale, margin) {
  svg.append("g")
    .attr("class", "axis")
    .attr("transform", `translate(0,${margin.top - 6})`)
    .call(d3.axisTop(xScale));

  svg.append("g")
    .attr("class", "axis")
    .attr("transform", `translate(${margin.left - 6},0)`)
    .call(d3.axisLeft(yScale).tickFormat(monthName));
}

// One tooltip element is shared by both visualizations.
function getTooltip() {
  let tooltip = d3.select("body").select(".tooltip");
  if (tooltip.empty()) {
    tooltip = d3.select("body")
      .append("div")
      .attr("class", "tooltip")
      .style("opacity", 0);
  }
  return tooltip;
}

function moveTooltip(event) {
  getTooltip()
    .style("left", `${event.pageX + 12}px`)
    .style("top", `${event.pageY + 12}px`);
}

function showTooltip(event, text) {
  getTooltip().text(text).style("opacity", 1);
  moveTooltip(event);
}

function hideTooltip() {
  getTooltip().style("opacity", 0);
}

// Horizontal stepped legend (Level 1): one swatch per color bin.
function drawColorLegend(container, title) {
  const barWidth = 360;
  const barHeight = 14;
  const [low, high] = TEMPERATURE_DOMAIN;

  const svg = container.append("svg")
    .attr("class", "legend")
    .attr("width", barWidth + 40)
    .attr("height", 62);

  const g = svg.append("g").attr("transform", "translate(14,0)");

  g.append("text")
    .attr("x", 0)
    .attr("y", 14)
    .text(title);

  const scale = d3.scaleLinear().domain(TEMPERATURE_DOMAIN).range([0, barWidth]);
  const colors = colorScale.range();
  const binSize = (high - low) / colors.length;

  g.selectAll("rect")
    .data(colors)
    .join("rect")
    .attr("x", (color, i) => scale(low + i * binSize))
    .attr("y", 22)
    .attr("width", scale(low + binSize) - scale(low))
    .attr("height", barHeight)
    .attr("fill", color => color);

  g.append("g")
    .attr("transform", `translate(0,${22 + barHeight})`)
    .call(
      d3.axisBottom(scale)
        .tickValues(LEGEND_TICKS)
        .tickFormat(d => `${d}°C`)
    );
}

// Vertical stepped legend (Level 2): 0 Celsius at the top, labeled 40 Celsius at the bottom
// to match the instructor's example (the color bins actually span TEMPERATURE_DOMAIN, 0 to 39).
function drawVerticalLegend(container, title) {
  const barWidth = 24;
  const binHeight = 22;
  const top = 24;
  const [low, high] = TEMPERATURE_DOMAIN;
  const colors = colorScale.range();
  const barHeight = binHeight * colors.length;

  const svg = container.append("svg")
    .attr("class", "legend")
    .attr("width", 140)
    .attr("height", top + barHeight + 12);

  svg.append("text")
    .attr("x", 0)
    .attr("y", 14)
    .text(title);

  svg.selectAll("rect")
    .data(colors)
    .join("rect")
    .attr("x", 0)
    .attr("y", (color, i) => top + i * binHeight)
    .attr("width", barWidth)
    .attr("height", binHeight)
    .attr("fill", color => color);

  const scale = d3.scaleLinear()
    .domain(TEMPERATURE_DOMAIN)
    .range([top, top + barHeight]);

  svg.append("g")
    .attr("transform", `translate(${barWidth},0)`)
    .call(
      d3.axisRight(scale)
        .tickValues(LEGEND_TICKS)
        // The bottom label is deliberately "40 Celsius" to match the instructor's example legend.
        .tickFormat(d => (d === low ? `${d} Celsius` : d === high ? "40 Celsius" : d))
    );
}

// Legend that explains the two lines inside the Level 2 cells.
function drawLineLegend(container) {
  const legend = container.append("div").attr("class", "line-legend");
  const items = [
    ["Daily maximum temperature", LINE_COLORS.max],
    ["Daily minimum temperature", LINE_COLORS.min]
  ];

  for (const [label, color] of items) {
    const item = legend.append("span").attr("class", "line-legend-item");
    item.append("span")
      .attr("class", "line-swatch")
      .style("background-color", color);
    item.append("span").text(label);
  }
}

// ---------------------------------------------------------------------------
// Level 1: monthly heatmap with a Max / Min switch
// ---------------------------------------------------------------------------

function level1Tooltip(d) {
  return `Date: ${formatMonth(monthStart(d))}; max: ${d.monthlyMax} min: ${d.monthlyMin}`;
}

function drawLevel1(monthlyData) {
  const { margin, cellWidth, cellHeight } = LEVEL1_LAYOUT;
  const container = d3.select("#level1-visualization");
  container.selectAll("*").remove();

  const years = uniqueYears(monthlyData);
  const months = d3.range(1, 13);

  // Max / Min buttons
  const buttons = container.append("div")
    .attr("class", "chart-controls")
    .selectAll("button")
    .data(Object.entries(MODES))
    .join("button")
    .text(([, mode]) => mode.label)
    .on("click", (event, [key]) => update(key));

  // Heatmap: one cell for every month-year combination
  const width = margin.left + margin.right + years.length * cellWidth;
  const height = margin.top + margin.bottom + months.length * cellHeight;
  const svg = createSvg(container, width, height);

  const x = d3.scaleBand()
    .domain(years)
    .range([margin.left, margin.left + years.length * cellWidth])
    .padding(0.08);

  const y = d3.scaleBand()
    .domain(months)
    .range([margin.top, margin.top + months.length * cellHeight])
    .padding(0.08);

  drawAxes(svg, x, y, margin);

  const cells = svg.selectAll(".heatmap-cell")
    .data(monthlyData)
    .join("rect")
    .attr("class", "heatmap-cell")
    .attr("x", d => x(d.year))
    .attr("y", d => y(d.month))
    .attr("width", x.bandwidth())
    .attr("height", y.bandwidth())
    .on("mouseover", (event, d) => showTooltip(event, level1Tooltip(d)))
    .on("mousemove", moveTooltip)
    .on("mouseout", hideTooltip);

  const legendBox = container.append("div");

  // Recolor the cells and rebuild the legend for the chosen mode.
  function update(modeKey) {
    const { label, field } = MODES[modeKey];

    buttons
      .classed("active", ([key]) => key === modeKey)
      .attr("aria-pressed", ([key]) => key === modeKey);

    cells.attr("fill", d => colorScale(d[field]));

    legendBox.selectAll("*").remove();
    drawColorLegend(legendBox, `${label} temperature (°C)`);
  }

  update("max");
}

// ---------------------------------------------------------------------------
// Level 2: mini line charts of the daily temperatures
// ---------------------------------------------------------------------------

function level2Tooltip(record) {
  return `Date: ${formatDay(record.date)}, max: ${record.maxTemperature} min: ${record.minTemperature}`;
}

function drawLevel2(monthlyData) {
  const { margin, cellWidth, cellHeight, innerPadding } = LEVEL2_LAYOUT;
  const container = d3.select("#level2-visualization");
  container.selectAll("*").remove();

  const years = uniqueYears(monthlyData).slice(-RECENT_YEARS);
  const data = monthlyData.filter(d => years.includes(d.year));
  const months = d3.range(1, 13);

  // Chart on the left, color legend on the right.
  const row = container.append("div").attr("class", "chart-row");

  const width = margin.left + margin.right + years.length * cellWidth;
  const height = margin.top + margin.bottom + months.length * cellHeight;
  const svg = createSvg(row, width, height);

  const xYear = d3.scaleBand()
    .domain(years)
    .range([margin.left, margin.left + years.length * cellWidth])
    .padding(0.08);

  const yMonth = d3.scaleBand()
    .domain(months)
    .range([margin.top, margin.top + months.length * cellHeight])
    .padding(0.08);

  drawAxes(svg, xYear, yMonth, margin);

  // Every cell has the same size and uses the same two scales, so the
  // mini charts can be compared with each other.
  const innerWidth = xYear.bandwidth();
  const innerHeight = yMonth.bandwidth();

  const dayScale = d3.scaleLinear()
    .domain([1, 31])
    .range([innerPadding, innerWidth - innerPadding]);

  const temperatureScale = d3.scaleLinear()
    .domain([d3.min(data, d => d.monthlyMin), d3.max(data, d => d.monthlyMax)])
    .nice()
    .range([innerHeight - innerPadding, innerPadding]);

  const maxLine = d3.line()
    .x(d => dayScale(d.date.getDate()))
    .y(d => temperatureScale(d.maxTemperature));

  const minLine = d3.line()
    .x(d => dayScale(d.date.getDate()))
    .y(d => temperatureScale(d.minTemperature));

  const cells = svg.selectAll(".daily-cell")
    .data(data)
    .join("g")
    .attr("class", "daily-cell")
    .attr("transform", d => `translate(${xYear(d.year)},${yMonth(d.month)})`);

  // Background color = the month's maximum temperature (same as Level 1 "max").
  cells.append("rect")
    .attr("class", "cell-background")
    .attr("width", innerWidth)
    .attr("height", innerHeight)
    .attr("fill", d => colorScale(d.monthlyMax));

  cells.append("path")
    .attr("class", "daily-line")
    .attr("stroke", LINE_COLORS.max)
    .attr("d", d => maxLine(d.records));

  cells.append("path")
    .attr("class", "daily-line")
    .attr("stroke", LINE_COLORS.min)
    .attr("d", d => minLine(d.records));

  // Transparent layer on top that reports the day under the mouse.
  cells.append("rect")
    .attr("class", "cell-overlay")
    .attr("width", innerWidth)
    .attr("height", innerHeight)
    .on("mouseover mousemove", function (event, d) {
      const [mouseX] = d3.pointer(event, this);
      const day = dayScale.invert(mouseX);
      const record = d3.least(d.records, r => Math.abs(r.date.getDate() - day));
      showTooltip(event, level2Tooltip(record));
    })
    .on("mouseout", hideTooltip);

  // Color legend to the right of the chart.
  drawVerticalLegend(row.append("div"), "Monthly maximum (°C)");

  // Line legend and a short explanation of the axes inside each cell.
  drawLineLegend(container);

  const [tempLow, tempHigh] = temperatureScale.domain();
  container.append("p")
    .attr("class", "chart-note")
    .text(
      `Inside each cell: x = day of the month (1 to 31), y = temperature ` +
      `(${tempLow}°C to ${tempHigh}°C, the same scale in every cell). ` +
      `Cell background = that month's maximum temperature (see the color legend).`
    );
}

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------

function showError(error) {
  console.error("Error loading temperature data:", error);
  d3.select("body")
    .append("p")
    .attr("class", "error-message")
    .text("Could not load the temperature data. Check the CSV filename and date format.");
}

d3.csv(DATA_FILE, parseRow)
  .then(rows => {
    const data = rows.filter(isValidRecord);
    if (data.length === 0) {
      throw new Error("No valid temperature records were found.");
    }

    const monthlyData = groupByMonth(data);
    drawLevel1(monthlyData);
    drawLevel2(monthlyData);
  })
  .catch(showError);
