const nodemailer = require('nodemailer');
const transporter = nodemailer.createTransport({
  host: '142.250.112.109',
  port: 465,
  secure: true,
  auth: { user: 'a@b.com', pass: 'c' },
  tls: { servername: 'smtp.gmail.com' }
});
transporter.verify().catch(console.log);
