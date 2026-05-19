require('dotenv').config();
const { sendEmail } = require('./src/services/emailService');

async function run() {
  console.log("Testing Brevo SMTP...");
  const res = await sendEmail({
    to: 'iamdalilrhasrhass@gmail.com',
    subject: 'Test SMTP Brevo COURTIA',
    text: 'Ceci est un test Brevo depuis le VPS COURTIA',
    html: '<b>Ceci est un test Brevo depuis le VPS COURTIA</b>'
  });
  console.log("Result:", res);
}
run();
