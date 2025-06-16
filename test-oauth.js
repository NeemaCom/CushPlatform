// Test script to debug Google OAuth token exchange

async function testGoogleOAuth() {
  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      code: "test_invalid_code",
      grant_type: "authorization_code",
      redirect_uri: "http://localhost:5000/api/auth/google/callback",
    }),
  });

  const result = await tokenResponse.json();
  console.log("Google OAuth Response:", result);
  console.log("Status:", tokenResponse.status);
}

testGoogleOAuth().catch(console.error);