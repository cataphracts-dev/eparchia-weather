# GitHub Copilot Instructions for Discord Weather Webhook

## Project Overview

Webhook service that posts daily weather updates for fictional campaigns to Discord. Runs on GitHub Actions with deterministic weather generation. Configuration is managed via Google Sheets.

## Code Style

- Use CommonJS (`require`/`module.exports`)
- Prefer async/await
- Add error handling to all async operations
- Use the custom logger for all output

## Project Structure

- **Main Entry**: [`webhook.js`](../webhook.js) - daily weather webhook execution
- **Weekly Entry**: [`weekly-webhook.js`](../weekly-webhook.js) - weekly forecast webhook execution
- **Advance Entry**: [`advance-webhook.js`](../advance-webhook.js) - advance forecast (tomorrow's weather)
- **Config**: [`src/config/config.js`](../src/config/config.js) - configuration loader
- **Google Sheets**: [`src/services/googleSheetsService.js`](../src/services/googleSheetsService.js) - fetches config from Google Sheets
- **Weather Service**: [`src/services/weatherService.js`](../src/services/weatherService.js) - weather generation logic
- **Logger**: [`src/utils/logger.js`](../src/utils/logger.js) - structured logging

## Environment Variables

**Required:**

- `GOOGLE_SERVICE_ACCOUNT_KEY`: JSON credentials for Google Sheets API
- `GOOGLE_SHEET_LINK`: Link to the Google Sheet with configuration

**Optional:**

- `WEEKLY_FORECAST_WEBHOOK_URL`: Consolidated weekly forecasts webhook
- `ADVANCE_WEBHOOK_URLS`: Comma-separated list of advance forecast webhooks

## Google Sheets Configuration

The Google Sheet has two sheets:

1. **Commander Database**: Maps webhook URLs to weather regions

   - Columns: `Webhook URL`, `Weather Region`

2. **Weather Regions**: Two tables
   - Regional weather: `Region`, `Spring Weather`, `Summer Weather`, `Autumn Weather`, `Winter Weather`
   - Mechanical impacts: `Condition`, `Mechanical Impact`

## Common Tasks

### Modifying Weather Data

Edit seasonal conditions in Google Sheets (Weather Regions sheet):

- Add/remove weather conditions per season (comma-separated)
- Order conditions by probability (first = most likely)
- Map conditions to mechanical impacts in the second table

### Testing Locally

```bash
npm test          # runs test-webhook.js (daily weather with mock data)
npm run test-weekly  # runs test-weekly.js (weekly forecast with mock data)
npm run test-advance # runs test-advance.js (advance forecast with mock data)
```

Note: Test files use mock data and don't require Google Sheets access.

### Error Handling

- Wrap async operations in try-catch
- Use logger for all output
- Fail gracefully on webhook errors
- Configuration must be loaded with `loadConfiguration()` before use

## Key Features

- **Deterministic**: Same date = same weather
- **Seasonal**: Weather varies by time of year
- **Dual Webhooks**: Daily updates for players, weekly forecasts for GMs
- **Dynamic Emojis**: Weather-appropriate emojis that differ for day/night
- **Modular**: Easy to extend with new features
