require("dotenv").config();
const { logger } = require("../utils/logger");
const {
  fetchConfiguration,
  getAdvanceWebhookUrls,
} = require("../services/googleSheetsService");

// Cached configuration - populated by loadConfiguration()
let regionsConfig = null;
let configLoaded = false;

/**
 * Load configuration from Google Sheets
 * Must be called before using any config functions
 * @returns {Promise<void>}
 */
async function loadConfiguration() {
  if (configLoaded) {
    return;
  }

  try {
    regionsConfig = await fetchConfiguration();
    configLoaded = true;
    logger.info("Configuration loaded successfully from Google Sheets");
  } catch (error) {
    logger.error(`Failed to load configuration: ${error.message}`);
    throw error;
  }
}

/**
 * Ensure configuration is loaded before accessing it
 */
function ensureConfigLoaded() {
  if (!configLoaded) {
    throw new Error(
      "Configuration not loaded. Call loadConfiguration() first."
    );
  }
}

/**
 * Get all configured regions (those with webhook URLs)
 * @returns {Array<Object>} - Array of region configurations
 */
function getConfiguredRegions() {
  ensureConfigLoaded();

  if (!regionsConfig || !regionsConfig.regions) {
    return [];
  }

  return Object.entries(regionsConfig.regions)
    .filter(([_, region]) => {
      return Array.isArray(region.webhookUrls) && region.webhookUrls.length > 0;
    })
    .map(([regionId, region]) => ({
      id: regionId,
      ...region,
    }));
}

/**
 * Get configuration for a specific region
 * @param {string} regionId - Region identifier (display name)
 * @returns {Object} - Region configuration
 */
function getRegionConfig(regionId) {
  ensureConfigLoaded();

  if (
    !regionsConfig ||
    !regionsConfig.regions ||
    !regionsConfig.regions[regionId]
  ) {
    throw new Error(`Region '${regionId}' not found in configuration`);
  }

  const region = regionsConfig.regions[regionId];

  // Normalize webhookUrls to always be an array
  let webhookUrls = [];
  if (Array.isArray(region.webhookUrls)) {
    webhookUrls = region.webhookUrls.filter(
      (url) => url && typeof url === "string"
    );
  }

  if (webhookUrls.length === 0) {
    throw new Error(`No webhook URLs configured for region '${regionId}'`);
  }

  return {
    id: regionId,
    ...region,
    webhookUrls,
  };
}

/**
 * Get the consolidated weekly forecast webhook URL
 * @returns {string|undefined} - Webhook URL or undefined if not configured
 */
function getWeeklyForecastWebhookUrl() {
  return process.env.WEEKLY_FORECAST_WEBHOOK_URL;
}

/**
 * Get all advance forecast webhook URLs
 * @returns {string[]} - Array of webhook URLs
 */
function getAdvanceForecastWebhookUrls() {
  return getAdvanceWebhookUrls();
}

/**
 * Reset configuration (useful for testing)
 */
function resetConfiguration() {
  regionsConfig = null;
  configLoaded = false;
}

module.exports = {
  loadConfiguration,
  getConfiguredRegions,
  getRegionConfig,
  getWeeklyForecastWebhookUrl,
  getAdvanceForecastWebhookUrls,
  resetConfiguration,
};
