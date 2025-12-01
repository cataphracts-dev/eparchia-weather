const {
  getRegionalWeatherUpdate,
  getWeatherEmoji,
} = require("./src/services/weatherService");
const { logger } = require("./src/utils/logger");

// Mock region configuration for testing (matches expected format from Google Sheets)
const mockRegionsConfig = {
  "Northern Eparchia": {
    name: "Northern Eparchia",
    webhookUrls: ["https://discord.com/api/webhooks/EXAMPLE_1/test"],
    seasonalWeather: {
      spring: {
        conditions: [
          "Mild spring day",
          "Spring showers",
          "Warming breezes",
          "Gentle rains",
          "Overcast and cool",
        ],
        mechanicalImpacts: {
          "Spring showers": ["Light rain: -1 to ranged attacks beyond 30ft"],
        },
      },
      summer: {
        conditions: [
          "Hot and sunny",
          "Warm summer day",
          "Thunderstorms",
          "Humid and hazy",
          "Clear skies",
        ],
        mechanicalImpacts: {
          Thunderstorms: [
            "Heavy rain and lightning: disadvantage on Perception checks",
          ],
        },
      },
      autumn: {
        conditions: [
          "Crisp autumn day",
          "Fall rains",
          "Overcast skies",
          "Chilly winds",
          "Foggy morning",
        ],
        mechanicalImpacts: {
          "Foggy morning": ["Heavy obscurement beyond 60ft until midday"],
        },
      },
      winter: {
        conditions: [
          "Cold and clear",
          "Light snow",
          "Heavy snowfall",
          "Freezing rain",
          "Bitter cold",
        ],
        mechanicalImpacts: {
          "Heavy snowfall": ["Difficult terrain outdoors, -2 to Perception"],
          "Freezing rain": [
            "Slippery surfaces: DEX save or fall prone when moving fast",
          ],
        },
      },
    },
  },
  "Southern Highlands": {
    name: "Southern Highlands",
    webhookUrls: ["https://discord.com/api/webhooks/EXAMPLE_2/test"],
    seasonalWeather: {
      spring: {
        conditions: ["Highland spring", "Mountain mist", "Cool mornings"],
      },
      summer: {
        conditions: ["Alpine summer", "Clear mountain air", "Afternoon storms"],
      },
      autumn: {
        conditions: ["Early frost", "Autumn winds", "Clear days"],
      },
      winter: {
        conditions: ["Deep snow", "Mountain blizzard", "Frozen peaks"],
        mechanicalImpacts: {
          "Mountain blizzard": [
            "Blinded beyond 15ft, difficult terrain, extreme cold",
          ],
        },
      },
    },
  },
};

// Mock webhook function for testing
async function mockSendWebhook(regionConfig, messageContent) {
  console.log(`\n🔧 MOCK WEBHOOK SEND TO: ${regionConfig.name}`);
  console.log(`📡 Webhook URLs: ${regionConfig.webhookUrls.join(", ")}`);
  console.log("📝 Message Content:");
  console.log("─".repeat(50));
  console.log(messageContent);
  console.log("─".repeat(50));
  return { status: 204 }; // Mock successful response
}

async function testRegionalWeatherWebhook(regionName) {
  try {
    if (!mockRegionsConfig[regionName]) {
      throw new Error(`Region '${regionName}' not found in test configuration`);
    }

    const regionConfig = {
      id: regionName,
      ...mockRegionsConfig[regionName],
    };

    logger.info(`Testing weather update for region: ${regionConfig.name}`);

    // Get weather data for this region
    const weather = getRegionalWeatherUpdate(regionConfig);

    // Build the weather message content
    let messageContent =
      `📅 **Weather Update - ${regionConfig.name}**\n` +
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

    // Send to mock webhook
    const response = await mockSendWebhook(regionConfig, messageContent);

    if (response.status === 204) {
      logger.info(
        `TEST: Weather update would be posted successfully for region: ${regionConfig.name}`
      );
      console.log(
        `✅ TEST: Weather update would be posted successfully for ${regionConfig.name}!`
      );
    }
  } catch (error) {
    logger.error(
      `TEST: Failed to send weather webhook for region ${regionName}: ${error.message}`
    );
    console.error(
      `❌ TEST: Failed to send weather update for ${regionName}:`,
      error.message
    );
  }
}

async function testAllRegionalWebhooks() {
  try {
    const regionNames = Object.keys(mockRegionsConfig);

    logger.info(
      `Testing weather updates for ${regionNames.length} mock regions`
    );

    for (const regionName of regionNames) {
      await testRegionalWeatherWebhook(regionName);
    }

    console.log(
      `\n✅ TEST: All ${regionNames.length} regional weather updates tested successfully!`
    );
  } catch (error) {
    logger.error(`TEST: Failed to test regional webhooks: ${error.message}`);
    console.error("❌ TEST: Failed to test regional webhooks:", error.message);
  }
}

// If this script is run directly
if (require.main === module) {
  console.log("=".repeat(50));
  console.log("Testing Daily Weather Webhook (Mock Mode)");
  console.log("=".repeat(50));

  const regionName = process.argv[2];

  if (regionName) {
    testRegionalWeatherWebhook(regionName);
  } else {
    testAllRegionalWebhooks();
  }
}

module.exports = {
  testRegionalWeatherWebhook,
  testAllRegionalWebhooks,
  mockRegionsConfig,
};
