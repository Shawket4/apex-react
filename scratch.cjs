const axios = require('axios');
const instance = axios.create({
  adapter: async (config) => {
    return {
      data: "Error message",
      status: 400,
      statusText: "Bad Request",
      headers: {},
      config,
      request: {}
    };
  }
});

instance.get('/').then(res => console.log('Resolved:', res.status)).catch(err => console.log('Rejected:', err.message));
