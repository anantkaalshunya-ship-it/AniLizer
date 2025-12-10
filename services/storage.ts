
import { Anime, Banner, BackupData, HistoryItem, Episode, Comment } from '../types';
import { db, auth } from './firebase';
import { 
  ref, get, set, remove, child, push, onValue, off
} from 'firebase/database';
import { signInAnonymously, onAuthStateChanged } from 'firebase/auth';

// Paths
const ANIME_PATH = 'anime';
const BANNER_PATH = 'banners';
const SETTINGS_PATH = 'settings';
const COMMENTS_PATH = 'comments';
const TOKENS_PATH = 'fcm_tokens';
const NOTIF_HISTORY_PATH = 'notification_history';

// Local Storage Keys
const HISTORY_KEY = 'anilizer_history';
const FAVORITES_KEY = 'anilizer_favorites';

const DEFAULT_VIDEO_URL = 'https://jumpshare.com/embed/un1bFcLQM3M0LgIosNx5';

const SEED_BANNERS: Banner[] = [
  { id: '1', imageUrl: 'https://picsum.photos/1920/600?random=1', linkUrl: '#' },
  { id: '2', imageUrl: 'https://picsum.photos/1920/600?random=2', linkUrl: '#' },
  { id: '3', imageUrl: 'https://picsum.photos/1920/600?random=3', linkUrl: '#' }
];

const SEED_ANIME: Anime[] = [
  {
    id: '1', title: 'One punch man', genre: 'Action', year: '2024', status: 'Ongoing',
    description: 'In a futuristic world, giant robots battle unknown entities.',
    poster: 'https://picsum.photos/300/450?random=10', isTrending: true, type: 'Anime', language: 'Hindi',
    episodes: [
      { id: 'e1', title: 'Ep 1: The Beginning', videoUrl: DEFAULT_VIDEO_URL, thumbnail: 'https://picsum.photos/300/200?random=101', season: '1' },
      { id: 'e2', title: 'Ep 2: The Attack', videoUrl: DEFAULT_VIDEO_URL, thumbnail: 'https://picsum.photos/300/200?random=102', season: '1' }
    ]
  },
  {
    id: '2', title: 'SOLO LEVELING', genre: 'Sci-Fi', year: '2023', status: 'Completed',
    description: 'A lone drifter explores the digital wasteland.',
    poster: 'https://picsum.photos/300/450?random=11', isTrending: true, type: 'WebSeries', language: 'Hindi',
    episodes: [{ id: 'e1', title: 'Ep 1: Login', videoUrl: DEFAULT_VIDEO_URL, thumbnail: 'https://picsum.photos/300/200?random=103', season: '1' }]
  },
  {
    id: '3', title: 'Blade Soul', genre: 'Action', year: '2025', status: 'Upcoming',
    description: 'Swordsmen fight for the ultimate soul gem.',
    poster: 'https://picsum.photos/300/450?random=12', isTrending: false, type: 'Anime', language: 'Hindi', episodes: []
  }
];

export interface NotificationLog {
    id: string;
    title: string;
    body: string;
    image?: string;
    timestamp: number;
    sentBy?: string;
}

// --- Auth Helper ---
const ensureAuth = async () => {
  return new Promise<void>((resolve) => {
    if (auth.currentUser) return resolve();
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      unsubscribe();
      if (user) {
        resolve();
      } else {
        // Attempt anonymous auth, but don't block if it fails (rules might allow public read)
        signInAnonymously(auth)
          .then(() => resolve())
          .catch((err) => {
            console.warn("Anonymous auth failed (check Firebase Console), proceeding:", err);
            resolve(); 
          });
      }
    });
  });
};

// --- BANNERS ---
export const getBanners = async (): Promise<Banner[]> => {
  await ensureAuth();
  try {
    const dbRef = ref(db);
    const snapshot = await get(child(dbRef, BANNER_PATH));
    
    if (snapshot.exists()) {
      const data = snapshot.val();
      return Object.values(data) as Banner[];
    }
    
    // Auto-seed only if we have permission
    try {
      const bannerObject: Record<string, Banner> = {};
      SEED_BANNERS.forEach(b => bannerObject[b.id] = b);
      await set(ref(db, BANNER_PATH), bannerObject);
    } catch (e) {
      // Ignore seed write errors
    }
    return SEED_BANNERS;
    
  } catch (error) {
    console.warn("Error fetching banners (using seed):", error);
    return SEED_BANNERS;
  }
};

