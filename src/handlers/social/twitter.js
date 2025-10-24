// src/handlers/social/twitter.js
const { createPage, navigateWithRetry, autoScroll } = require('../../utils/browser');
const { withCache } = require('../../utils/cache');
const { logScraping } = require('../../utils/logger');

async function scrapeTwitter(username) {
  const startTime = Date.now();
  
  return withCache('twitter', username, async () => {
    const page = await createPage();
    
    try {
      console.log(`[TWITTER] Scraping profile: ${username}`);
      
      const nitterUrl = `https://nitter.net/${username}`;
      await navigateWithRetry(page, nitterUrl);
      await page.waitForSelector('.profile-card', { timeout: 10000 });
      await autoScroll(page, 5);

      const data = await page.evaluate(() => {
        const tweets = [];
        const tweetElements = document.querySelectorAll('.timeline-item');
        
        tweetElements.forEach((el, index) => {
          if (index >= 50) return;
          
          const text = el.querySelector('.tweet-content')?.textContent.trim();
          const date = el.querySelector('.tweet-date a')?.getAttribute('title');
          const repliesText = el.querySelector('.icon-comment')?.parentElement?.textContent.trim();
          const retweetsText = el.querySelector('.icon-retweet')?.parentElement?.textContent.trim();
          const likesText = el.querySelector('.icon-heart')?.parentElement?.textContent.trim();
          
          if (text) {
            tweets.push({
              text,
              date,
              stats: {
                replies: repliesText || '0',
                retweets: retweetsText || '0',
                likes: likesText || '0'
              }
            });
          }
        });

        return {
          username: document.querySelector('.profile-card-username')?.textContent.trim().replace('@', ''),
          displayName: document.querySelector('.profile-card-fullname')?.textContent.trim(),
          bio: document.querySelector('.profile-bio')?.textContent.trim(),
          location: document.querySelector('.profile-location')?.textContent.trim(),
          website: document.querySelector('.profile-website a')?.href,
          joinDate: document.querySelector('.profile-joindate')?.textContent.trim(),
          stats: {
            tweets: document.querySelector('.profile-stat[title*="tweet"]')?.textContent.trim(),
            following: document.querySelector('.profile-stat[title*="following"]')?.textContent.trim(),
            followers: document.querySelector('.profile-stat[title*="follower"]')?.textContent.trim()
          },
          tweets: tweets
        };
      });

      await page.close();

      const duration = Date.now() - startTime;
      logScraping('twitter', username, duration, true, data.tweets.length);

      console.log(`[TWITTER] ✓ Profile scraped successfully in ${duration}ms`);

      return {
        source: 'twitter',
        url: `https://twitter.com/${username}`,
        scrapedAt: new Date().toISOString(),
        data,
        confidence: data.tweets.length > 0 ? 85 : 40
      };

    } catch (error) {
      await page.close();
      const duration = Date.now() - startTime;
      logScraping('twitter', username, duration, false);
      
      console.error(`[TWITTER] ✗ Error scraping profile:`, error.message);
      throw new Error(`Twitter scraping failed: ${error.message}`);
    }
  }, 43200);
}

module.exports = { scrapeTwitter };
