// src/handlers/professional/github.js
const axios = require('axios');
const { withCache } = require('../../utils/cache');
const { logScraping } = require('../../utils/logger');

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

async function scrapeGitHub(username) {
  const startTime = Date.now();
  
  return withCache('github', username, async () => {
    try {
      console.log(`[GITHUB] Fetching profile: ${username}`);

      const headers = GITHUB_TOKEN ? { 'Authorization': `token ${GITHUB_TOKEN}` } : {};

      const userResponse = await axios.get(`https://api.github.com/users/${username}`, { headers });
      const user = userResponse.data;

      const reposResponse = await axios.get(`https://api.github.com/users/${username}/repos?sort=updated&per_page=100`, { headers });
      const repos = reposResponse.data;

      const languages = {};
      repos.forEach(repo => {
        if (repo.language) {
          languages[repo.language] = (languages[repo.language] || 0) + 1;
        }
      });

      const topRepos = repos
        .sort((a, b) => b.stargazers_count - a.stargazers_count)
        .slice(0, 10)
        .map(repo => ({
          name: repo.name,
          description: repo.description,
          stars: repo.stargazers_count,
          forks: repo.forks_count,
          language: repo.language,
          url: repo.html_url,
          topics: repo.topics || []
        }));

      const data = {
        username: user.login,
        name: user.name,
        bio: user.bio,
        company: user.company,
        location: user.location,
        email: user.email,
        blog: user.blog,
        twitter: user.twitter_username,
        publicRepos: user.public_repos,
        publicGists: user.public_gists,
        followers: user.followers,
        following: user.following,
        createdAt: user.created_at,
        updatedAt: user.updated_at,
        profileUrl: user.html_url,
        avatarUrl: user.avatar_url,
        languages: Object.entries(languages)
          .sort((a, b) => b[1] - a[1])
          .map(([lang, count]) => ({ language: lang, repos: count })),
        topRepositories: topRepos,
        stats: {
          totalStars: repos.reduce((sum, repo) => sum + repo.stargazers_count, 0),
          totalForks: repos.reduce((sum, repo) => sum + repo.forks_count, 0),
          averageStarsPerRepo: repos.length > 0 ? Math.round(repos.reduce((sum, repo) => sum + repo.stargazers_count, 0) / repos.length) : 0
        }
      };

      const duration = Date.now() - startTime;
      logScraping('github', username, duration, true, repos.length);

      console.log(`[GITHUB] ✓ Profile fetched successfully in ${duration}ms`);

      return {
        source: 'github',
        url: `https://github.com/${username}`,
        scrapedAt: new Date().toISOString(),
        data,
        confidence: 95
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      logScraping('github', username, duration, false);

      if (error.response?.status === 404) {
        throw new Error(`GitHub user '${username}' not found`);
      }

      console.error(`[GITHUB] ✗ Error fetching profile:`, error.message);
      throw new Error(`GitHub scraping failed: ${error.message}`);
    }
  }, 43200);
}

module.exports = { scrapeGitHub };
