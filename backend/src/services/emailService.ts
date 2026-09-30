import nodemailer from 'nodemailer';

/**
 * Create an Ethereal SMTP transporter for a specific sender.
 *
 * Ethereal is a fake SMTP service — emails are captured but never
 * actually delivered. This lets us test the full SMTP flow without
 * sending real mail. Each sender has their own Ethereal credentials.
 */
export function createTransporter(user: string, pass: string) {
  return nodemailer.createTransport({
    host: 'smtp.ethereal.email',
    port: 587,
    secure: false,
    auth: { user, pass },
  });
}

/**
 * Create a new Ethereal test account.
 * Returns { user, pass } credentials.
 */
export async function createEtherealAccount(): Promise<{
  user: string;
  pass: string;
  email: string;
}> {
  const account = await nodemailer.createTestAccount();
  return {
    user: account.user,
    pass: account.pass,
    email: account.user, // Ethereal user IS the email address
  };
}

/**
 * Send an email via Ethereal SMTP.
 * Returns the Ethereal preview URL for verification.
 */
export async function sendEmail(params: {
  from: string;
  to: string;
  subject: string;
  html: string;
  etherealUser: string;
  etherealPass: string;
}): Promise<{ messageId: string; previewUrl: string | false }> {
  const transporter = createTransporter(params.etherealUser, params.etherealPass);

  const info = await transporter.sendMail({
    from: params.from,
    to: params.to,
    subject: params.subject,
    html: params.html,
  });

  const previewUrl = nodemailer.getTestMessageUrl(info);

  return {
    messageId: info.messageId,
    previewUrl,
  };
}
