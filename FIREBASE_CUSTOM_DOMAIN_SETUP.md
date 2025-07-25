# Firebase Custom Domain Setup for portal.we-cush.com

## Overview
To display "portal.we-cush.com" instead of "cushportal.firebase.com" in the Google Sign-In popup, you need to set up a custom domain in Firebase Hosting.

## Step-by-Step Setup

### 1. Access Firebase Console
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select project "cushportal"
3. Navigate to **Hosting** → **Custom domain**

### 2. Add Custom Domain
1. Click **"Add custom domain"**
2. Enter: `portal.we-cush.com`
3. Click **"Continue"**

### 3. Verify Domain Ownership
Firebase will provide a TXT record for DNS verification:

**Add this TXT record to your domain DNS:**
- **Type:** TXT
- **Name:** `portal.we-cush.com` (or `@` if your DNS provider uses root domain)
- **Value:** `firebase=cushportal` (Firebase will provide the exact value)
- **TTL:** 3600 (or default)

### 4. Configure DNS Records
After verification, Firebase will provide IP addresses. Add these to your DNS:

**A Records:**
```
Type: A
Name: portal
Value: [Firebase will provide IPv4 addresses]
TTL: 3600
```

**AAAA Records:**
```
Type: AAAA  
Name: portal
Value: [Firebase will provide IPv6 addresses]
TTL: 3600
```

### 5. SSL Certificate Provisioning
- Firebase automatically provisions SSL certificates
- This process can take up to 24 hours
- You'll receive email confirmation when complete

### 6. Update Firebase Configuration (Already Done)
The application is already configured with:
```javascript
authDomain: "portal.we-cush.com"
```

## Expected Results

### Before Custom Domain Setup:
- Google Sign-In popup shows: `cushportal.firebaseapp.com`
- Authentication works but shows Firebase subdomain

### After Custom Domain Setup:
- Google Sign-In popup shows: `portal.we-cush.com`
- Professional branded authentication experience
- Same functionality with custom domain

## Verification Steps

1. **DNS Propagation:** Use tools like `dig` or online DNS checkers
   ```bash
   dig portal.we-cush.com A
   dig portal.we-cush.com AAAA
   ```

2. **SSL Certificate:** Check certificate validity
   ```bash
   openssl s_client -connect portal.we-cush.com:443 -servername portal.we-cush.com
   ```

3. **Firebase Hosting:** Test direct access to custom domain
   - Visit `https://portal.we-cush.com`
   - Should serve Firebase content

4. **Authentication Flow:** Test Google Sign-In
   - Popup should show `portal.we-cush.com` URL
   - Authentication should complete successfully

## Troubleshooting

### Common Issues:
- **DNS Propagation Delay:** Can take up to 48 hours globally
- **SSL Certificate Pending:** Wait up to 24 hours for provisioning
- **Cache Issues:** Clear browser cache after DNS changes

### DNS Providers:
- **Cloudflare:** Set proxy status to "DNS only" (gray cloud) during setup
- **GoDaddy/Namecheap:** Use standard A/AAAA record configuration
- **Route 53:** Create record sets for A and AAAA records

## Timeline
- **DNS Verification:** 5-10 minutes after adding TXT record
- **A/AAAA Record Setup:** 5-10 minutes after adding records
- **SSL Certificate:** Up to 24 hours
- **Global Propagation:** Up to 48 hours

## Status Check
Once setup is complete, the Google Sign-In popup will display the custom domain, providing a professional branded authentication experience.