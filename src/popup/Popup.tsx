import { useState, useEffect } from 'react';

interface ProfileData {
  name: string;
  role: string;
  company: string;
  linkedinUrl: string;
  email: string;
  connectionRequestSent: boolean;
  connected: boolean;
}

function Popup() {
  const [profileData, setProfileData] = useState<ProfileData>({
    name: '',
    role: '',
    company: '',
    linkedinUrl: '',
    email: '',
    connectionRequestSent: false,
    connected: false,
  });
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    extractProfileData();
  }, []);

  const extractProfileData = async () => {
    try {
      setLoading(true);
      setStatus('Waiting for LinkedIn to load...');

      // Get the current active tab
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

      if (!tab.id) {
        setStatus('Error: No active tab found');
        setLoading(false);
        return;
      }

      // Check if we're on a LinkedIn profile page
      if (!tab.url?.includes('linkedin.com/in/')) {
        setStatus('Please navigate to a LinkedIn profile page');
        setLoading(false);
        return;
      }

      setStatus('Extracting profile data...');

      // Send message to content script to extract profile data
      // The content script now handles waiting and retries internally
      chrome.tabs.sendMessage(
        tab.id,
        { action: 'extractProfileData' },
        (response) => {
          if (chrome.runtime.lastError) {
            console.error('Error:', chrome.runtime.lastError);
            setStatus('Error: Please refresh the LinkedIn page and try again');
            setLoading(false);
            return;
          }

          if (response) {
            setProfileData(response);

            // Check if we got complete data
            if (response.name && (response.role || response.company)) {
              setStatus('Profile data extracted! You can edit and save.');
            } else if (response.name) {
              setStatus('Partial data extracted. Please check and edit as needed.');
            } else {
              setStatus('Could not extract data. The page may still be loading.');
            }
          }
          setLoading(false);
        }
      );
    } catch (error) {
      console.error('Error extracting profile:', error);
      setStatus('Error extracting profile data');
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setStatus('Saving to Airtable...');

      // Send to background script to save to Airtable
      chrome.runtime.sendMessage(
        { action: 'saveToAirtable', data: profileData },
        (response) => {
          if (response.success) {
            setStatus('Saved successfully! ✓');
          } else {
            setStatus(`Error: ${response.error}`);
          }
        }
      );
    } catch (error) {
      console.error('Error saving:', error);
      setStatus('Error saving to Airtable');
    }
  };

  return (
    <div className="popup-container">
      <h1>LinkedIn Profile Saver</h1>

      <div className="form">
        <div className="field">
          <label>Name</label>
          <input
            type="text"
            value={profileData.name}
            onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
            placeholder="Full name"
            disabled={loading}
          />
        </div>

        <div className="field">
          <label>Role</label>
          <input
            type="text"
            value={profileData.role}
            onChange={(e) => setProfileData({ ...profileData, role: e.target.value })}
            placeholder="Job title"
            disabled={loading}
          />
        </div>

        <div className="field">
          <label>Company</label>
          <input
            type="text"
            value={profileData.company}
            onChange={(e) => setProfileData({ ...profileData, company: e.target.value })}
            placeholder="Company name"
            disabled={loading}
          />
        </div>

        <div className="field">
          <label>LinkedIn URL</label>
          <input
            type="text"
            value={profileData.linkedinUrl}
            readOnly
            placeholder="Profile URL"
          />
        </div>

        <div className="field">
          <label>Email</label>
          <input
            type="email"
            value={profileData.email}
            onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
            placeholder="email@example.com"
            disabled={loading}
          />
        </div>

        <div className="field checkbox-field">
          <label>
            <input
              type="checkbox"
              checked={profileData.connectionRequestSent}
              onChange={(e) => setProfileData({ ...profileData, connectionRequestSent: e.target.checked })}
              disabled={loading}
            />
            LI Connection Request Sent?
          </label>
        </div>

        <div className="field checkbox-field">
          <label>
            <input
              type="checkbox"
              checked={profileData.connected}
              onChange={(e) => setProfileData({ ...profileData, connected: e.target.checked })}
              disabled={loading}
            />
            Connected?
          </label>
        </div>

        <div className="button-group">
          <button onClick={extractProfileData} className="refresh-btn" disabled={loading}>
            {loading ? 'Extracting...' : 'Refresh Data'}
          </button>
          <button onClick={handleSave} className="save-btn" disabled={loading || !profileData.name}>
            Save to Airtable
          </button>
        </div>

        {status && <div className="status">{status}</div>}
      </div>

      <button
        onClick={() => chrome.runtime.openOptionsPage()}
        className="settings-link"
        style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
      >
        Settings
      </button>
    </div>
  );
}

export default Popup;
