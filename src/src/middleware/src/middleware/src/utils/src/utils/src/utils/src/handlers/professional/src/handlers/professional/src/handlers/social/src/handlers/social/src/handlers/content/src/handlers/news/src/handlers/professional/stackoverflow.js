// src/handlers/professional/stackoverflow.js
const axios = require('axios');
const { withCache } = require('../../utils/cache');
const { logScraping } = require('../../utils/logger');

async function scrapeStackOverflow(userId) {
  const startTime = Date.now();
  
  return withCache('stackoverflow', userId, async () => {
    try {
      console.log(`[STACKOVERFLOW] Fetching profile: ${userId}`);

      const baseUrl = 'https://api.stackexchange.com/2.3';
      
      const userResponse = await axios.get(`${baseUrl}/users/${userId}`, {
        params: {
          site: 'stackoverflow',
          filter: 'withstring'
        }
      });

      const user = userResponse.data.items[0];
      if (!user) {
        throw new Error(`User ${userId} not found`);
      }

      const answersResponse = await axios.get(`${baseUrl}/users/${userId}/answers`, {
        params: {
          site: 'stackoverflow',
          pagesize: 50,
          sort: 'votes',
          order: 'desc'
        }
      });

      const questionsResponse = await axios.get(`${baseUrl}/users/${userId}/questions`, {
        params: {
          site: 'stackoverflow',
          pagesize: 50,
          sort: 'votes',
          order: 'desc'
        }
      });

      const tagsResponse = await axios.get(`${baseUrl}/users/${userId}/top-tags`, {
        params: {
          site: 'stackoverflow',
          pagesize: 20
        }
      });

      const data = {
        userId: user.user_id,
        displayName: user.display_name,
        reputation: user.reputation,
        profileImage: user.profile_image,
        link: user.link,
        location: user.location,
        website: user.website_url,
        badges: {
          gold: user.badge_counts.gold,
          silver: user.badge_counts.silver,
          bronze: user.badge_counts.bronze
        },
        accountCreated: new Date(user.creation_date * 1000).toISOString(),
        lastSeen: new Date(user.last_access_date * 1000).toISOString(),
        answers: answersResponse.data.items.map(a => ({
          score: a.score,
          isAccepted: a.is_accepted,
          title: a.title,
          tags: a.tags,
          url: a.link
        })),
        questions: questionsResponse.data.items.map(q => ({
          score: q.score,
          answerCount: q.answer_count,
          viewCount: q.view_count,
          title: q.title,
          tags: q.tags,
          url: q.link
        })),
        topTags: tagsResponse.data.items.map(t => ({
          name: t.tag_name,
          answerCount: t.answer_count,
          questionCount: t.question_count,
          score: t.answer_score
        }))
      };

      const duration = Date.now() - startTime;
      logScraping('stackoverflow', userId, duration, true);

      console.log(`[STACKOVERFLOW] ✓ Profile fetched successfully in ${duration}ms`);

      return {
        source: 'stackoverflow',
        url: user.link,
        scrapedAt: new Date().toISOString(),
        data,
        confidence: 95
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      logScraping('stackoverflow', userId, duration, false);

      console.error(`[STACKOVERFLOW] ✗ Error fetching profile:`, error.message);
      throw new Error(`Stack Overflow scraping failed: ${error.message}`);
    }
  }, 86400);
}

module.exports = { scrapeStackOverflow };
