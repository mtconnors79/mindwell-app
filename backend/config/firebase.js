const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

let firebaseInitialized = false;

const initializeFirebase = () => {
  try {
    if (admin.apps.length > 0) {
      console.log('Firebase Admin SDK already initialized');
      firebaseInitialized = true;
      return admin;
    }

    let credential;

    // Try to load service account from file first
    const serviceAccountPath = path.join(__dirname, 'firebase-service-account.json');
    if (fs.existsSync(serviceAccountPath)) {
      try {
        const serviceAccount = require('./firebase-service-account.json');
        // Check if it's a valid service account (not placeholder)
        if (serviceAccount.private_key && !serviceAccount.private_key.includes('YOUR_PRIVATE_KEY')) {
          credential = admin.credential.cert(serviceAccount);
          console.log('Using service account from file');
        }
      } catch (e) {
        console.log('Service account file exists but could not be loaded:', e.message);
      }
    }

    // Fall back to environment variable
    if (!credential && process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
      try {
        const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
        credential = admin.credential.cert(serviceAccount);
        console.log('Using service account from environment variable');
      } catch (e) {
        console.log('Could not parse FIREBASE_SERVICE_ACCOUNT_KEY:', e.message);
      }
    }

    // Fall back to application default credentials
    if (!credential) {
      try {
        credential = admin.credential.applicationDefault();
        console.log('Using application default credentials');
      } catch (e) {
        console.log('Application default credentials not available');
      }
    }

    const config = {
      projectId: process.env.FIREBASE_PROJECT_ID,
    };

    if (credential) {
      config.credential = credential;
    }

    admin.initializeApp(config);
    firebaseInitialized = true;
    console.log('Firebase Admin SDK initialized successfully');

    return admin;
  } catch (error) {
    // If all credential methods fail, initialize with just project ID
    if (error.code === 'app/invalid-credential') {
      console.log('Initializing Firebase without credentials (development mode)');
      admin.initializeApp({
        projectId: process.env.FIREBASE_PROJECT_ID,
      });
      firebaseInitialized = true;
      return admin;
    }
    console.error('Failed to initialize Firebase Admin SDK:', error.message);
    throw error;
  }
};

const getAuth = () => {
  if (admin.apps.length === 0) {
    initializeFirebase();
  }
  return admin.auth();
};

const getMessaging = () => {
  if (admin.apps.length === 0) {
    initializeFirebase();
  }
  return admin.messaging();
};

const verifyIdToken = async (idToken) => {
  try {
    const decodedToken = await getAuth().verifyIdToken(idToken);
    return decodedToken;
  } catch (error) {
    console.error('Error verifying ID token:', error.message);
    throw error;
  }
};

const getUserByEmail = async (email) => {
  try {
    const userRecord = await getAuth().getUserByEmail(email);
    return userRecord;
  } catch (error) {
    console.error('Error fetching user by email:', error.message);
    throw error;
  }
};

const getUserByUid = async (uid) => {
  try {
    const userRecord = await getAuth().getUser(uid);
    return userRecord;
  } catch (error) {
    console.error('Error fetching user by UID:', error.message);
    throw error;
  }
};

const isFirebaseInitialized = () => firebaseInitialized;

module.exports = {
  initializeFirebase,
  getAuth,
  getMessaging,
  verifyIdToken,
  getUserByEmail,
  getUserByUid,
  isFirebaseInitialized,
  admin
};
