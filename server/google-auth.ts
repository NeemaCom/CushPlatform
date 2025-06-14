import type { Express } from "express";
import { storage } from "./storage";

export function setupGoogleAuth(app: Express) {
  // Google OAuth initiate
  app.get("/api/auth/google", async (req, res) => {
    const googleAuthUrl = `https://accounts.google.com/oauth/authorize?` +
      `client_id=${process.env.GOOGLE_CLIENT_ID}&` +
      `redirect_uri=${encodeURIComponent(`${req.protocol}://${req.get('host')}/api/auth/google/callback`)}&` +
      `scope=profile email&` +
      `response_type=code&` +
      `access_type=offline&` +
      `prompt=consent`;
    
    res.redirect(googleAuthUrl);
  });

  // Google OAuth callback
  app.get("/api/auth/google/callback", async (req, res) => {
    try {
      const { code } = req.query;
      
      if (!code) {
        return res.redirect("/register?error=oauth_failed");
      }

      // Exchange code for access token
      const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: process.env.GOOGLE_CLIENT_ID!,
          client_secret: process.env.GOOGLE_CLIENT_SECRET!,
          code: code as string,
          grant_type: "authorization_code",
          redirect_uri: `${req.protocol}://${req.get('host')}/api/auth/google/callback`,
        }),
      });

      const tokenData = await tokenResponse.json();
      
      if (!tokenData.access_token) {
        return res.redirect("/register?error=oauth_failed");
      }

      // Get user profile
      const profileResponse = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      });

      const profile = await profileResponse.json();

      // Check if user already exists
      let user = await storage.getUserByEmail(profile.email);
      
      if (!user) {
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
      }

      // Set session
      req.session.userId = user.id;
      req.session.role = user.role ?? "customer";
      req.session.lastActivity = Date.now();
      
      res.redirect("/dashboard");
    } catch (error) {
      console.error("Google OAuth error:", error);
      res.redirect("/register?error=oauth_failed");
    }
  });
}