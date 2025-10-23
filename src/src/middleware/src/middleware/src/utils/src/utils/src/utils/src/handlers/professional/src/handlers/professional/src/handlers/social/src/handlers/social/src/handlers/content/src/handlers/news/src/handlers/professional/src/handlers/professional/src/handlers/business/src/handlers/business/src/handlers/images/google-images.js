// src/handlers/images/google-images.js
const { createPage, navigateWithRetry, autoScroll } = require('../../utils/browser');
const { withCache } = require('../../utils/cache');
const { logScraping } = require('../../utils/logger');

async function scrapeGoogleImages(query) {
  const startTime = Date.now();
  
  return withCache('google-images', query, async () => {
    const page = await createPage();
    
    try {
      console.log(`[GOOGLE_IMAGES] Searching for: ${query}`);

      const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}&tbm=isch`;
      await navigateWithRetry(page, searchUrl);
      
      await page.waitForSelector('img', { timeout: 10000 });
      await autoScroll(page, 3);

      const images = await page.evaluate(() => {
        const results = [];
        const imgElements = document.querySelectorAll('img[data-src], img[src]');
        
        imgElements.forEach((img, index) => {
          if (index >= 30) return;
          
          const src = img.getAttribute('data-src') || img.getAttribute('src');
          if (src && !src.includes('logo') && src.startsWith('http')) {
            results.push({
              url: src,
              alt: img.getAttribute('alt') || '',
              width: img.naturalWidth || 0,
              height: img.naturalHeight || 0
            });
          }
        });
        
        return results;
      });

      await page.close();

      const duration = Date.now() - startTime;
      logScraping('google-images', query, duration, true, images.length);

      console.log(`[GOOGLE_IMAGES] ✓ Found ${images.length} images in ${duration}ms`);

      return {
        source: 'google-images',
        query: query,
        scrapedAt: new Date().toISOString(),
        data: {
          images,
          totalResults: images.length
        },
        confidence: images.length > 0 ? 80 : 30
      };

    } catch (error) {
      await page.close();
      const duration = Date.now() - startTime;
      logScraping('google-images', query, duration, false);

      console.error(`[GOOGLE_IMAGES] ✗ Error searching:`, error.message);
      throw new Error(`Google Images scraping failed: ${error.message}`);
    }
  }, 86400);
}

module.exports = { scrapeGoogleImages };
```

**Commit the file!**

---

## 🎉 **PERFECT! NOW LET'S DEPLOY TO RAILWAY!**

You've uploaded all the files! Now let's get this deployed so you can use it!

---

## 🚀 **STEP 8: DEPLOY TO RAILWAY**

### 8.1 Go to Railway
1. Open: **https://railway.app**
2. Click **"Start a New Project"**
3. Click **"Login"** (use GitHub to login)

### 8.2 Deploy from GitHub
1. Click **"Deploy from GitHub repo"**
2. You'll see your repository: **identity-atlas-scraping-api**
3. Click on it to select it
4. Railway will start deploying automatically!

### 8.3 Add Environment Variables
**This is important!** Railway needs your API keys.

1. Click on your project
2. Click **"Variables"** tab
3. Click **"New Variable"**
4. Add these one by one:
```
GITHUB_TOKEN=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
YOUTUBE_API_KEY=AIzaSyBcRiJDAhFuyuVTv5YsP4V1hgYmftuNYnI
REDDIT_CLIENT_ID=9iSo68_kFh1FUOeatO_gkg
REDDIT_CLIENT_SECRET=OpsYTXLuOY9qksGZCN2Mv86aItKHbg
REDDIT_USERNAME=your_reddit_username
REDDIT_PASSWORD=your_reddit_password
IDENTITY_ATLAS_API_KEY=sk_test_identity_atlas_12345
NODE_ENV=production
CACHE_ENABLED=true
CACHE_TTL=86400
PUPPETEER_HEADLESS=true
PUPPETEER_TIMEOUT=30000
