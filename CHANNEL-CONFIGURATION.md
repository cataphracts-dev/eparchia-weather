# Channel Configuration Guide

## Overview

The channel configuration system uses **three separate files** to make it easy to manage Discord webhooks and region assignments:

1. **`channels.json`** - Maps channel IDs to Discord webhook URLs (sensitive, gitignored)
2. **`channel-assignments.json`** - Maps regions to channel IDs (easy to edit, optional gitignore)
3. **`regions.json`** - Contains only weather configuration (large file, rarely touched)

This separation means you can **move channels between regions** by editing only the small `channel-assignments.json` file, without ever touching the 1000+ line weather configuration file.

## File Structure

### 1. channels.json (Secret Webhook URLs)

Contains the actual Discord webhook URLs with friendly names.

```json
{
  "channels": {
    "my-player-channel": {
      "name": "My Campaign - Players",
      "webhookUrl": "https://discord.com/api/webhooks/YOUR_WEBHOOK_ID/YOUR_TOKEN"
    },
    "gm-channel": {
      "name": "GM - Forecasts",
      "webhookUrl": "https://discord.com/api/webhooks/YOUR_WEBHOOK_ID/YOUR_TOKEN"
    }
  }
}
```

**Location:** `src/config/channels.json` or root `channels.json`  
**Security:** Gitignored, contains sensitive webhook URLs  
**Template:** `src/config/channels-example.json`

### 2. channel-assignments.json (Region → Channel Mapping)

Maps regions to channel IDs. This is the file you edit most often.

```json
{
  "assignments": {
    "northern_eparchia": {
      "channels": ["my-player-channel"],
      "advanceChannels": ["gm-channel"]
    },
    "southern_eparchia": {
      "channels": ["my-player-channel", "another-channel"],
      "advanceChannels": ["gm-channel"]
    }
  },
  "weeklyForecastChannel": "gm-channel"
}
```

**Location:** `src/config/channel-assignments.json` or root `channel-assignments.json`  
**Security:** Gitignored by default (but safe to version control if desired)  
**Template:** `src/config/channel-assignments-example.json`

**Fields:**

- `assignments` - Maps region IDs to channel configurations
  - `channels` - Array of channel IDs for daily weather updates
  - `advanceChannels` - Array of channel IDs for GM advance forecasts (optional)
- `weeklyForecastChannel` - Single channel ID for consolidated weekly forecasts

### 3. regions.json (Weather Configuration)

Contains seasonal weather data for each region. You rarely need to edit this for channel management.

```json
{
  "regions": {
    "northern_eparchia": {
      "name": "Northern Eparchia",
      "seasonalWeather": {
        "spring": {
          "conditions": ["Mild and cloudy", "Light rain", ...],
          "mechanicalImpacts": { ... }
        },
        ...
      }
    }
  }
}
```

**Location:** `src/config/regions.json` or root `regions.json`  
**Security:** Gitignored (contains no webhook URLs in new system)  
**Template:** `src/config/regions-example.json`

## Common Tasks

### Moving a Channel Between Regions

**Before:** Had to find and copy webhook URL in the 1000-line regions.json file

**Now:** Just edit `channel-assignments.json`:

```json
{
  "assignments": {
    "region_1": {
      "channels": ["channel-a", "channel-b"] // Remove channel-b from here
    },
    "region_2": {
      "channels": ["channel-b"] // Add channel-b here
    }
  }
}
```

### Adding a New Channel

1. Add webhook URL to `channels.json`:

```json
{
  "channels": {
    "new-channel": {
      "name": "My New Channel",
      "webhookUrl": "https://discord.com/api/webhooks/..."
    }
  }
}
```

2. Assign it to a region in `channel-assignments.json`:

```json
{
  "assignments": {
    "my_region": {
      "channels": ["existing-channel", "new-channel"]
    }
  }
}
```

### Adding Multiple Channels to One Region

Just list them in the `channels` array:

```json
{
  "assignments": {
    "southern_eparchia": {
      "channels": ["player-channel-1", "player-channel-2", "weather-channel"]
    }
  }
}
```

All listed channels will receive the same daily weather updates.

### Setting Up GM Advance Forecasts

Use the `advanceChannels` field to specify which channels receive tomorrow's weather:

```json
{
  "assignments": {
    "northern_eparchia": {
      "channels": ["player-channel"],
      "advanceChannels": ["gm-private-channel"]
    }
  }
}
```

Run advance forecasts with: `npm run advance`

