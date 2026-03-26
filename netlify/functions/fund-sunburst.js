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
      // Get fundId from query parameters
      const fundId = event.queryStringParameters?.fundId;
      
      if (!fundId) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ success: false, error: 'fundId is required' })
        };
      }
  
      const apiUrl = `https://beta-restapi.sarmaaya.pk/api/mutual-funds/sunburst/${fundId}`;
      
      console.log('Fetching sunburst data from:', apiUrl);
  
      // Fetch from the actual API
      let data;
      if (typeof fetch !== 'undefined') {
        const response = await fetch(apiUrl);
        data = await response.json();
      } else {
        const https = require('https');
        data = await new Promise((resolve, reject) => {
          https.get(apiUrl, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
              try { resolve(JSON.parse(body)); } catch (e) { reject(e); }
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
      console.error('Error fetching sunburst data:', error);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ success: false, error: error.message })
      };
    }
  };