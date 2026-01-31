// Background service worker
console.log('LinkedIn Chrome Extension - Background script loaded');

// Handle extension icon click - open side panel
chrome.action.onClicked.addListener(async (tab) => {
  if (tab.id) {
    // Open the side panel for this tab
    await chrome.sidePanel.open({ tabId: tab.id });
  }
});

interface ProfileData {
  name: string;
  role: string;
  company: string;
  linkedinUrl: string;
  email: string;
  connectionRequestSent: boolean;
  connected: boolean;
  companyLinkedInUrl?: string;
}

interface BrandData {
  brandName: string;
  brandWebsite: string;
  location: string;
}

interface AirtableConfig {
  apiKey: string;
  baseId: string;
  tableName: string;
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'saveToAirtable') {
    // Save profile data and optionally brand data to Airtable
    saveToAirtable(request.data, request.brandData)
      .then((result) => sendResponse({ success: true, result }))
      .catch((error) => sendResponse({ success: false, error: error.message }));

    return true; // Keep channel open for async response
  }
});

/**
 * Searches for an existing brand record by name
 */
async function findBrandByName(brandName: string, config: AirtableConfig): Promise<string | null> {
  try {
    const filterFormula = `{Brand Name} = "${brandName.replace(/"/g, '\\"')}"`;
    const url = `https://api.airtable.com/v0/${config.baseId}/Brands?filterByFormula=${encodeURIComponent(filterFormula)}`;

    console.log('Searching for existing brand:', brandName);
    console.log('Brand search URL:', url);
    console.log('Filter formula:', filterFormula);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
      },
    });

    console.log('Brand search response status:', response.status);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Failed to search for brand. Status:', response.status);
      console.error('Error details:', errorData);
      return null;
    }

    const result = await response.json();
    console.log('Brand search result:', JSON.stringify(result, null, 2));

    if (result.records && result.records.length > 0) {
      console.log('✓ Found existing brand:', result.records[0].id);
      return result.records[0].id;
    }

    console.log('✗ No existing brand found');
    return null;
  } catch (error) {
    console.error('Error searching for brand:', error);
    return null;
  }
}

/**
 * Saves brand data to Airtable and returns the record ID (upsert logic)
 */
async function saveBrandToAirtable(brandData: BrandData, config: AirtableConfig): Promise<string> {
  console.log('Saving brand to Airtable:', brandData);

  // Search for existing brand
  const existingRecordId = await findBrandByName(brandData.brandName, config);

  const fields: any = {
    'Brand Name': brandData.brandName,
    'Brand Website': brandData.brandWebsite,
    Location: brandData.location,
  };

  // Only set Temperature on new records
  if (!existingRecordId) {
    fields.Temperature = 'Cold';
  }

  if (existingRecordId) {
    // Update existing record
    const url = `https://api.airtable.com/v0/${config.baseId}/Brands/${existingRecordId}`;
    console.log('Updating existing brand:', url);

    const response = await fetch(url, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ fields }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Airtable Brand Update Error:', errorData);
      throw new Error(`Failed to update brand: ${errorData.error?.message || response.statusText}`);
    }

    const result = await response.json();
    console.log('Brand updated successfully:', result);
    return result.id;
  } else {
    // Create new record
    const url = `https://api.airtable.com/v0/${config.baseId}/Brands`;
    console.log('Creating new brand:', url);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ fields }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Airtable Brand Create Error:', errorData);
      throw new Error(`Failed to create brand: ${errorData.error?.message || response.statusText}`);
    }

    const result = await response.json();
    console.log('Brand created successfully:', result);
    return result.id;
  }
}

/**
 * Searches for an existing prospect record by LinkedIn URL
 */
async function findProspectByLinkedInUrl(linkedinUrl: string, config: AirtableConfig): Promise<string | null> {
  try {
    const filterFormula = `{LinkedIn URL} = "${linkedinUrl.replace(/"/g, '\\"')}"`;
    const url = `https://api.airtable.com/v0/${config.baseId}/${encodeURIComponent(config.tableName)}?filterByFormula=${encodeURIComponent(filterFormula)}`;

    console.log('Searching for existing prospect:', linkedinUrl);
    console.log('Search URL:', url);
    console.log('Filter formula:', filterFormula);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
      },
    });

    console.log('Search response status:', response.status);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Failed to search for prospect. Status:', response.status);
      console.error('Error details:', errorData);
      return null;
    }

    const result = await response.json();
    console.log('Search result:', JSON.stringify(result, null, 2));

    if (result.records && result.records.length > 0) {
      console.log('✓ Found existing prospect:', result.records[0].id);
      return result.records[0].id;
    }

    console.log('✗ No existing prospect found');
    return null;
  } catch (error) {
    console.error('Error searching for prospect:', error);
    return null;
  }
}

/**
 * Saves profile data to Airtable, optionally creating/linking brand first (upsert logic)
 */
async function saveToAirtable(data: ProfileData, brandData?: BrandData | null) {
  console.log('Saving to Airtable:', data);
  console.log('Brand data:', brandData);

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

  let brandRecordId: string | undefined;

  // Save brand first if provided
  if (brandData && brandData.brandName) {
    try {
      brandRecordId = await saveBrandToAirtable(brandData, config);
      console.log('Brand record ID:', brandRecordId);
    } catch (error) {
      console.error('Failed to save brand, continuing with prospect:', error);
      // Continue saving prospect even if brand fails
    }
  }

  // Search for existing prospect
  const existingRecordId = await findProspectByLinkedInUrl(data.linkedinUrl, config);

  // Prepare the record for Airtable
  const fields: any = {
    'Prospect Name': data.name,
    Role: data.role,
    'LinkedIn URL': data.linkedinUrl,
    Email: data.email || '',
    'LI Connection Request?': data.connectionRequestSent,
    'Connected?': data.connected,
  };

  // Add brand link if we have a brand record ID
  if (brandRecordId) {
    fields.Brand = [brandRecordId]; // Linked record field expects array of record IDs
  }

  let url: string;
  let method: string;

  if (existingRecordId) {
    // Update existing record
    url = `https://api.airtable.com/v0/${config.baseId}/${encodeURIComponent(config.tableName)}/${existingRecordId}`;
    method = 'PATCH';
    console.log('Updating existing prospect:', url);
  } else {
    // Create new record
    url = `https://api.airtable.com/v0/${config.baseId}/${encodeURIComponent(config.tableName)}`;
    method = 'POST';
    console.log('Creating new prospect:', url);
  }

  const response = await fetch(url, {
    method,
    headers: {
      'Authorization': `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ fields }),
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
  console.log(`Successfully ${existingRecordId ? 'updated' : 'created'} prospect in Airtable:`, result);

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
