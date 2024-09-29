# slack-wp-search-bot

A Slack bot that searches your articles in WordPress.

## Setup

### 1. Create a new Google Apps Script project at [script.google.com](https://script.google.com)

### 2. Copy the content of `main.gs` to the script editor

### 3. Deploy the script as a WebApp

- Click on the `Deploy` button in the toolbar
- Select `New deployment`
- Choose `Web app` as the type
- Set `Who has access to the app` to `Anyone, even anonymous`
- Click on `Deploy`
- Copy the WebApp URL

### 4. Modify `slack-manifest.json`

Change `display_information` and `features` to match your app and replace `request_url` with the WebApp URL retrieved from Google Apps Script.

### 5. Create a new Slack App at [api.slack.com](https://api.slack.com/apps)

Select `From manifest` and copy the content of `slack-manifest.json` to the textarea.

### 6. Install the app to your workspace

### 7. Set up the script properties

- `WP_BASE_URL`: Your WordPress site URL (e.g. `https://example.com`)
- `WP_USERNAME`: Your WordPress username
- `WP_PASSWORD`: Your WordPress App Password (Spaces in the app password can be removed)
- `SLACK_BOT_TOKEN`: Your Slack Bot OAuth Access Token

## Usage

1. Invite the bot to a channel
2. Mention the bot with a search query (e.g. `@bot expecto patronum`)
