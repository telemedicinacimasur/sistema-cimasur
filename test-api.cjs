async function test() {
  const res = await fetch('http://localhost:3000/api/mail/send-batch', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      config: {
        smtpServer: 'smtp.gmail.com',
        smtpPort: '465',
        smtpUser: 'comercial@cimasur.cl',
        smtpPass: 'gscz csib mrfk isuh',
        nombre: 'Prueba'
      },
      emails: [{ to: 'test@example.com', subject: 'Test', text: 'Test' }]
    })
  });
  console.log(res.status, await res.text());
}
test();
