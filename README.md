# Discord Weather Webhook for Cataphracts Campaigns

Automated daily weather updates for real-time [Cataphracts](https://samsorensen.blot.im/cataphracts-design-diary-1) campaigns. Posts deterministic, date-based weather to Discord channels via GitHub Actions.

## Features

- **Daily Weather Updates** - Posted to player channels each morning
- **Weekly Forecasts** - Consolidated 7-day forecasts for GM planning
- **Advance Forecasts** - Tomorrow's weather for GM preparation channels
- **Deterministic Generation** - Same date always produces same weather
- **Multiple Regions** - Support for multiple campaign regions with different climates
- **Google Sheets Configuration** - Easy management without editing code

## Configuration

All configuration is managed via Google Sheets and environment variables. No JSON files needed!

### Required Environment Variables

| Variable                      | Description                                                       |
| ----------------------------- | ----------------------------------------------------------------- |
| `GOOGLE_SERVICE_ACCOUNT_KEY`  | JSON credentials for Google Sheets API access                     |
| `GOOGLE_SHEET_LINK`           | Link to your Google Sheet with configuration                      |
| `WEEKLY_FORECAST_WEBHOOK_URL` | Discord webhook for consolidated weekly forecasts                 |
| `ADVANCE_WEBHOOK_URLS`        | Comma-separated list of webhooks for advance forecasts (optional) |

### Google Sheets Setup

Create a Google Sheet with two sheets:

#### Sheet 1: "Commander Database"

Maps Discord channels to weather regions:

| Webhook URL                          | Weather Region     |
| ------------------------------------ | ------------------ |
| https://discord.com/api/webhooks/... | Northern Eparchia  |
| https://discord.com/api/webhooks/... | Northern Eparchia  |
| https://discord.com/api/webhooks/... | Southern Highlands |

- Multiple webhooks can point to the same region
- Each row represents one Discord channel

#### Sheet 2: "Weather Regions"

Contains two tables:

**Table 1 - Regional Weather Conditions:**

| Region             | Spring Weather         | Summer Weather        | Autumn Weather  | Winter Weather |
| ------------------ | ---------------------- | --------------------- | --------------- | -------------- |
| Northern Eparchia  | Mild day, Showers, Fog | Hot and sunny, Storms | Crisp day, Rain | Snow, Blizzard |
| Southern Highlands | Mountain mist, Cool    | Alpine summer         | Early frost     | Deep snow      |

- Comma-separated conditions in each cell
- Ordered by probability (first = most likely)

**Table 2 - Mechanical Impacts** (separate from Table 1 with empty rows between):

| Condition      | Mechanical Impact                            |
| -------------- | -------------------------------------------- |
| Heavy snowfall | Difficult terrain outdoors, -2 to Perception |
| Blizzard       | Blinded beyond 15ft, extreme cold            |
| Thunderstorms  | Disadvantage on Perception checks            |

- Maps conditions to their game mechanical effects
- Only conditions with impacts need to be listed

### Google Service Account Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable the Google Sheets API
4. Create a Service Account (IAM & Admin → Service Accounts)
5. Create a JSON key for the service account
6. Share your Google Sheet with the service account email
7. Use the JSON key content as `GOOGLE_SERVICE_ACCOUNT_KEY`

## Usage

### Daily Weather (runs automatically via GitHub Actions)

```bash
npm start
# or
node webhook.js
```

### Weekly Forecast

```bash
npm run weekly
# or
node weekly-webhook.js
```

### Advance Forecast (tomorrow's weather)

```bash
npm run advance
# or
node advance-webhook.js
```

### Testing (uses mock data, no Google Sheets needed)

```bash
npm test              # Test daily weather
npm run test-weekly   # Test weekly forecast
npm run test-advance  # Test advance forecast
```

## GitHub Actions Workflows

The weather updates run automatically:

- **Daily Weather**: Every day at 12:00 PM UTC
- **Weekly Forecast**: Saturdays at midnight UTC
- **Advance Forecast**: Every evening (configure as needed)

Configure schedule in `.github/workflows/` files.

## Project Structure

```
├── webhook.js              # Daily weather webhook
├── weekly-webhook.js       # Weekly forecast webhook
├── advance-webhook.js      # Advance forecast webhook
├── test-*.js               # Test files with mock data
└── src/
    ├── config/
    │   └── config.js       # Configuration loader
    ├── services/
    │   ├── googleSheetsService.js  # Google Sheets API
    │   └── weatherService.js       # Weather generation
    └── utils/
        └── logger.js       # Logging utility
```

## Weather Generation

Weather is deterministically generated based on:

1. **Date** - Same date = same weather
2. **Region** - Different regions have different climates
3. **Season** - Weather conditions vary by season (Southern Hemisphere)

The seeded random generator ensures consistent results across runs.

## License

MIT