### Changing the Weekly Forecast Channel

Edit the `weeklyForecastChannel` field at the root level:

```json
{
  "assignments": { ... },
  "weeklyForecastChannel": "gm-weekly-channel"
}
```

## Setup Instructions

### First-Time Setup

1. **Copy example files:**

   ```bash
   cp src/config/channels-example.json src/config/channels.json
   cp src/config/channel-assignments-example.json src/config/channel-assignments.json
   ```

2. **Add your webhook URLs to `channels.json`:**

   - Get webhook URLs from Discord (Server Settings → Integrations → Webhooks)
   - Give each channel a unique ID (e.g., `my-campaign-players`)
   - Add a friendly name for documentation

3. **Configure channel assignments in `channel-assignments.json`:**

   - Map each region ID to the channel IDs you want
   - Set advance channels for GM forecasts
   - Set the weekly forecast channel

4. **Test your configuration:**
   ```bash
   npm test              # Test daily weather
   npm run test-weekly   # Test weekly forecast
   npm run test-advance  # Test advance forecast
   ```

### Migrating from Old Configuration

If you have an existing `regions.json` with embedded webhook URLs:

1. **Extract webhook URLs** - Copy them to the new `channels.json`
2. **Create channel assignments** - Map regions to channel IDs in `channel-assignments.json`
3. **Keep your weather data** - The `regions.json` file with seasonal weather stays the same structure

The system supports **backward compatibility** - if `regions.json` contains `webhookUrls` or `advanceWebhookUrls`, they'll still work, but the new system takes precedence.

## Configuration Priority

The system loads files in this priority order:

1. Root directory (`./channels.json`, `./channel-assignments.json`)
2. `config/` directory
3. `src/config/` directory
4. Example files as fallback

For `regions.json`, environment variable `REGIONS_CONFIG` (GitHub Actions) takes highest priority.

## GitHub Actions / CI/CD

For automated deployments, you can use environment variables:

- `REGIONS_CONFIG` - Full regions.json as JSON string (existing)
- `WEEKLY_FORECAST_WEBHOOK_URL` - Override weekly forecast webhook

The channel/assignment files should be deployed as actual files or baked into the deployment.

## Security Notes

- **Never commit** `channels.json` - it contains sensitive webhook URLs
- `channel-assignments.json` is safe to version control if you want (no sensitive data)
- `regions.json` in the new system contains no sensitive data (only weather config)
- Use `.env.example` to document what environment variables are needed

## Troubleshooting

### "Channel 'X' not found in channels.json"

**Cause:** You referenced a channel ID in `channel-assignments.json` that doesn't exist in `channels.json`

**Fix:** Add the channel to `channels.json` or fix the typo in the channel ID

### "No regions configured with webhook URLs"

**Cause:** No regions have valid channel assignments that resolve to webhook URLs

**Fix:** Check that:

1. `channel-assignments.json` has assignments for your regions
2. Channel IDs in assignments match channel IDs in `channels.json`
3. Webhook URLs in `channels.json` are valid

### "Weekly forecast channel 'X' not found"

**Cause:** The `weeklyForecastChannel` ID doesn't exist in `channels.json`

**Fix:** Add the channel to `channels.json` or update the channel ID in `channel-assignments.json`

## Benefits of This System

✅ **Easy channel management** - Edit small assignment file instead of huge weather config  
✅ **Friendly names** - Use readable channel IDs instead of long webhook URLs  
✅ **Security** - Webhook URLs separated from configuration  
✅ **Version control** - Can safely track assignments without exposing secrets  
✅ **Reusability** - One webhook can be used in multiple regions  
✅ **No duplication** - Define webhook URL once, reference many times

## Example Workflow

**Scenario:** You want to move the "Highlands" weather from channel A to channel B.

**Old way (before this system):**

1. Open 1000-line `regions.json`
2. Find the highlands section (scroll, scroll, scroll...)
3. Copy webhook URL from channel A
4. Find webhook URL for channel B (where was it again?)
5. Replace the URL
6. Hope you didn't break the JSON syntax

**New way (with this system):**

1. Open `channel-assignments.json` (small, easy to read)
2. Change `"channels": ["channel-a"]` to `"channels": ["channel-b"]`
3. Done!

```json
{
  "assignments": {
    "highlands": {
      "channels": ["channel-b"] // Changed from channel-a
    }
  }
}
```

That's it! No hunting through large files, no copying URLs, no risk of syntax errors.
