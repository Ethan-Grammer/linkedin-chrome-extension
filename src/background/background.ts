// Background service worker
console.log('LinkedIn Chrome Extension - Background script loaded');

interface ProfileData {
  name: string;
  role: string;
  company: string;
  linkedinUrl: string;
  email: string;
  connectionRequestSent: boolean;
  connected: boolean;
}

interface AirtableConfig {
  apiKey: string;
  baseId: string;
  tableName: string;
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'saveToAirtable') {
    // Save profile data to Airtable
    saveToAirtable(request.data)
      .then((result) => sendResponse({ success: true, result }))
      .catch((error) => sendResponse({ success: false, error: error.message }));

    return true; // Keep channel open for async response
  }
});

/**
 * Saves profile data to Airtable
 */
async function saveToAirtable(data: ProfileData) {
  console.log('Saving to Airtable:', data);

  // Get Airtable configuration from storage
  const config = await getAirtableConfig();

  if (!config.apiKey || !config.baseId || !config.tableName) {
    throw new Error('Airtable is not configured. Please go to Settings and add your API key, Base ID, and Table name.');
  }

  // Debug logging
  console.log('Airtable Config:', {
    baseId: config.baseId,
    tableName: config.tableName,
    apiKeyLength: config.apiKey.length,
    apiKeyPrefix: config.apiKey.substring(0, 7) + '...'
  });

  // Prepare the record for Airtable
  const record = {
    fields: {
      'Prospect Name': data.name,
      Role: data.role,
      'LinkedIn URL': data.linkedinUrl,
      Email: data.email || '',
      'LI Connection Request?': data.connectionRequestSent,
      'Connected?': data.connected,
    },
  };

  // Send to Airtable API
  const url = `https://api.airtable.com/v0/${config.baseId}/${encodeURIComponent(config.tableName)}`;

  console.log('Airtable API URL:', url);

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(record),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    console.error('Airtable API Error Response:', errorData);
    console.error('URL that failed:', url);

    let errorMessage = errorData.error?.message || `HTTP ${response.status}: ${response.statusText}`;

    // Add helpful context for 404 errors
    if (response.status === 404) {
      errorMessage = `404 Not Found. Please check:\n` +
        `1. Base ID is correct (currently: ${config.baseId})\n` +
        `2. Table name is correct and matches exactly (currently: "${config.tableName}")\n` +
        `3. API token has access to this base\n` +
        `Full URL: ${url}`;
    }

    throw new Error(`Airtable API error: ${errorMessage}`);
  }

  const result = await response.json();
  console.log('Successfully saved to Airtable:', result);

  return result;
}

/**
 * Retrieves Airtable configuration from Chrome storage
 */
async function getAirtableConfig(): Promise<AirtableConfig> {
  return new Promise((resolve) => {
    chrome.storage.sync.get(['airtableApiKey', 'airtableBaseId', 'airtableTableName'], (items) => {
      resolve({
        apiKey: items.airtableApiKey || '',
        baseId: items.airtableBaseId || '',
        tableName: items.airtableTableName || 'Profiles',
      });
    });
  });
}
