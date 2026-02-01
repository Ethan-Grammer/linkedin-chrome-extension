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
  companyLinkedInUrl?: string;      // Company LinkedIn URL for brand extraction
}

interface BrandData {
  brandName: string;
  brandWebsite: string;
  location: string;
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
 * Extracts brand data from a LinkedIn company page
 */
function extractBrandData(): BrandData {
  const brandData: BrandData = {
    brandName: '',
    brandWebsite: '',
    location: 'LinkedIn',
  };

  try {
    console.log('=== Starting brand data extraction ===');

    // Extract Brand Name from h1
    const h1Elements = Array.from(document.querySelectorAll('h1'));
    const nameElement = h1Elements.find(el => {
      const text = el.textContent?.trim() || '';
      return text.length > 0 && text.length < 100;
    });

    if (nameElement) {
      brandData.brandName = nameElement.textContent?.trim() || '';
      console.log('✓ Brand name extracted:', brandData.brandName);
    }

    // Extract Brand Website - look for website link
    // LinkedIn company pages have a "Website" section with an external link
    const allLinks = Array.from(document.querySelectorAll('a[href]'));

    // Find links that are external (not linkedin.com) and look like company websites
    const websiteLink = allLinks.find(link => {
      const href = (link as HTMLAnchorElement).href;
      const text = link.textContent?.toLowerCase() || '';

      // Skip LinkedIn URLs
      if (href.includes('linkedin.com')) return false;

      // Look for common website patterns or "Website" label
      return text.includes('website') ||
             href.match(/^https?:\/\/(?:www\.)?[a-zA-Z0-9-]+\.[a-zA-Z]{2,}/);
    });

    if (websiteLink) {
      brandData.brandWebsite = (websiteLink as HTMLAnchorElement).href;
      console.log('✓ Brand website extracted:', brandData.brandWebsite);
    } else {
      // Alternative: look for links in the "About" section
      const aboutSection = document.querySelector('[class*="about"]');
      if (aboutSection) {
        const aboutLinks = Array.from(aboutSection.querySelectorAll('a[href]'));
        const externalLink = aboutLinks.find(link => {
          const href = (link as HTMLAnchorElement).href;
          return href && !href.includes('linkedin.com');
        });

        if (externalLink) {
          brandData.brandWebsite = (externalLink as HTMLAnchorElement).href;
          console.log('✓ Brand website extracted from About:', brandData.brandWebsite);
        }
      }
    }

    console.log('Extracted brand data:', brandData);
  } catch (error) {
    console.error('Error extracting brand data:', error);
  }

  return brandData;
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

    // First, check for "1st" connection badge in the profile header
    const profileHeader = document.querySelector('main, [data-view-name*="profile"]');
    if (profileHeader) {
      const headerText = profileHeader.textContent || '';

      // Look for various "1st" connection indicators
      const connectionIndicators = [
        '1st degree connection',
        '• 1st',
        '1st',
        'Connected'
      ];

      const hasConnectionIndicator = connectionIndicators.some(indicator =>
        headerText.includes(indicator)
      );

      console.log('Profile header text (first 500 chars):', headerText.substring(0, 500));
      console.log('Checking for connection indicators:', connectionIndicators);

      if (hasConnectionIndicator) {
        console.log('✓ Found connection indicator in profile header - already connected');
        status.connected = true;
        status.connectionRequestSent = true;
        return status;
      }
    }

    // Look for buttons in the profile header specifically
    const profileButtons = profileHeader ?
      Array.from(profileHeader.querySelectorAll('button')) :
      Array.from(document.querySelectorAll('button'));

    // Debug: Log profile action buttons (looking for Message, Connect, Pending)
    console.log('Profile action buttons:');
    profileButtons.forEach(button => {
      const text = button.textContent?.trim() || '';
      const ariaLabel = button.getAttribute('aria-label') || '';

      // Only log buttons that might be action buttons
      if (text.length < 50 && (
        text.toLowerCase().includes('message') ||
        text.toLowerCase().includes('connect') ||
        text.toLowerCase().includes('pending') ||
        ariaLabel.toLowerCase().includes('message') ||
        ariaLabel.toLowerCase().includes('connect') ||
        ariaLabel.toLowerCase().includes('pending')
      )) {
        console.log(`  - Text: "${text}", Aria-label: "${ariaLabel}"`);
      }
    });

    // Check for "Pending" button (connection request sent but not accepted)
    const pendingButton = profileButtons.find(button => {
      const ariaLabel = button.getAttribute('aria-label') || '';
      const text = button.textContent?.trim().toLowerCase() || '';
      return ariaLabel.toLowerCase().includes('pending') || text.includes('pending');
    });

    if (pendingButton) {
      console.log('✓ Connection request is pending (not yet accepted)');
      status.connectionRequestSent = true;
      status.connected = false;
      return status;
    }

    // Check for "Message" button (already connected)
    const messageButton = profileButtons.find(button => {
      const ariaLabel = button.getAttribute('aria-label') || '';
      const text = button.textContent?.trim().toLowerCase() || '';

      return text === 'message' ||
             text.includes('message') ||
             ariaLabel.toLowerCase().includes('message') ||
             ariaLabel.toLowerCase().startsWith('message '); // "Message John Doe"
    });

    if (messageButton) {
      console.log('✓ Found Message button - already connected');
      console.log('  Message button text:', messageButton.textContent?.trim());
      console.log('  Message button aria-label:', messageButton.getAttribute('aria-label'));
      status.connected = true;
      status.connectionRequestSent = true;
      return status;
    }

    // Check for "Connect" button (not connected at all)
    const connectButton = profileButtons.find(button => {
      const ariaLabel = button.getAttribute('aria-label') || '';
      const text = button.textContent?.trim().toLowerCase() || '';
      return ariaLabel.toLowerCase().includes('invite') ||
             ariaLabel.toLowerCase().includes('connect') ||
             text === 'connect' ||
             text.includes('connect');
    });

    if (connectButton) {
      console.log('✓ Not connected (no request sent yet)');
      return status;
    }

    console.log('⚠️ Could not determine connection status - no indicators found');
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
      // Get only visible text, not screen-reader duplicates
      let name = '';

      // Check if nameElement has aria-hidden/visually-hidden pattern
      const ariaHiddenChild = nameElement.querySelector('[aria-hidden="true"]');
      if (ariaHiddenChild && nameElement.querySelector('.visually-hidden')) {
        // Use only the aria-hidden (visible) text
        name = ariaHiddenChild.textContent?.trim() || '';
      } else {
        name = nameElement.textContent?.trim() || '';
      }

      profileData.name = name;
      console.log('✓ Name extracted:', profileData.name);
    } else {
      console.log('❌ Name not found');
    }