export const saveBanner = async (banner: Banner) => {
  await ensureAuth();
  await set(ref(db, `${BANNER_PATH}/${banner.id}`), banner);
};

export const deleteBanner = async (id: string) => {
  await ensureAuth();
  await remove(ref(db, `${BANNER_PATH}/${id}`));
};

// --- ANIME ---
export const getAnimeList = async (): Promise<Anime[]> => {
  await ensureAuth();
  try {
    const dbRef = ref(db);
    const snapshot = await get(child(dbRef, ANIME_PATH));

    if (snapshot.exists()) {
       const data = snapshot.val();
       return Object.values(data).map((a: any) => ({
         ...a,
         episodes: a.episodes || []
       })) as Anime[];
    }

    try {
      const animeObject: Record<string, Anime> = {};
      SEED_ANIME.forEach(a => animeObject[a.id] = a);
      await set(ref(db, ANIME_PATH), animeObject);
    } catch (e) { /* Ignore seed error */ }
    
    return SEED_ANIME;
    
  } catch (error) {
    console.warn("Error fetching anime (using seed):", error);
    return SEED_ANIME;
  }
};

export const saveAnime = async (anime: Anime) => {
  await ensureAuth();
  await set(ref(db, `${ANIME_PATH}/${anime.id}`), anime);
};

export const deleteAnime = async (id: string) => {
  await ensureAuth();
  await remove(ref(db, `${ANIME_PATH}/${id}`));
};

export const getAnimeById = async (id: string): Promise<Anime | undefined> => {
  await ensureAuth();
  try {
    const dbRef = ref(db);
    const snapshot = await get(child(dbRef, `${ANIME_PATH}/${id}`));
    if (snapshot.exists()) {
      const data = snapshot.val();
      return {
        ...data,
        episodes: data.episodes || []
      } as Anime;
    }
    // Fallback to seed if ID matches
    return SEED_ANIME.find(a => a.id === id);
  } catch (error) {
    console.warn("Error fetching anime by ID:", error);
    // Fallback to seed if ID matches
    return SEED_ANIME.find(a => a.id === id);
  }
};

// --- SETTINGS (LOGO) ---
export const getLogo = async (): Promise<string> => {
  await ensureAuth();
  try {
    const dbRef = ref(db);
    const snapshot = await get(child(dbRef, `${SETTINGS_PATH}/logo`));
    if (snapshot.exists()) {
      return snapshot.val().url;
    }
  } catch (e) { 
    // console.error(e); // Suppress permission errors for logo
  }
  return "https://zippy-gold-pjtvv4rnrb-199jsywth2.edgeone.dev/31055.png";
};

export const saveLogo = async (url: string) => {
  await ensureAuth();
  await set(ref(db, `${SETTINGS_PATH}/logo`), { url });
};

