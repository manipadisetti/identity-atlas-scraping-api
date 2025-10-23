// src/index.js
// Main server file for Universal Scraping API

require('dotenv').config();
const express = require('express');
const { authMiddleware } = require('./middleware/auth');
const { rateLimitMiddleware } = require('./middleware/rateLimit');
const { logRequest } = require('./utils/logger');

// Handler imports
const { scrapeLinkedIn } = require('./handlers/professional/linkedin');
const { scrapeGitHub } = require('./handlers/professional/github');
const { scrapeStackOverflow } = require('./handlers/professional/stackoverflow');
const { scrapeMedium } = require('./handlers/professional/medium');
const { scrapeTwitter } = require('./handlers/social/twitter');
const { scrapeReddit } = require('./handlers/social/reddit');
const { scrapeYouTube } = require('./handlers/content/youtube');
const { scrapeGoogleNews } = require('./handlers/news/google-news');
const { scrapeASIC } = require('./handlers/business/asic');
const { scrapeABN } = require('./handlers/business/abn-lookup');
const { scrapeGoogleScholar } = require('./handlers/academic/google-scholar');
const { scrapeGoogleImages } = require('./handlers/images/google-images');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(logRequest);

// Health check endpoint (no auth required)
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: '1.0.0'
  });
});

// API Documentation endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'Universal Scraping API',
    version: '1.0.0',
    description: 'Comprehensive data scraping service for Identity Atlas and all projects',
    endpoints: {
      comprehensive: 'POST /scrape/comprehensive',
      professional: {
        linkedin: 'POST /scrape/professional/linkedin',
        github: 'POST /scrape/professional/github',
        stackoverflow: 'POST /scrape/professional/stackoverflow',
        medium: 'POST /scrape/professional/medium'
      },
      social: {
        twitter: 'POST /scrape/social/twitter',
        reddit: 'POST /scrape/social/reddit'
      },
      content: {
        youtube: 'POST /scrape/content/youtube'
      },
      news: {
        googleNews: 'POST /scrape/news/google-news'
      },
      business: {
        asic: 'POST /scrape/business/asic',
        abn: 'POST /scrape/business/abn'
      },
      academic: {
        scholar: 'POST /scrape/academic/scholar'
      },
      images: {
        google: 'POST /scrape/images/google'
      }
    },
    authentication: 'Bearer token required in Authorization header',
    documentation: 'https://github.com/yourusername/scraping-api'
  });
});

// Apply authentication and rate limiting to all /scrape/* routes
app.use('/scrape/*', authMiddleware);
app.use('/scrape/*', rateLimitMiddleware);

// ========================================
// COMPREHENSIVE ENDPOINT (RECOMMENDED)
// ========================================
// This endpoint scrapes ALL sources in parallel
app.post('/scrape/comprehensive', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const {
      identifier,
      identifierType, // 'email', 'name', 'linkedin_url', 'username'
      sources = ['all'], // or specific: ['linkedin', 'twitter', 'github']
      depth = 'standard', // 'quick', 'standard', 'deep'
      includePhotos = true,
      includeOldContent = true,
      dateRange = '2-years'
    } = req.body;

    if (!identifier) {
      return res.status(400).json({
        success: false,
        error: 'Identifier is required'
      });
    }

    console.log(`[COMPREHENSIVE] Starting scrape for: ${identifier}`);

    // Determine which sources to scrape
    const sourcesToScrape = sources.includes('all') 
      ? ['linkedin', 'twitter', 'github', 'reddit', 'youtube', 'google-news', 'abn', 'google-scholar']
      : sources;

    // Execute scrapers in parallel
    const scrapingPromises = [];
    const results = {
      identifier,
      identifierType,
      timestamp: new Date().toISOString(),
      results: {},
      metadata: {
        sourcesRequested: sourcesToScrape,
        sourcesSucceeded: [],
        sourcesFailed: [],
        totalDataPoints: 0,
        scrapingTime: 0
      }
    };

    // LinkedIn
    if (sourcesToScrape.includes('linkedin')) {
      scrapingPromises.push(
        scrapeLinkedIn(identifier)
          .then(data => {
            results.results.linkedin = data;
            results.metadata.sourcesSucceeded.push('linkedin');
          })
          .catch(error => {
            results.results.linkedin = { error: error.message };
            results.metadata.sourcesFailed.push('linkedin');
          })
      );
    }

    // Twitter
    if (sourcesToScrape.includes('twitter')) {
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

    // GitHub
    if (sourcesToScrape.includes('github')) {
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

    // Reddit
    if (sourcesToScrape.includes('reddit')) {
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
      scrapingPromises.push(
        scrapeGoogleNews(identifier)
          .then(data => {
            results.results.news = data;
            results.metadata.sourcesSucceeded.push('google-news');
          })
          .catch(error => {
            results.results.news = { error: error.message };
            results.metadata.sourcesFailed.push('google-news');
          })
      );
    }

    // ABN (Australian Business Number)
    if (sourcesToScrape.includes('abn')) {
      scrapingPromises.push(
        scrapeABN(identifier)
          .then(data => {
            results.results.abn = data;
            results.metadata.sourcesSucceeded.push('abn');
          })
          .catch(error => {
            results.results.abn = { error: error.message };
            results.metadata.sourcesFailed.push('abn');
          })
      );
    }

    // Google Scholar
    if (sourcesToScrape.includes('google-scholar')) {
      scrapingPromises.push(
        scrapeGoogleScholar(identifier)
          .then(data => {
            results.results.scholar = data;
            results.metadata.sourcesSucceeded.push('google-scholar');
          })
          .catch(error => {
            results.results.scholar = { error: error.message };
            results.metadata.sourcesFailed.push('google-scholar');
          })
      );
    }

    // Wait for all scrapers to complete
    await Promise.all(scrapingPromises);

    // Calculate metadata
    const endTime = Date.now();
    results.metadata.scrapingTime = `${((endTime - startTime) / 1000).toFixed(2)} seconds`;
    
    // Count total data points
    Object.values(results.results).forEach(sourceData => {
      if (sourceData && !sourceData.error) {
        if (Array.isArray(sourceData)) {
          results.metadata.totalDataPoints += sourceData.length;
        } else if (sourceData.items) {
          results.metadata.totalDataPoints += sourceData.items.length;
        } else {
          results.metadata.totalDataPoints += 1;
        }
      }
    });

    // Calculate confidence score
    const successRate = results.metadata.sourcesSucceeded.length / sourcesToScrape.length;
    results.metadata.confidence = parseFloat((successRate * 100).toFixed(2));

    console.log(`[COMPREHENSIVE] Completed in ${results.metadata.scrapingTime}`);
    console.log(`[COMPREHENSIVE] Success rate: ${results.metadata.confidence}%`);

    res.json({
      success: true,
      data: results
    });

  } catch (error) {
    console.error('[COMPREHENSIVE] Error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      scrapingTime: `${((Date.now() - startTime) / 1000).toFixed(2)} seconds`
    });
  }
});

