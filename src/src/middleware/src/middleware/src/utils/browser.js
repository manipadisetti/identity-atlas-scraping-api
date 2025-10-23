// src/utils/browser.js
// Puppeteer Browser Management Utility

const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

// Add stealth plugin to avoid bot detection
puppeteer.use(StealthPlugin());

let browserInstance = null;

/**
 * Get or create a browser instance (singleton pattern)
 * Reusing browser instances is more efficient
 */
async function getBrowser() {
  if (browserInstance && browserInstance.isConnected()) {
    return browserInstance;
  }

  console.log('[BROWSER] Launching new browser instance...');
  
  browserInstance = await puppeteer.launch({
    headless: process.env.PUPPETEER_HEADLESS !== 'false',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--disable-gpu'
    ],
    defaultViewport: {
      width: 1920,
      height: 1080
    }
  });

  console.log('[BROWSER] Browser launched successfully');
  
  // Handle browser disconnection
  browserInstance.on('disconnected', () => {
    console.log('[BROWSER] Browser disconnected');
    browserInstance = null;
  });

  return browserInstance;
}

/**
 * Create a new page with common configurations
 */
async function createPage() {
  const browser = await getBrowser();
  const page = await browser.newPage();

  // Set user agent to avoid bot detection
  await page.setUserAgent(
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  );

  // Set extra headers
  await page.setExtraHTTPHeaders({
    'Accept-Language': 'en-US,en;q=0.9',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
  });

  // Enable JavaScript
  await page.setJavaScriptEnabled(true);

  // Set default timeout
  const timeout = parseInt(process.env.PUPPETEER_TIMEOUT) || 30000;
  page.setDefaultTimeout(timeout);
  page.setDefaultNavigationTimeout(timeout);

  return page;
}

/**
 * Navigate to a URL with retry logic
 */
async function navigateWithRetry(page, url, maxRetries = 3) {
  let lastError;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`[BROWSER] Navigating to ${url} (attempt ${attempt}/${maxRetries})`);
      
      await page.goto(url, {
        waitUntil: 'networkidle2',
        timeout: 30000
      });

      return true;
    } catch (error) {
      lastError = error;
      console.warn(`[BROWSER] Navigation attempt ${attempt} failed:`, error.message);
      
      if (attempt < maxRetries) {
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, 2000 * attempt));
      }
    }
  }

  throw new Error(`Failed to navigate to ${url} after ${maxRetries} attempts: ${lastError.message}`);
}

/**
 * Wait for selector with retry
 */
async function waitForSelectorWithRetry(page, selector, maxRetries = 3) {
  let lastError;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await page.waitForSelector(selector, { timeout: 10000 });
      return true;
    } catch (error) {
      lastError = error;
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  }

  throw new Error(`Selector ${selector} not found after ${maxRetries} attempts: ${lastError.message}`);
}

/**
 * Extract text from element
 */
async function extractText(page, selector) {
  try {
    const element = await page.$(selector);
    if (!element) return null;
    
    const text = await page.evaluate(el => el.textContent.trim(), element);
    return text;
  } catch (error) {
    return null;
  }
}

/**
 * Extract multiple texts from elements
 */
async function extractTexts(page, selector) {
  try {
    const elements = await page.$$(selector);
    const texts = await Promise.all(
      elements.map(el => page.evaluate(element => element.textContent.trim(), el))
    );
    return texts.filter(text => text.length > 0);
  } catch (error) {
    return [];
  }
}

/**
 * Take screenshot (useful for debugging)
 */
async function takeScreenshot(page, filename = 'screenshot.png') {
  try {
    await page.screenshot({ 
      path: `./logs/${filename}`,
      fullPage: true 
    });
    console.log(`[BROWSER] Screenshot saved: ${filename}`);
  } catch (error) {
    console.error('[BROWSER] Screenshot failed:', error.message);
  }
}

/**
 * Handle common bot detection challenges
 */
async function handleBotDetection(page) {
  try {
    // Check for common bot detection indicators
    const hasChallenge = await page.evaluate(() => {
      const body = document.body.innerText.toLowerCase();
      return body.includes('verify you are human') ||
             body.includes('captcha') ||
             body.includes('please complete') ||
             body.includes('security check');
    });

    if (hasChallenge) {
      console.warn('[BROWSER] Bot detection challenge detected');
      return false;
    }

    return true;
  } catch (error) {
    return true;
  }
}

/**
 * Scroll page to load dynamic content
 */
async function autoScroll(page, maxScrolls = 5) {
  try {
    await page.evaluate(async (maxScrolls) => {
      await new Promise((resolve) => {
        let scrolls = 0;
        const distance = 100;
        const timer = setInterval(() => {
          window.scrollBy(0, distance);
          scrolls++;

          if (scrolls >= maxScrolls) {
            clearInterval(timer);
            resolve();
          }
        }, 100);
      });
    }, maxScrolls);
  } catch (error) {
    console.warn('[BROWSER] Auto-scroll failed:', error.message);
  }
}

/**
 * Close browser gracefully
 */
async function closeBrowser() {
  if (browserInstance) {
    try {
      await browserInstance.close();
      browserInstance = null;
      console.log('[BROWSER] Browser closed successfully');
    } catch (error) {
      console.error('[BROWSER] Error closing browser:', error.message);
    }
  }
}

// Graceful shutdown handlers
process.on('SIGTERM', closeBrowser);
process.on('SIGINT', closeBrowser);

module.exports = {
  getBrowser,
  createPage,
  navigateWithRetry,
  waitForSelectorWithRetry,
  extractText,
  extractTexts,
  takeScreenshot,
  handleBotDetection,
  autoScroll,
  closeBrowser
};
