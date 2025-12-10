
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getDatabase } from 'firebase/database';
import { getMessaging, getToken } from 'firebase/messaging';

// Helper to safely access env vars in various environments (Vite, CRA, Next, etc.)
// with a fallback to hardcoded values for the current preview environment.
const getEnv = (key: string, fallback: string) => {
  try {
    // Check Vite
    // @ts-ignore
    if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env[key]) {
      // @ts-ignore
      return import.meta.env[key];
    }
  } catch (e) {}

  try {
    // Check Process (React App / Node)
    if (typeof process !== 'undefined' && process.env && process.env[key]) {
      return process.env[key];
    }
  } catch (e) {}

  return fallback;
};

// Use VITE_ or REACT_APP_ prefixes or standard names
const config = {
  apiKey: getEnv("VITE_FIREBASE_API_KEY", getEnv("REACT_APP_FIREBASE_API_KEY", "AIzaSyDnL6XiryX95lW6fg4EI1ZfI_VZXLc64cs")),
  authDomain: getEnv("VITE_FIREBASE_AUTH_DOMAIN", getEnv("REACT_APP_FIREBASE_AUTH_DOMAIN", "anilizer-4ec7f.firebaseapp.com")),
  databaseURL: getEnv("VITE_FIREBASE_DATABASE_URL", getEnv("REACT_APP_FIREBASE_DATABASE_URL", "https://anilizer-4ec7f-default-rtdb.firebaseio.com")),
  projectId: getEnv("VITE_FIREBASE_PROJECT_ID", getEnv("REACT_APP_FIREBASE_PROJECT_ID", "anilizer-4ec7f")),
  storageBucket: getEnv("VITE_FIREBASE_STORAGE_BUCKET", getEnv("REACT_APP_FIREBASE_STORAGE_BUCKET", "anilizer-4ec7f.firebasestorage.app")),
  messagingSenderId: getEnv("VITE_FIREBASE_MESSAGING_SENDER_ID", getEnv("REACT_APP_FIREBASE_MESSAGING_SENDER_ID", "9148477710")),
  appId: getEnv("VITE_FIREBASE_APP_ID", getEnv("REACT_APP_FIREBASE_APP_ID", "1:9148477710:web:038bb549cd3fb97c0c275f")),
  vapidKey: getEnv("VITE_FIREBASE_VAPID_KEY", getEnv("REACT_APP_FIREBASE_VAPID_KEY", "BB1x8mWvgovGFWdR8dZpfbKN4cjsffIPoR_wCg3Ovpiz-oFJLXoz3kM_NvZNpcnNJhK_2WDH3Rq5vQAC9vQapAI"))
};

const firebaseConfig = {
  apiKey: config.apiKey,
  authDomain: config.authDomain,
  databaseURL: config.databaseURL,
  projectId: config.projectId,
  storageBucket: config.storageBucket,
  messagingSenderId: config.messagingSenderId,
  appId: config.appId
};

// Singleton pattern to prevent multiple initializations
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getDatabase(app);
const messaging = getMessaging(app);

// Helper to ask Android/Browser system for notification permission
export const requestForToken = async () => {
  try {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      // Use the config VAPID key
      const token = await getToken(messaging, { 
        vapidKey: config.vapidKey 
      });
      return token;
    } else {
        console.log("Notification permission denied");
    }
  } catch (error) {
    console.error('An error occurred while retrieving token.', error);
  }
  return null;
};

export { app, auth, db, messaging };
