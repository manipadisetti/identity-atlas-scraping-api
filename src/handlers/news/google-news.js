// src/handlers/news/google-news.js
const { createPage, navigateWithRetry } = require('../../utils/browser');
const { withCache } = require('../../utils/cache');
const { logScraping } = require('../../utils/logger');

async function scrapeGoogleNews(query) {
  const startTime = Date.now();
  
  return withCache('google-news', query, async () => {
    const page = await createPage();
    
    try {
      console.log(`[GOOGLE_NEWS] Searching for: ${query}`);

      const searchUrl = `https://news.google.com/search?q=${encodeURIComponent(query)}&hl=en-US&gl=US&ceid=US:en`;
      await navigateWithRetry(page, searchUrl);
      
      await page.waitForSelector('article', { timeout: 10000 });

      const articles = await page.evaluate(() => {
        const results = [];
        const articleElements = document.querySelectorAll('article');
        
        articleElements.forEach((article, index) => {
          if (index >= 50) return;
          
          const titleEl = article.querySelector('h3, h4');
          const linkEl = article.querySelector('a');
          const sourceEl = article.querySelector('div[data-n-tid]');
          const timeEl = article.querySelector('time');
          const descEl = article.querySelector('p');
          
          if (titleEl && linkEl) {
            let url = linkEl.getAttribute('href');
            if (url && url.startsWith('./')) {
              url = 'https://news.google.com' + url.substring(1);
            }

            results.push({
              title: titleEl.textContent.trim(),
              url: url,
              source: sourceEl?.textContent.trim() || 'Unknown',
              publishedAt: timeEl?.getAttribute('datetime') || null,
              description: descEl?.textContent.trim() || null
            });
          }
        });
        
        return results;
      });

      await page.close();

      const duration = Date.now() - startTime;
      logScraping('google-news', query, duration, true, articles.length);

      console.log(`[GOOGLE_NEWS] ✓ Found ${articles.length} articles in ${duration}ms`);

      return {
        source: 'google-news',
        query: query,
        scrapedAt: new Date().toISOString(),
        data: {
          articles,
          totalResults: articles.length,
          sources: [...new Set(articles.map(a => a.source))]
        },
        confidence: articles.length > 0 ? 85 : 30
      };

    } catch (error) {
      await page.close();
      const duration = Date.now() - startTime;
      logScraping('google-news', query, duration, false);

      console.error(`[GOOGLE_NEWS] ✗ Error searching:`, error.message);
      throw new Error(`Google News scraping failed: ${error.message}`);
    }
  }, 21600);
}

module.exports = { scrapeGoogleNews };
