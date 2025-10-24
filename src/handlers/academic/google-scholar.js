// src/handlers/academic/google-scholar.js
const { createPage, navigateWithRetry } = require('../../utils/browser');
const { withCache } = require('../../utils/cache');
const { logScraping } = require('../../utils/logger');

async function scrapeGoogleScholar(query) {
  const startTime = Date.now();
  
  return withCache('google-scholar', query, async () => {
    const page = await createPage();
    
    try {
      console.log(`[GOOGLE_SCHOLAR] Searching for: ${query}`);

      const searchUrl = `https://scholar.google.com/scholar?q=${encodeURIComponent(query)}`;
      await navigateWithRetry(page, searchUrl);
      
      await page.waitForSelector('.gs_r', { timeout: 10000 });

      const papers = await page.evaluate(() => {
        const results = [];
        const paperElements = document.querySelectorAll('.gs_r');
        
        paperElements.forEach((paper, index) => {
          if (index >= 20) return;
          
          const title = paper.querySelector('.gs_rt')?.textContent.trim();
          const link = paper.querySelector('.gs_rt a')?.href;
          const authors = paper.querySelector('.gs_a')?.textContent.trim();
          const snippet = paper.querySelector('.gs_rs')?.textContent.trim();
          const citedBy = paper.querySelector('.gs_fl a:first-child')?.textContent.match(/\d+/)?.[0];
          
          if (title) {
            results.push({
              title,
              url: link,
              authors,
              snippet,
              citedBy: citedBy ? parseInt(citedBy) : 0
            });
          }
        });
        
        return results;
      });

      await page.close();

      const duration = Date.now() - startTime;
      logScraping('google-scholar', query, duration, true, papers.length);

      console.log(`[GOOGLE_SCHOLAR] ✓ Found ${papers.length} papers in ${duration}ms`);

      return {
        source: 'google-scholar',
        query: query,
        scrapedAt: new Date().toISOString(),
        data: {
          papers,
          totalResults: papers.length,
          totalCitations: papers.reduce((sum, p) => sum + p.citedBy, 0)
        },
        confidence: papers.length > 0 ? 80 : 30
      };

    } catch (error) {
      await page.close();
      const duration = Date.now() - startTime;
      logScraping('google-scholar', query, duration, false);

      console.error(`[GOOGLE_SCHOLAR] ✗ Error searching:`, error.message);
      throw new Error(`Google Scholar scraping failed: ${error.message}`);
    }
  }, 86400);
}

module.exports = { scrapeGoogleScholar };
