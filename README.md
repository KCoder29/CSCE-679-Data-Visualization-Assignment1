# CSCE 679 - Data Visualization Assignment 1

## Hong Kong Temperature Heatmap

Live site: https://kcoder29.github.io/CSCE-679-Data-Visualization-Assignment1/

This project implements the Level 1 and Level 2 visualizations for CSCE 679
Assignment 1 using the instructor-provided daily temperature dataset
(`temperature_daily.csv`, columns `date`, `max_temperature`, `min_temperature`).

## Visualizations

**Level 1: Monthly temperature heatmap**
- Matrix of years (x) by months (y), one cell per month-year combination.
- Buttons switch between the monthly maximum and the monthly minimum temperature.
- Hovering over a cell shows the month and its maximum and minimum temperature.
- A color legend explains the color-to-temperature mapping.

**Level 2: Daily temperature details**
- The same year-month matrix for the latest 10 years in the data.
- Each cell contains a mini line chart: x = day of the month, y = temperature,
  with one line for the daily maximum and one for the daily minimum.
- The cell background shows that month's maximum temperature using the same color
  scale as Level 1.
- A line legend identifies the two lines and a color legend explains the backgrounds.
- Hovering over a cell shows the value for the day under the mouse.

## Design choices

- "Monthly maximum" is the highest daily maximum in that month, and "monthly
  minimum" is the lowest daily minimum in that month.
- Both levels use one stepped color scale (0 to 40 degrees Celsius, 11 bins from
  purple to dark red), so a color means the same temperature everywhere.
- All Level 2 mini charts share the same y-scale and the same 1-31 day axis, so
  they can be compared with each other.
- Empty values in the CSV are skipped rather than treated as 0.

## Project structure

- `index.html` - page structure and containers for the two visualizations
- `style.css` - page, chart, tooltip and legend styling
- `script.js` - data loading, grouping by month, Level 1 and Level 2 drawing code
- `temperature_daily.csv` - dataset

## Running locally

Browsers block loading CSV files from `file://`, so start a local server:

```
python -m http.server 8000
```

Then open http://localhost:8000.

## Technologies

HTML, CSS, JavaScript, D3.js v7
