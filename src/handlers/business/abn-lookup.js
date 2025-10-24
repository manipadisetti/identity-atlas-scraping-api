// src/handlers/business/abn-lookup.js
const axios = require('axios');
const { withCache } = require('../../utils/cache');
const { logScraping } = require('../../utils/logger');

const ABN_GUID = process.env.ABN_LOOKUP_GUID;

async function scrapeABN(abnOrName) {
  const startTime = Date.now();
  
  return withCache('abn', abnOrName, async () => {
    try {
      console.log(`[ABN] Looking up: ${abnOrName}`);

      if (!ABN_GUID) {
        console.warn('[ABN] ABN_LOOKUP_GUID not configured - skipping');
        return {
          source: 'abn-lookup',
          query: abnOrName,
          data: { note: 'ABN_LOOKUP_GUID not configured' },
          confidence: 0
        };
      }

      let url;
      let isABN = /^\d{11}$/.test(abnOrName.replace(/\s/g, ''));
      
      if (isABN) {
        const cleanABN = abnOrName.replace(/\s/g, '');
        url = `https://abr.business.gov.au/json/AbnDetails.aspx?abn=${cleanABN}&guid=${ABN_GUID}`;
      } else {
        url = `https://abr.business.gov.au/json/MatchingNames.aspx?name=${encodeURIComponent(abnOrName)}&guid=${ABN_GUID}`;
      }

      const response = await axios.get(url, {
        headers: { 'User-Agent': 'Identity-Atlas-Scraper/1.0' }
      });

      const data = response.data;

      const result = {
        query: abnOrName,
        queryType: isABN ? 'ABN' : 'Name',
        found: false,
        business: null
      };

      if (isABN && data.Abn) {
        result.found = true;
        result.business = {
          abn: data.Abn,
          abnStatus: data.AbnStatus,
          entityName: data.EntityName,
          entityType: data.EntityTypeName,
          gst: data.Gst,
          address: {
            state: data.AddressState,
            postcode: data.AddressPostcode
          }
        };
      } else if (!isABN && data.Names && data.Names.length > 0) {
        result.found = true;
        result.business = data.Names.map(business => ({
          abn: business.Abn,
          name: business.Name,
          state: business.State,
          postcode: business.Postcode,
          score: business.Score
        }));
      }

      const duration = Date.now() - startTime;
      logScraping('abn', abnOrName, duration, true);

      console.log(`[ABN] ✓ Lookup completed in ${duration}ms`);

      return {
        source: 'abn-lookup',
        url: 'https://abr.business.gov.au',
        scrapedAt: new Date().toISOString(),
        data: result,
        confidence: result.found ? 95 : 40
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      logScraping('abn', abnOrName, duration, false);

      console.error(`[ABN] ✗ Error looking up:`, error.message);
      throw new Error(`ABN lookup failed: ${error.message}`);
    }
  }, 604800);
}

module.exports = { scrapeABN };
