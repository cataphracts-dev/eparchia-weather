# Project Structure

This document shows the project structure for the Discord Weather Webhook system.

## Current Structure

```
discord-weather-bot/
├── .env                          # Environment variables (local only)
├── .env.example                  # Example environment file
├── .gitignore                    # Git ignore rules
├── package.json                  # Dependencies and scripts
├── package-lock.json             # Dependency lock file
├── README.md                     # Project documentation
├── PROJECT-STRUCTURE.md          # This file
├── ADVANCE-FORECAST.md           # Advance forecast feature documentation
├── webhook.js                    # Daily weather webhook
├── weekly-webhook.js             # Weekly forecast webhook
├── advance-webhook.js            # Advance forecast webhook (tomorrow's weather)
├── test-webhook.js               # Local testing script for daily weather
├── test-weekly.js                # Local testing script for weekly forecast
├── test-advance.js               # Local testing script for advance forecast
├── .github/
│   ├── copilot-instructions.md   # GitHub Copilot coding instructions
│   └── workflows/
│       ├── daily-weather.yml     # Daily weather GitHub Actions workflow
│       ├── weekly-forecast.yml   # Weekly forecast GitHub Actions workflow
│       └── regional-weather.yml.example # Example regional weather workflow
└── src/
    ├── config/
    │   ├── config.js              # Configuration management with regional support
    │   ├── regions.json           # Regional weather pattern definitions
    │   └── regions-example.json   # Example regions configuration
    ├── services/
    │   └── weatherService.js      # Weather generation logic with regional support
    └── utils/
        └── logger.js              # Logging utilities
```

## System Architecture

The Discord Weather Webhook system generates deterministic weather updates for fictional campaign regions and posts them to Discord channels via webhooks. The system supports both single-region and multi-region configurations.

## Core Features

- **Deterministic Weather**: Same date generates same weather conditions
- **Seasonal Variation**: Weather patterns change based on time of year
- **Regional Support**: Different climate types with unique weather patterns
- **Discord Integration**: Automatic posting via webhooks
- **Dual Formats**: Daily updates and weekly forecasts
- **Advance Forecasts**: Optional tomorrow's weather for GM/planning channels
- **GitHub Actions**: Automated scheduling and deployment

## Key Files

### Entry Points

- **`webhook.js`** - Daily weather update webhook (today's weather)
- **`weekly-webhook.js`** - Weekly forecast webhook
- **`advance-webhook.js`** - Advance forecast webhook (tomorrow's weather)

### Configuration

- **`src/config/config.js`** - Environment variable management and regional configuration
- **`src/config/regions.json`** - Regional climate definitions and webhook URLs
- **`src/config/regions-example.json`** - Example regions configuration template

### Core Logic

- **`src/services/weatherService.js`** - Weather generation with seeded randomization
- **`src/utils/logger.js`** - Structured logging utilities

### Testing

- **`test-webhook.js`** - Test daily weather updates locally
- **`test-weekly.js`** - Test weekly forecasts locally
- **`test-advance.js`** - Test advance forecasts locally

### Automation

- **`.github/workflows/daily-weather.yml`** - Daily weather automation
- **`.github/workflows/weekly-forecast.yml`** - Weekly forecast automation
- **`.github/workflows/regional-weather.yml.example`** - Example regional setup

### Documentation

- **`README.md`** - Main project documentation and setup guide
- **`ADVANCE-FORECAST.md`** - Advance forecast feature documentation
- **`PROJECT-STRUCTURE.md`** - This file

## Regional Climate Types

The system supports multiple climate types, each with unique seasonal weather patterns:

| Region Type         | Climate          | Description                                      |
| ------------------- | ---------------- | ------------------------------------------------ |
| `temperate_coastal` | Western European | Maritime climate with mild winters, cool summers |
| `desert`            | Arid             | Extreme temperatures, minimal precipitation      |
| `tropical`          | Monsoon          | Hot, humid with distinct wet/dry seasons         |
| `arctic`            | Polar            | Extreme cold, brief summers, harsh conditions    |
| `mountain`          | Alpine           | High altitude, rapid weather changes             |

## Configuration

### Environment Variables

- `REGIONS_CONFIG`: Complete regions.json as JSON string (GitHub Actions)
- `WEEKLY_FORECAST_WEBHOOK_URL`: Consolidated weekly forecasts (optional)

### Local Development

Create `regions.json` in project root with webhook URLs. The system checks these paths in order:

1. `regions.json` (project root)
2. `config/regions.json`
3. `src/config/custom-regions.json`
4. `src/config/regions.json`
5. `src/config/regions-example.json`

**Security Note**: `regions.json` contains sensitive webhook URLs and should not be committed to version control.

## Usage

### NPM Scripts

```bash
npm start         # Send daily weather update
npm run weekly    # Send weekly forecast
npm test          # Test daily weather locally
npm run test-weekly  # Test weekly forecast locally
```

### Manual Execution

The webhooks can be triggered manually by running the scripts directly:

```bash
node webhook.js          # Send daily weather update
node weekly-webhook.js   # Send weekly forecast
node test-webhook.js     # Test daily weather
node test-weekly.js      # Test weekly forecast
```

### GitHub Actions

The system automatically runs:

- **Daily weather**: Every day at 12:00 PM UTC (8:00 AM EST)
- **Weekly forecast**: Every Saturday at midnight UTC

## Dependencies

- **`axios`** - HTTP requests to Discord webhooks
- **`dotenv`** - Environment variable management
