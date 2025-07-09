import type { Express } from "express";
import { storage } from "./storage";

export function setupGoogleAuth(app: Express) {
  // Google OAuth initiate
  app.get("/api/auth/google", async (req, res) => {
    try {
      // Validate required environment variables
      if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
        console.error("Google OAuth credentials missing:", {
          clientId: process.env.GOOGLE_CLIENT_ID ? "present" : "missing",
          clientSecret: process.env.GOOGLE_CLIENT_SECRET ? "present" : "missing"
        });
        return res.redirect("/signin?error=oauth_config_error&details=Google OAuth not configured");
      }

      const baseUrl = process.env.NODE_ENV === 'production' 
        ? `https://${req.get('host')}`
        : `http://${req.get('host')}`;
      
      const redirectUri = `${baseUrl}/api/auth/google/callback`;
      
      // Log OAuth configuration for debugging
      console.log("Google OAuth Config:", {
        clientId: process.env.GOOGLE_CLIENT_ID ? `${process.env.GOOGLE_CLIENT_ID.substring(0, 10)}...` : "missing",
        redirectUri,
        baseUrl
      });
      
      const googleAuthUrl = `https://accounts.google.com/oauth/authorize?` +
        `client_id=${process.env.GOOGLE_CLIENT_ID}&` +
        `redirect_uri=${encodeURIComponent(redirectUri)}&` +
        `scope=${encodeURIComponent('openid profile email')}&` +
        `response_type=code&` +
        `access_type=offline&` +
        `prompt=consent`;
      
      console.log("Redirecting to Google OAuth URL");
      res.redirect(googleAuthUrl);
    } catch (error) {
      console.error("Google OAuth initiate error:", error);
      res.redirect("/signin?error=oauth_error&details=Failed to initiate Google OAuth");
    }
  });

  // Google OAuth callback
  app.get("/api/auth/google/callback", async (req, res) => {
    try {
      const { code, error, error_description } = req.query;
      
      if (error) {
        console.error("Google OAuth error:", error, error_description);
        const errorMessage = error_description || error;
        return res.redirect(`/signin?error=oauth_failed&details=${encodeURIComponent(errorMessage)}`);
      }
      
      if (!code) {
        console.error("No authorization code received");
        return res.redirect("/signin?error=oauth_failed&details=No authorization code received");
      }

      // Exchange code for access token
      const baseUrl = process.env.NODE_ENV === 'production' 
        ? `https://${req.get('host')}`
        : `http://${req.get('host')}`;
      
      const redirectUri = `${baseUrl}/api/auth/google/callback`;
      
      const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: process.env.GOOGLE_CLIENT_ID!,
          client_secret: process.env.GOOGLE_CLIENT_SECRET!,
          code: code as string,
          grant_type: "authorization_code",
          redirect_uri: redirectUri,
        }),
      });

      const tokenData = await tokenResponse.json();
      
      if (!tokenData.access_token) {
        console.error("Google OAuth token exchange failed:", {
          status: tokenResponse.status,
          statusText: tokenResponse.statusText,
          response: tokenData
        });
        return res.redirect("/signin?error=oauth_failed&details=Token exchange failed");
      }
      
      console.log("Google OAuth token exchange successful");

      // Get user profile
      const profileResponse = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      });

      const profile = await profileResponse.json();

      console.log("Google profile received:", {
        email: profile.email,
        name: profile.name,
        given_name: profile.given_name,
        family_name: profile.family_name
      });

      // Check if user already exists
      let user = await storage.getUserByEmail(profile.email);
      
      if (!user) {
        console.log("Creating new user from Google profile");
        // Create new user
        user = await storage.createUser({
          firstName: profile.given_name || "",
          lastName: profile.family_name || "",
          username: profile.email.split('@')[0] + Date.now(),
          email: profile.email,
          passwordHash: "", // No password for OAuth users
          acceptTerms: true,
          acceptPrivacy: true,
          marketingConsent: false
        });
        console.log("New user created successfully:", user.id);
      } else {
        console.log("Existing user found:", user.id);
      }

      // Set session
      req.session.userId = user.id;
      req.session.role = user.role ?? "customer";
      req.session.lastActivity = Date.now();
      
      console.log("Google OAuth login successful, redirecting to dashboard");
      res.redirect("/dashboard");
    } catch (error) {
      console.error("Google OAuth error:", error);
      res.redirect("/signin?error=oauth_failed&details=Internal server error");
    }
  });
}