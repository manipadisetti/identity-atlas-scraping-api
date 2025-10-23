// src/handlers/professional/medium.js
const axios = require('axios');
const { withCache } = require('../../utils/cache');
const { logScraping } = require('../../utils/logger');

async function scrapeMedium(username) {
  const startTime = Date.now();
  
  return withCache('medium', username, async () => {
    try {
      console.log(`[MEDIUM] Fetching profile: ${username}`);

      const rssUrl = `https://medium.com/feed/@${username}`;
      const response = await axios.get(rssUrl);
      
      const xml = response.data;
      
      const articles = [];
      const itemRegex = /<item>(.*?)<\/item>/gs;
      const matches = xml.matchAll(itemRegex);
      
      for (const match of matches) {
        const item = match[1];
        
        const title = item.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/)?.[1];
        const link = item.match(/<link>(.*?)<\/link>/)?.[1];
        const pubDate = item.match(/<pubDate>(.*?)<\/pubDate>/)?.[1];
        const description = item.match(/<description><!\[CDATA\[(.*?)\]\]><\/description>/)?.[1];
        
        if (title && link) {
          articles.push({
            title: title.trim(),
            url: link.trim(),
            publishedAt: pubDate ? new Date(pubDate).toISOString() : null,
            excerpt: description ? description.replace(/<[^>]*>/g, '').substring(0, 200) : null
          });
        }
      }

      const duration = Date.now() - startTime;
      logScraping('medium', username, duration, true, articles.length);

      console.log(`[MEDIUM] ✓ Found ${articles.length} articles in ${duration}ms`);

      return {
        source: 'medium',
        url: `https://medium.com/@${username}`,
        scrapedAt: new Date().toISOString(),
        data: {
          username,
          articles,
          totalArticles: articles.length
        },
        confidence: articles.length > 0 ? 85 : 40
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      logScraping('medium', username, duration, false);

      if (error.response?.status === 404) {
        throw new Error(`Medium user '@${username}' not found`);
      }

      console.error(`[MEDIUM] ✗ Error fetching profile:`, error.message);
      throw new Error(`Medium scraping failed: ${error.message}`);
    }
  }, 86400);
}

module.exports = { scrapeMedium };
