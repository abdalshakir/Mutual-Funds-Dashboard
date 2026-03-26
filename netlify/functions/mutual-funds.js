// In-memory cache
let cachedData = null;
let cacheTimestamp = null;
const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes

async function fetchAllFunds() {
  const allFunds = [];
  let currentPage = 1;
  let totalPages = 1;

  // Fetch first page to get total pages
  const firstPageUrl = 'https://beta-restapi.sarmaaya.pk/api/mutual-funds?page=1&limit=100';
  
  let firstPageData;
  if (typeof fetch !== 'undefined') {
    const response = await fetch(firstPageUrl);
    firstPageData = await response.json();
  } else {
    const https = require('https');
    firstPageData = await new Promise((resolve, reject) => {
      https.get(firstPageUrl, (res) => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
          try { resolve(JSON.parse(body)); } catch (e) { reject(e); }
        });
      }).on('error', reject);
    });
  }

  if (firstPageData.success && firstPageData.response) {
    allFunds.push(...firstPageData.response.data);
    totalPages = firstPageData.response.totalPages;
    
    // Fetch remaining pages in parallel
    const fetchPromises = [];
    for (let page = 2; page <= totalPages; page++) {
      fetchPromises.push(fetchPage(page));
    }
    
    const results = await Promise.all(fetchPromises);
    results.forEach(pageData => {
      if (pageData && pageData.success && pageData.response && pageData.response.data) {
        allFunds.push(...pageData.response.data);
      }
    });
  }

  return allFunds;
}

async function fetchPage(pageNum) {
  const url = `https://beta-restapi.sarmaaya.pk/api/mutual-funds?page=${pageNum}&limit=100`;
  
  try {
    if (typeof fetch !== 'undefined') {
      const response = await fetch(url);
      return await response.json();
    } else {
      const https = require('https');
      return await new Promise((resolve, reject) => {
        https.get(url, (res) => {
          let body = '';
          res.on('data', chunk => body += chunk);
          res.on('end', () => {
            try { resolve(JSON.parse(body)); } catch (e) { reject(e); }
          });
        }).on('error', reject);
      });
    }
  } catch (error) {
    console.error(`Error fetching page ${pageNum}:`, error);
    return null;
  }
}

function applyFilters(funds, filters) {
  let filtered = [...funds];

  // Apply AMC name filter
  if (filters.amcName) {
    filtered = filtered.filter(fund => 
      fund.amcName && fund.amcName.toLowerCase() === filters.amcName.toLowerCase()
    );
  }

  // Apply Shariah filter
  // isSheriah=Islamic means isShariah: true
  // isSheriah=Conventional means isShariah: false
  if (filters.isSheriah) {
    const shariahValues = filters.isSheriah.split(',').map(v => v.trim());
    filtered = filtered.filter(fund => {
      const hasIslamic = shariahValues.includes('Islamic');
      const hasConventional = shariahValues.includes('Conventional');
      
      if (hasIslamic && hasConventional) {
        return true; // Show all
      } else if (hasIslamic) {
        return fund.isShariah === true;
      } else if (hasConventional) {
        return fund.isShariah === false;
      }
      return true;
    });
  }

  // Apply Risk Profile filter
  // riskProfile=Low,Medium,High
  if (filters.riskProfile) {
    const riskValues = filters.riskProfile.split(',').map(v => v.trim());
    filtered = filtered.filter(fund => 
      riskValues.includes(fund.riskProfile)
    );
  }

  return filtered;
}

exports.handler = async function(event, context) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const queryParams = event.queryStringParameters || {};
    
    // Check if cache is valid
    const now = Date.now();
    if (!cachedData || !cacheTimestamp || (now - cacheTimestamp) > CACHE_DURATION) {
      console.log('Cache expired or empty. Fetching all funds from API...');
      cachedData = await fetchAllFunds();
      cacheTimestamp = now;
      console.log(`Cached ${cachedData.length} funds for 30 minutes`);
    } else {
      console.log(`Using cached data (${cachedData.length} funds)`);
    }

    // Apply filters on cached data (no API calls for filtering!)
    let filtered = applyFilters(cachedData, queryParams);

    // Pagination
    const page = parseInt(queryParams.page) || 1;
    const limit = parseInt(queryParams.limit) || 10;
    const totalItems = filtered.length;
    const totalPages = Math.ceil(totalItems / limit);
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedData = filtered.slice(startIndex, endIndex);

    const response = {
      success: true,
      message: "Success",
      response: {
        data: paginatedData,
        currentPage: page,
        pageSize: limit,
        totalItems: totalItems,
        totalPages: totalPages,
        next: page < totalPages ? page + 1 : null,
        previous: page > 1 ? page - 1 : null
      }
    };

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(response)
    };
  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ success: false, error: error.message })
    };
  }
};