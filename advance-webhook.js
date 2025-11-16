const axios = require("axios");
const {
  getRegionalAdvanceForecast,
  getWeatherEmoji,
} = require("./src/services/weatherService");
const {
  getConfiguredRegions,
  getRegionConfig,
} = require("./src/config/config");
const { logger } = require("./src/utils/logger");

async function sendRegionalAdvanceForecastWebhook(regionId) {
  try {
    // Get region configuration
    const regionConfig = getRegionConfig(regionId);

    // Check if this region has any advance forecast webhooks configured
    if (
      !regionConfig.advanceWebhookUrls ||
      regionConfig.advanceWebhookUrls.length === 0
    ) {
      logger.info(
        `No advance forecast webhooks configured for region: ${regionConfig.name}`
      );
      return { success: true, skipped: true };
    }

    logger.info(
      `Sending advance weather forecast for region: ${regionConfig.name}`
    );

    // Get weather data for tomorrow (single condition + impacts)
    const weather = getRegionalAdvanceForecast(regionConfig);

    // Build the weather message content
    let messageContent =
      `📅 **Tomorrow's Weather Forecast${
        regionConfig.name ? ` - ${regionConfig.name}` : ""
      }**\n` +
      `**Date:** ${weather.date}\n` +
      `**Season:** ${
        weather.season.charAt(0).toUpperCase() + weather.season.slice(1)
      }\n` +
      `${getWeatherEmoji(weather.condition, false)} **Weather:** ${
        weather.condition
      }\n`;

    // Add mechanical impacts if any
    if (Array.isArray(weather.impacts) && weather.impacts.length > 0) {
      weather.impacts.forEach((impact) => {
        messageContent += `⚠️ ${impact}\n`;
      });
    }

    // Format the message for Discord webhook
    const weatherMessage = {
      content: messageContent,
    };

    // Send to all advance forecast Discord webhooks for this region
    const results = [];
    for (let i = 0; i < regionConfig.advanceWebhookUrls.length; i++) {
      const webhookUrl = regionConfig.advanceWebhookUrls[i];
      try {
        const response = await axios.post(webhookUrl, weatherMessage, {
          headers: {
            "Content-Type": "application/json",
          },
        });

        if (response.status === 204) {
          logger.info(
            `Advance forecast posted successfully to webhook ${i + 1}/${
              regionConfig.advanceWebhookUrls.length
            } for region: ${regionConfig.name}`
          );
          results.push({ webhookIndex: i + 1, success: true });
        } else {
          logger.warn(
            `Unexpected response status: ${
              response.status
            } for advance webhook ${i + 1} in region: ${regionConfig.name}`
          );
          results.push({
            webhookIndex: i + 1,
            success: false,
            status: response.status,
          });
        }
      } catch (error) {
        logger.error(
          `Failed to send to advance webhook ${i + 1}/${
            regionConfig.advanceWebhookUrls.length
          } for region ${regionId}: ${error.message}`
        );
        results.push({
          webhookIndex: i + 1,
          success: false,
          error: error.message,
        });
      }
    }

    // Check if all webhooks succeeded
    const successful = results.filter((r) => r.success).length;
    const failed = results.length - successful;

    if (failed === 0) {
      console.log(
        `✅ Advance forecast posted successfully to all ${successful} webhook(s) for ${regionConfig.name}!`
      );
    } else {
      console.log(
        `⚠️ Advance forecast posted to ${successful}/${results.length} webhook(s) for ${regionConfig.name}`
      );
      throw new Error(
        `Failed to post to ${failed} advance webhook(s) for region ${regionId}`
      );
    }

    return { success: true, skipped: false };
  } catch (error) {
    logger.error(
      `Failed to send advance forecast webhook for region ${regionId}: ${error.message}`
    );
    console.error(
      `❌ Failed to send advance forecast for ${regionId}:`,
      error.message
    );
    throw error; // Re-throw to allow caller to handle
  }
}

async function sendAllRegionalAdvanceForecasts() {
  try {
    const configuredRegions = getConfiguredRegions();

    if (configuredRegions.length === 0) {
      logger.warn("No regions configured with webhook URLs");
      console.log("⚠️ No regions configured with webhook URLs");
      return;
    }

    logger.info(
      `Checking advance forecast webhooks for ${configuredRegions.length} regions`
    );

    const results = [];
    let skippedCount = 0;

    for (const region of configuredRegions) {
      try {
        const result = await sendRegionalAdvanceForecastWebhook(region.id);
        if (result.skipped) {
          skippedCount++;
        }
        results.push({
          regionId: region.id,
          success: true,
          skipped: result.skipped,
        });
      } catch (error) {
        results.push({
          regionId: region.id,
          success: false,
          skipped: false,
          error: error.message,
        });
      }
    }

    // Log summary
    const successful = results.filter((r) => r.success && !r.skipped).length;
    const failed = results.filter((r) => !r.success).length;

    if (failed === 0) {
      if (successful > 0) {
        logger.info(
          `All ${successful} advance forecast(s) sent successfully (${skippedCount} region(s) skipped - no advance webhooks configured)`
        );
        console.log(
          `✅ All ${successful} advance forecast(s) sent successfully!`
        );
        if (skippedCount > 0) {
          console.log(
            `ℹ️ ${skippedCount} region(s) skipped - no advance webhooks configured`
          );
        }
      } else {
        logger.info(
          "All regions skipped - no advance forecast webhooks configured"
        );
        console.log(
          "ℹ️ All regions skipped - no advance forecast webhooks configured"
        );
      }
    } else {
      logger.warn(
        `${successful} successful, ${failed} failed, ${skippedCount} skipped advance forecasts`
      );
      console.log(
        `⚠️ ${successful} successful, ${failed} failed advance forecasts`
      );

      // Log failures
      results
        .filter((r) => !r.success)
        .forEach((result) => {
          logger.error(`Failed region ${result.regionId}: ${result.error}`);
        });
    }

    // Exit with error code if any failed
    if (failed > 0) {
      process.exit(1);
    }
  } catch (error) {
    logger.error(`Failed to send advance forecast webhooks: ${error.message}`);
    console.error(
      "❌ Failed to send advance forecast webhooks:",
      error.message
    );
    process.exit(1);
  }
}

// If this script is run directly (not imported)
if (require.main === module) {
  // Check if a specific region was provided as argument
  const regionId = process.argv[2];

  if (regionId) {
    sendRegionalAdvanceForecastWebhook(regionId);
  } else {
    sendAllRegionalAdvanceForecasts();
  }
}

module.exports = {
  sendRegionalAdvanceForecastWebhook,
  sendAllRegionalAdvanceForecasts,
};
