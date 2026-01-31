import { useState, useEffect } from 'react';

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
  const [brandData, setBrandData] = useState<BrandData | null>(null);
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

            // Check if we have a company LinkedIn URL to extract brand data
            if (response.companyLinkedInUrl) {
              setStatus('Extracting brand data...');
              extractBrandData(response.companyLinkedInUrl);
            } else {
              // No company URL, just finish
              if (response.name && (response.role || response.company)) {
                setStatus('Profile data extracted! You can edit and save.');
              } else if (response.name) {
                setStatus('Partial data extracted. Please check and edit as needed.');
              } else {
                setStatus('Could not extract data. The page may still be loading.');
              }
              setLoading(false);
            }
          } else {
            setLoading(false);
          }
        }
      );
    } catch (error) {
      console.error('Error extracting profile:', error);
      setStatus('Error extracting profile data');
      setLoading(false);
    }
  };

  const extractBrandData = async (companyUrl: string) => {
    try {
      console.log('Opening company page:', companyUrl);

      // Create a new tab with the company URL
      const newTab = await chrome.tabs.create({
        url: companyUrl,
        active: false, // Open in background
      });

      // Wait for the tab to load
      await new Promise((resolve) => {
        const listener = (tabId: number, changeInfo: chrome.tabs.TabChangeInfo) => {
          if (tabId === newTab.id && changeInfo.status === 'complete') {
            chrome.tabs.onUpdated.removeListener(listener);
            resolve(true);
          }
        };
        chrome.tabs.onUpdated.addListener(listener);

        // Timeout after 10 seconds
        setTimeout(() => {
          chrome.tabs.onUpdated.removeListener(listener);
          resolve(false);
        }, 10000);
      });

      // Give it a bit more time to render
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Extract brand data from the company page
      if (newTab.id) {
        chrome.tabs.sendMessage(
          newTab.id,
          { action: 'extractBrandData' },
          async (brandResponse) => {
            // Close the company tab
            if (newTab.id) {
              await chrome.tabs.remove(newTab.id);
            }

            if (chrome.runtime.lastError) {
              console.error('Error extracting brand:', chrome.runtime.lastError);
              setStatus('Could not extract brand data. Profile data ready to save.');
              setLoading(false);
              return;
            }

            if (brandResponse) {
              setBrandData(brandResponse);
              setStatus('Profile and brand data extracted! Review and save.');
            } else {
              setStatus('Profile data extracted! Could not get brand data.');
            }

            setLoading(false);
          }
        );
      } else {
        setLoading(false);
        setStatus('Profile data extracted! Could not open brand page.');
      }
    } catch (error) {
      console.error('Error extracting brand data:', error);
      setStatus('Profile data extracted! Brand extraction failed.');
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setStatus(brandData ? 'Saving brand and prospect to Airtable...' : 'Saving to Airtable...');

      // Send to background script to save to Airtable
      chrome.runtime.sendMessage(
        { action: 'saveToAirtable', data: profileData, brandData: brandData },
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

        {brandData && (
          <>
            <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #ddd' }}>
              <h3 style={{ fontSize: '14px', marginBottom: '12px', color: '#0073b1' }}>Brand Information</h3>
            </div>

            <div className="field">
              <label>Brand Name</label>
              <input
                type="text"
                value={brandData.brandName}
                onChange={(e) => setBrandData({ ...brandData, brandName: e.target.value })}
                placeholder="Brand name"
                disabled={loading}
              />
            </div>

            <div className="field">
              <label>Brand Website</label>
              <input
                type="text"
                value={brandData.brandWebsite}
                onChange={(e) => setBrandData({ ...brandData, brandWebsite: e.target.value })}
                placeholder="https://example.com"
                disabled={loading}
              />
            </div>

            <div className="field">
              <label>Location</label>
              <input
                type="text"
                value={brandData.location}
                readOnly
                disabled={loading}
              />
            </div>
          </>
        )}

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
