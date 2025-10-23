// src/handlers/professional/linkedin.js
// LinkedIn Profile Scraper

const { createPage, navigateWithRetry, extractText, extractTexts, autoScroll } = require('../../utils/browser');
const { withCache } = require('../../utils/cache');
const { logScraping } = require('../../utils/logger');

/**
 * Scrape LinkedIn profile
 * Note: LinkedIn is aggressive with bot detection, so this uses public view
 */
async function scrapeLinkedIn(identifier) {
  const startTime = Date.now();
  
  return withCache('linkedin', identifier, async () => {
    const page = await createPage();
    
    try {
      // Determine if identifier is a URL or username
      let profileUrl;
      if (identifier.startsWith('http')) {
        profileUrl = identifier;
      } else {
        // Assume it's a username
        profileUrl = `https://www.linkedin.com/in/${identifier}/`;
      }

      console.log(`[LINKEDIN] Scraping profile: ${profileUrl}`);

      // Navigate to profile
      await navigateWithRetry(page, profileUrl);

      // Wait for profile to load
      await page.waitForSelector('main', { timeout: 10000 });

      // Scroll to load all content
      await autoScroll(page, 3);

      // Extract profile data
      const profileData = await page.evaluate(() => {
        const data = {};

        // Helper function to get text content
        const getText = (selector) => {
          const el = document.querySelector(selector);
          return el ? el.textContent.trim() : null;
        };

        const getTexts = (selector) => {
          const elements = document.querySelectorAll(selector);
          return Array.from(elements).map(el => el.textContent.trim()).filter(t => t);
        };

        // Basic info
        data.name = getText('h1.top-card-layout__title') || 
                    getText('h1.text-heading-xlarge');
        
        data.headline = getText('div.top-card-layout__headline') || 
                       getText('div.text-body-medium');
        
        data.location = getText('span.top-card__subline-item') ||
                       getText('span.text-body-small');

        data.about = getText('div.core-section-container__content p') ||
                    getText('section[data-section="summary"] p');

        // Experience
        data.experience = [];
        const experienceItems = document.querySelectorAll('li.profile-section-card');
        experienceItems.forEach(item => {
          const title = getText('div.profile-section-card__title') ||
                       item.querySelector('h3')?.textContent.trim();
          const company = getText('span.profile-section-card__subtitle') ||
                         item.querySelector('.t-14')?.textContent.trim();
          const duration = getText('span.date-range') ||
                          item.querySelector('.t-black--light')?.textContent.trim();
          
          if (title) {
            data.experience.push({ title, company, duration });
          }
        });

        // Education
        data.education = [];
        const educationItems = document.querySelectorAll('section[data-section="education"] li');
        educationItems.forEach(item => {
          const school = item.querySelector('.profile-section-card__title')?.textContent.trim() ||
                        item.querySelector('.t-bold')?.textContent.trim();
          const degree = item.querySelector('.profile-section-card__subtitle')?.textContent.trim() ||
                        item.querySelector('.t-14')?.textContent.trim();
          
          if (school) {
            data.education.push({ school, degree });
          }
        });

        // Skills
        data.skills = getTexts('span.skill-badge__skill-name');

        // Connection count (if visible)
        const connectionText = getText('span.top-card__subline-item--bullet') ||
                              getText('span.link-without-visited-state');
        if (connectionText && connectionText.includes('connection')) {
          data.connections = connectionText;
        }

        return data;
      });

      // Get profile photo URL
      try {
        const photoUrl = await page.$eval('img.profile-photo-edit__preview', 
          img => img.src
        ).catch(() => null);
        profileData.photoUrl = photoUrl;
      } catch (e) {
        profileData.photoUrl = null;
      }

      const duration = Date.now() - startTime;
      logScraping('linkedin', identifier, duration, true, Object.keys(profileData).length);

      console.log(`[LINKEDIN] ✓ Profile scraped successfully in ${duration}ms`);

      return {
        source: 'linkedin',
        url: profileUrl,
        scrapedAt: new Date().toISOString(),
        data: profileData,
        confidence: calculateConfidence(profileData)
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      logScraping('linkedin', identifier, duration, false);
      
      console.error(`[LINKEDIN] ✗ Error scraping profile:`, error.message);
      
      throw new Error(`LinkedIn scraping failed: ${error.message}`);
    } finally {
      await page.close();
    }
  }, 86400); // Cache for 24 hours
}

/**
 * Calculate confidence score based on data completeness
 */
function calculateConfidence(data) {
  let score = 0;
  const weights = {
    name: 20,
    headline: 15,
    location: 10,
    about: 15,
    experience: 20,
    education: 10,
    skills: 10
  };

  for (const [field, weight] of Object.entries(weights)) {
    if (data[field]) {
      if (Array.isArray(data[field]) && data[field].length > 0) {
        score += weight;
      } else if (typeof data[field] === 'string' && data[field].length > 0) {
        score += weight;
      }
    }
  }

  return Math.min(100, score);
}

module.exports = {
  scrapeLinkedIn
};