    // Extract Role and Company from Experience Section
    // Look for the current job (one with "Present" in the date)
    // Try multiple selectors to handle different LinkedIn HTML structures
    let experienceSection = document.querySelector('[data-view-name="profile-card-experience"]');

    // Fallback: Try to find section by the experience anchor ID
    if (!experienceSection) {
      const experienceAnchor = document.getElementById('experience');
      if (experienceAnchor) {
        experienceSection = experienceAnchor.closest('section');
      }
    }

    // Fallback: Find section containing the "Experience" heading
    if (!experienceSection) {
      const headings = Array.from(document.querySelectorAll('h2'));
      const expHeading = headings.find(h => h.textContent?.trim() === 'Experience');
      if (expHeading) {
        experienceSection = expHeading.closest('section');
      }
    }

    if (experienceSection) {
      console.log('✓ Found experience section');

      // Find all company links in the experience section
      // Handle both text-based and numeric ID company URLs
      const allLinks = Array.from(experienceSection.querySelectorAll('a[href*="linkedin.com/company"]'));
      console.log(`Found ${allLinks.length} company links in experience section`);

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
            console.log('✓ Found current job with "Present"');

            // Extract company LinkedIn URL
            const companyUrl = (companyLink as HTMLAnchorElement).href;
            if (companyUrl && companyUrl.includes('linkedin.com/company')) {
              profileData.companyLinkedInUrl = companyUrl;
              console.log('✓ Company LinkedIn URL extracted:', companyUrl);
            }

            // Method 1: Look for paragraphs within the company link (original structure)
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
                console.log('✓ Role extracted from <p> tag:', roleText);
              }

