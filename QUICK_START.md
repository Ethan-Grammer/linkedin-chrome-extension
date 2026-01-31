# Quick Start Guide

## 🚀 Your extension is ready!

The extension has been built and is located in the `dist` folder.

## Step 1: Load the Extension in Chrome

1. Open Chrome and navigate to: `chrome://extensions/`
2. Enable **Developer mode** (toggle in the top-right corner)
3. Click **"Load unpacked"**
4. Select the `dist` folder from this project directory:
   ```
   /Users/ethan/Desktop/Projects/linkedin-chrome-extension/dist
   ```

## Step 2: Configure Airtable

Before you can save profiles, you need to set up Airtable:

1. Click the extension icon in Chrome
2. Click **"Settings"** at the bottom
3. Enter your Airtable configuration:
   - **API Key**: Get from https://airtable.com/account
   - **Base ID**: Found in your Airtable API docs (starts with "app...")
   - **Table Name**: Default is "Profiles"

### Create Your Airtable Table

Create a table with these exact field names:
- `Name` - Single line text
- `Role` - Single line text or Long text
- `Company` - Single line text
- `LinkedIn URL` - URL field
- `Email` - Email field
- `Created At` - Date field

## Step 3: Test the Extension

1. Go to any LinkedIn profile (e.g., `linkedin.com/in/jonathanki`)
2. Wait for the page to fully load
3. Click the extension icon
4. The extension should automatically extract:
   - Name
   - Role/Headline
   - Company
   - LinkedIn URL
5. Add an email if you have it (optional)
6. Click **"Save to Airtable"**

## Troubleshooting

### "Please navigate to a LinkedIn profile page"
- Make sure you're on a URL like `linkedin.com/in/username`
- The extension only works on profile pages, not search results or feeds

### "Please refresh the LinkedIn page and try again"
- Refresh the LinkedIn page
- Wait for it to fully load
- Try clicking the extension icon again

### "Airtable is not configured"
- Go to Settings (click extension icon → Settings)
- Make sure you've entered all three values (API Key, Base ID, Table Name)
- Click "Save Settings"

### Profile data is empty or incorrect
- LinkedIn frequently changes their HTML structure
- Try clicking "Refresh Data" in the popup
- Check the browser console (F12) for error messages

## Development Mode

To make changes to the extension:

```bash
# Start development mode (auto-rebuilds on changes)
npm run dev

# After making changes, reload the extension:
# 1. Go to chrome://extensions/
# 2. Click the reload icon on your extension
```

## Next Steps

- Test on multiple LinkedIn profiles to ensure extraction works
- Customize the Airtable field names if needed (update `src/background/background.ts`)
- Add additional fields to capture more data
- Style the popup to match your preferences (edit `src/popup/popup.css`)

---

## Support

For issues or questions, refer to the main [README.md](README.md) file.
