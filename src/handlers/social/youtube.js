// src/handlers/content/youtube.js
const axios = require('axios');
const { withCache } = require('../../utils/cache');
const { logScraping } = require('../../utils/logger');

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;

async function scrapeYouTube(query) {
  const startTime = Date.now();
  
  return withCache('youtube', query, async () => {
    try {
      console.log(`[YOUTUBE] Searching for: ${query}`);

      if (!YOUTUBE_API_KEY) {
        throw new Error('YOUTUBE_API_KEY not configured');
      }

      const searchResponse = await axios.get('https://www.googleapis.com/youtube/v3/search', {
        params: {
          key: YOUTUBE_API_KEY,
          q: query,
          type: 'video',
          part: 'snippet',
          maxResults: 20,
          order: 'relevance',
          safeSearch: 'none'
        }
      });

      const videos = searchResponse.data.items.map(item => ({
        videoId: item.id.videoId,
        title: item.snippet.title,
        description: item.snippet.description,
        channelTitle: item.snippet.channelTitle,
        channelId: item.snippet.channelId,
        publishedAt: item.snippet.publishedAt,
        thumbnail: item.snippet.thumbnails.high.url,
        url: `https://www.youtube.com/watch?v=${item.id.videoId}`
      }));

      if (videos.length > 0) {
        const videoIds = videos.slice(0, 10).map(v => v.videoId).join(',');
        const statsResponse = await axios.get('https://www.googleapis.com/youtube/v3/videos', {
          params: {
            key: YOUTUBE_API_KEY,
            id: videoIds,
            part: 'statistics,contentDetails'
          }
        });

        statsResponse.data.items.forEach(item => {
          const video = videos.find(v => v.videoId === item.id);
          if (video) {
            video.stats = {
              views: parseInt(item.statistics.viewCount || 0),
              likes: parseInt(item.statistics.likeCount || 0),
              comments: parseInt(item.statistics.commentCount || 0)
            };
            video.duration = item.contentDetails.duration;
          }
        });
      }

      const duration = Date.now() - startTime;
      logScraping('youtube', query, duration, true, videos.length);

      console.log(`[YOUTUBE] ✓ Found ${videos.length} videos in ${duration}ms`);

      return {
        source: 'youtube',
        query: query,
        scrapedAt: new Date().toISOString(),
        data: {
          videos,
          totalResults: videos.length,
          channels: [...new Set(videos.map(v => v.channelTitle))]
        },
        confidence: videos.length > 0 ? 90 : 30
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      logScraping('youtube', query, duration, false);

      if (error.response?.status === 403) {
        throw new Error('YouTube API quota exceeded or invalid API key');
      }

      console.error(`[YOUTUBE] ✗ Error searching:`, error.message);
      throw new Error(`YouTube scraping failed: ${error.message}`);
    }
  }, 86400);
}

module.exports = { scrapeYouTube };
