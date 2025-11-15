# Discord Weather Webhook for Cataphracts Campaigns

Automated daily weather updates for real-time [Cataphracts](https://samsorensen.blot.im/cataphracts-design-diary-1) campaigns. Posts deterministic, date-based weather to Discord channels via GitHub Actions.

## Easy Setup Guide

This guide assumes you have never used GitHub or coded before. Follow each step carefully.

### Step 1: Set Up Your Discord Channel

1. Open Discord and go to the channel where you want weather updates
2. Click the gear icon (⚙️) next to the channel name
3. Select "Integrations" from the left menu
4. Click "Webhooks"
5. Click "New Webhook"
6. Give it a name like "Weather Bot"
7. Click "Copy Webhook URL" and save this URL somewhere safe - you'll need it later
8. Click "Save Changes"

**Optional: Use a Discord Thread**
If you want weather updates in a thread to keep your main channel clean:

1. In your Discord channel, type a message like "Weather Updates"
2. Right-click on your message and select "Create Thread"
3. Name the thread something like "Daily Weather"
4. Copy the thread's webhook URL instead by going to the thread settings → Integrations → Webhooks
5. Create the webhook in the thread and use that URL in your configuration

This keeps all weather updates organized in one thread instead of cluttering the main channel.

### Step 2: Get This Code

1. Go to https://github.com/your-username/discord-weather-bot (replace with actual repo)
2. Click the green "Code" button
3. Click "Download ZIP"
4. Extract the ZIP file to your computer
5. Remember where you saved it

### Step 3: Create Your Weather Configuration

1. In the extracted folder, find the file called `regions-example.json` in the `src/config` folder
2. Copy this file to the main folder (next to `README.md`)
3. Rename the copied file to `regions.json`
4. Open `regions.json` in a text editor (Notepad works fine)
5. Replace the example data with your own:
   - Change `"temperate_coastal"` to your region name (use underscores instead of spaces)
   - Change `"Temperate Coastal Region"` to your campaign's region name
   - Replace the webhook URLs in the `webhookUrls` array with your Discord webhook URL(s) from Step 1
   - You can have one or more webhook URLs - add more to post to multiple channels
   - Modify the weather conditions to match your world's climate
6. Save the file

**Important**: Make sure to use the exact webhook URL you copied from Discord, including the long string of numbers and letters at the end.

### Step 4: Set Up GitHub Actions (Automated Posting)

1. Go to https://github.com and create a free account if you don't have one
2. Click the "+" icon in the top right corner and select "New repository"
3. Name it something like "my-weather-bot"
4. Make sure "Public" is selected
5. Click "Create repository"
6. Click "uploading an existing file"
7. Drag all the files from your extracted folder into the upload area
8. Scroll down and click "Commit changes"

### Step 5: Configure Your Secrets

1. In your GitHub repository, click "Settings" at the top
2. Click "Secrets and variables" in the left menu
3. Click "Actions"
4. Click "New repository secret"
5. For the name, type: `REGIONS_CONFIG`
6. For the value, copy and paste the entire contents of your `regions.json` file
7. Click "Add secret"

### Step 6: Test Your Setup

1. In your repository, click "Actions" at the top
2. Click "Daily Weather Update" on the left
3. Click "Run workflow" on the right
4. Click the green "Run workflow" button
5. Wait about 30 seconds, then refresh the page
6. Check your Discord channel - you should see a weather update

### Step 7: Schedule Your Weather Updates

Your weather will now automatically post:

- Daily at 12:00 PM UTC
- Weekly forecast on Saturdays at midnight UTC

To change these times:

1. Go to the `.github/workflows` folder in your repository
2. Edit `daily-weather.yml` and `weekly-forecast.yml` files
3. Change the `cron` line (search online for "cron schedule generator" for help)

### Optional: Weekly Forecast Setup

If you want a consolidated weekly forecast in a different channel:

1. Create another Discord webhook following Step 1
2. In your GitHub repository settings, add another secret called `WEEKLY_FORECAST_WEBHOOK_URL`
3. Use the new webhook URL as the value

## Managing Webhook Channels

### Adding Channels to a Region

Each region can post to multiple Discord channels. This is useful when you have multiple groups playing in the same region or want weather in both a player channel and a GM channel.

**To add a channel to an existing region:**

1. Open your `regions.json` file
2. Find the region you want to add a channel to
3. Change `webhookUrl` to `webhookUrls` (add an 's')
4. Convert the single URL to an array with multiple URLs:

**Before (single channel):**

```json
{
  "regions": {
    "temperate_coastal": {
      "name": "Coastal Region",
      "webhookUrl": "https://discord.com/api/webhooks/123456/abc123",
      "seasonalWeather": { ... }
    }
  }
}
```

**After (multiple channels):**

```json
{
  "regions": {
    "temperate_coastal": {
      "name": "Coastal Region",
      "webhookUrls": [
        "https://discord.com/api/webhooks/123456/abc123",
        "https://discord.com/api/webhooks/789012/def456",
        "https://discord.com/api/webhooks/345678/ghi789"
      ],
      "seasonalWeather": { ... }
    }
  }
}
```

5. Save the file
6. Update your GitHub secret `REGIONS_CONFIG` with the new content
7. Weather will now post to all channels for that region

**Note:** The old `webhookUrl` format (single string) still works for backward compatibility, but `webhookUrls` (array) is recommended.

### Moving Channels Between Regions

If you need to move a Discord channel from one region to another (for example, if your campaign party travels to a different climate zone):

**Step 1: Find the webhook URL to move**

- Open your `regions.json` file
- Locate the webhook URL in the current region's `webhookUrls` array
- Copy the URL

**Step 2: Remove from old region**

```json
"old_region": {
  "name": "Old Region",
  "webhookUrls": [
    "https://discord.com/api/webhooks/123456/abc123",
    "https://discord.com/api/webhooks/REMOVE_THIS/xyz789"  // ← Remove this one
  ],
  "seasonalWeather": { ... }
}
```

**Step 3: Add to new region**

```json
"new_region": {
  "name": "New Region",
  "webhookUrls": [
    "https://discord.com/api/webhooks/789012/def456",
    "https://discord.com/api/webhooks/REMOVE_THIS/xyz789"  // ← Add it here
  ],
  "seasonalWeather": { ... }
}
```

**Step 4: Update GitHub**

- Save your `regions.json` file
- Go to your GitHub repository → Settings → Secrets and variables → Actions
- Click on `REGIONS_CONFIG`
- Click "Update secret"
- Paste the entire contents of your updated `regions.json` file
- Click "Update secret"

The channel will immediately start receiving weather for the new region on the next scheduled update.

### Quick Reference: Webhook URL Management

**Get a webhook URL from Discord:**

1. Channel settings (⚙️) → Integrations → Webhooks → Create/Copy

**Multiple channels in one region:**

```json
"webhookUrls": [
  "https://discord.com/api/webhooks/URL1",
  "https://discord.com/api/webhooks/URL2"
]
```

**Single channel (backward compatible):**

```json
"webhookUrl": "https://discord.com/api/webhooks/URL"
```

**Remove a channel:**

- Delete its webhook URL from the `webhookUrls` array
- Update the `REGIONS_CONFIG` secret on GitHub

**Duplicate weather to test channel:**

- Add your test webhook URL to the same region's `webhookUrls` array
- Both channels will receive identical weather updates

### Troubleshooting

**No weather appears in Discord:**

- Check that your webhook URL is correct and starts with `https://discord.com/api/webhooks/`
- Make sure the Discord channel allows webhooks
- Verify your `regions.json` file is valid JSON (use an online JSON validator)
- Test your webhook URL by pasting it in a browser - you should see a message about webhook methods

**Weather updates at wrong time:**

- Remember that GitHub Actions uses UTC time
- Convert your desired time to UTC using an online converter

**Same weather every day:**

- Make sure each season has multiple different weather conditions
- The system picks randomly from your list

**GitHub Actions not running:**

- Check the "Actions" tab in your repository for error messages
- Verify your secrets are set correctly

## Setup

### 1. Create Discord Webhooks

1. Go to Discord channel settings → Integrations → Webhooks
2. Create webhook, copy URL
3. Optional: Create second webhook for weekly forecasts

### 2. Configure Regions

Create `regions.json` in project root:

```json
{
  "regions": {
    "my_region": {
      "name": "My Campaign Region",
      "webhookUrls": [
        "https://discord.com/api/webhooks/YOUR_WEBHOOK_URL_1",
        "https://discord.com/api/webhooks/YOUR_WEBHOOK_URL_2"
      ],
      "seasonalWeather": {
        "spring": {
          "conditions": ["Mild and sunny", "Light rain", "Overcast"],
          "mechanicalImpacts": {
            "Light rain": "Scouting range reduced by 1 hex"
          }
        },
        "summer": {
          "conditions": [
            "Warm and sunny",
            "Hot with clear skies",
            "Thunderstorms"
          ],
          "mechanicalImpacts": {
            "Thunderstorms": "Movement speed reduced by 1 hex"
          }
        },
        "autumn": {
          "conditions": ["Cool and crisp", "Overcast with rain", "Windy"],
          "mechanicalImpacts": {
            "Overcast with rain": "Scouting range reduced by 1 hex"
          }
        },
        "winter": {
          "conditions": [
            "Cold and frosty",
            "Overcast with sleet",
            "Light snow"
          ],
          "mechanicalImpacts": {
            "Overcast with sleet": "Movement speed reduced by 1 hex"
          }
        }
      }
    }
  }
}
```

**Note:** You can use a single webhook URL with `"webhookUrl": "..."` (backward compatible) or multiple URLs with `"webhookUrls": [...]` array format.

### 3. Local Testing

```bash
npm install
npm test          # Test daily weather
npm run test-weekly  # Test weekly forecast
```

### 4. GitHub Actions Setup

1. Fork this repository
2. Go to Settings → Secrets and variables → Actions
3. Add secret: `REGIONS_CONFIG` with your complete `regions.json` content
4. Optional: Add `WEEKLY_FORECAST_WEBHOOK_URL` for consolidated weekly forecasts

## Usage

## Usage

```bash
npm start         # Send daily weather update
npm run weekly    # Send weekly forecast
npm test          # Test daily weather locally
npm run test-weekly  # Test weekly forecast locally
```

## Configuration

### Schedules

Default GitHub Actions schedule:

- Daily weather: 12:00 PM UTC
- Weekly forecast: Saturday 00:00 UTC

Edit `.github/workflows/daily-weather.yml` and `.github/workflows/weekly-forecast.yml` to change timing.

### Weather Patterns

Weather conditions are defined in `seasonalWeather` objects within your `regions.json`. Each season requires:

- `conditions`: Array of weather descriptions (biased toward earlier items)
- `mechanicalImpacts` (optional): Object mapping specific conditions to game effects

**Example:**

```json
"spring": {
  "conditions": [
    "Mild and sunny",        // Most common
    "Partly cloudy",         // Common
    "Light rain",            // Less common
    "Thunderstorms"          // Rare
  ],
  "mechanicalImpacts": {
    "Light rain": "Scouting range reduced by 1 hex",
    "Thunderstorms": "Movement speed reduced by 1 hex, scouting range reduced by 2 hexes"
  }
}
```

### Example Region Template

Copy from `src/config/regions-example.json` for reference climate types:

- Temperate coastal (Western European)
- Desert (arid)
- Tropical (monsoon)
- Arctic (polar)
- Mountain (alpine)

### Environment Variables

**Required:**

- `REGIONS_CONFIG`: JSON string of your regions configuration (GitHub Actions only)

**Optional:**

- `WEEKLY_FORECAST_WEBHOOK_URL`: Consolidated weekly forecast webhook

**Local Development:**
Create `.env` file with webhook URLs or use `regions.json` directly.

## How It Works

- Weather is deterministic: same date produces same weather for each region
- Seasons change automatically based on calendar date
- Each region has unique weather patterns defined in configuration
- Weather generation uses seeded randomization for consistency
- Discord messages include weather-appropriate emojis

## Files

- `webhook.js` - Daily weather sender
- `weekly-webhook.js` - Weekly forecast sender
- `test-webhook.js` - Local daily testing
- `test-weekly.js` - Local weekly testing
- `src/services/weatherService.js` - Weather generation logic
- `src/config/config.js` - Configuration management
- `regions.json` - Regional weather definitions (create this)

## Troubleshooting

**No weather posted**: Check webhook URL and Discord channel permissions
**Wrong timing**: Verify cron expressions in workflow files
**Same weather daily**: Confirm regions have multiple weather conditions
**Local testing fails**: Run `npm install` and check `.env` or `regions.json`
