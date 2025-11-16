# Advance Weather Forecast Feature

## Overview

The advance forecast feature allows specific Discord channels to receive weather forecasts **one day in advance** (tomorrow's weather). This is useful for GM/planning channels that need advance notice, while player channels receive the current day's weather.

## Architecture

### Key Components

1. **`advance-webhook.js`**: New webhook script that sends tomorrow's weather
2. **`getRegionalAdvanceForecast()`**: Service function that generates weather for tomorrow
3. **`advanceWebhookUrls`**: Optional configuration array in each region

### How It Works

- **Daily Webhook** (`webhook.js`): Sends **today's** weather to `webhookUrls`
- **Advance Webhook** (`advance-webhook.js`): Sends **tomorrow's** weather to `advanceWebhookUrls`
- Both use the same deterministic weather generation, just offset by one day

## Configuration

### Region Configuration Structure

```json
{
  "regions": {
    "your_region_id": {
      "name": "Your Region Name",
      "webhookUrls": [
        "https://discord.com/api/webhooks/PLAYER_CHANNEL_1/TOKEN",
        "https://discord.com/api/webhooks/PLAYER_CHANNEL_2/TOKEN"
      ],
      "advanceWebhookUrls": [
        "https://discord.com/api/webhooks/GM_PLANNING_CHANNEL/TOKEN"
      ],
      "seasonalWeather": {
        // ... seasonal weather configuration
      }
    }
  }
}
```

### Configuration Fields

- **`webhookUrls`** (required): Array of webhook URLs that receive **today's** weather
- **`advanceWebhookUrls`** (optional): Array of webhook URLs that receive **tomorrow's** weather
  - If omitted or empty, no advance forecasts are sent for that region
  - Can contain one or more webhook URLs

## Usage

### Local Testing

```bash
# Test advance forecast for all regions
npm run test-advance

# Test advance forecast for a specific region
node advance-webhook.js your_region_id
```

### Production (GitHub Actions)

Add a new workflow step to run the advance webhook:

```yaml
- name: Send Advance Weather Forecasts
  run: node advance-webhook.js
  env:
    REGIONS_CONFIG: ${{ secrets.REGIONS_CONFIG }}
```

**Recommended Schedule:**

- Run `advance-webhook.js` in the **evening** (e.g., 6 PM) to give tomorrow's forecast
- Run `webhook.js` in the **morning** (e.g., 8 AM) to give today's weather

### GitHub Actions Scheduling Example

```yaml
name: Daily Weather Updates

on:
  schedule:
    # Today's weather at 8 AM UTC
    - cron: "0 8 * * *"
    # Tomorrow's weather at 6 PM UTC
    - cron: "0 18 * * *"
  workflow_dispatch:

jobs:
  send-weather:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: "18"

      - name: Install dependencies
        run: npm ci

      - name: Send Today's Weather (Morning)
        if: github.event.schedule == '0 8 * * *' || github.event_name == 'workflow_dispatch'
        run: node webhook.js
        env:
          REGIONS_CONFIG: ${{ secrets.REGIONS_CONFIG }}

      - name: Send Tomorrow's Weather (Evening)
        if: github.event.schedule == '0 18 * * *' || github.event_name == 'workflow_dispatch'
        run: node advance-webhook.js
        env:
          REGIONS_CONFIG: ${{ secrets.REGIONS_CONFIG }}
```

## Use Cases

### 1. GM Planning Channel

**Problem**: GMs need to know tomorrow's weather to plan session content.

**Solution**: Add GM channel to `advanceWebhookUrls`:

```json
{
  "webhookUrls": ["https://discord.com/api/webhooks/PLAYER_CHANNEL/TOKEN"],
  "advanceWebhookUrls": ["https://discord.com/api/webhooks/GM_CHANNEL/TOKEN"]
}
```

### 2. Separate Player and Planning Channels

**Problem**: Different groups need different forecast timings.

**Solution**: Use separate webhook URLs for each group:

```json
{
  "webhookUrls": [
    "https://discord.com/api/webhooks/GROUP_A_PLAYER/TOKEN",
    "https://discord.com/api/webhooks/GROUP_B_PLAYER/TOKEN"
  ],
  "advanceWebhookUrls": [
    "https://discord.com/api/webhooks/GROUP_A_GM/TOKEN",
    "https://discord.com/api/webhooks/GROUP_B_GM/TOKEN"
  ]
}
```

### 3. No Advance Forecast Needed

**Problem**: Some regions don't need advance forecasts.

**Solution**: Simply omit `advanceWebhookUrls` or leave it empty:

```json
{
  "webhookUrls": ["https://discord.com/api/webhooks/PLAYER_CHANNEL/TOKEN"]
  // No advanceWebhookUrls field = no advance forecasts
}
```

## Message Format

### Advance Forecast Message

```
📅 **Tomorrow's Weather Forecast - Region Name**
**Date:** December 15
**Season:** Winter
❄️ **Weather:** Light snow flurries
⚠️ Scouting range reduced by 1 hex
```

### Today's Weather Message (for comparison)

```
📅 **Weather Update - Region Name**
**Date:** December 14
**Season:** Winter
🧊 **Weather:** Cold and frosty
```

## Validation

The configuration validator checks for:

- `advanceWebhookUrls` must be an array if provided
- Empty `advanceWebhookUrls` arrays should be omitted
- Webhook URLs must be valid strings

Run validation:

```bash
npm run validate-regions
```

## Technical Details

### Weather Generation

- Both daily and advance webhooks use the same `getWeatherForDate()` function
- Deterministic seeding ensures same date = same weather
- Advance forecast simply offsets the date by +1 day

### Service Function

```javascript
const getRegionalAdvanceForecast = (regionConfig) => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return getWeatherForDate(
    tomorrow,
    regionConfig.seasonalWeather,
    regionConfig.id
  );
};
```

### Graceful Skipping

- If a region has no `advanceWebhookUrls`, it's skipped (not an error)
- Logs indicate which regions were skipped
- Exit code 0 even if all regions skipped (no advance webhooks configured)

## Backwards Compatibility

✅ **Fully backwards compatible**

- Existing configurations without `advanceWebhookUrls` continue working
- No breaking changes to existing webhook behavior
- Optional feature - regions can opt-in as needed

## Best Practices

1. **Timing**: Run advance webhook 12-18 hours before daily webhook
2. **Channel Strategy**:
   - Player channels → `webhookUrls` (today's weather)
   - GM channels → `advanceWebhookUrls` (tomorrow's weather)
3. **Testing**: Always test with `npm run test-advance` before deploying
4. **Validation**: Run `npm run validate-regions` after configuration changes

## Troubleshooting

### No advance forecasts sent

- Check that `advanceWebhookUrls` is defined and not empty
- Verify webhook URLs are valid Discord webhook URLs
- Check logs for "skipped" messages

### Wrong date in forecast

- Advance webhook shows tomorrow's date (correct behavior)
- Daily webhook shows today's date
- If confused, check the message header: "Tomorrow's Weather Forecast" vs "Weather Update"

### Duplicate messages

- Ensure a channel isn't in both `webhookUrls` and `advanceWebhookUrls`
- If intentional, both today's and tomorrow's weather will be posted to that channel