// ========================================
// INDIVIDUAL ENDPOINTS
// ========================================

// Professional Network Endpoints
app.post('/scrape/professional/linkedin', async (req, res) => {
  try {
    const { url, username } = req.body;
    const data = await scrapeLinkedIn(url || username);
    res.json({ success: true, source: 'linkedin', data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/scrape/professional/github', async (req, res) => {
  try {
    const { username } = req.body;
    const data = await scrapeGitHub(username);
    res.json({ success: true, source: 'github', data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/scrape/professional/stackoverflow', async (req, res) => {
  try {
    const { username, userId } = req.body;
    const data = await scrapeStackOverflow(username || userId);
    res.json({ success: true, source: 'stackoverflow', data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/scrape/professional/medium', async (req, res) => {
  try {
    const { username } = req.body;
    const data = await scrapeMedium(username);
    res.json({ success: true, source: 'medium', data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Social Media Endpoints
app.post('/scrape/social/twitter', async (req, res) => {
  try {
    const { username } = req.body;
    const data = await scrapeTwitter(username);
    res.json({ success: true, source: 'twitter', data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/scrape/social/reddit', async (req, res) => {
  try {
    const { username } = req.body;
    const data = await scrapeReddit(username);
    res.json({ success: true, source: 'reddit', data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Content Endpoints
app.post('/scrape/content/youtube', async (req, res) => {
  try {
    const { query, channelId } = req.body;
    const data = await scrapeYouTube(query || channelId);
    res.json({ success: true, source: 'youtube', data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// News Endpoints
app.post('/scrape/news/google-news', async (req, res) => {
  try {
    const { query } = req.body;
    const data = await scrapeGoogleNews(query);
    res.json({ success: true, source: 'google-news', data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Business Endpoints
app.post('/scrape/business/asic', async (req, res) => {
  try {
    const { companyName, acn } = req.body;
    const data = await scrapeASIC(companyName || acn);
    res.json({ success: true, source: 'asic', data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/scrape/business/abn', async (req, res) => {
  try {
    const { abn, name } = req.body;
    const data = await scrapeABN(abn || name);
    res.json({ success: true, source: 'abn', data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Academic Endpoints
app.post('/scrape/academic/scholar', async (req, res) => {
  try {
    const { query, authorId } = req.body;
    const data = await scrapeGoogleScholar(query || authorId);
    res.json({ success: true, source: 'google-scholar', data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Images Endpoints
app.post('/scrape/images/google', async (req, res) => {
  try {
    const { query } = req.body;
    const data = await scrapeGoogleImages(query);
    res.json({ success: true, source: 'google-images', data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║   🚀 UNIVERSAL SCRAPING API                                ║
║                                                            ║
║   Status: Running                                          ║
║   Port: ${PORT}                                            ║
║   Environment: ${process.env.NODE_ENV || 'development'}   ║
║   Time: ${new Date().toISOString()}                        ║
║                                                            ║
║   Health Check: http://localhost:${PORT}/health            ║
║   Documentation: http://localhost:${PORT}/                 ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
  `);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully...');
  process.exit(0);
});
