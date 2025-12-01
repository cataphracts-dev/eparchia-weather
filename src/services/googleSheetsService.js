const { google } = require("googleapis");
const { logger } = require("../utils/logger");

// Cache for the configuration - fetched once per run
let cachedConfig = null;

/**
 * Extract the spreadsheet ID from a Google Sheets URL
 * @param {string} sheetLink - Full Google Sheets URL
 * @returns {string} - Spreadsheet ID
 */
function extractSpreadsheetId(sheetLink) {
  // Handles URLs like:
  // https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/edit#gid=0
  // https://docs.google.com/spreadsheets/d/SPREADSHEET_ID
  const match = sheetLink.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (!match) {
    throw new Error(`Invalid Google Sheets URL: ${sheetLink}`);
  }
  return match[1];
}

/**
 * Create an authenticated Google Sheets client
 * @returns {Promise<object>} - Google Sheets API client
 */
async function getGoogleSheetsClient() {
  const serviceAccountKey = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;

  if (!serviceAccountKey) {
    throw new Error("GOOGLE_SERVICE_ACCOUNT_KEY environment variable not set");
  }

  let credentials;
  try {
    credentials = JSON.parse(serviceAccountKey);
  } catch (error) {
    throw new Error(
      `Failed to parse GOOGLE_SERVICE_ACCOUNT_KEY: ${error.message}`
    );
  }

  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
  });

  const sheets = google.sheets({ version: "v4", auth });
  return sheets;
}

/**
 * Fetch data from a specific sheet
 * @param {object} sheets - Google Sheets API client
 * @param {string} spreadsheetId - Spreadsheet ID
 * @param {string} range - Sheet name and range (e.g., "Commander Database!A:B")
 * @returns {Promise<string[][]>} - 2D array of cell values
 */
async function fetchSheetData(sheets, spreadsheetId, range) {
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range,
    });

    return response.data.values || [];
  } catch (error) {
    throw new Error(
      `Failed to fetch sheet data for range "${range}": ${error.message}`
    );
  }
}

/**
 * Parse the Commander Database sheet
 * Groups webhook URLs by region
 * @param {string[][]} data - Raw sheet data
 * @returns {Object<string, string[]>} - Map of region name to webhook URLs
 */
function parseCommanderDatabase(data) {
  if (!data || data.length < 2) {
    logger.warn("Commander Database sheet is empty or has no data rows");
    return {};
  }

  // Find column indices from header row
  const headers = data[0].map((h) => h.toLowerCase().trim());
  const webhookUrlIndex = headers.findIndex(
    (h) => h.includes("webhook") && h.includes("url")
  );
  const regionIndex = headers.findIndex(
    (h) => h.includes("weather") && h.includes("region")
  );

  if (webhookUrlIndex === -1) {
    throw new Error('Commander Database sheet missing "Webhook URL" column');
  }
  if (regionIndex === -1) {
    throw new Error('Commander Database sheet missing "Weather Region" column');
  }

  // Group webhooks by region
  const regionWebhooks = {};

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const webhookUrl = row[webhookUrlIndex]?.trim();
    const region = row[regionIndex]?.trim();

    if (!webhookUrl || !region) {
      continue; // Skip rows with missing data
    }

    if (!regionWebhooks[region]) {
      regionWebhooks[region] = [];
    }

    // Avoid duplicate webhook URLs
    if (!regionWebhooks[region].includes(webhookUrl)) {
      regionWebhooks[region].push(webhookUrl);
    }
  }

  logger.info(
    `Parsed Commander Database: ${
      Object.keys(regionWebhooks).length
    } regions found`
  );

  return regionWebhooks;
}

/**
 * Parse the Weather Regions sheet (contains two tables)
 * @param {string[][]} data - Raw sheet data
 * @returns {{ seasonalWeather: Object, mechanicalImpacts: Object }}
 */