// --- BACKUP / RESTORE ---
export const createBackup = async (): Promise<void> => {
  await ensureAuth();
  const [banners, anime, logo] = await Promise.all([
    getBanners(),
    getAnimeList(),
    getLogo()
  ]);

  const backupData: BackupData = {
    anime,
    banners,
    logo,
    timestamp: Date.now()
  };

  const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `anilizer_backup_${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

export const restoreBackup = async (data: any) => {
  await ensureAuth();
  
  if (!data || !Array.isArray(data.anime) || !Array.isArray(data.banners)) {
    throw new Error("Invalid backup format");
  }

  const animeObject: Record<string, Anime> = {};
  data.anime.forEach((a: Anime) => {
     if (a.id) animeObject[a.id] = a;
  });
  await set(ref(db, ANIME_PATH), animeObject);

  const bannerObject: Record<string, Banner> = {};
  data.banners.forEach((b: Banner) => {
    if (b.id) bannerObject[b.id] = b;
  });
  await set(ref(db, BANNER_PATH), bannerObject);

  if (typeof data.logo === 'string') {
      await saveLogo(data.logo);
  }
};

// --- HISTORY (HYBRID: FIREBASE + LOCAL) ---
export const addToHistory = async (anime: Anime, episode: Episode, index: number) => {
  await ensureAuth();
  const user = auth.currentUser;
  
  const newItem: HistoryItem = {
    animeId: anime.id,
    animeTitle: anime.title,
    animePoster: anime.poster,
    episodeId: episode.id,
    episodeTitle: episode.title,
    episodeNumber: index + 1,
    timestamp: Date.now()
  };

  if (user && !user.isAnonymous) {
      // Firebase Storage for Logged In Users
      try {
        const historyRef = ref(db, `users/${user.uid}/history`);
        const snapshot = await get(historyRef);
        let history: HistoryItem[] = snapshot.exists() ? (Array.isArray(snapshot.val()) ? snapshot.val() : Object.values(snapshot.val())) : [];
        
        // Remove existing
        history = history.filter(h => h.animeId !== anime.id);
        // Add to front
        history.unshift(newItem);
        // Limit
        if (history.length > 50) history.pop();
        
        await set(historyRef, history);
      } catch (e) { console.error("Firebase history save failed", e); }
  } else {
      // Local Storage for Guests
      try {
        const raw = localStorage.getItem(HISTORY_KEY);
        let history: HistoryItem[] = raw ? JSON.parse(raw) : [];
        history = history.filter(h => h.animeId !== anime.id);
        history.unshift(newItem);
        if (history.length > 50) history.pop();
        localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
      } catch (e) { console.error("Local history save failed", e); }
  }
};

export const getHistory = async (): Promise<HistoryItem[]> => {
  await ensureAuth();
  const user = auth.currentUser;

  if (user && !user.isAnonymous) {
      try {
        const snapshot = await get(ref(db, `users/${user.uid}/history`));
        if (snapshot.exists()) {
            const val = snapshot.val();
            return Array.isArray(val) ? val : Object.values(val);
        }
        return [];
      } catch (e) { return []; }
  } else {
      try {
        const raw = localStorage.getItem(HISTORY_KEY);
        return raw ? JSON.parse(raw) : [];
      } catch (e) { return []; }
  }
};

// --- FAVORITES (HYBRID: FIREBASE + LOCAL) ---
export const toggleFavorite = async (anime: Anime): Promise<boolean> => {
  await ensureAuth();
  const user = auth.currentUser;
  
  if (user && !user.isAnonymous) {
      try {
        const favRef = ref(db, `users/${user.uid}/favorites`);
        const snapshot = await get(favRef);
        let favs: Anime[] = snapshot.exists() ? (Array.isArray(snapshot.val()) ? snapshot.val() : Object.values(snapshot.val())) : [];
        
        const exists = favs.find(f => f.id === anime.id);
        if (exists) {
          favs = favs.filter(f => f.id !== anime.id);
        } else {
          favs.push(anime);
        }
        await set(favRef, favs);
        return !exists;
      } catch (e) { return false; }
  } else {
      try {
        const raw = localStorage.getItem(FAVORITES_KEY);
        let favs: Anime[] = raw ? JSON.parse(raw) : [];
        const exists = favs.find(f => f.id === anime.id);
        if (exists) {
          favs = favs.filter(f => f.id !== anime.id);
        } else {
          favs.push(anime);
        }
        localStorage.setItem(FAVORITES_KEY, JSON.stringify(favs));
        return !exists;
      } catch (e) { return false; }
  }
};

export const isFavorite = async (animeId: string): Promise<boolean> => {
   await ensureAuth();
   const user = auth.currentUser;
   
   if (user && !user.isAnonymous) {
       try {
         const snapshot = await get(ref(db, `users/${user.uid}/favorites`));
         const favs: Anime[] = snapshot.exists() ? (Array.isArray(snapshot.val()) ? snapshot.val() : Object.values(snapshot.val())) : [];
         return !!favs.find(f => f.id === animeId);
       } catch (e) { return false; }
   } else {
       try {
         const raw = localStorage.getItem(FAVORITES_KEY);
         const favs: Anime[] = raw ? JSON.parse(raw) : [];
         return !!favs.find(f => f.id === animeId);
       } catch (e) { return false; }
   }
};

export const getFavorites = async (): Promise<Anime[]> => {
    await ensureAuth();
    const user = auth.currentUser;

    if (user && !user.isAnonymous) {
        try {
            const snapshot = await get(ref(db, `users/${user.uid}/favorites`));
            if (snapshot.exists()) {
                const val = snapshot.val();
                return Array.isArray(val) ? val : Object.values(val);
            }
            return [];
        } catch(e) { return []; }
    } else {
        try {
            const raw = localStorage.getItem(FAVORITES_KEY);
            return raw ? JSON.parse(raw) : [];
        } catch (e) { return []; }
    }
};

// --- COMMENTS (FIREBASE RTDB) ---
export const addComment = async (animeId: string, userName: string, text: string) => {
  await ensureAuth();
  try {
    const commentRef = push(ref(db, `${COMMENTS_PATH}/${animeId}`));
    await set(commentRef, {
      id: commentRef.key,
      userName,
      text,
      timestamp: Date.now()
    });
  } catch (e) {
    console.error("Failed to post comment (Permission Denied?)", e);
  }
};

export const subscribeToComments = (animeId: string, callback: (comments: Comment[]) => void) => {
  const commentsRef = ref(db, `${COMMENTS_PATH}/${animeId}`);
  // Limit to last 50 comments
  const listener = onValue(commentsRef, (snapshot) => {
    if (snapshot.exists()) {
      const data = snapshot.val();
      const loadedComments: Comment[] = Object.values(data);
      // Sort by new
      loadedComments.sort((a, b) => b.timestamp - a.timestamp);
      callback(loadedComments);
    } else {
      callback([]);
    }
  }, (error) => {
    // Suppress permission denied errors in console for readers
    console.warn("Comments subscription error:", error.message);
    callback([]);
  });
  
  return () => off(commentsRef, 'value', listener);
};

// --- NOTIFICATIONS & TOKENS ---
export const saveTokenToDb = async (token: string) => {
    // This allows sending notifications to everyone (broadcast)
    await ensureAuth();
    const user = auth.currentUser;
    const uid = user ? user.uid : 'guest';
    
    // Save to global list for admin broadcasting
    // Use token as key to prevent duplicates
    const safeToken = token.substring(0, 100) + "..."; // logging
    try {
        await set(ref(db, `${TOKENS_PATH}/${token}`), {
            uid: uid,
            timestamp: Date.now()
        });
        
        // Also save to user profile if logged in
        if (user && !user.isAnonymous) {
            await set(ref(db, `users/${user.uid}/fcmToken`), token);
        }
    } catch (e) {
        console.warn("Failed to save FCM token to DB", e);
    }
};

export const getAllFcmTokens = async (): Promise<string[]> => {
    await ensureAuth();
    try {
        const snapshot = await get(ref(db, TOKENS_PATH));
        if (snapshot.exists()) {
            return Object.keys(snapshot.val());
        }
        return [];
    } catch (e) {
        console.error("Error fetching tokens", e);
        return [];
    }
};

export const saveFcmServerKey = async (key: string) => {
    await ensureAuth();
    await set(ref(db, `${SETTINGS_PATH}/fcmServerKey`), key);
};

export const getFcmServerKey = async (): Promise<string> => {
    await ensureAuth();
    try {
        const snapshot = await get(ref(db, `${SETTINGS_PATH}/fcmServerKey`));
        return snapshot.exists() ? snapshot.val() : '';
    } catch (e) { return ''; }
};

// --- NOTIFICATION HISTORY ---
export const saveNotificationHistory = async (notif: Omit<NotificationLog, 'id'>) => {
    await ensureAuth();
    const dbRef = ref(db, NOTIF_HISTORY_PATH);
    const newItemRef = push(dbRef);
    await set(newItemRef, { ...notif, id: newItemRef.key });
};

export const getNotificationHistory = async (): Promise<NotificationLog[]> => {
    await ensureAuth();
    try {
        const snapshot = await get(ref(db, NOTIF_HISTORY_PATH));
        if (snapshot.exists()) {
            const data = snapshot.val();
            // Convert to array and sort by newest first
            return Object.values(data).sort((a: any, b: any) => b.timestamp - a.timestamp) as NotificationLog[];
        }
        return [];
    } catch (e) { return []; }
};
