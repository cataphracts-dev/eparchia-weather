require("dotenv").config();
const fs = require("fs");
const path = require("path");

// Load regional configurations with flexible file discovery
const loadRegionsConfig = () => {
  // 1. Try to load from REGIONS_CONFIG environment variable (for GitHub Actions)
  if (process.env.REGIONS_CONFIG) {
    try {
      const config = JSON.parse(process.env.REGIONS_CONFIG);
      console.log(
        `[CONFIG] Loaded regions configuration from REGIONS_CONFIG environment variable`
      );
      return config;
    } catch (error) {
      console.warn(
        `[CONFIG] Failed to parse REGIONS_CONFIG environment variable: ${error.message}`
      );
    }
  }

  // 2. Priority order for regions configuration files
  const possiblePaths = [
    // Custom user file (highest priority)
    path.join(process.cwd(), "regions.json"),
    path.join(process.cwd(), "config", "regions.json"),
    path.join(process.cwd(), "src", "config", "custom-regions.json"),

    // Default example file (fallback)
    path.join(__dirname, "regions.json"),
    path.join(__dirname, "regions-example.json"),
  ];

  for (const regionsPath of possiblePaths) {
    try {
      if (fs.existsSync(regionsPath)) {
        const config = JSON.parse(fs.readFileSync(regionsPath, "utf8"));
        console.log(
          `[CONFIG] Loaded regions configuration from: ${regionsPath}`
        );
        return config;
      }
    } catch (error) {
      console.warn(
        `[CONFIG] Failed to load regions from ${regionsPath}: ${error.message}`
      );
    }
  }

  // No regions file found - return empty config
  console.log("[CONFIG] No regions configuration found");
  return { regions: {} };
};

let regionsConfig = loadRegionsConfig();

// Build simplified config - only need the weekly forecast webhook URL
const config = {
  // Consolidated weekly forecast webhook (all regions in one channel)
  WEEKLY_FORECAST_WEBHOOK_URL: process.env.WEEKLY_FORECAST_WEBHOOK_URL,
};

// Function to validate specific environment variables
const validateConfig = (requiredVars = [], optionalVars = []) => {
  for (const varName of requiredVars) {
    if (!config[varName]) {
      console.error(`Missing required environment variable: ${varName}`);
      process.exit(1);
    }
  }

  // Warn about optional variables
  for (const varName of optionalVars) {
    if (!config[varName]) {
      console.warn(`Optional environment variable not set: ${varName}`);
    }
  }
};

// Function to get all configured regions
const getConfiguredRegions = () => {
  if (!regionsConfig.regions) return [];

  return Object.entries(regionsConfig.regions)
    .filter(([_, region]) => {
      // Support both webhookUrls (array) and webhookUrl (single, for backward compatibility)
      return (
        (Array.isArray(region.webhookUrls) && region.webhookUrls.length > 0) ||
        region.webhookUrl
      );
    })
    .map(([regionId, region]) => ({
      id: regionId,
      ...region,
    }));
};

// Function to get a specific region configuration
const getRegionConfig = (regionId) => {
  if (!regionsConfig.regions || !regionsConfig.regions[regionId]) {
    throw new Error(`Region '${regionId}' not found in configuration`);
  }

  const region = regionsConfig.regions[regionId];

  // Normalize webhookUrls to always be an array
  let webhookUrls = [];
  if (Array.isArray(region.webhookUrls)) {
    webhookUrls = region.webhookUrls.filter(
      (url) => url && typeof url === "string"
    );
  } else if (region.webhookUrl && typeof region.webhookUrl === "string") {
    // Backward compatibility: convert single webhookUrl to array
    webhookUrls = [region.webhookUrl];
  }

  // Check if any webhook URLs are configured
  if (webhookUrls.length === 0) {
    throw new Error(`No webhook URLs configured for region '${regionId}'`);
  }

  return {
    id: regionId,
    ...region,
    webhookUrls, // Always provide as array for consistent interface
  };
};

// Function to get the consolidated weekly forecast webhook URL
const getWeeklyForecastWebhookUrl = () => {
  return config.WEEKLY_FORECAST_WEBHOOK_URL;
};

// Function to validate region webhook configuration
const validateRegionConfig = (regionId) => {
  const region = getRegionConfig(regionId);

  if (!region.webhookUrls || region.webhookUrls.length === 0) {
    throw new Error(`No webhook URLs configured for region '${regionId}'`);
  }

  return region;
};

