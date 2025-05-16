# Plunk Email Templates Guide

## Email Verification Template

### Template Variables

The following variables are available in the template:

- `{{name}}`: User's name or email address
- `{{token}}`: The verification token
- `{{expiresInMinutes}}`: Token expiry time in minutes

### Example Template

Here's an example HTML template you can use in your Plunk dashboard:

```html
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Verify Your Email</title>
    <style>
      body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
        line-height: 1.6;
        color: #333;
        max-width: 600px;
        margin: 0 auto;
        padding: 20px;
      }
      .container {
        background-color: #ffffff;
        border-radius: 8px;
        padding: 30px;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
      }
      .header {
        text-align: center;
        margin-bottom: 30px;
      }
      .verification-code {
        background-color: #f5f5f5;
        padding: 15px;
        border-radius: 4px;
        text-align: center;
        font-size: 24px;
        letter-spacing: 2px;
        margin: 20px 0;
      }
      .expiry {
        color: #666;
        font-size: 14px;
        text-align: center;
        margin-top: 20px;
      }
      .footer {
        margin-top: 30px;
        text-align: center;
        font-size: 12px;
        color: #666;
      }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <h1>Verify Your Email Address</h1>
      </div>

      <p>Hello {{name}},</p>

      <p>Please use the verification code below to verify your email address:</p>

      <div class="verification-code">{{token}}</div>

      <p class="expiry">This code will expire in {{expiresInMinutes}} minutes.</p>

      <p>If you didn't request this verification, you can safely ignore this email.</p>

      <div class="footer">
        <p>This is an automated message, please do not reply to this email.</p>
        <p>For security reasons, this verification code can only be used once.</p>
      </div>
    </div>
  </body>
</html>
```

### Security Considerations

1. **Token Handling**

   - The token is single-use and expires after the configured time
   - Tokens are stored securely in the database
   - Each token is tied to a specific user ID

2. **Email Content**
   - Clear instructions and expiration information
   - Security warning for unrequested verifications
   - No clickable links (preventing phishing attacks)
   - No sensitive information in the email

### Setup Instructions

1. Go to your Plunk dashboard at https://app.useplunk.com/
2. Navigate to the Templates section
3. Click "New Template"
4. Name it "Email Verification"
5. Paste the HTML template above
6. Save the template and copy the template ID
7. Use the template ID in your PlunkEmailVerificationService configuration:

```typescript
const plunkVerification = new PlunkEmailVerificationService(knex, {
  apiKey: 'your_plunk_api_key',
  fromEmail: 'verify@yourdomain.com',
  fromName: 'Your App',
  templateId: 'template_id_from_plunk',
  tokenExpiryMinutes: 15,
});
```

### Testing the Template

To test the template in Plunk:

1. Use the "Preview" feature in Plunk's template editor
2. Send a test email with sample data:
   - name: "Test User"
   - token: "123456"
   - expiresInMinutes: "15"

This will help ensure the template renders correctly with your variables.
