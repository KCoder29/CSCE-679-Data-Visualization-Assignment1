
/*
 * CSCE 679 - Data Visualization Assignment 1
 * Hong Kong temperature visualizations
 */

const DATA_FILE = "temperature_daily.csv";

const margin = { top: 35, right: 20, bottom: 45, left: 65 };
const cellWidth = 24;
const cellHeight = 22;

let temperatureData = [];
let currentTemperature = "max";

// Load and prepare the temperature data.
d3.csv(DATA_FILE, row => ({
  date: d3.timeParse("%Y-%m-%d")(row.date),
  maxTemperature: +row.max_temperature,
  minTemperature: +row.min_temperature
}))
.then(data => {
  temperatureData = data.filter(d =>
    d.date &&
    Number.isFinite(d.maxTemperature) &&
    Number.isFinite(d.minTemperature)
  );

  if (temperatureData.length === 0) {
    throw new Error("No valid temperature records were found.");
  }

  drawLevel1();
  drawLevel2();
})
.catch(error => {
  console.error("Error loading temperature data:", error);

  d3.select("body")
    .append("p")
    .style("color", "red")
    .text("Could not load the temperature data. Check the CSV filename and date format.");
});

// Group daily data by year and month.
function groupByMonth(data) {
  const groups = d3.group(data, d =>
    `${d.date.getFullYear()}-${String(d.date.getMonth() + 1).padStart(2, "0")}`
  );

  return Array.from(groups, ([key, records]) => {
    const [year, month] = key.split("-").map(Number);

    return {
      key,
      year,
      month,
      records: records.sort((a, b) => a.date - b.date),
      monthlyMax: d3.max(records, d => d.maxTemperature),
      monthlyMin: d3.min(records, d => d.minTemperature),
      averageMax: d3.mean(records, d => d.maxTemperature),
      averageMin: d3.mean(records, d => d.minTemperature)
    };
  });
}

// Create a color scale for the temperature values.
function createColorScale(data, field) {
  const values = data.map(d => d[field]).filter(Number.isFinite);

  return d3.scaleSequential()
    .domain(d3.extent(values))
    .interpolator(d3.interpolateYlOrRd);
}

// Create a color legend.
function drawLegend(container, colorScale, label) {
  container.selectAll("*").remove();

  const width = 320;
  const height = 48;

  const svg = container.append("svg")
    .attr("class", "legend")
    .attr("width", width)
    .attr("height", height);

  const defs = svg.append("defs");

  const gradientId = `gradient-${Math.random().toString(36).slice(2)}`;

  const gradient = defs.append("linearGradient")
    .attr("id", gradientId);

  const domain = colorScale.domain();

  d3.range(0, 1.01, 0.1).forEach(t => {
    gradient.append("stop")
      .attr("offset", `${t * 100}%`)
      .attr("stop-color", colorScale(domain[0] + t * (domain[1] - domain[0])));
  });

  svg.append("text")
    .attr("x", 0)
    .attr("y", 12)
    .attr("font-size", 12)
    .text(label);

  svg.append("rect")
    .attr("x", 0)
    .attr("y", 19)
    .attr("width", width - 35)
    .attr("height", 12)
    .attr("fill", `url(#${gradientId})`);

  const scale = d3.scaleLinear()
    .domain(domain)
    .range([0, width - 35]);

  svg.append("g")
    .attr("transform", "translate(0,31)")
    .call(
      d3.axisBottom(scale)
        .ticks(5)
        .tickFormat(d => `${d.toFixed(1)}°`)
    )
    .call(g => g.select(".domain").remove());
}

// Create a tooltip shared by both visualizations.
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

// Level 1: one cell for every month and year.
function drawLevel1() {
  const container = d3.select("#level1-visualization");

  container.selectAll("*").remove();

  const monthlyData = groupByMonth(temperatureData);

  const years = Array.from(new Set(monthlyData.map(d => d.year)))
    .sort((a, b) => a - b);

  const months = d3.range(1, 13);
  const colorScale = createColorScale(monthlyData, "monthlyMax");
  const tooltip = getTooltip();

  const controls = container.append("div")
    .attr("class", "chart-controls");

  controls.append("button")
    .attr("class", "active")
    .text("Monthly maximum")
    .on("click", () => {
      currentTemperature = "max";
      drawLevel1();
    });

  controls.append("button")
    .attr("class", currentTemperature === "min" ? "active" : "")
    .text("Monthly minimum")
    .on("click", () => {
      currentTemperature = "min";
      drawLevel1();
    });

  const field = currentTemperature === "max" ? "monthlyMax" : "monthlyMin";

  const activeColorScale = createColorScale(monthlyData, field);

  const width = margin.left + margin.right + years.length * cellWidth;
  const height = margin.top + margin.bottom + months.length * cellHeight;

  const chart = container.append("div")
    .attr("class", "chart-container");

  const svg = chart.append("svg")
    .attr("width", width)
    .attr("height", height);

  const x = d3.scaleBand()
    .domain(years)
    .range([margin.left, margin.left + years.length * cellWidth])
    .padding(0.04);

  const y = d3.scaleBand()
    .domain(months)
    .range([margin.top, margin.top + months.length * cellHeight])
    .padding(0.04);

  svg.append("g")
    .attr("class", "axis")
    .attr("transform", `translate(0,${margin.top - 5})`)
    .call(d3.axisTop(x).tickValues(years.filter((d, i) => i % 2 === 0)));

  svg.append("g")
    .attr("class", "axis")
    .attr("transform", `translate(${margin.left - 5},0)`)
    .call(d3.axisLeft(y).tickFormat(d => d3.timeFormat("%b")(new Date(2000, d - 1, 1))));

  svg.selectAll(".heatmap-cell")
    .data(monthlyData)
    .join("rect")
    .attr("class", "heatmap-cell")
    .attr("x", d => x(d.year))
    .attr("y", d => y(d.month))
    .attr("width", x.bandwidth())
    .attr("height", y.bandwidth())
    .attr("fill", d => activeColorScale(d[field]))
    .on("mouseover", function(event, d) {
      tooltip
        .style("opacity", 1)
        .html(
          `<strong>${d3.timeFormat("%B %Y")(new Date(d.year, d.month - 1, 1))}</strong><br>` +
          `Monthly maximum: ${d.monthlyMax.toFixed(1)}°C<br>` +
          `Monthly minimum: ${d.monthlyMin.toFixed(1)}°C`
        );
    })
    .on("mousemove", function(event) {
      tooltip
        .style("left", `${event.pageX + 12}px`)
        .style("top", `${event.pageY + 12}px`);
    })
    .on("mouseout", function() {
      tooltip.style("opacity", 0);
    });

  drawLegend(
    container.append("div"),
    activeColorScale,
    currentTemperature === "max" ? "Monthly maximum temperature (°C)" : "Monthly minimum temperature (°C)"
  );
}

