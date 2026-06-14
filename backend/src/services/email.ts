import nodemailer from 'nodemailer';

/**
 * Send account verification email.
 * Link: {APP_URL}/verify-email?token={rawToken}
 */
export async function sendVerificationEmail(to: string, rawToken: string): Promise<void> {
  const appUrl = process.env.APP_URL || 'http://localhost:3000';
  const link = `${appUrl}/verify-email?token=${rawToken}`;
  const subject = 'Verify your Git Analyser account';
  const body = `Hello,\n\nPlease verify your account by clicking the link below:\n\n${link}\n\nThank you,\nGit Analyser Team`;

  if (process.env.NODE_ENV !== 'production') {
    console.log(`\n📧 [DEV EMAIL] To: ${to}\n   Subject: ${subject}\n   Link: ${link}\n`);
    return;
  }

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  await transporter.sendMail({
    from: process.env.SMTP_FROM || 'no-reply@gitanalyser.app',
    to,
    subject,
    text: body,
  });
}

/**
 * Send password reset email.
 * Link: {APP_URL}/reset-password?token={rawToken}
 */
export async function sendPasswordResetEmail(to: string, rawToken: string): Promise<void> {
  const appUrl = process.env.APP_URL || 'http://localhost:3000';
  const link = `${appUrl}/reset-password?token=${rawToken}`;
  const subject = 'Reset your Git Analyser password';
  const body = `Hello,\n\nYou requested a password reset. Please click the link below to set a new password:\n\n${link}\n\nThank you,\nGit Analyser Team`;

  if (process.env.NODE_ENV !== 'production') {
    console.log(`\n📧 [DEV EMAIL] To: ${to}\n   Subject: ${subject}\n   Link: ${link}\n`);
    return;
  }

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  await transporter.sendMail({
    from: process.env.SMTP_FROM || 'no-reply@gitanalyser.app',
    to,
    subject,
    text: body,
  });
}
