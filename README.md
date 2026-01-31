# LinkedIn Profile Saver Chrome Extension

A Chrome extension that automatically extracts LinkedIn profile information and saves it to Airtable.

## Features

- Automatically extracts:
  - Name
  - Role/Headline
  - Company
  - LinkedIn URL
  - Email (from Contact Info)
  - Connection status (Pending/Connected)
- Clean, intuitive popup interface
- Direct integration with Airtable
- Editable fields before saving

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Create Icons

The extension needs icon files in the `public` folder. Create the following PNG files:
- `icon16.png` (16x16)
- `icon48.png` (48x48)
- `icon128.png` (128x128)

You can use the provided `icon.svg` as a template or create your own icons.

### 3. Build the Extension

For development (with watch mode):
```bash
npm run dev
```

For production:
```bash
npm run build
```

This will create a `dist` folder with all the extension files.

### 4. Load in Chrome

1. Open Chrome and go to `chrome://extensions/`
2. Enable "Developer mode" (toggle in top right)
3. Click "Load unpacked"
4. Select the `dist` folder from this project

### 5. Configure Airtable

1. Click the extension icon and go to "Settings"
2. Enter your Airtable credentials:
   - **API Key**: Get from [Airtable Account Settings](https://airtable.com/account)
   - **Base ID**: Found in your Airtable API documentation (starts with "app...")
   - **Table Name**: The name of the table where profiles will be saved (default: "Profiles")

3. Create a table in Airtable with these fields:
   - `Prospect Name` (Single line text) - Primary field
   - `Role` (Single line text)
   - `LinkedIn URL` (URL)
   - `Email` (Email)
   - `LI Connection Request?` (Checkbox)
   - `Connected?` (Checkbox)

## Usage

1. Navigate to any LinkedIn profile page (e.g., `linkedin.com/in/username`)
2. Click the extension icon
3. The extension will automatically extract the profile data
4. Edit any fields if needed
5. Click "Save to Airtable"

## Project Structure

```
linkedin-chrome-extension/
├── public/
│   ├── manifest.json          # Chrome extension manifest
│   └── icon*.png              # Extension icons
├── src/
│   ├── background/
│   │   └── background.ts      # Background script (Airtable API)
│   ├── content/
│   │   └── content.ts         # Content script (profile extraction)
│   ├── popup/
│   │   ├── Popup.tsx          # Main popup component
│   │   ├── popup.css          # Popup styles
│   │   └── index.html         # Popup HTML
│   └── options/
│       ├── Options.tsx        # Settings page component
│       ├── options.css        # Settings styles
│       └── index.html         # Settings HTML
├── package.json
├── tsconfig.json
└── vite.config.ts             # Vite build configuration
```

## Development

### Tech Stack

- React 18
- TypeScript
- Vite (for bundling)
- Chrome Extension Manifest V3

### Making Changes

1. Edit the source files in `src/`
2. Run `npm run dev` to rebuild automatically on changes
3. Reload the extension in Chrome:
   - Go to `chrome://extensions/`
   - Click the reload icon on your extension

### Content Script Logic

The content script (`src/content/content.ts`) uses multiple strategies to extract profile data:

1. Finds heading elements (h1/h2) for the name
2. Locates the main profile section using `data-view-name` attributes
3. Filters paragraph elements to identify role and company
4. Handles LinkedIn's dynamic, obfuscated class names

## Troubleshooting

### "Please refresh the LinkedIn page and try again"

If you see this error, the content script may not have loaded properly:
1. Refresh the LinkedIn profile page
2. Wait for the page to fully load
3. Click the extension icon again

### "Airtable is not configured"

Make sure you've:
1. Opened the Settings page (click "Settings" in the popup)
2. Entered your Airtable API key, Base ID, and Table name
3. Clicked "Save Settings"

### Profile data not extracting correctly

LinkedIn frequently updates their HTML structure. If extraction fails:
1. Check the browser console for errors
2. Inspect the LinkedIn page structure
3. Update the selectors in `src/content/content.ts` if needed

## License

MIT
