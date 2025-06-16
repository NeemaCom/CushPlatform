const { createServer } = require('../../dist/index.js');

exports.handler = async (event, context) => {
  try {
    const server = await createServer();
    
    // Create a mock request object
    const req = {
      method: event.httpMethod,
      url: event.path.replace('/.netlify/functions/server', '') + (event.queryStringParameters ? '?' + new URLSearchParams(event.queryStringParameters).toString() : ''),
      headers: event.headers || {},
      body: event.body,
      ip: event.headers['x-forwarded-for'] || event.headers['client-ip'] || '',
      get: (header) => event.headers[header.toLowerCase()],
    };

    // Create a mock response object
    const res = {
      statusCode: 200,
      headers: {},
      body: '',
      status: function(code) {
        this.statusCode = code;
        return this;
      },
      json: function(data) {
        this.headers['Content-Type'] = 'application/json';
        this.body = JSON.stringify(data);
        return this;
      },
      send: function(data) {
        this.body = typeof data === 'string' ? data : JSON.stringify(data);
        return this;
      },
      redirect: function(url) {
        this.statusCode = 302;
        this.headers['Location'] = url;
        return this;
      },
      set: function(name, value) {
        this.headers[name] = value;
        return this;
      },
      end: function() {
        return this;
      }
    };

    // Handle the request (simplified for serverless)
    if (req.url.startsWith('/api/')) {
      // Basic API routing - you may need to expand this
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
        },
        body: JSON.stringify({ message: 'API endpoint reached' })
      };
    }

    return {
      statusCode: res.statusCode,
      headers: res.headers,
      body: res.body
    };

  } catch (error) {
    console.error('Serverless function error:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ error: 'Internal server error' })
    };
  }
};