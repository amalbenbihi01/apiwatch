import { sendTeamInvitationEmail } from '../services/notification-service.js';

async function testSmtp() {
  console.log('Testing SMTP connection & invitation email sending...');
  console.log(`SMTP_HOST: ${process.env.SMTP_HOST || 'default'}`);
  console.log(`SMTP_PORT: ${process.env.SMTP_PORT || 'default'}`);
  console.log(`SMTP_USER configured: ${Boolean(process.env.SMTP_USER)}`);
  console.log(`SMTP_PASS configured: ${Boolean(process.env.SMTP_PASS)}`);
  console.log(`EMAIL_FROM: ${process.env.EMAIL_FROM || 'not set'}`);

  const recipient = process.env.SMTP_USER || 'benbihiamal43@gmail.com';
  console.log(`Sending test team invitation to: ${recipient}`);

  try {
    const result = await sendTeamInvitationEmail({
      to: recipient,
      teamName: 'Équipe APIWatch Test',
      inviterName: 'Amal Benbihi',
      inviteLink: 'http://localhost:3000/invitations/accept?token=0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
      role: 'MEMBER',
    });

    console.log('Result:', result);
  } catch (err) {
    console.error('SMTP Error:', err.message);
  }
}

testSmtp();
