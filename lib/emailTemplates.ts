export function renderUserReportEmail({
  adminName,
  reporterName,
  reportedUserName,
  category,
  reason,
  description,
  reportId,
  timestamp,
  attachments
}: {
  adminName: string;
  reporterName: string;
  reportedUserName: string;
  category: string;
  reason: string;
  description: string;
  reportId: string;
  timestamp: string;
  attachments?: Array<{
    fileName: string;
    fileSize: number;
    fileType: string;
    s3Url: string;
  }>;
}): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>New User Report</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
          background-color: #f5f5f5;
        }
        .container {
          background: white;
          border-radius: 8px;
          padding: 30px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .header {
          text-align: center;
          border-bottom: 2px solid #ff6b6b;
          padding-bottom: 20px;
          margin-bottom: 30px;
        }
        .report-icon {
          font-size: 48px;
          color: #ff6b6b;
          margin-bottom: 10px;
        }
        .title {
          color: #ff6b6b;
          font-size: 24px;
          font-weight: bold;
          margin: 0;
        }
        .subtitle {
          color: #666;
          font-size: 16px;
          margin: 5px 0 0 0;
        }
        .content {
          margin-bottom: 30px;
        }
        .report-details {
          background: #f8f9fa;
          border-radius: 6px;
          padding: 20px;
          margin: 20px 0;
        }
        .detail-row {
          display: flex;
          margin-bottom: 10px;
          padding: 8px 0;
          border-bottom: 1px solid #eee;
        }
        .detail-row:last-child {
          border-bottom: none;
          margin-bottom: 0;
        }
        .detail-label {
          font-weight: bold;
          color: #333;
          min-width: 120px;
          margin-right: 15px;
        }
        .detail-value {
          color: #666;
          flex: 1;
        }
        .category-badge {
          display: inline-block;
          padding: 4px 12px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: bold;
          text-transform: uppercase;
        }
        .category-harassment { background: #ffebee; color: #c62828; }
        .category-spam { background: #fff3e0; color: #ef6c00; }
        .category-inappropriate { background: #f3e5f5; color: #7b1fa2; }
        .category-other { background: #e8f5e8; color: #2e7d32; }
        .description {
          background: white;
          border: 1px solid #ddd;
          border-radius: 4px;
          padding: 15px;
          margin: 10px 0;
          font-style: italic;
          color: #555;
        }
        .footer {
          text-align: center;
          margin-top: 30px;
          padding-top: 20px;
          border-top: 1px solid #eee;
          color: #666;
          font-size: 14px;
        }
        .admin-link {
          display: inline-block;
          background: #00d9ff;
          color: white;
          padding: 12px 24px;
          text-decoration: none;
          border-radius: 6px;
          font-weight: bold;
          margin: 20px 0;
        }
        .admin-link:hover {
          background: #00b8d4;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="report-icon">🚨</div>
          <h1 class="title">New User Report</h1>
          <p class="subtitle">A user has been reported and requires your attention</p>
        </div>
        
        <div class="content">
          <p>Hello ${adminName},</p>
          
          <p>A new user report has been submitted and requires your review:</p>
          
          <div class="report-details">
            <div class="detail-row">
              <span class="detail-label">Reporter:</span>
              <span class="detail-value">${reporterName}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Reported User:</span>
              <span class="detail-value">${reportedUserName}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Category:</span>
              <span class="detail-value">
                <span class="category-badge category-${category}">${category}</span>
              </span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Reason:</span>
              <span class="detail-value">${reason}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Report ID:</span>
              <span class="detail-value">${reportId}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Timestamp:</span>
              <span class="detail-value">${new Date(timestamp).toLocaleString()}</span>
            </div>
          </div>
          
          ${description ? `
            <h3>Additional Details:</h3>
            <div class="description">${description}</div>
          ` : ''}
          
          ${attachments && attachments.length > 0 ? `
            <h3>Attached Evidence:</h3>
            <div class="report-details">
              ${attachments.map(attachment => `
                <div class="detail-row">
                  <span class="detail-label">File:</span>
                  <span class="detail-value">
                    <a href="${attachment.s3Url}" target="_blank" style="color: #00d9ff; text-decoration: none;">
                      ${attachment.fileName}
                    </a>
                    <span style="color: #666; font-size: 12px; margin-left: 8px;">
                      (${Math.round(attachment.fileSize / 1024)} KB)
                    </span>
                  </span>
                </div>
              `).join('')}
            </div>
          ` : ''}
          
          <div style="text-align: center;">
            <a href="${process.env.NEXTAUTH_URL}/admin" class="admin-link">
              Review Report in Admin Panel
            </a>
          </div>
        </div>
        
        <div class="footer">
          <p>This is an automated notification from the Geeks Talk moderation system.</p>
          <p>Please review this report promptly to maintain community safety.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

export function renderBugReplyEmail({
  reporterName,
  bugTitle,
  adminName,
  replyMessage
}: {
  reporterName: string;
  bugTitle: string;
  adminName: string;
  replyMessage: string;
}): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Bug Report Reply</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
          background-color: #f5f5f5;
        }
        .container {
          background: white;
          border-radius: 8px;
          padding: 30px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .header {
          text-align: center;
          border-bottom: 2px solid #00d9ff;
          padding-bottom: 20px;
          margin-bottom: 30px;
        }
        .bug-icon {
          font-size: 48px;
          color: #00d9ff;
          margin-bottom: 10px;
        }
        .title {
          color: #00d9ff;
          font-size: 24px;
          font-weight: bold;
          margin: 0;
        }
        .content {
          margin-bottom: 30px;
        }
        .bug-title {
          background: #f8f9fa;
          border-left: 4px solid #00d9ff;
          padding: 15px;
          margin: 20px 0;
          border-radius: 4px;
        }
        .reply-message {
          background: #f8f9fa;
          border: 1px solid #e9ecef;
          padding: 20px;
          border-radius: 8px;
          margin: 20px 0;
          white-space: pre-wrap;
        }
        .footer {
          text-align: center;
          color: #666;
          font-size: 14px;
          border-top: 1px solid #e9ecef;
          padding-top: 20px;
          margin-top: 30px;
        }
        .button {
          display: inline-block;
          background: #00d9ff;
          color: white;
          padding: 12px 24px;
          text-decoration: none;
          border-radius: 6px;
          font-weight: bold;
          margin: 20px 0;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="bug-icon">🐛</div>
          <h1 class="title">Bug Report Reply</h1>
        </div>
        
        <div class="content">
          <p>Hello <strong>${reporterName}</strong>,</p>
          
          <p>Thank you for reporting the bug. Our development team has reviewed your report and provided the following response:</p>
          
          <div class="bug-title">
            <strong>Bug Report:</strong> ${bugTitle}
          </div>
          
          <div class="reply-message">
            <strong>Reply from ${adminName}:</strong><br><br>
            ${replyMessage}
          </div>
          
          <p>We appreciate your feedback and will continue to work on improving our platform. If you have any additional information or questions, please don't hesitate to reach out.</p>
          
          <p>Best regards,<br>
          <strong>The Geeks Talk Team</strong></p>
        </div>
        
        <div class="footer">
          <p>This is an automated message from Geeks Talk. Please do not reply to this email.</p>
          <p>If you need further assistance, please contact our support team.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

export function renderBanEmail(
  userName: string, 
  reason: string, 
  days: number, 
  expiresAt: Date
): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Account Suspension Notice</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
          background-color: #f5f5f5;
        }
        .container {
          background: white;
          border-radius: 8px;
          padding: 30px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .header {
          text-align: center;
          border-bottom: 2px solid #e74c3c;
          padding-bottom: 20px;
          margin-bottom: 30px;
        }
        .warning-icon {
          font-size: 48px;
          color: #e74c3c;
          margin-bottom: 10px;
        }
        .title {
          color: #e74c3c;
          font-size: 24px;
          font-weight: bold;
          margin: 0;
        }
        .content {
          margin-bottom: 30px;
        }
        .ban-details {
          background: #f8f9fa;
          border-left: 4px solid #e74c3c;
          padding: 20px;
          margin: 20px 0;
          border-radius: 4px;
        }
        .footer {
          text-align: center;
          color: #666;
          font-size: 14px;
          border-top: 1px solid #eee;
          padding-top: 20px;
        }
        .button {
          display: inline-block;
          background: #007bff;
          color: white;
          padding: 12px 24px;
          text-decoration: none;
          border-radius: 6px;
          margin: 20px 0;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="warning-icon">⚠️</div>
          <h1 class="title">Account Suspension Notice</h1>
        </div>
        
        <div class="content">
          <p>Dear ${userName},</p>
          
          <p>We are writing to inform you that your account has been temporarily suspended due to a violation of our community guidelines.</p>
          
          <div class="ban-details">
            <h3>Suspension Details:</h3>
            <ul>
              <li><strong>Reason:</strong> ${reason}</li>
              <li><strong>Duration:</strong> ${days} day${days > 1 ? 's' : ''}</li>
              <li><strong>Expires:</strong> ${expiresAt.toLocaleDateString()} at ${expiresAt.toLocaleTimeString()}</li>
            </ul>
          </div>
          
          <p>During this suspension period, you will not be able to access your account or participate in our community. We encourage you to review our community guidelines to understand what led to this action.</p>
          
          <p>If you believe this suspension was made in error, you may contact our support team for review.</p>
          
          <p>We hope this temporary break gives you time to reflect and return as a positive member of our community.</p>
          
          <p>Best regards,<br>
          The GeeksTalk Team</p>
        </div>
        
        <div class="footer">
          <p>This is an automated message. Please do not reply to this email.</p>
          <p>© 2024 GeeksTalk. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

export function renderAdminMessageEmail(
  userName: string, 
  subject: string, 
  message: string
): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Message from GeeksTalk Admin</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
          background-color: #f5f5f5;
        }
        .container {
          background: white;
          border-radius: 8px;
          padding: 30px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .header {
          text-align: center;
          border-bottom: 2px solid #00d9ff;
          padding-bottom: 20px;
          margin-bottom: 30px;
        }
        .icon {
          font-size: 48px;
          color: #00d9ff;
          margin-bottom: 10px;
        }
        .title {
          color: #00d9ff;
          font-size: 24px;
          font-weight: bold;
          margin: 0;
        }
        .content {
          margin-bottom: 30px;
        }
        .message-box {
          background: #f8f9fa;
          border-left: 4px solid #00d9ff;
          padding: 20px;
          margin: 20px 0;
          border-radius: 4px;
        }
        .footer {
          text-align: center;
          color: #666;
          font-size: 14px;
          border-top: 1px solid #eee;
          padding-top: 20px;
        }
        .button {
          display: inline-block;
          background: #00d9ff;
          color: white;
          padding: 12px 24px;
          text-decoration: none;
          border-radius: 6px;
          margin: 20px 0;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="icon">💬</div>
          <h1 class="title">Message from GeeksTalk Admin</h1>
        </div>
        
        <div class="content">
          <p>Dear ${userName},</p>
          
          <p>You have received a message from our admin team:</p>
          
          <div class="message-box">
            <h3>${subject}</h3>
            <p>${message.replace(/\n/g, '<br>')}</p>
          </div>
          
          <p>You can also view this message in your notification inbox on GeeksTalk.</p>
          
          <p>If you have any questions or need assistance, please don't hesitate to contact our support team.</p>
          
          <p>Best regards,<br>
          The GeeksTalk Team</p>
        </div>
        
        <div class="footer">
          <p>This is an automated message. Please do not reply to this email.</p>
          <p>© 2024 GeeksTalk. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

export function renderVerificationEmail(
  email: string,
  code: string,
  purpose: 'signup' | 'reset' | 'change'
): string {
  const getTitle = () => {
    switch (purpose) {
      case 'signup': return 'Verify Your Email Address';
      case 'reset': return 'Reset Your Password';
      case 'change': return 'Verify Email Change';
      default: return 'Email Verification';
    }
  };

  const getMessage = () => {
    switch (purpose) {
      case 'signup': return 'Thank you for signing up! Please verify your email address to complete your registration.';
      case 'reset': return 'You requested to reset your password. Use the code below to set a new password.';
      case 'change': return 'You requested to change your email address. Please verify this new email address.';
      default: return 'Please verify your email address.';
    }
  };

  const getInstructions = () => {
    switch (purpose) {
      case 'signup': return 'Enter this code in the verification form to activate your account.';
      case 'reset': return 'Enter this code along with your new password to reset your account.';
      case 'change': return 'Enter this code to confirm your new email address.';
      default: return 'Enter this code to verify your email address.';
    }
  };

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${getTitle()} - GeeksTalk</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
          background-color: #f5f5f5;
        }
        .container {
          background: white;
          border-radius: 8px;
          padding: 30px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .header {
          text-align: center;
          border-bottom: 2px solid #00d9ff;
          padding-bottom: 20px;
          margin-bottom: 30px;
        }
        .icon {
          font-size: 48px;
          color: #00d9ff;
          margin-bottom: 10px;
        }
        .title {
          color: #00d9ff;
          font-size: 24px;
          font-weight: bold;
          margin: 0;
        }
        .content {
          margin-bottom: 30px;
        }
        .code-box {
          background: #f8f9fa;
          border: 2px solid #00d9ff;
          border-radius: 8px;
          padding: 20px;
          margin: 20px 0;
          text-align: center;
        }
        .verification-code {
          font-size: 32px;
          font-weight: bold;
          color: #00d9ff;
          letter-spacing: 4px;
          font-family: 'Courier New', monospace;
        }
        .warning {
          background: #fff3cd;
          border: 1px solid #ffeaa7;
          border-radius: 4px;
          padding: 15px;
          margin: 20px 0;
          color: #856404;
        }
        .footer {
          text-align: center;
          color: #666;
          font-size: 14px;
          border-top: 1px solid #eee;
          padding-top: 20px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="icon">🔐</div>
          <h1 class="title">${getTitle()}</h1>
        </div>
        
        <div class="content">
          <p>Hello,</p>
          
          <p>${getMessage()}</p>
          
          <div class="code-box">
            <p style="margin: 0 0 10px 0; font-weight: bold;">Your verification code:</p>
            <div class="verification-code">${code}</div>
          </div>
          
          <p>${getInstructions()}</p>
          
          <div class="warning">
            <strong>⚠️ Important:</strong> This code will expire in 15 minutes for security reasons. If you didn't request this verification, please ignore this email.
          </div>
          
          <p>If you have any questions or need assistance, please contact our support team.</p>
          
          <p>Best regards,<br>
          The GeeksTalk Team</p>
        </div>
        
        <div class="footer">
          <p>This is an automated message. Please do not reply to this email.</p>
          <p>© 2024 GeeksTalk. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

export function renderContactReplyEmail(
  userName: string,
  originalMessage: string,
  reply: string
): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Reply to Your Contact Message</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
          background-color: #f5f5f5;
        }
        .container {
          background: white;
          border-radius: 8px;
          padding: 30px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .header {
          text-align: center;
          border-bottom: 2px solid #28a745;
          padding-bottom: 20px;
          margin-bottom: 30px;
        }
        .icon {
          font-size: 48px;
          color: #28a745;
          margin-bottom: 10px;
        }
        .title {
          color: #28a745;
          font-size: 24px;
          font-weight: bold;
          margin: 0;
        }
        .content {
          margin-bottom: 30px;
        }
        .message-box {
          background: #f8f9fa;
          border-left: 4px solid #28a745;
          padding: 20px;
          margin: 20px 0;
          border-radius: 4px;
        }
        .original-message {
          background: #e9ecef;
          padding: 15px;
          margin: 15px 0;
          border-radius: 4px;
          font-style: italic;
        }
        .footer {
          text-align: center;
          color: #666;
          font-size: 14px;
          border-top: 1px solid #eee;
          padding-top: 20px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="icon">📧</div>
          <h1 class="title">Reply to Your Contact Message</h1>
        </div>
        
        <div class="content">
          <p>Dear ${userName},</p>
          
          <p>Thank you for contacting us. We have received your message and here is our reply:</p>
          
          <div class="message-box">
            <h3>Our Reply:</h3>
            <p>${reply.replace(/\n/g, '<br>')}</p>
          </div>
          
          <div class="original-message">
            <h4>Your Original Message:</h4>
            <p>${originalMessage.replace(/\n/g, '<br>')}</p>
          </div>
          
          <p>If you have any further questions or need additional assistance, please don't hesitate to contact us again.</p>
          
          <p>Best regards,<br>
          The GeeksTalk Team</p>
        </div>
        
        <div class="footer">
          <p>This is an automated message. Please do not reply to this email.</p>
          <p>© 2024 GeeksTalk. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}