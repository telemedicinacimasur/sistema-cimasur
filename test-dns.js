const dns = require('dns');
dns.promises.lookup('smtp.gmail.com', { family: 4 })
  .then(console.log)
  .catch(console.error);