// Function to validate a custom region definition
const validateRegionDefinition = (regionId, regionData) => {
  const errors = [];

  // Check required fields
  if (!regionData.name) {
    errors.push(`Region '${regionId}' missing required field: name`);
  }
  // Support both webhookUrls (array) and webhookUrl (single, for backward compatibility)
  const hasWebhookUrls =
    Array.isArray(regionData.webhookUrls) && regionData.webhookUrls.length > 0;
  const hasWebhookUrl =
    regionData.webhookUrl && typeof regionData.webhookUrl === "string";
  if (!hasWebhookUrls && !hasWebhookUrl) {
    errors.push(
      `Region '${regionId}' missing required field: webhookUrls (array) or webhookUrl (string)`
    );
  }

  // Check seasonal weather structure
  if (!regionData.seasonalWeather) {
    errors.push(`Region '${regionId}' missing required field: seasonalWeather`);
  } else {
    const requiredSeasons = ["spring", "summer", "autumn", "winter"];
    const seasons = Object.keys(regionData.seasonalWeather);

    for (const season of requiredSeasons) {
      if (!seasons.includes(season)) {
        errors.push(`Region '${regionId}' missing season: ${season}`);
        continue;
      }

      const seasonData = regionData.seasonalWeather[season];
      // Require single 'conditions' array only
      if (!Array.isArray(seasonData.conditions)) {
        errors.push(
          `Region '${regionId}' season '${season}' must define a 'conditions' array`
        );
      } else if (seasonData.conditions.length === 0) {
        errors.push(
          `Region '${regionId}' season '${season}' conditions cannot be empty`
        );
      }

      // Validate mechanicalImpacts if it exists (optional) against 'conditions'
      if (seasonData.mechanicalImpacts) {
        if (
          typeof seasonData.mechanicalImpacts !== "object" ||
          Array.isArray(seasonData.mechanicalImpacts)
        ) {
          errors.push(
            `Region '${regionId}' season '${season}' mechanicalImpacts must be an object`
          );
        } else {
          const known = new Set(seasonData.conditions || []);
          Object.keys(seasonData.mechanicalImpacts).forEach((condition) => {
            if (!known.has(condition)) {
              errors.push(
                `Region '${regionId}' season '${season}' mechanicalImpacts references unknown condition: '${condition}'`
              );
            }
          });
        }
      }
    }
  }

  return errors;
};

// Function to validate all regions in the current configuration
const validateAllRegions = () => {
  const allErrors = [];

  if (!regionsConfig.regions) {
    return ["No regions configuration found"];
  }

  Object.entries(regionsConfig.regions).forEach(([regionId, regionData]) => {
    const errors = validateRegionDefinition(regionId, regionData);
    allErrors.push(...errors);
  });

  return allErrors;
};

// Function to create a region template
const createRegionTemplate = (regionId, regionName) => {
  return {
    name: regionName,
    webhookUrls: [
      "https://discord.com/api/webhooks/YOUR_WEBHOOK_ID_1/YOUR_WEBHOOK_TOKEN_1",
      "https://discord.com/api/webhooks/YOUR_WEBHOOK_ID_2/YOUR_WEBHOOK_TOKEN_2",
    ],
    seasonalWeather: {
      spring: {
        conditions: [
          "Mild spring weather",
          "Pleasant spring day",
          "Spring showers",
          "Warming temperatures",
          "Fresh spring air",
        ],
      },
      summer: {
        conditions: [
          "Warm summer day",
          "Hot and sunny",
          "Summer heat",
          "Bright summer weather",
          "Intense summer sun",
        ],
      },
      autumn: {
        conditions: [
          "Crisp autumn day",
          "Fall weather",
          "Changing seasons",
          "Autumn breeze",
          "Cool autumn temperatures",
        ],
      },
      winter: {
        conditions: [
          "Cold winter day",
          "Winter chill",
          "Freezing temperatures",
          "Winter weather",
          "Harsh winter conditions",
        ],
      },
    },
  };
};

// Function to get regions file path (for saving custom regions)
const getRegionsFilePath = () => {
  const customPath = path.join(process.cwd(), "regions.json");
  return customPath;
};

module.exports = {
  config,
  validateConfig,
  regionsConfig,
  getConfiguredRegions,
  getRegionConfig,
  validateRegionConfig,
  getWeeklyForecastWebhookUrl,
  validateRegionDefinition,
  validateAllRegions,
  createRegionTemplate,
  getRegionsFilePath,
};