function parseWeatherRegions(data) {
  if (!data || data.length < 2) {
    throw new Error("Weather Regions sheet is empty or has no data");
  }

  // Find the two tables by looking for their header rows
  let regionalWeatherStart = -1;
  let mechanicalImpactsStart = -1;

  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    if (!row || row.length === 0) continue;

    const firstCell = row[0]?.toLowerCase().trim() || "";

    // Look for the regional weather table header
    if (firstCell === "region" && row.length >= 5) {
      const headers = row.map((h) => h?.toLowerCase().trim() || "");
      if (
        headers.some((h) => h.includes("spring")) &&
        headers.some((h) => h.includes("summer"))
      ) {
        regionalWeatherStart = i;
      }
    }

    // Look for the mechanical impacts table header
    if (firstCell === "condition" && row.length >= 2) {
      const secondCell = row[1]?.toLowerCase().trim() || "";
      if (secondCell.includes("mechanical") || secondCell.includes("impact")) {
        mechanicalImpactsStart = i;
      }
    }
  }

  if (regionalWeatherStart === -1) {
    throw new Error(
      'Weather Regions sheet missing regional weather table (looking for "Region | Spring Weather | Summer Weather | ..." header)'
    );
  }

  if (mechanicalImpactsStart === -1) {
    throw new Error(
      'Weather Regions sheet missing mechanical impacts table (looking for "Condition | Mechanical Impact" header)'
    );
  }

  // Parse regional weather table
  const seasonalWeather = parseRegionalWeatherTable(
    data,
    regionalWeatherStart,
    mechanicalImpactsStart
  );

  // Parse mechanical impacts table
  const mechanicalImpacts = parseMechanicalImpactsTable(
    data,
    mechanicalImpactsStart
  );

  return { seasonalWeather, mechanicalImpacts };
}

/**
 * Parse the regional weather table
 * @param {string[][]} data - Full sheet data
 * @param {number} startRow - Row index where table starts (header row)
 * @param {number} endRow - Row index where next table starts (or end of data)
 * @returns {Object} - Map of region to seasonal weather config
 */
function parseRegionalWeatherTable(data, startRow, endRow) {
  const headers = data[startRow].map((h) => h?.toLowerCase().trim() || "");

  // Find season column indices
  const springIndex = headers.findIndex((h) => h.includes("spring"));
  const summerIndex = headers.findIndex((h) => h.includes("summer"));
  const autumnIndex = headers.findIndex(
    (h) => h.includes("autumn") || h.includes("fall")
  );
  const winterIndex = headers.findIndex((h) => h.includes("winter"));

  if (
    springIndex === -1 ||
    summerIndex === -1 ||
    autumnIndex === -1 ||
    winterIndex === -1
  ) {
    throw new Error(
      "Weather Regions table missing one or more season columns (Spring, Summer, Autumn/Fall, Winter)"
    );
  }

  const seasonalWeather = {};

  for (let i = startRow + 1; i < endRow && i < data.length; i++) {
    const row = data[i];
    if (!row || !row[0]?.trim()) {
      // Empty row - end of this table
      break;
    }

    const regionName = row[0].trim();

    // Parse comma-separated conditions for each season
    const parseConditions = (cellValue) => {
      if (!cellValue) return [];
      return cellValue
        .split(",")
        .map((c) => c.trim())
        .filter((c) => c.length > 0);
    };

    seasonalWeather[regionName] = {
      spring: { conditions: parseConditions(row[springIndex]) },
      summer: { conditions: parseConditions(row[summerIndex]) },
      autumn: { conditions: parseConditions(row[autumnIndex]) },
      winter: { conditions: parseConditions(row[winterIndex]) },
    };
  }

  logger.info(
    `Parsed regional weather for ${Object.keys(seasonalWeather).length} regions`
  );

  return seasonalWeather;
}

/**
 * Parse the mechanical impacts table
 * @param {string[][]} data - Full sheet data
 * @param {number} startRow - Row index where table starts (header row)
 * @returns {Object} - Map of condition to mechanical impact string
 */
function parseMechanicalImpactsTable(data, startRow) {
  const headers = data[startRow].map((h) => h?.toLowerCase().trim() || "");

  const conditionIndex = headers.findIndex((h) => h === "condition");
  const impactIndex = headers.findIndex(
    (h) => h.includes("mechanical") || h.includes("impact")
  );

  if (conditionIndex === -1 || impactIndex === -1) {
    throw new Error(
      "Mechanical impacts table missing Condition or Mechanical Impact column"
    );
  }

  const mechanicalImpacts = {};

  for (let i = startRow + 1; i < data.length; i++) {
    const row = data[i];
    if (!row || !row[conditionIndex]?.trim()) {
      // Empty row - could be end of table or just a gap
      continue;
    }

    const condition = row[conditionIndex].trim();
    const impact = row[impactIndex]?.trim() || "";

    if (condition && impact) {
      mechanicalImpacts[condition] = impact;
    }
  }

  logger.info(
    `Parsed ${Object.keys(mechanicalImpacts).length} mechanical impacts`
  );

  return mechanicalImpacts;
}

