import { useState, useEffect } from 'react';

interface Settings {
  airtableApiKey: string;
  airtableBaseId: string;
  airtableTableName: string;
}

function Options() {
  const [settings, setSettings] = useState<Settings>({
    airtableApiKey: '',
    airtableBaseId: '',
    airtableTableName: 'Profiles',
  });
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = () => {
    chrome.storage.sync.get(
      ['airtableApiKey', 'airtableBaseId', 'airtableTableName'],
      (items) => {
        setSettings({
          airtableApiKey: items.airtableApiKey || '',
          airtableBaseId: items.airtableBaseId || '',
          airtableTableName: items.airtableTableName || 'Profiles',
        });
        setLoading(false);
      }
    );
  };

  const handleSave = () => {
    chrome.storage.sync.set(
      {
        airtableApiKey: settings.airtableApiKey,
        airtableBaseId: settings.airtableBaseId,
        airtableTableName: settings.airtableTableName,
      },
      () => {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    );
  };

  if (loading) {
    return (
      <div className="options-container">
        <h1>Loading settings...</h1>
      </div>
    );
  }

  return (
    <div className="options-container">
      <h1>Airtable Configuration</h1>

      <p className="instructions">
        Configure your Airtable credentials to save LinkedIn profiles directly to your Airtable base.
      </p>

      <div className="form">
        <div className="field">
          <label>Airtable API Key / Personal Access Token</label>
          <input
            type="password"
            value={settings.airtableApiKey}
            onChange={(e) => setSettings({ ...settings, airtableApiKey: e.target.value })}
            placeholder="Enter your Airtable API key"
          />
          <small>
            Get your API key from{' '}
            <a href="https://airtable.com/account" target="_blank" rel="noopener noreferrer">
              Airtable Account Settings
            </a>
          </small>
        </div>

        <div className="field">
          <label>Airtable Base ID</label>
          <input
            type="text"
            value={settings.airtableBaseId}
            onChange={(e) => setSettings({ ...settings, airtableBaseId: e.target.value })}
            placeholder="appXXXXXXXXXXXXXX"
          />
          <small>
            Find your Base ID in the Airtable API documentation for your base
          </small>
        </div>

        <div className="field">
          <label>Table Name</label>
          <input
            type="text"
            value={settings.airtableTableName}
            onChange={(e) => setSettings({ ...settings, airtableTableName: e.target.value })}
            placeholder="Profiles"
          />
          <small>
            The name of the table where profiles will be saved (default: "Profiles")
          </small>
        </div>

        <button onClick={handleSave} className="save-btn">
          Save Settings
        </button>

        {saved && <div className="status success">✓ Settings saved successfully!</div>}
      </div>

      <div className="help-section">
        <h2>Setup Instructions</h2>
        <ol>
          <li>Create an Airtable base or use an existing one</li>
          <li>Create a table with the following fields:
            <ul>
              <li><strong>Name</strong> (Single line text)</li>
              <li><strong>Role</strong> (Single line text or Long text)</li>
              <li><strong>Company</strong> (Single line text)</li>
              <li><strong>LinkedIn URL</strong> (URL)</li>
              <li><strong>Email</strong> (Email)</li>
              <li><strong>Created At</strong> (Date)</li>
            </ul>
          </li>
          <li>Get your API key from Airtable account settings</li>
          <li>Get your Base ID from the Airtable API documentation</li>
          <li>Enter all credentials above and save</li>
        </ol>
      </div>
    </div>
  );
}

export default Options;
