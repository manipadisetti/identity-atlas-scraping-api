// src/handlers/professional/github.js
// GitHub Profile Scraper (Uses Official API - FREE!)

const axios = require('axios');
const { withCache } = require('../../utils/cache');
const { logScraping } = require('../../utils/logger');

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_API = 'https://api.github.com';

/**
 * Scrape GitHub profile using official API
 * Rate limit: 5000 requests/hour with authentication
 * Rate limit: 60 requests/hour without authentication
 */
async function scrapeGitHub(username) {
  const startTime = Date.now();
  
  return withCache('github', username, async () => {
    try {
      console.log(`[GITHUB] Fetching profile: ${username}`);

      const headers = {
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'Identity-Atlas-Scraper'
      };

      // Add token if available
      if (GITHUB_TOKEN) {
        headers['Authorization'] = `token ${GITHUB_TOKEN}`;
      }

      // Fetch user profile
      const userResponse = await axios.get(`${GITHUB_API}/users/${username}`, { headers });
      const user = userResponse.data;

      // Fetch repositories
      const reposResponse = await axios.get(`${GITHUB_API}/users/${username}/repos?sort=updated&per_page=30`, { headers });
      const repos = reposResponse.data;

      // Fetch recent activity (events)
      const eventsResponse = await axios.get(`${GITHUB_API}/users/${username}/events/public?per_page=30`, { headers });
      const events = eventsResponse.data;

      // Process repositories data
      const processedRepos = repos.map(repo => ({
        name: repo.name,
        description: repo.description,
        language: repo.language,
        stars: repo.stargazers_count,
        forks: repo.forks_count,
        url: repo.html_url,
        createdAt: repo.created_at,
        updatedAt: repo.updated_at,
        topics: repo.topics || [],
        isPrivate: repo.private
      }));

      // Analyze languages
      const languages = {};
      repos.forEach(repo => {
        if (repo.language) {
          languages[repo.language] = (languages[repo.language] || 0) + 1;
        }
      });

      // Analyze activity patterns
      const activityAnalysis = analyzeActivity(events);

      // Calculate coding statistics
      const totalStars = repos.reduce((sum, repo) => sum + repo.stargazers_count, 0);
      const totalForks = repos.reduce((sum, repo) => sum + repo.forks_count, 0);

      const profileData = {
        username: user.login,
        name: user.name,
        bio: user.bio,
        company: user.company,
        location: user.location,
        email: user.email,
        blog: user.blog,
        twitter: user.twitter_username,
        avatarUrl: user.avatar_url,
        profileUrl: user.html_url,
        
        stats: {
          publicRepos: user.public_repos,
          publicGists: user.public_gists,
          followers: user.followers,
          following: user.following,
          totalStars,
          totalForks
        },

        repositories: processedRepos,
        languages: Object.entries(languages)
          .sort((a, b) => b[1] - a[1])
          .map(([lang, count]) => ({ language: lang, count })),
        
        activity: activityAnalysis,

        accountInfo: {
          createdAt: user.created_at,
          updatedAt: user.updated_at,
          type: user.type,
          hireable: user.hireable
        }
      };

      const duration = Date.now() - startTime;
      logScraping('github', username, duration, true, repos.length);

      console.log(`[GITHUB] ✓ Profile fetched successfully in ${duration}ms`);

      return {
        source: 'github',
        url: user.html_url,
        scrapedAt: new Date().toISOString(),
        data: profileData,
        confidence: calculateConfidence(profileData)
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      logScraping('github', username, duration, false);

      if (error.response?.status === 404) {
        throw new Error(`GitHub user '${username}' not found`);
      } else if (error.response?.status === 403) {
        throw new Error('GitHub API rate limit exceeded. Add GITHUB_TOKEN to .env');
      }

      console.error(`[GITHUB] ✗ Error fetching profile:`, error.message);
      throw new Error(`GitHub scraping failed: ${error.message}`);
    }
  }, 86400); // Cache for 24 hours
}

/**
 * Analyze recent activity patterns
 */
function analyzeActivity(events) {
  const analysis = {
    recentEvents: events.length,
    eventTypes: {},
    mostActiveRepo: null,
    lastActivityDate: null
  };

  if (events.length === 0) {
    return analysis;
  }

  // Count event types
  events.forEach(event => {
    analysis.eventTypes[event.type] = (analysis.eventTypes[event.type] || 0) + 1;
  });

  // Find most active repository
  const repoActivity = {};
  events.forEach(event => {
    if (event.repo) {
      repoActivity[event.repo.name] = (repoActivity[event.repo.name] || 0) + 1;
    }
  });

  if (Object.keys(repoActivity).length > 0) {
    analysis.mostActiveRepo = Object.entries(repoActivity)
      .sort((a, b) => b[1] - a[1])[0][0];
  }

  // Get last activity date
  analysis.lastActivityDate = events[0]?.created_at;

  return analysis;
}

/**
 * Calculate confidence score
 */
function calculateConfidence(data) {
  let score = 0;

  // Profile completeness
  if (data.name) score += 10;
  if (data.bio) score += 10;
  if (data.company) score += 10;
  if (data.location) score += 10;
  if (data.email) score += 10;

  // Activity indicators
  if (data.stats.publicRepos > 0) score += 15;
  if (data.stats.publicRepos > 5) score += 5;
  if (data.stats.followers > 0) score += 10;
  if (data.stats.followers > 10) score += 5;
  if (data.stats.totalStars > 0) score += 10;
  if (data.languages.length > 0) score += 5;

  return Math.min(100, score);
}

module.exports = {
  scrapeGitHub
};
