const {
  getRegionalAdvanceForecast,
  getWeatherEmoji,
} = require("./src/services/weatherService");
const { logger } = require("./src/utils/logger");
const { mockRegionsConfig } = require("./test-webhook");

// Mock webhook function for testing
async function mockSendWebhook(webhookUrl, content) {
  console.log(`\n🔧 MOCK ADVANCE WEBHOOK SEND`);
  console.log(`📡 Webhook URL: ${webhookUrl}`);
  console.log(`📏 Content Length: ${content.length} characters`);
  console.log("📝 Message Content:");
  console.log("─".repeat(50));
  console.log(content);
  console.log("─".repeat(50));

  return { status: 204 }; // Mock successful response
}

async function testAllRegionalAdvanceForecasts() {
  try {
    const mockAdvanceWebhookUrls = [
      "https://discord.com/api/webhooks/EXAMPLE_ADVANCE_1/test",
      "https://discord.com/api/webhooks/EXAMPLE_ADVANCE_2/test",
    ];

    const regionNames = Object.keys(mockRegionsConfig);

    logger.info(
      `Testing advance forecasts for ${regionNames.length} regions to ${mockAdvanceWebhookUrls.length} webhook(s)`
    );

    // Build consolidated message for all regions
    let consolidatedMessage =
      "📅 **Tomorrow's Weather Forecast - All Regions**\n\n";

    for (const regionName of regionNames) {
      try {
        const regionConfig = {
          id: regionName,
          ...mockRegionsConfig[regionName],
        };

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
          `Failed to generate advance forecast for region ${regionName}: ${error.message}`
        );
        consolidatedMessage += `🌍 **${regionName}**\n`;
        consolidatedMessage += `❌ *Error generating forecast for this region*\n\n`;
        consolidatedMessage += "─────────────────────────────\n\n";
      }
    }

    // Add footer
    consolidatedMessage +=
      "*Advance weather forecast for tomorrow - all campaign regions*";

    // Send to mock advance webhook URLs
    for (let i = 0; i < mockAdvanceWebhookUrls.length; i++) {
      const webhookUrl = mockAdvanceWebhookUrls[i];
      const response = await mockSendWebhook(webhookUrl, consolidatedMessage);

      if (response.status === 204) {
        logger.info(
          `TEST: Advance forecast would be posted successfully to webhook ${
            i + 1
          }/${mockAdvanceWebhookUrls.length}`
        );
      }
    }

    console.log(
      `\n✅ TEST: Advance forecast would be posted successfully to all ${mockAdvanceWebhookUrls.length} webhook(s)!`
    );
  } catch (error) {
    logger.error(
      `TEST: Failed to send advance forecast webhooks: ${error.message}`
    );
    console.error(
      "❌ TEST: Failed to send advance forecast webhooks:",
      error.message
    );
  }
}

// If this script is run directly
if (require.main === module) {
  console.log("=".repeat(50));
  console.log("Testing Advance Weather Forecast Webhook (Mock Mode)");
  console.log("=".repeat(50));

  testAllRegionalAdvanceForecasts();
}

module.exports = {
  testAllRegionalAdvanceForecasts,
};
