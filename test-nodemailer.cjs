const nodemailer = require('nodemailer');
const dns = require('dns');

async function test() {
  const { address: ipv4Address } = await dns.promises.lookup('smtp.gmail.com', { family: 4 });
  console.log('IPv4 resolved:', ipv4Address);

  const config = { smtpServer: 'smtp.gmail.com', smtpPort: '465' };
  const portInt = parseInt(config.smtpPort, 10);
  
  const transporter = nodemailer.createTransport({
    host: ipv4Address || config.smtpServer,
    port: portInt,
    secure: portInt === 465,
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
    auth: {
      user: 'comercial@cimasur.cl',
      pass: 'gscz csib mrfk isuh'
    },
    tls: { 
      rejectUnauthorized: false,
      servername: config.smtpServer
    },
  });

  try {
    await transporter.verify();
    console.log('Verify successful!');
  } catch (err) {
    console.error('Verify failed:', err);
  }
}

test();
