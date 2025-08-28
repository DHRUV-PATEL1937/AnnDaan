# Google OAuth Setup Guide

## Current Status
Google OAuth is currently **DISABLED** to prevent authentication errors. The system works perfectly with email/password authentication.

## To Enable Google OAuth (Future Setup)

### 1. Create Google OAuth Client
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing project
3. Enable Google+ API
4. Go to "Credentials" → "Create Credentials" → "OAuth 2.0 Client ID"
5. Set Application type to "Web application"
6. Add authorized origins:
   - `http://localhost:5000`
   - `http://127.0.0.1:5000`
   - Your production domain
7. Copy the Client ID

### 2. Update Environment Configuration
In `FoodLink/.env`, uncomment and update:
```env
GOOGLE_CLIENT_ID=your-actual-client-id-here
```

### 3. Enable Google Sign-In in Code

#### Update mock-server.js
Replace the disabled Google OAuth endpoint with actual implementation:
```javascript
app.post("/api/auth/google-signin", async (req, res) => {
  const { OAuth2Client } = require('google-auth-library');
  const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
  
  try {
    const { token, role } = req.body;
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    
    const payload = ticket.getPayload();
    // Handle user creation/login logic here
    
  } catch (error) {
    res.status(400).json({ message: "Invalid Google token" });
  }
});
```

#### Update login pages
In `FoodLink/public/login.html`, uncomment:
```html
<script src="https://accounts.google.com/gsi/client" async defer></script>
```

And replace the info message with:
```html
<div class="google-signin">
  <div id="g_id_onload"
    data-client_id="YOUR_ACTUAL_CLIENT_ID"
    data-context="signin"
    data-ux_mode="popup"
    data-callback="handleCredentialResponse">
  </div>
  <!-- Rest of Google Sign-In HTML -->
</div>
```

### 4. Test Google OAuth
1. Restart the server
2. Try Google Sign-In from the login page
3. Check browser console for any remaining errors

## Current Working Features
- ✅ Email/password signup and login
- ✅ Role-based authentication (User/NGO/Rider)
- ✅ JWT token management
- ✅ Protected dashboards
- ✅ CORS properly configured
- ✅ No authentication errors

## Troubleshooting
If you still see Google OAuth errors after following this guide:
1. Check that the Client ID is correct
2. Verify authorized origins in Google Console
3. Clear browser cache and cookies
4. Check browser console for specific error messages