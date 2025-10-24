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

4. **Commit**

---

## 🎉 **YOU'RE DONE WITH ALL THE CODE!**

**Now let's verify your structure!**

Send me a screenshot of your GitHub repo showing the `src/` folder structure so I can verify everything is in place!

Then we'll check Railway and test the API! 🚀

---

## 📂 **YOUR FINAL STRUCTURE SHOULD BE:**
```
identity-atlas-scraping-api/
├── .gitignore
├── Procfile
├── nixpacks.toml
├── package.json
├── README.md
└── src/
    ├── index.js
    ├── middleware/
    │   ├── auth.js
    │   └── rateLimit.js
    ├── utils/
    │   ├── browser.js
    │   ├── cache.js
    │   └── logger.js
    └── handlers/
        ├── professional/
        │   ├── linkedin.js
        │   ├── github.js
        │   ├── stackoverflow.js
        │   └── medium.js
        ├── social/
        │   ├── twitter.js
        │   └── reddit.js
        ├── content/
        │   └── youtube.js
        ├── news/
        │   └── google-news.js
        ├── business/
        │   └── abn-lookup.js
        ├── academic/
        │   └── google-scholar.js
        └── images/
            └── google-images.js