/**
 * Merge all parsed data into the final configuration format
 * @param {Object<string, string[]>} regionWebhooks - Region to webhook URLs mapping
 * @param {Object} seasonalWeather - Region to seasonal conditions mapping
 * @param {Object} mechanicalImpacts - Condition to impact mapping
 * @returns {Object} - Final regions configuration
 */
function mergeConfiguration(
  regionWebhooks,
  seasonalWeather,
  mechanicalImpacts
) {
  const regions = {};

  // For each region that has webhook URLs
  for (const [regionName, webhookUrls] of Object.entries(regionWebhooks)) {
    // Check if we have weather data for this region
    if (!seasonalWeather[regionName]) {
      logger.warn(
        `Region "${regionName}" has webhooks but no weather data in Weather Regions sheet - skipping`
      );
      continue;
    }

    const regionWeather = seasonalWeather[regionName];

    // Add mechanical impacts to each season's conditions
    const enrichedSeasonalWeather = {};
    for (const [season, seasonData] of Object.entries(regionWeather)) {
      const seasonMechanicalImpacts = {};

      for (const condition of seasonData.conditions) {
        if (mechanicalImpacts[condition]) {
          // Store as array with single string (matching current format)
          seasonMechanicalImpacts[condition] = [mechanicalImpacts[condition]];
        }
      }

      enrichedSeasonalWeather[season] = {
        conditions: seasonData.conditions,
        ...(Object.keys(seasonMechanicalImpacts).length > 0 && {
          mechanicalImpacts: seasonMechanicalImpacts,
        }),
      };
    }

    // Use regionName as both ID and display name (simplified)
    regions[regionName] = {
      name: regionName,
      webhookUrls,
      seasonalWeather: enrichedSeasonalWeather,
    };
  }

  // Log any regions in Weather Regions that don't have webhooks
  for (const regionName of Object.keys(seasonalWeather)) {
    if (!regionWebhooks[regionName]) {
      logger.warn(
        `Region "${regionName}" has weather data but no webhooks in Commander Database - skipping`
      );
    }
  }

  logger.info(`Final configuration: ${Object.keys(regions).length} regions`);

  return { regions };
}

/**
 * Fetch and parse all configuration from Google Sheets
 * Results are cached for the duration of the run
 * @returns {Promise<Object>} - Complete regions configuration
 */
async function fetchConfiguration() {
  // Return cached config if available
  if (cachedConfig) {
    logger.info("Using cached Google Sheets configuration");
    return cachedConfig;
  }

  const sheetLink = process.env.GOOGLE_SHEET_LINK;
  if (!sheetLink) {
    throw new Error("GOOGLE_SHEET_LINK environment variable not set");
  }

  logger.info("Fetching configuration from Google Sheets...");

  const spreadsheetId = extractSpreadsheetId(sheetLink);
  const sheets = await getGoogleSheetsClient();

  // Fetch both sheets in parallel
  const [commanderData, weatherData] = await Promise.all([
    fetchSheetData(sheets, spreadsheetId, "Commander Database!A:Z"),
    fetchSheetData(sheets, spreadsheetId, "Weather Regions!A:Z"),
  ]);

  // Parse the data
  const regionWebhooks = parseCommanderDatabase(commanderData);
  const { seasonalWeather, mechanicalImpacts } =
    parseWeatherRegions(weatherData);

  // Merge into final configuration
  cachedConfig = mergeConfiguration(
    regionWebhooks,
    seasonalWeather,
    mechanicalImpacts
  );

  return cachedConfig;
}

/**
 * Clear the cached configuration (useful for testing)
 */
function clearConfigCache() {
  cachedConfig = null;
}

/**
 * Get advance webhook URLs from environment variable
 * @returns {string[]} - Array of advance webhook URLs
 */
function getAdvanceWebhookUrls() {
  const urlsString = process.env.ADVANCE_WEBHOOK_URLS;
  if (!urlsString) {
    return [];
  }

  return urlsString
    .split(",")
    .map((url) => url.trim())
    .filter((url) => url.length > 0);
}

module.exports = {
  fetchConfiguration,
  clearConfigCache,
  getAdvanceWebhookUrls,
  // Exported for testing
  extractSpreadsheetId,
  parseCommanderDatabase,
  parseWeatherRegions,
  mergeConfiguration,
};
