# LinkedIn Profile Saver - Installation Instructions

## Step 1: Download and Extract

1. Download the `linkedin-chrome-extension.zip` file
2. Extract the ZIP file to a folder on your computer
3. Remember where you saved it (e.g., `Downloads/linkedin-chrome-extension/`)

## Step 2: Load Extension in Chrome

1. Open Google Chrome
2. Go to `chrome://extensions` (paste this in the address bar)
3. Enable **"Developer mode"** using the toggle in the top-right corner
4. Click **"Load unpacked"** button (top-left)
5. Navigate to the extracted folder and select the **`dist`** folder inside it
6. Click **"Select Folder"**

The extension should now appear in your Chrome toolbar!

## Step 3: Configure Airtable Settings

Before using the extension, you need to configure your Airtable credentials:

1. Click the extension icon in your Chrome toolbar
2. Click **"Settings"** at the bottom of the popup
3. Enter your Airtable details:
   - **API Key**: Your Airtable Personal Access Token
   - **Base ID**: Found in your Airtable URL (starts with `app...`)
   - **Table Name**: The name of your table (e.g., "Prospects")
4. Click **"Save Settings"**

### How to Get Your Airtable API Key:
1. Go to https://airtable.com/create/tokens
2. Create a new token with the following scopes:
   - `data.records:write`
   - `data.records:read`
3. Add access to your specific base
4. Copy the token and paste it in the extension settings

### How to Find Your Base ID:
1. Open your Airtable base in a web browser
2. Look at the URL: `https://airtable.com/appXXXXXXXXXXXXXX/...`
3. The part that starts with `app` is your Base ID

## Step 4: Use the Extension

1. Navigate to any LinkedIn profile (e.g., `linkedin.com/in/someone`)
2. Click the extension icon
3. The extension will automatically extract:
   - Name
   - Role
   - Company
   - LinkedIn URL
   - Email (if available in Contact Info)
   - Connection status (if pending or connected)
4. Review and edit the data if needed
5. Click **"Save to Airtable"**

## Troubleshooting

### Extension doesn't appear after loading
- Make sure you selected the `dist` folder, not the root folder
- Try refreshing the extensions page (`chrome://extensions`)

### "Please refresh the LinkedIn page and try again" error
- Refresh the LinkedIn profile page
- Wait a few seconds for the page to fully load
- Try clicking the extension icon again

### No email is extracted
- Not all LinkedIn profiles have public email addresses
- The extension tries to open the Contact Info modal to find the email
- You can manually add the email if needed

### Connection status not detected
- Make sure the LinkedIn profile page has fully loaded
- The extension looks for "Pending", "Connect", or "Message" buttons
- You can manually check/uncheck these boxes if needed

## Support

If you encounter any issues, please provide:
- The error message (if any)
- The LinkedIn profile URL you were trying to save
- A screenshot of the issue
