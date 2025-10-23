// src/handlers/social/reddit.js
const axios = require('axios');
const { withCache } = require('../../utils/cache');
const { logScraping } = require('../../utils/logger');

async function scrapeReddit(username) {
  const startTime = Date.now();
  
  return withCache('reddit', username, async () => {
    try {
      console.log(`[REDDIT] Fetching profile: ${username}`);

      const aboutResponse = await axios.get(`https://www.reddit.com/user/${username}/about.json`, {
        headers: { 'User-Agent': 'Identity-Atlas-Scraper/1.0' }
      });

      const user = aboutResponse.data.data;

      const postsResponse = await axios.get(`https://www.reddit.com/user/${username}/submitted.json?limit=50`, {
        headers: { 'User-Agent': 'Identity-Atlas-Scraper/1.0' }
      });

      const commentsResponse = await axios.get(`https://www.reddit.com/user/${username}/comments.json?limit=50`, {
        headers: { 'User-Agent': 'Identity-Atlas-Scraper/1.0' }
      });

      const posts = postsResponse.data.data.children.map(p => ({
        title: p.data.title,
        subreddit: p.data.subreddit,
        score: p.data.score,
        numComments: p.data.num_comments,
        url: `https://reddit.com${p.data.permalink}`,
        created: new Date(p.data.created_utc * 1000).toISOString(),
        text: p.data.selftext ? p.data.selftext.substring(0, 500) : null
      }));

      const comments = commentsResponse.data.data.children.map(c => ({
        text: c.data.body.substring(0, 500),
        subreddit: c.data.subreddit,
        score: c.data.score,
        created: new Date(c.data.created_utc * 1000).toISOString(),
        url: `https://reddit.com${c.data.permalink}`
      }));

      const subredditCounts = {};
      [...posts, ...comments].forEach(item => {
        subredditCounts[item.subreddit] = (subredditCounts[item.subreddit] || 0) + 1;
      });

      const favoriteSubreddits = Object.entries(subredditCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([name, count]) => ({ name, posts: count }));

      const data = {
        username: user.name,
        karma: {
          post: user.link_karma,
          comment: user.comment_karma,
          total: user.total_karma
        },
        accountAge: new Date(user.created_utc * 1000).toISOString(),
        isPremium: user.is_gold || false,
        isVerified: user.verified || false,
        posts: posts,
        comments: comments,
        favoriteSubreddits: favoriteSubreddits,
        stats: {
          totalPosts: posts.length,
          totalComments: comments.length,
          averagePostScore: posts.length > 0 ? Math.round(posts.reduce((sum, p) => sum + p.score, 0) / posts.length) : 0,
          averageCommentScore: comments.length > 0 ? Math.round(comments.reduce((sum, c) => sum + c.score, 0) / comments.length) : 0
        }
      };

      const duration = Date.now() - startTime;
      logScraping('reddit', username, duration, true, posts.length + comments.length);

      console.log(`[REDDIT] ✓ Profile fetched successfully in ${duration}ms`);

      return {
        source: 'reddit',
        url: `https://reddit.com/user/${username}`,
        scrapedAt: new Date().toISOString(),
        data,
        confidence: 90
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      logScraping('reddit', username, duration, false);

      if (error.response?.status === 404) {
        throw new Error(`Reddit user '${username}' not found`);
      }

      console.error(`[REDDIT] ✗ Error fetching profile:`, error.message);
      throw new Error(`Reddit scraping failed: ${error.message}`);
    }
  }, 43200);
}

module.exports = { scrapeReddit };
