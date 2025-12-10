
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getDatabase } from 'firebase/database';
import { getMessaging, getToken } from 'firebase/messaging';

const firebaseConfig = {
  apiKey: "AIzaSyDnL6XiryX95lW6fg4EI1ZfI_VZXLc64cs",
  authDomain: "anilizer-4ec7f.firebaseapp.com",
  databaseURL: "https://anilizer-4ec7f-default-rtdb.firebaseio.com",
  projectId: "anilizer-4ec7f",
  storageBucket: "anilizer-4ec7f.firebasestorage.app",
  messagingSenderId: "9148477710",
  appId: "1:9148477710:web:038bb549cd3fb97c0c275f"
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
      const token = await getToken(messaging, { 
        vapidKey: "BMw5y_v3y3n...YOUR_GENERATED_VAPID_KEY_HERE" 
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