// Level 2: mini line charts showing daily temperatures in each month.
function drawLevel2() {
  const container = d3.select("#level2-visualization");

  container.selectAll("*").remove();

  const monthlyData = groupByMonth(temperatureData);
  const years = Array.from(new Set(monthlyData.map(d => d.year)))
    .sort((a, b) => a - b);

  // Display the latest 10 years available in the dataset.
  const recentYears = years.slice(-10);
  const recentData = monthlyData.filter(d => recentYears.includes(d.year));

  const months = d3.range(1, 13);
  const width = margin.left + margin.right + recentYears.length * 105;
  const height = margin.top + margin.bottom + months.length * 76;

  const chart = container.append("div")
    .attr("class", "chart-container");

  const svg = chart.append("svg")
    .attr("width", width)
    .attr("height", height);

  const xYear = d3.scaleBand()
    .domain(recentYears)
    .range([margin.left, margin.left + recentYears.length * 105])
    .padding(0.08);

  const yMonth = d3.scaleBand()
    .domain(months)
    .range([margin.top, margin.top + months.length * 76])
    .padding(0.08);

  svg.append("g")
    .attr("class", "axis")
    .attr("transform", `translate(0,${margin.top - 5})`)
    .call(d3.axisTop(xYear));

  svg.append("g")
    .attr("class", "axis")
    .attr("transform", `translate(${margin.left - 5},0)`)
    .call(d3.axisLeft(yMonth).tickFormat(d => d3.timeFormat("%b")(new Date(2000, d - 1, 1))));

  const tooltip = getTooltip();

  recentData.forEach(month => {
    const cellX = xYear(month.year);
    const cellY = yMonth(month.month);
    const cellWidth = xYear.bandwidth();
    const cellHeight = yMonth.bandwidth();

    const cell = svg.append("g")
      .attr("transform", `translate(${cellX},${cellY})`);

    cell.append("rect")
      .attr("width", cellWidth)
      .attr("height", cellHeight)
      .attr("fill", "#f4f4f4")
      .attr("stroke", "#cccccc");

    const innerMargin = 5;

    const x = d3.scaleLinear()
      .domain([1, d3.max(month.records, d => d.date.getDate()) || 31])
      .range([innerMargin, cellWidth - innerMargin]);

    const allTemps = month.records.flatMap(d => [
      d.maxTemperature,
      d.minTemperature
    ]);

    const y = d3.scaleLinear()
      .domain(d3.extent(allTemps))
      .nice()
      .range([cellHeight - innerMargin, innerMargin]);

    const lineMax = d3.line()
      .x(d => x(d.date.getDate()))
      .y(d => y(d.maxTemperature));

    const lineMin = d3.line()
      .x(d => x(d.date.getDate()))
      .y(d => y(d.minTemperature));

    cell.append("path")
      .datum(month.records)
      .attr("fill", "none")
      .attr("stroke", "#d73027")
      .attr("stroke-width", 1.2)
      .attr("d", lineMax);

    cell.append("path")
      .datum(month.records)
      .attr("fill", "none")
      .attr("stroke", "#4575b4")
      .attr("stroke-width", 1.2)
      .attr("d", lineMin);

    cell.append("rect")
      .attr("width", cellWidth)
      .attr("height", cellHeight)
      .attr("fill", "transparent")
      .on("mouseover", function(event) {
        tooltip
          .style("opacity", 1)
          .html(
            `<strong>${d3.timeFormat("%B %Y")(new Date(month.year, month.month - 1, 1))}</strong><br>` +
            `Daily maximum: red line<br>` +
            `Daily minimum: blue line<br>` +
            `Highest maximum: ${month.monthlyMax.toFixed(1)}°C<br>` +
            `Lowest minimum: ${month.monthlyMin.toFixed(1)}°C`
          );
      })
      .on("mousemove", function(event) {
        tooltip
          .style("left", `${event.pageX + 12}px`)
          .style("top", `${event.pageY + 12}px`);
      })
      .on("mouseout", function() {
        tooltip.style("opacity", 0);
      });
  });

  container.append("div")
    .attr("class", "line-legend")
    .html(
      '<span style="color:#d73027">━ Daily maximum temperature</span>' +
      '<span style="color:#4575b4">━ Daily minimum temperature</span>'
    );

  const colorScale = createColorScale(recentData, "averageMax");

  drawLegend(
    container.append("div"),
    colorScale,
    "Average daily maximum temperature for the month (°C)"
  );
}
