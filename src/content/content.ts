// Content script runs on LinkedIn profile pages
console.log('LinkedIn Chrome Extension - Content script loaded');

interface ProfileData {
  name: string;
  role: string;
  company: string;
  linkedinUrl: string;
  email: string;
  connectionRequestSent: boolean;  // LI Connection Request?
  connected: boolean;               // Connected?
}

/**
 * Waits for an element to appear in the DOM
 */
function waitForElement(selector: string, timeout = 10000): Promise<Element | null> {
  return new Promise((resolve) => {
    // Check if element already exists
    const element = document.querySelector(selector);
    if (element) {
      resolve(element);
      return;
    }

    // Set up observer to watch for element
    const observer = new MutationObserver((mutations, obs) => {
      const element = document.querySelector(selector);
      if (element) {
        obs.disconnect();
        resolve(element);
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    // Timeout after specified duration
    setTimeout(() => {
      observer.disconnect();
      resolve(null);
    }, timeout);
  });
}

/**
 * Extracts connection status from the profile page
 */
function extractConnectionStatus(): { connected: boolean; connectionRequestSent: boolean } {
  const status = {
    connected: false,
    connectionRequestSent: false,
  };

  try {
    console.log('=== Extracting connection status ===');

    // Look for all buttons on the page
    const buttons = Array.from(document.querySelectorAll('button'));

    // Check for "Pending" button (connection request sent)
    const pendingButton = buttons.find(button => {
      const ariaLabel = button.getAttribute('aria-label') || '';
      return ariaLabel.toLowerCase().includes('pending');
    });

    if (pendingButton) {
      console.log('✓ Connection request is pending');
      status.connectionRequestSent = true;
      return status;
    }

    // Check for "Message" button (already connected)
    const messageButton = buttons.find(button => {
      const ariaLabel = button.getAttribute('aria-label') || '';
      const text = button.textContent?.trim().toLowerCase() || '';
      return text === 'message' || ariaLabel.toLowerCase().includes('message');
    });

    if (messageButton) {
      console.log('✓ Already connected (Message button found)');
      status.connected = true;
      return status;
    }

    // Check for "Connect" button (not connected)
    const connectButton = buttons.find(button => {
      const ariaLabel = button.getAttribute('aria-label') || '';
      const text = button.textContent?.trim().toLowerCase() || '';
      return ariaLabel.toLowerCase().includes('invite') ||
             ariaLabel.toLowerCase().includes('connect') ||
             text === 'connect';
    });

    if (connectButton) {
      console.log('✓ Not connected (Connect button found)');
      return status;
    }

    console.log('⚠️ Could not determine connection status');
  } catch (error) {
    console.error('❌ Error extracting connection status:', error);
  }

  return status;
}

/**
 * Extracts profile data from a LinkedIn profile page
 */
function extractProfileData(): ProfileData {
  const profileData: ProfileData = {
    name: '',
    role: '',
    company: '',
    linkedinUrl: window.location.href,
    email: '',
    connectionRequestSent: false,
    connected: false,
  };

  try {
    console.log('=== Starting profile data extraction ===');

    // Extract Name - Look for h1/h2 in the profile header, excluding overlays
    const h1h2Elements = Array.from(document.querySelectorAll('h1, h2'));
    console.log(`Found ${h1h2Elements.length} h1/h2 elements`);

    const nameElement = h1h2Elements.find(el => {
      // Exclude elements inside overlays/dialogs/modals
      if (el.closest('[role="dialog"]') ||
          el.closest('[aria-modal="true"]') ||
          el.closest('.artdeco-modal') ||
          el.closest('[data-test-modal]')) {
        return false;
      }

      const text = el.textContent?.trim() || '';

      // Must be in the profile section (look for parent with profile-related attributes)
      const isInProfile = el.closest('[data-view-name*="profile"]') ||
                          el.closest('main') ||
                          !el.closest('nav') && !el.closest('header') && !el.closest('aside');

      // Filter out common non-name headers
      const isValidName = text &&
             text.length > 2 &&
             text.length < 100 &&
             !text.toLowerCase().includes('notification') &&
             !text.toLowerCase().includes('contact info') &&
             !text.toLowerCase().includes('activity') &&
             !text.toLowerCase().includes('experience') &&
             !text.toLowerCase().includes('message') &&
             !text.toLowerCase().includes('connections');

      console.log(`Checking: "${text.substring(0, 50)}" - isInProfile: ${isInProfile}, isValidName: ${isValidName}`);

      return isInProfile && isValidName;
    });

    if (nameElement) {
      profileData.name = nameElement.textContent?.trim() || '';
      console.log('✓ Name extracted:', profileData.name);
    } else {
      console.log('❌ Name not found');
    }

    // Extract Role and Company from Experience Section
    // Look for the current job (one with "Present" in the date)
    const experienceSection = document.querySelector('[data-view-name="profile-card-experience"]');

    if (experienceSection) {
      // Find all links in the experience section
      const allLinks = Array.from(experienceSection.querySelectorAll('a[href*="linkedin.com/company"]'));

      // Search for the experience entry with "Present"
      for (const companyLink of allLinks) {
        // Get the parent container that holds this experience entry
        let experienceContainer = companyLink.parentElement;

        // Walk up to find a larger container that includes the date
        for (let i = 0; i < 5; i++) {
          if (!experienceContainer) break;
          const containerText = experienceContainer.textContent || '';

          // Check if this container has "Present" indicating current job
          if (containerText.includes('Present')) {
            // Found the current job entry
            // Now find the role and company within this specific container

            // Look for paragraphs within the company link
            const linkParagraphs = Array.from(companyLink.querySelectorAll('p'));

            if (linkParagraphs.length >= 2) {
              // First p tag is typically the role
              const rolePara = linkParagraphs[0];
              const roleText = rolePara.textContent?.trim() || '';

              // Validate it's actually a role (not a date, location, etc.)
              if (roleText &&
                  roleText.length > 2 &&
                  roleText.length < 100 &&
                  !roleText.match(/\d{4}/) &&
                  !roleText.match(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)/i)) {
                profileData.role = roleText;
              }

              // Second p tag is typically the company
              const companyPara = linkParagraphs[1];
              const companyText = companyPara.textContent?.trim() || '';

              if (companyText) {
                // Extract company name (before "·" if present)
                const companyParts = companyText.split('·');
                profileData.company = companyParts[0].trim();
              }
            }

            // Found and extracted current job, stop searching
            break;
          }

          experienceContainer = experienceContainer.parentElement;
        }

        // If we found data, stop looking
        if (profileData.role && profileData.company) {
          break;
        }
      }
    }

    // Fallback: Try to get headline from profile header if no role found
    if (!profileData.role) {
      const profileSection = document.querySelector('[data-view-name*="profile-top-card"]');
      if (profileSection) {
        const paragraphs = Array.from(profileSection.querySelectorAll('p'));
        const headlineCandidate = paragraphs.find(p => {
          const text = p.textContent?.trim() || '';
          return text.length > 10 &&
                 text.length < 300 &&
                 !text.startsWith('·') &&
                 !text.toLowerCase().includes('contact info') &&
                 !text.toLowerCase().includes('connections');
        });

        if (headlineCandidate) {
          profileData.role = headlineCandidate.textContent?.trim() || '';
        }
      }
    }

    // Extract connection status
    const connectionStatus = extractConnectionStatus();
    profileData.connected = connectionStatus.connected;
    profileData.connectionRequestSent = connectionStatus.connectionRequestSent;

    console.log('Extracted profile data:', profileData);
  } catch (error) {
    console.error('Error extracting profile data:', error);
  }

  return profileData;
}

/**
 * Closes the Contact Info overlay using Escape key
 */
function closeContactInfoOverlay(): void {
  console.log('🔒 Closing Contact Info overlay with Escape key...');

  setTimeout(() => {
    // Simply send Escape key to close the modal
    const escapeEvent = new KeyboardEvent('keydown', {
      key: 'Escape',
      code: 'Escape',
      keyCode: 27,
      which: 27,
      bubbles: true,
      cancelable: true
    });
    document.dispatchEvent(escapeEvent);
    console.log('✓ Sent Escape key to close overlay');
  }, 500);
}

/**
 * Attempts to extract email from Contact Info overlay
 */
async function extractEmailFromContactInfo(): Promise<string> {
  try {
    console.log('=== Starting email extraction from Contact Info ===');

    // Look for the "Contact info" link - avoid matching the overlay heading
    const contactInfoLinks = Array.from(document.querySelectorAll('a, button'));
    const contactInfoLink = contactInfoLinks.find(link => {
      const text = link.textContent?.toLowerCase() || '';
      const href = (link as HTMLAnchorElement).href || '';

      // Match "Contact info" or "contact-info" in URL, but make sure it's not already in an overlay
      return (text.includes('contact info') || href.includes('overlay/contact-info')) &&
             !link.closest('[role="dialog"]'); // Exclude if already in overlay
    }) as HTMLElement;

    if (!contactInfoLink) {
      console.log('❌ Contact info link not found');
      return '';
    }

    console.log('✓ Found Contact info link, clicking...');
    contactInfoLink.click();

    // Wait for overlay to appear
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Use MutationObserver to wait for the mailto link to appear
    console.log('⏳ Waiting for mailto link to appear...');
    const emailFound = await waitForElement('a[href^="mailto:"]', 5000);

    if (emailFound) {
      const emailLink = emailFound as HTMLAnchorElement;
      const email = emailLink.href.replace('mailto:', '');

      if (email && email.includes('@')) {
        console.log('✓ Email found:', email);

        // Close the overlay
        closeContactInfoOverlay();

        return email;
      }
    }

    console.log('❌ mailto link not found, trying alternative methods...');

    // Fallback: Search entire document for mailto links (in case overlay structure is different)
    const allMailtoLinks = Array.from(document.querySelectorAll('a[href^="mailto:"]'));
    console.log(`Found ${allMailtoLinks.length} total mailto links in document`);

    if (allMailtoLinks.length > 0) {
      // Get the most recently added mailto link (likely from the overlay)
      const emailLink = allMailtoLinks[allMailtoLinks.length - 1] as HTMLAnchorElement;
      const email = emailLink.href.replace('mailto:', '');

      if (email && email.includes('@')) {
        console.log('✓ Email found via document search:', email);

        // Close overlay
        closeContactInfoOverlay();

        return email;
      }
    }

    // Last resort: regex on entire document
    console.log('Trying regex on overlay content...');
    const overlay = document.querySelector('[role="dialog"]');
    if (overlay) {
      const overlayHTML = overlay.innerHTML;
      console.log('Overlay HTML length:', overlayHTML.length);
      console.log('Overlay HTML preview:', overlayHTML.substring(0, 500));

      const emailRegex = /mailto:([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/;
      const match = overlayHTML.match(emailRegex);

      if (match && match[1]) {
        console.log('✓ Email found via regex in HTML:', match[1]);

        closeContactInfoOverlay();

        return match[1];
      }
    }

    console.log('❌ No email found after all attempts');

    // Close overlay
    closeContactInfoOverlay();

    return '';
  } catch (error) {
    console.error('❌ Error extracting email from Contact Info:', error);
    return '';
  }
}

/**
 * Extracts profile data with retries and waiting for content to load
 */
async function extractProfileDataWithRetry(maxRetries = 3): Promise<ProfileData> {
  // Wait for key elements to be present
  console.log('Waiting for LinkedIn profile to load...');

  // Close any existing overlays first to ensure clean extraction
  const existingOverlay = document.querySelector('[role="dialog"]');
  if (existingOverlay) {
    console.log('Closing existing overlay...');
    const closeButton = existingOverlay.querySelector('[aria-label*="Dismiss"], [aria-label*="Close"], button[aria-label]');
    if (closeButton) {
      (closeButton as HTMLButtonElement).click();
      await new Promise(resolve => setTimeout(resolve, 300));
    }
  }

  // Wait for either the name or experience section to appear
  await Promise.race([
    waitForElement('h1, h2'),
    waitForElement('[data-view-name="profile-card-experience"]'),
  ]);

  // Give LinkedIn a moment to finish rendering
  await new Promise(resolve => setTimeout(resolve, 500));

  // Try extraction with retries
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    console.log(`Extraction attempt ${attempt}/${maxRetries}`);

    const profileData = extractProfileData();

    // Check if we got meaningful data
    if (profileData.name && (profileData.role || profileData.company)) {
      console.log('Successfully extracted profile data:', profileData);

      // Try to extract email from Contact Info
      const email = await extractEmailFromContactInfo();
      if (email) {
        profileData.email = email;
      }

      return profileData;
    }

    // If not the last attempt, wait before retrying
    if (attempt < maxRetries) {
      console.log('Incomplete data, retrying...');
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  // Return whatever we got, even if incomplete
  console.log('Extraction completed with available data');
  const profileData = extractProfileData();

  // Still try to get email
  const email = await extractEmailFromContactInfo();
  if (email) {
    profileData.email = email;
  }

  return profileData;
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'extractProfileData') {
    // Use async extraction with retries
    extractProfileDataWithRetry()
      .then(profileData => {
        sendResponse(profileData);
      })
      .catch(error => {
        console.error('Error during extraction:', error);
        sendResponse(extractProfileData()); // Fallback to immediate extraction
      });

    return true; // Keep channel open for async response
  }
  return true;
});
