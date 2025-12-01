const axios = require("axios");
const {
  getRegionalAdvanceForecast,
  getWeatherEmoji,
} = require("./src/services/weatherService");
const {
  loadConfiguration,
  getConfiguredRegions,
  getRegionConfig,
  getAdvanceForecastWebhookUrls,
} = require("./src/config/config");
const { logger } = require("./src/utils/logger");

/**
 * Send consolidated advance forecasts for all regions to all advance webhook URLs
 */
async function sendAllRegionalAdvanceForecasts() {
  try {
    const advanceWebhookUrls = getAdvanceForecastWebhookUrls();

    if (advanceWebhookUrls.length === 0) {
      logger.info("No advance forecast webhook URLs configured - skipping");
      console.log("ℹ️ No advance forecast webhook URLs configured - skipping");
      return;
    }

    const configuredRegions = getConfiguredRegions();

    if (configuredRegions.length === 0) {
      logger.warn("No regions configured with webhook URLs");
      console.log("⚠️ No regions configured with webhook URLs");
      return;
    }

    logger.info(
      `Sending advance forecasts for ${configuredRegions.length} regions to ${advanceWebhookUrls.length} webhook(s)`
    );

    // Build consolidated message for all regions
    let consolidatedMessage =
      "📅 **Tomorrow's Weather Forecast - All Regions**\n\n";

    for (const region of configuredRegions) {
      try {
        const regionConfig = getRegionConfig(region.id);
        const weather = getRegionalAdvanceForecast(regionConfig);

        consolidatedMessage += `🌍 **${regionConfig.name}**\n`;
        consolidatedMessage += `**Date:** ${weather.date}\n`;
        consolidatedMessage += `**Season:** ${
          weather.season.charAt(0).toUpperCase() + weather.season.slice(1)
        }\n`;
        consolidatedMessage += `${getWeatherEmoji(
          weather.condition,
          false
        )} **Weather:** ${weather.condition}\n`;

        // Add mechanical impacts if any
        if (Array.isArray(weather.impacts) && weather.impacts.length > 0) {
          weather.impacts.forEach((impact) => {
            consolidatedMessage += `⚠️ ${impact}\n`;
          });
        }

        consolidatedMessage += "\n─────────────────────────────\n\n";
      } catch (error) {
        logger.error(
          `Failed to generate advance forecast for region ${region.id}: ${error.message}`
        );
        consolidatedMessage += `🌍 **${region.name || region.id}**\n`;
        consolidatedMessage += `❌ *Error generating forecast for this region*\n\n`;
        consolidatedMessage += "─────────────────────────────\n\n";
      }
    }

    // Add footer
    consolidatedMessage +=
      "*Advance weather forecast for tomorrow - all campaign regions*";

    // Send to all advance webhook URLs
    const results = [];
    for (let i = 0; i < advanceWebhookUrls.length; i++) {
      const webhookUrl = advanceWebhookUrls[i];
      try {
        const response = await axios.post(
          webhookUrl,
          { content: consolidatedMessage },
          {
            headers: { "Content-Type": "application/json" },
          }
        );

        if (response.status === 204) {
          logger.info(
            `Advance forecast posted successfully to webhook ${i + 1}/${
              advanceWebhookUrls.length
            }`
          );
          results.push({ webhookIndex: i + 1, success: true });
        } else {
          logger.warn(
            `Unexpected response status: ${
              response.status
            } for advance webhook ${i + 1}`
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
            advanceWebhookUrls.length
          }: ${error.message}`
        );
        results.push({
          webhookIndex: i + 1,
          success: false,
          error: error.message,
        });
      }
    }

    // Log summary
    const successful = results.filter((r) => r.success).length;
    const failed = results.length - successful;

    if (failed === 0) {
      logger.info(
        `Advance forecast posted successfully to all ${successful} webhook(s)`
      );
      console.log(
        `✅ Advance forecast posted successfully to all ${successful} webhook(s)!`
      );
    } else {
      logger.warn(
        `Advance forecast: ${successful} successful, ${failed} failed`
      );
      console.log(
        `⚠️ Advance forecast: ${successful} successful, ${failed} failed`
      );
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
  (async () => {
    try {
      // Load configuration from Google Sheets
      await loadConfiguration();

      await sendAllRegionalAdvanceForecasts();
    } catch (error) {
      logger.error(`Failed to run advance webhook: ${error.message}`);
      console.error("❌ Failed to run advance webhook:", error.message);
      process.exit(1);
    }
  })();
}

module.exports = {
  sendAllRegionalAdvanceForecasts,
};
