import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { storage } from "./storage";
import type { Express } from "express";

// Configure Google OAuth strategy
passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID!,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
  callbackURL: "/api/auth/google/callback"
}, async (accessToken, refreshToken, profile, done) => {
  try {
    // Check if user already exists with this Google ID or email
    const existingUser = await storage.getUserByEmail(profile.emails![0].value);
    
    if (existingUser) {
      // User exists, log them in
      return done(null, existingUser);
    }
    
    // Create new user from Google profile
    const newUser = await storage.createUser({
      firstName: profile.name?.givenName || "",
      lastName: profile.name?.familyName || "",
      username: profile.emails![0].value.split('@')[0] + Date.now(), // Generate unique username
      email: profile.emails![0].value,
      passwordHash: "", // No password for OAuth users
      role: "customer",
      profileImage: profile.photos?.[0]?.value || null,
      isEmailVerified: true, // Gmail accounts are already verified
      acceptTerms: true,
      acceptPrivacy: true,
      marketingConsent: false
    });
    
    return done(null, newUser);
  } catch (error) {
    return done(error, null);
  }
}));

export function setupGoogleAuth(app: Express) {
  // Google OAuth initiate
  app.get("/api/auth/google", 
    passport.authenticate("google", { scope: ["profile", "email"] })
  );

  // Google OAuth callback
  app.get("/api/auth/google/callback", 
    passport.authenticate("google", { failureRedirect: "/register?error=oauth_failed" }),
    async (req, res) => {
      // Successful authentication, redirect to dashboard
      if (req.user) {
        // Set session
        req.session.userId = (req.user as any).id;
        req.session.role = (req.user as any).role;
        req.session.lastActivity = Date.now();
        
        res.redirect("/dashboard");
      } else {
        res.redirect("/register?error=oauth_failed");
      }
    }
  );
}