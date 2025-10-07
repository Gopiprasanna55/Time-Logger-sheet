import { ConfidentialClientApplication, Configuration } from "@azure/msal-node";
import { Client } from "@microsoft/microsoft-graph-client";
import { Request, Response, NextFunction } from "express";
import { storage } from "./storage";

// Azure AD configuration
const clientConfig: Configuration = {
  auth: {
    clientId: process.env.AZURE_CLIENT_ID!,
    clientSecret: process.env.AZURE_CLIENT_SECRET!,
    authority: `https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID}`,
  },
  system: {
    loggerOptions: {
      loggerCallback: (level, message, containsPii) => {
        if (!containsPii) {
          console.log(message);
        }
      },
      piiLoggingEnabled: false,
      logLevel: 3, // Info level
    }
  }
};

// Create MSAL instance
const msalInstance = new ConfidentialClientApplication(clientConfig);

// Microsoft Graph client helper
function getGraphClient(accessToken: string): Client {
  return Client.init({
    authProvider: (done) => {
      done(null, accessToken);
    }
  });
}

// Get authorization URL
export async function getAuthUrl(): Promise<string> {
  // Force the Replit domain instead of using conditional logic
  const redirectUri = process.env.AZURE_REDIRECT_URI || `http://localhost:5002/auth/redirect`;
    
  console.log('Debug - FORCED redirectUri:', redirectUri);
    
  const authCodeUrlRequest = {
    scopes: ["user.read", "openid", "profile", "email"],
    redirectUri,
  };

  const authUrl = await msalInstance.getAuthCodeUrl(authCodeUrlRequest);
  console.log('Debug - Generated Auth URL:', authUrl);
  return authUrl;
}

// Handle callback and get user info
export async function handleCallback(code: string) {
  try {
    // Force the same Replit domain for consistency
    const redirectUri = process.env.AZURE_REDIRECT_URI || `http://localhost:5002/auth/redirect`;
      
    const tokenRequest = {
      code,
      scopes: ["user.read", "openid", "profile", "email"],
      redirectUri,
    };

    const response = await msalInstance.acquireTokenByCode(tokenRequest);
    
    if (!response) {
      throw new Error("Failed to acquire token");
    }

    // Get user profile from Microsoft Graph
    const graphClient = getGraphClient(response.accessToken);
    const user = await graphClient.api('/me').get();

    return {
      accessToken: response.accessToken,
      user: {
        id: user.id,
        email: user.userPrincipalName || user.mail,
        firstName: user.givenName,
        lastName: user.surname,
        displayName: user.displayName,
      }
    };
  } catch (error) {
    console.error("Azure auth error:", error);
    throw error;
  }
}

// Middleware to verify user exists in our system (simplified version)
export async function ensureUserExists(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ message: "No user found in session" });
    }

    // User should already exist in our system since they logged in
    // This middleware is just a safety check
    const user = await storage.getUser(req.user.id);
    
    if (!user) {
      return res.status(401).json({ message: "User not found in system" });
    }

    // Ensure req.user has the latest data from storage
    req.user = user;
    next();
  } catch (error) {
    console.error("User verification error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

