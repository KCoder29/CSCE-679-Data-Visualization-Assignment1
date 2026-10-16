
/*
 * CSCE 679 - Data Visualization Assignment 1
 * Load and validate the daily temperature dataset.
 */

// File containing the instructor-provided data.
const DATA_FILE = "temperature_daily.csv";

// Read the CSV file and convert temperature values to numbers.
d3.csv(DATA_FILE, function (row) {
  return {
    date: new Date(row.date),
    maxTemperature: Number(row.max_temperature),
    minTemperature: Number(row.min_temperature)
  };
})
  .then(function (temperatureData) {
    // Keep only records with valid dates and temperature values.
    const validTemperatureData = temperatureData.filter(function (record) {
      return (
        !Number.isNaN(record.date.getTime()) &&
        Number.isFinite(record.maxTemperature) &&
        Number.isFinite(record.minTemperature)
      );
    });

    // Report basic information so we can verify the dataset loaded.
    console.log("Temperature data loaded successfully.");
    console.log("Valid records:", validTemperatureData.length);
    console.log("First record:", validTemperatureData[0]);
    console.log("Last record:", validTemperatureData[validTemperatureData.length - 1]);
  })
  .catch(function (error) {
    console.error("Could not load the temperature dataset:", error);
  });
