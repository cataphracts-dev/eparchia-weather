require("dotenv").config();
const fs = require("fs");
const path = require("path");

// Helper function to try loading a JSON file from multiple locations
const tryLoadJsonFile = (possiblePaths, fileDescription) => {
  for (const filePath of possiblePaths) {
    try {
      if (fs.existsSync(filePath)) {
        const config = JSON.parse(fs.readFileSync(filePath, "utf8"));
        console.log(`[CONFIG] Loaded ${fileDescription} from: ${filePath}`);
        return config;
      }
    } catch (error) {
      console.warn(
        `[CONFIG] Failed to load ${fileDescription} from ${filePath}: ${error.message}`
      );
    }
  }
  return null;
};

// Load channels configuration (webhook URLs)
const loadChannelsConfig = () => {
  const possiblePaths = [
    path.join(process.cwd(), "channels.json"),
    path.join(process.cwd(), "config", "channels.json"),
    path.join(process.cwd(), "src", "config", "channels.json"),
    path.join(__dirname, "channels.json"),
    path.join(__dirname, "channels-example.json"),
  ];

  const config = tryLoadJsonFile(possiblePaths, "channels configuration");
  return config || { channels: {} };
};

// Load channel assignments (which channels go to which regions)
const loadChannelAssignments = () => {
  const possiblePaths = [
    path.join(process.cwd(), "channel-assignments.json"),
    path.join(process.cwd(), "config", "channel-assignments.json"),
    path.join(process.cwd(), "src", "config", "channel-assignments.json"),
    path.join(__dirname, "channel-assignments.json"),
    path.join(__dirname, "channel-assignments-example.json"),
  ];

  const config = tryLoadJsonFile(possiblePaths, "channel assignments");
  return config || { assignments: {}, weeklyForecastChannel: null };
};

// Load regional weather configurations
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

// Load all configurations
let channelsConfig = loadChannelsConfig();
let channelAssignments = loadChannelAssignments();
let regionsConfig = loadRegionsConfig();

// Merge configurations: combine region weather data with channel assignments
const mergeConfigurations = () => {
  const merged = { regions: {} };

  // For each region in the regions.json (weather data)
  Object.entries(regionsConfig.regions || {}).forEach(
    ([regionId, regionData]) => {
      // Get channel assignments for this region
      const assignments = channelAssignments.assignments[regionId] || {};

      // Resolve channel IDs to webhook URLs
      const webhookUrls = (assignments.channels || [])
        .map((channelId) => {
          const channel = channelsConfig.channels[channelId];
          if (!channel) {
            console.warn(
              `[CONFIG] Channel '${channelId}' not found in channels.json for region '${regionId}'`
            );
            return null;
          }
          return channel.webhookUrl;
        })
        .filter((url) => url);

      const advanceWebhookUrls = (assignments.advanceChannels || [])
        .map((channelId) => {
          const channel = channelsConfig.channels[channelId];
          if (!channel) {
            console.warn(
              `[CONFIG] Advance channel '${channelId}' not found in channels.json for region '${regionId}'`
            );
            return null;
          }
          return channel.webhookUrl;
        })
        .filter((url) => url);

      // Merge everything together
      merged.regions[regionId] = {
        ...regionData,
        webhookUrls,
        advanceWebhookUrls,
        // Keep backward compatibility - if webhookUrls is set in regions.json, keep it
        ...(regionData.webhookUrls && { webhookUrls: regionData.webhookUrls }),
        ...(regionData.advanceWebhookUrls && {
          advanceWebhookUrls: regionData.advanceWebhookUrls,
        }),
      };
    }
  );

  return merged;
};

// Create the merged configuration
regionsConfig = mergeConfigurations();

// Build simplified config - only need the weekly forecast webhook URL
const config = {
  // Consolidated weekly forecast webhook (all regions in one channel)
  WEEKLY_FORECAST_WEBHOOK_URL: process.env.WEEKLY_FORECAST_WEBHOOK_URL,
};

// Resolve weekly forecast webhook from channel assignments if not in env
if (
  !config.WEEKLY_FORECAST_WEBHOOK_URL &&
  channelAssignments.weeklyForecastChannel
) {
  const channelId = channelAssignments.weeklyForecastChannel;
  const channel = channelsConfig.channels[channelId];
  if (channel && channel.webhookUrl) {
    config.WEEKLY_FORECAST_WEBHOOK_URL = channel.webhookUrl;
    console.log(
      `[CONFIG] Resolved weekly forecast webhook from channel: ${channelId}`
    );
  } else {
    console.warn(
      `[CONFIG] Weekly forecast channel '${channelId}' not found in channels.json`
    );
  }
}

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

  // Normalize advanceWebhookUrls to always be an array (optional)
  let advanceWebhookUrls = [];
  if (Array.isArray(region.advanceWebhookUrls)) {
    advanceWebhookUrls = region.advanceWebhookUrls.filter(
      (url) => url && typeof url === "string"
    );
  }

  // Check if any webhook URLs are configured
  if (webhookUrls.length === 0) {
    throw new Error(`No webhook URLs configured for region '${regionId}'`);
  }

  return {
    id: regionId,
    ...region,
    webhookUrls, // Always provide as array for consistent interface
    advanceWebhookUrls, // Always provide as array (may be empty)
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

  // Validate advanceWebhookUrls if it exists (optional)
  if (regionData.advanceWebhookUrls !== undefined) {
    if (!Array.isArray(regionData.advanceWebhookUrls)) {
      errors.push(
        `Region '${regionId}' advanceWebhookUrls must be an array if provided`
      );
    } else if (regionData.advanceWebhookUrls.length === 0) {
      errors.push(
        `Region '${regionId}' advanceWebhookUrls should not be an empty array (omit if not needed)`
      );
    }
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
    advanceWebhookUrls: [
      "https://discord.com/api/webhooks/YOUR_ADVANCE_WEBHOOK_ID/YOUR_ADVANCE_TOKEN",
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
