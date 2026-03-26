exports.handler = async function(event, context) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
  };

  // Handle preflight OPTIONS request
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  try {
    // Get query parameters from the request
    const queryParams = event.queryStringParameters || {};
    
    // Build the API URL with query parameters
    let apiUrl = 'https://beta-restapi.sarmaaya.pk/api/mutual-funds';
    const params = new URLSearchParams(queryParams);
    if (params.toString()) {
      apiUrl += '?' + params.toString();
    }

    console.log('Fetching from:', apiUrl);

    // Fetch from the actual API using native fetch (Node 18+) or require https
    let data;
    if (typeof fetch !== 'undefined') {
      // Use native fetch if available (Node 18+)
      const response = await fetch(apiUrl);
      data = await response.json();
    } else {
      // Fallback to https module for older Node versions
      const https = require('https');
      data = await new Promise((resolve, reject) => {
        https.get(apiUrl, (res) => {
          let body = '';
          res.on('data', chunk => body += chunk);
          res.on('end', () => {
            try {
              resolve(JSON.parse(body));
            } catch (e) {
              reject(e);
            }
          });
        }).on('error', reject);
      });
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(data)
    };
  } catch (error) {
    console.error('Error fetching mutual funds:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        success: false, 
        error: error.message 
      })
    };
  }
};