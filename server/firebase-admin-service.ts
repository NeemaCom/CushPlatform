/**
 * Firebase Admin Service
 * Handles server-side Firebase ID token verification
 * Fixes 401 authorization failures by validating client tokens
 */

import * as admin from 'firebase-admin';

class FirebaseAdminService {
  private app: admin.app.App | null = null;
  private initialized = false;

  async initialize() {
    if (this.initialized) {
      return this.app;
    }

    try {
      // Initialize Firebase Admin SDK with service account
      // In production, use proper service account key
      // For development, use minimal config
      
      if (!admin.apps.length) {
        // Initialize with minimal config for development
        this.app = admin.initializeApp({
          projectId: 'cushportal',
          // In production, add proper service account credentials
        });
      } else {
        this.app = admin.apps[0];
      }

      this.initialized = true;
      console.log('Firebase Admin SDK initialized successfully');
      return this.app;
    } catch (error) {
      console.error('Firebase Admin initialization failed:', error);
      throw error;
    }
  }

  async verifyIdToken(idToken: string): Promise<admin.auth.DecodedIdToken | null> {
    try {
      if (!this.initialized) {
        await this.initialize();
      }

      if (!this.app) {
        throw new Error('Firebase Admin not initialized');
      }

      console.log('Verifying Firebase ID token...');
      const decodedToken = await admin.auth().verifyIdToken(idToken);
      
      console.log('Firebase ID token verified successfully:', {
        uid: decodedToken.uid,
        email: decodedToken.email,
        exp: new Date(decodedToken.exp * 1000).toISOString()
      });
      
      return decodedToken;
    } catch (error) {
      console.error('Firebase ID token verification failed:', error);
      
      // Log specific error types for debugging
      if ((error as any).code === 'auth/id-token-expired') {
        console.log('Token expired - client should refresh');
      } else if ((error as any).code === 'auth/invalid-credential') {
        console.log('Invalid token format or signature');
      } else if ((error as any).code === 'auth/project-not-found') {
        console.log('Firebase project configuration issue');
      }
      
      return null;
    }
  }

  async getUserByFirebaseUid(uid: string) {
    try {
      if (!this.initialized) {
        await this.initialize();
      }

      if (!this.app) {
        throw new Error('Firebase Admin not initialized');
      }

      const userRecord = await admin.auth().getUser(uid);
      return userRecord;
    } catch (error) {
      console.error('Failed to get Firebase user:', error);
      return null;
    }
  }
}

export const firebaseAdminService = new FirebaseAdminService();