              // Second p tag is typically the company
              const companyPara = linkParagraphs[1];
              const companyText = companyPara.textContent?.trim() || '';

              if (companyText) {
                // Extract company name (before "·" if present)
                const companyParts = companyText.split('·');
                profileData.company = companyParts[0].trim();
                console.log('✓ Company extracted from <p> tag:', profileData.company);
              }
            }

            // Method 2: Look for spans with role/company (alternative structure)
            if (!profileData.role || !profileData.company) {
              console.log('Trying alternative span-based extraction...');

              // Find all spans and divs within the link that might contain role/company
              // Filter out screen reader duplicates (visually-hidden class)
              const allSpans = Array.from(companyLink.querySelectorAll('span, div')).filter(el => {
                const classes = el.className || '';
                // Skip visually-hidden elements (screen reader only) and aria-hidden elements
                return !classes.includes('visually-hidden') &&
                       !classes.includes('accessibility-text') &&
                       el.getAttribute('aria-hidden') !== 'true';
              });

              for (const span of allSpans) {
                const text = span.textContent?.trim() || '';

                // Skip if already found both
                if (profileData.role && profileData.company) break;

                // Skip if this span contains child elements with duplicated text
                // (LinkedIn often wraps text in nested spans)
                const childSpans = span.querySelectorAll('span');
                const hasVisuallyHiddenChild = Array.from(childSpans).some(child =>
                  child.className.includes('visually-hidden')
                );

                // If it has a visually-hidden child, get text from aria-hidden span only
                let displayText = text;
                if (hasVisuallyHiddenChild) {
                  const ariaHiddenSpan = span.querySelector('[aria-hidden="true"]');
                  if (ariaHiddenSpan) {
                    displayText = ariaHiddenSpan.textContent?.trim() || '';
                  }
                }

                // Check if this looks like a role (not a date, not too long, contains meaningful text)
                if (!profileData.role && displayText.length > 2 && displayText.length < 100 &&
                    !displayText.match(/\d{4}/) &&
                    !displayText.match(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)/i) &&
                    !displayText.includes('Present') &&
                    !displayText.includes('·') &&
                    !displayText.includes('Full-time') &&
                    !displayText.includes('Part-time')) {

                  // Check if this span has a bold class (roles are often bold)
                  const hasBoldClass = span.className.includes('bold') ||
                                      span.className.includes('t-bold') ||
                                      span.closest('[class*="bold"]');

                  if (hasBoldClass) {
                    profileData.role = displayText;
                    console.log('✓ Role extracted from <span> tag:', displayText);
                  }
                }

                // Check if this looks like a company name
                if (!profileData.company && displayText.length > 1 && displayText.length < 100 &&
                    !displayText.match(/\d{4}/) &&
                    !displayText.match(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)/i) &&
                    !displayText.includes('Present')) {

                  // Extract company name (before "·" if present)
                  const companyParts = displayText.split('·');
                  const potentialCompany = companyParts[0].trim();

                  if (potentialCompany && potentialCompany !== profileData.role) {
                    profileData.company = potentialCompany;
                    console.log('✓ Company extracted from <span> tag:', potentialCompany);
                  }
                }
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
    } else {
      console.log('⚠️ Experience section not found');
    }

    // Fallback: Try to get role/company from profile header
    if (!profileData.role || !profileData.company) {
      console.log('Attempting to extract role/company from profile header...');

      // Try multiple selectors for the profile header
      let profileSection = document.querySelector('[data-view-name*="profile-top-card"]');

      if (!profileSection) {
        // Alternative: look for the main section or section with profile data
        profileSection = document.querySelector('main section');
      }

      if (profileSection) {
        // PRIORITY 1: Extract company name from profile header (same as brand extraction)
        if (!profileData.company) {
          console.log('Extracting company name from profile header...');

          // Method 1: Look for ALL text in spans/divs near company images/buttons
          // This mirrors how brand extraction finds the company name on company pages
          const allSpans = Array.from(profileSection.querySelectorAll('span, div'));

          // Look for short text elements that could be company names (like "FORM")
          // Similar to how we extract brand names from h1 on company pages
          const companyNameCandidates = allSpans
            .map(el => {
              // Get visible text only (skip screen reader duplicates)
              const classes = el.className || '';
              if (classes.includes('visually-hidden') || el.getAttribute('aria-hidden') === 'true') {
                return null;
              }

              // Get direct text content (not from children)
              let text = '';
              for (const node of el.childNodes) {
                if (node.nodeType === Node.TEXT_NODE) {
                  text += node.textContent || '';
                }
              }
              text = text.trim();

              // Also try getting from first child if it's aria-hidden
              if (!text) {
                const ariaHiddenChild = el.querySelector('[aria-hidden="true"]');
                if (ariaHiddenChild && el.querySelector('.visually-hidden')) {
                  text = ariaHiddenChild.textContent?.trim() || '';
                }
              }

              // Check if this could be a company name
              // Company names are typically short (1-50 chars), no dates, and near top of profile
              if (text &&
                  text.length > 0 &&
                  text.length < 50 &&
                  !text.match(/\d{4}/) &&
                  !text.match(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)/i) &&
                  !text.toLowerCase().includes('connection') &&
                  !text.toLowerCase().includes('follower') &&
                  !text.toLowerCase().includes('contact') &&
                  !text.includes('·') &&
                  !text.includes('|') &&
                  text !== profileData.name &&
                  text !== profileData.role) {

                // Check if this element is near a company-related element
                const parent = el.closest('button, a, li, div[class*="company"]');
                if (parent) {
                  const parentText = parent.textContent?.toLowerCase() || '';
                  const parentClasses = parent.className?.toLowerCase() || '';
                  const ariaLabel = parent.getAttribute('aria-label')?.toLowerCase() || '';

                  if (parentText.includes('company') ||
                      parentClasses.includes('company') ||
                      ariaLabel.includes('company')) {
                    return { text, element: el };
                  }
                }
              }

              return null;
            })
            .filter(item => item !== null);

          console.log(`Found ${companyNameCandidates.length} company name candidates:`, companyNameCandidates.map(c => c?.text));

          // Take the first valid candidate
          if (companyNameCandidates.length > 0 && companyNameCandidates[0]) {
            profileData.company = companyNameCandidates[0].text;
            console.log('✓ Company name extracted (brand-style):', profileData.company);
          }

          // Method 2: Extract from button aria-label as backup
          if (!profileData.company) {
            const companyButtons = Array.from(profileSection.querySelectorAll('button[aria-label*="company"], button[aria-label*="Company"]'));

            for (const button of companyButtons) {
              const ariaLabel = button.getAttribute('aria-label') || '';
              const match = ariaLabel.match(/(?:Current company|Company):\s*([^.]+)/i);
              if (match && match[1]) {
                const companyName = match[1].trim().split('.')[0].split(',')[0].trim();
                profileData.company = companyName;
                console.log('✓ Company extracted from aria-label:', profileData.company);
                break;
              }
            }
          }
        }

        // PRIORITY 2: Extract role from headline div
        if (!profileData.role) {
          // Look for divs with class "text-body-medium" which often contain the headline
          const headlineDivs = Array.from(profileSection.querySelectorAll('div.text-body-medium'));

          for (const div of headlineDivs) {
            // Get only visible text, not screen-reader duplicates
            let text = '';

            // Check if div has aria-hidden/visually-hidden pattern
            const ariaHiddenChild = div.querySelector('[aria-hidden="true"]');
            if (ariaHiddenChild && div.querySelector('.visually-hidden')) {
              // Use only the aria-hidden (visible) text
              text = ariaHiddenChild.textContent?.trim() || '';
            } else {
              text = div.textContent?.trim() || '';
            }

            // Validate this looks like a headline (has role/company info)
            if (text.length > 5 && text.length < 300 &&
                !text.toLowerCase().includes('contact info') &&
                !text.toLowerCase().includes('connections') &&
                !text.toLowerCase().includes('followers')) {

              console.log('Found headline div:', text);

              // Extract role (everything before " at ", ",", or "|")
              let role = text;

              if (text.includes(' at ')) {
                role = text.split(' at ')[0].trim();
              } else if (text.includes(',')) {
                role = text.split(',')[0].trim();
              } else if (text.includes('|')) {
                role = text.split('|')[0].trim();
              }

              if (role && role.length > 2) {
                profileData.role = role;
                console.log('✓ Role extracted from headline:', role);
                break;
              }
            }
          }

          // Alternative: Try paragraphs if divs didn't work
          if (!profileData.role) {
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
              const headlineText = headlineCandidate.textContent?.trim() || '';
              profileData.role = headlineText;
              console.log('✓ Role extracted from <p> headline:', headlineText);
            }
          }
        }

        // PRIORITY 3: If still no company, try parsing from headline as last resort
        if (!profileData.company) {
          const headlineDivs = Array.from(profileSection.querySelectorAll('div.text-body-medium'));

          for (const div of headlineDivs) {
            let text = '';
            const ariaHiddenChild = div.querySelector('[aria-hidden="true"]');
            if (ariaHiddenChild && div.querySelector('.visually-hidden')) {
              text = ariaHiddenChild.textContent?.trim() || '';
            } else {
              text = div.textContent?.trim() || '';
            }

            if (text.length > 5 && text.length < 300) {
              // Try to extract company name from headline patterns
              let company = '';

              if (text.includes(' at ')) {
                const parts = text.split(' at ');
                if (parts[1]) {
                  company = parts[1].split('|')[0].split(',')[0].trim();
                }
              } else if (text.includes(',')) {
                const parts = text.split(',');
                if (parts[1]) {
                  const secondPart = parts[1].trim();
                  // Make sure it's not the same as the role and looks like a company
                  if (!secondPart.match(/\d{4}/) && secondPart.length < 50 && secondPart !== profileData.role) {
                    company = secondPart.split('|')[0].trim();
                  }
                }
              }

              if (company && company.length > 1 && company !== profileData.role) {
                profileData.company = company;
                console.log('✓ Company extracted from headline parsing:', company);
                break;
              }
            }
          }
        }
      }
    }

    // This section has been moved up to Priority 1 in the profile header extraction

    // Extract connection status
    const connectionStatus = extractConnectionStatus();
    profileData.connected = connectionStatus.connected;
    profileData.connectionRequestSent = connectionStatus.connectionRequestSent;

    console.log('=== Final Extracted Profile Data ===');
    console.log('Name:', profileData.name || '❌ NOT FOUND');
    console.log('Role:', profileData.role || '❌ NOT FOUND');
    console.log('Company:', profileData.company || '❌ NOT FOUND');
    console.log('LinkedIn URL:', profileData.linkedinUrl);
    console.log('Company LinkedIn URL:', profileData.companyLinkedInUrl || 'Not found');
    console.log('Connected:', profileData.connected);
    console.log('Connection Request Sent:', profileData.connectionRequestSent);
    console.log('===================================');
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

  if (request.action === 'extractBrandData') {
    // Extract brand data from company page
    const brandData = extractBrandData();
    sendResponse(brandData);
    return true;
  }

  return true;
});
