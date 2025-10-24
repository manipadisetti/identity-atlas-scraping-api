// src/index.js
// Main server file for Identity Atlas Scraping API

require('dotenv').config();
const express = require('express');
const { authMiddleware, getUsageStats } = require('./middleware/auth.js');
const { rateLimiter, strictRateLimiter } = require('./middleware/rateLimit.js');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint (no auth required)
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: '1.0.0'
  });
});

// Apply authentication to all routes except health
app.use(authMiddleware);
app.use(rateLimiter);

// Usage stats endpoint
app.get('/usage', getUsageStats);

// ==========================================
// PROFESSIONAL ENDPOINTS
// ==========================================

// LinkedIn scraper
app.post('/scrape/linkedin', strictRateLimiter, async (req, res) => {
  try {
    const { profileUrl } = req.body;
    if (!profileUrl) {
      return res.status(400).json({ success: false, error: 'profileUrl is required' });
    }
    const { scrapeLinkedIn } = require('./handlers/professional/linkedin.js');
    const data = await scrapeLinkedIn(profileUrl);
    res.json({ success: true, source: 'linkedin', data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GitHub scraper
app.post('/scrape/github', async (req, res) => {
  try {
    const { username } = req.body;
    if (!username) {
      return res.status(400).json({ success: false, error: 'username is required' });
    }
    const { scrapeGitHub } = require('./handlers/professional/github.js');
    const data = await scrapeGitHub(username);
    res.json({ success: true, source: 'github', data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Stack Overflow scraper
app.post('/scrape/stackoverflow', async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) {
      return res.status(400).json({ success: false, error: 'userId is required' });
    }
    const { scrapeStackOverflow } = require('./handlers/professional/stackoverflow.js');
    const data = await scrapeStackOverflow(userId);
    res.json({ success: true, source: 'stackoverflow', data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Medium scraper
app.post('/scrape/medium', async (req, res) => {
  try {
    const { username } = req.body;
    if (!username) {
      return res.status(400).json({ success: false, error: 'username is required' });
    }
    const { scrapeMedium } = require('./handlers/professional/medium.js');
    const data = await scrapeMedium(username);
    res.json({ success: true, source: 'medium', data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==========================================
// SOCIAL MEDIA ENDPOINTS
// ==========================================

// Twitter scraper
app.post('/scrape/twitter', async (req, res) => {
  try {
    const { username } = req.body;
    if (!username) {
      return res.status(400).json({ success: false, error: 'username is required' });
    }
    const { scrapeTwitter } = require('./handlers/social/twitter.js');
    const data = await scrapeTwitter(username);
    res.json({ success: true, source: 'twitter', data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Reddit scraper
app.post('/scrape/reddit', async (req, res) => {
  try {
    const { username } = req.body;
    if (!username) {
      return res.status(400).json({ success: false, error: 'username is required' });
    }
    const { scrapeReddit } = require('./handlers/social/reddit.js');
    const data = await scrapeReddit(username);
    res.json({ success: true, source: 'reddit', data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==========================================
// CONTENT ENDPOINTS
// ==========================================

// YouTube search
app.post('/scrape/youtube', async (req, res) => {
  try {
    const { query } = req.body;
    if (!query) {
      return res.status(400).json({ success: false, error: 'query is required' });
    }
    const { scrapeYouTube } = require('./handlers/content/youtube.js');
    const data = await scrapeYouTube(query);
    res.json({ success: true, source: 'youtube', data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==========================================
// NEWS ENDPOINTS
// ==========================================

// Google News search
app.post('/scrape/news/google', async (req, res) => {
  try {
    const { query } = req.body;
    if (!query) {
      return res.status(400).json({ success: false, error: 'query is required' });
    }
    const { scrapeGoogleNews } = require('./handlers/news/google-news.js');
    const data = await scrapeGoogleNews(query);
    res.json({ success: true, source: 'google-news', data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==========================================
// BUSINESS ENDPOINTS
// ==========================================

// ABN Lookup
app.post('/scrape/business/abn', async (req, res) => {
  try {
    const { abnOrName } = req.body;
    if (!abnOrName) {
      return res.status(400).json({ success: false, error: 'abnOrName is required' });
    }
    const { scrapeABN } = require('./handlers/business/abn-lookup.js');
    const data = await scrapeABN(abnOrName);
    res.json({ success: true, source: 'abn-lookup', data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==========================================
// ACADEMIC ENDPOINTS
// ==========================================

// Google Scholar search
app.post('/scrape/academic/scholar', async (req, res) => {
  try {
    const { query } = req.body;
    if (!query) {
      return res.status(400).json({ success: false, error: 'query is required' });
    }
    const { scrapeGoogleScholar } = require('./handlers/academic/google-scholar.js');
    const data = await scrapeGoogleScholar(query);
    res.json({ success: true, source: 'google-scholar', data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==========================================
// IMAGE ENDPOINTS
// ==========================================

// Google Images search
app.post('/scrape/images/google', async (req, res) => {
  try {
    const { query } = req.body;
    if (!query) {
      return res.status(400).json({ success: false, error: 'query is required' });
    }
    const { scrapeGoogleImages } = require('./handlers/images/google-images.js');
    const data = await scrapeGoogleImages(query);
    res.json({ success: true, source: 'google-images', data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==========================================
// COMPREHENSIVE SCRAPING
// ==========================================

// Comprehensive scraping endpoint
app.post('/scrape/comprehensive', strictRateLimiter, async (req, res) => {
  try {
    const { identifier, sources = ['all'] } = req.body;
    
    if (!identifier) {
      return res.status(400).json({
        success: false,
        error: 'identifier is required (email, name, or username)'
      });
    }

    const results = {
      identifier,
      scrapedAt: new Date().toISOString(),
      results: {},
      metadata: {
        sourcesRequested: sources,
        sourcesSucceeded: [],
        sourcesFailed: []
      }
    };

    const scrapingPromises = [];
    const sourcesToScrape = sources.includes('all') 
      ? ['github', 'twitter', 'reddit', 'youtube', 'google-news']
      : sources;

    // GitHub
    if (sourcesToScrape.includes('github')) {
      const { scrapeGitHub } = require('./handlers/professional/github.js');
      scrapingPromises.push(
        scrapeGitHub(identifier)
          .then(data => {
            results.results.github = data;
            results.metadata.sourcesSucceeded.push('github');
          })
          .catch(error => {
            results.results.github = { error: error.message };
            results.metadata.sourcesFailed.push('github');
          })
      );
    }

    // Twitter
    if (sourcesToScrape.includes('twitter')) {
      const { scrapeTwitter } = require('./handlers/social/twitter.js');
      scrapingPromises.push(
        scrapeTwitter(identifier)
          .then(data => {
            results.results.twitter = data;
            results.metadata.sourcesSucceeded.push('twitter');
          })
          .catch(error => {
            results.results.twitter = { error: error.message };
            results.metadata.sourcesFailed.push('twitter');
          })
      );
    }

    // Reddit
    if (sourcesToScrape.includes('reddit')) {
      const { scrapeReddit } = require('./handlers/social/reddit.js');
      scrapingPromises.push(
        scrapeReddit(identifier)
          .then(data => {
            results.results.reddit = data;
            results.metadata.sourcesSucceeded.push('reddit');
          })
          .catch(error => {
            results.results.reddit = { error: error.message };
            results.metadata.sourcesFailed.push('reddit');
          })
      );
    }

    // YouTube
    if (sourcesToScrape.includes('youtube')) {
      const { scrapeYouTube } = require('./handlers/content/youtube.js');
      scrapingPromises.push(
        scrapeYouTube(identifier)
          .then(data => {
            results.results.youtube = data;
            results.metadata.sourcesSucceeded.push('youtube');
          })
          .catch(error => {
            results.results.youtube = { error: error.message };
            results.metadata.sourcesFailed.push('youtube');
          })
      );
    }

    // Google News
    if (sourcesToScrape.includes('google-news')) {
      const { scrapeGoogleNews } = require('./handlers/news/google-news.js');
      scrapingPromises.push(
        scrapeGoogleNews(identifier)
          .then(data => {
            results.results.googleNews = data;
            results.metadata.sourcesSucceeded.push('google-news');
          })
          .catch(error => {
            results.results.googleNews = { error: error.message };
            results.metadata.sourcesFailed.push('google-news');
          })
      );
    }

    await Promise.all(scrapingPromises);

    const successRate = (results.metadata.sourcesSucceeded.length / sourcesToScrape.length) * 100;
    results.metadata.successRate = `${successRate.toFixed(0)}%`;

    res.json({
      success: true,
      ...results
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    message: `The endpoint ${req.method} ${req.path} does not exist`,
    availableEndpoints: [
      'GET /health',
      'GET /usage',
      'POST /scrape/linkedin',
      'POST /scrape/github',
      'POST /scrape/twitter',
      'POST /scrape/reddit',
      'POST /scrape/youtube',
      'POST /scrape/news/google',
      'POST /scrape/comprehensive'
    ]
  });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`[SERVER] Identity Atlas Scraping API`);
  console.log(`[SERVER] Listening on port ${PORT}`);
  console.log(`[SERVER] Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`[SERVER] Ready to scrape! 🚀`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('[SERVER] SIGTERM received, closing server...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('[SERVER] SIGINT received, closing server...');
  process.exit(0);
});
