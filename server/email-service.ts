import sgMail from '@sendgrid/mail';

if (!process.env.SENDGRID_API_KEY) {
  throw new Error("SENDGRID_API_KEY environment variable must be set");
}

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

interface EmailParams {
  to: string;
  from: string;
  subject: string;
  text?: string;
  html?: string;
}

export async function sendEmail(params: EmailParams): Promise<boolean> {
  try {
    await sgMail.send({
      to: params.to,
      from: params.from,
      subject: params.subject,
      text: params.text,
      html: params.html,
    });
    return true;
  } catch (error) {
    console.error('SendGrid email error:', error);
    return false;
  }
}

export function generatePasswordResetEmail(
  userEmail: string,
  resetToken: string,
  baseUrl: string = process.env.FRONTEND_URL || 'http://localhost:5000'
): EmailParams {
  const resetUrl = `${baseUrl}/reset-password?token=${resetToken}`;
  
  const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Reset Your Password - Cush</title>
        <style>
            body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
                line-height: 1.6;
                color: #333333;
                background-color: #f8f9fa;
                margin: 0;
                padding: 20px;
            }
            .container {
                max-width: 600px;
                margin: 0 auto;
                background-color: #ffffff;
                border-radius: 8px;
                box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
                overflow: hidden;
            }
            .header {
                background: linear-gradient(135deg, #2563eb 0%, #7c3aed 100%);
                color: white;
                padding: 30px;
                text-align: center;
            }
            .content {
                padding: 40px 30px;
            }
            .button {
                display: inline-block;
                background: linear-gradient(135deg, #2563eb 0%, #7c3aed 100%);
                color: white;
                padding: 14px 28px;
                text-decoration: none;
                border-radius: 6px;
                font-weight: 600;
                margin: 20px 0;
                text-align: center;
            }
            .footer {
                background-color: #f8f9fa;
                padding: 20px 30px;
                text-align: center;
                color: #6b7280;
                font-size: 14px;
                border-top: 1px solid #e5e7eb;
            }
            .warning {
                background-color: #fef3c7;
                border: 1px solid #f59e0b;
                border-radius: 6px;
                padding: 15px;
                margin: 20px 0;
                color: #92400e;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1 style="margin: 0; font-size: 28px;">Cush Platform</h1>
                <p style="margin: 10px 0 0 0; opacity: 0.9;">Password Reset Request</p>
            </div>
            
            <div class="content">
                <h2 style="color: #1f2937; margin-top: 0;">Reset Your Password</h2>
                
                <p>We received a request to reset your password for your Cush account. If you made this request, click the button below to create a new password:</p>
                
                <div style="text-align: center; margin: 30px 0;">
                    <a href="${resetUrl}" class="button">Reset Password</a>
                </div>
                
                <p>Or copy and paste this link into your browser:</p>
                <p style="word-break: break-all; background-color: #f3f4f6; padding: 10px; border-radius: 4px; font-family: monospace;">
                    ${resetUrl}
                </p>
                
                <div class="warning">
                    <strong>Important:</strong> This link will expire in 1 hour for security reasons. If you didn't request this password reset, you can safely ignore this email.
                </div>
                
                <p>If you're having trouble clicking the button, copy and paste the URL above into your web browser.</p>
            </div>
            
            <div class="footer">
                <p>This email was sent from Cush Platform. If you have any questions, please contact our support team.</p>
                <p style="margin: 10px 0 0 0;">© ${new Date().getFullYear()} Cush Platform. All rights reserved.</p>
            </div>
        </div>
    </body>
    </html>
  `;

  const textContent = `
Reset Your Password - Cush Platform

We received a request to reset your password for your Cush account.

To reset your password, please visit the following link:
${resetUrl}

This link will expire in 1 hour for security reasons.

If you didn't request this password reset, you can safely ignore this email.

If you're having trouble with the link, copy and paste it into your web browser.

© ${new Date().getFullYear()} Cush Platform. All rights reserved.
  `.trim();

  return {
    to: userEmail,
    from: 'noreply@cush-platform.com', // You can customize this sender email
    subject: 'Reset Your Password - Cush Platform',
    text: textContent,
    html: htmlContent,
  };
}