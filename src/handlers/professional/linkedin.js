// src/handlers/professional/linkedin.js
const { createPage, navigateWithRetry, autoScroll } = require('../../utils/browser');
const { withCache } = require('../../utils/cache');
const { logScraping } = require('../../utils/logger');

async function scrapeLinkedIn(profileUrl) {
  const startTime = Date.now();
  
  return withCache('linkedin', profileUrl, async () => {
    const page = await createPage();
    
    try {
      console.log(`[LINKEDIN] Scraping profile: ${profileUrl}`);
      
      await navigateWithRetry(page, profileUrl);
      await page.waitForSelector('body', { timeout: 10000 });
      await autoScroll(page, 3);

      const data = await page.evaluate(() => {
        const getText = (selector) => {
          const el = document.querySelector(selector);
          return el ? el.textContent.trim() : null;
        };

        const getAll = (selector) => {
          return Array.from(document.querySelectorAll(selector)).map(el => el.textContent.trim());
        };

        return {
          name: getText('h1'),
          headline: getText('.text-body-medium'),
          location: getText('.text-body-small.inline'),
          about: getText('#about ~ div'),
          experience: getAll('.experience-item'),
          education: getAll('.education-item'),
          skills: getAll('.skill-item')
        };
      });

      await page.close();

      const duration = Date.now() - startTime;
      logScraping('linkedin', profileUrl, duration, true);

      console.log(`[LINKEDIN] ✓ Profile scraped successfully in ${duration}ms`);

      return {
        source: 'linkedin',
        url: profileUrl,
        scrapedAt: new Date().toISOString(),
        data,
        confidence: 75
      };

    } catch (error) {
      await page.close();
      const duration = Date.now() - startTime;
      logScraping('linkedin', profileUrl, duration, false);
      
      console.error(`[LINKEDIN] ✗ Error scraping profile:`, error.message);
      throw new Error(`LinkedIn scraping failed: ${error.message}`);
    }
  }, 86400);
}

module.exports = { scrapeLinkedIn };
