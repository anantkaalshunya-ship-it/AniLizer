
import { Anime, Banner, BackupData, HistoryItem, Episode, Comment } from '../types';
import { db, auth } from './firebase';
import { 
  ref, set, get, remove, child, push, update, 
  query, orderByChild, equalTo, onValue 
} from 'firebase/database';
import { signInAnonymously, onAuthStateChanged, User } from 'firebase/auth';

// Collection/Path Names
const ANIME_PATH = 'anime';
const BANNER_PATH = 'banners';
const SETTINGS_PATH = 'settings';
const COMMENTS_PATH = 'comments';
const TOKENS_PATH = 'fcm_tokens';
const NOTIF_HISTORY_PATH = 'notification_history';
const USERS_PATH = 'users';

// Local Storage Keys
const HISTORY_KEY = 'anilizer_history';
const FAVORITES_KEY = 'anilizer_favorites';
const LOGO_CACHE_KEY = 'anilizer_logo_cache';

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
        signInAnonymously(auth)
          .then(() => resolve())
          .catch((err) => {
            console.warn("Anonymous auth failed, proceeding:", err);
            resolve(); 
          });
      }
    });
  });
};

// --- ADMIN CHECK ---
export const checkIsAdmin = async (user: User | null): Promise<boolean> => {
    if (!user) return false;
    
    // 1. Super Admin Hardcode
    if (user.email === 'sanskaranimeyt@gmail.com') return true;

    // 2. Database Check
    try {
        const snapshot = await get(ref(db, `${USERS_PATH}/${user.uid}/isAdmin`));
        return snapshot.exists() && snapshot.val() === true;
    } catch (e) {
        return false;
    }
};

// --- BANNERS ---
export const getBanners = async (): Promise<Banner[]> => {
  await ensureAuth();
  try {
    const snapshot = await get(ref(db, BANNER_PATH));
    if (snapshot.exists()) {
      return Object.values(snapshot.val());
    }
    
    // Auto-seed
    try {
      const updates: any = {};
      SEED_BANNERS.forEach(b => {
        updates[`${BANNER_PATH}/${b.id}`] = b;
      });
      await update(ref(db), updates);
    } catch (e) { /* ignore */ }
    return SEED_BANNERS;
  } catch (error) {
    console.warn("Error fetching banners:", error);
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
    const snapshot = await get(ref(db, ANIME_PATH));
    if (snapshot.exists()) {
       const data = snapshot.val();
       return Object.values(data).map((a: any) => ({
         ...a,
         episodes: a.episodes || []
       }));
    }

    try {
      const updates: any = {};
      SEED_ANIME.forEach(a => {
        updates[`${ANIME_PATH}/${a.id}`] = a;
      });
      await update(ref(db), updates);
    } catch (e) { /* ignore */ }
    return SEED_ANIME;
  } catch (error) {
    console.warn("Error fetching anime:", error);
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
    const snapshot = await get(child(ref(db, ANIME_PATH), id));
    if (snapshot.exists()) {
      const data = snapshot.val();
      return { ...data, episodes: data.episodes || [] };
    }
    return SEED_ANIME.find(a => a.id === id);
  } catch (error) {
    return SEED_ANIME.find(a => a.id === id);
  }
};

// --- SETTINGS (LOGO) ---
export const getLogo = async (): Promise<string> => {
  const cachedLogo = localStorage.getItem(LOGO_CACHE_KEY);
  if (cachedLogo) return cachedLogo;

  await ensureAuth();
  try {
    const snapshot = await get(ref(db, `${SETTINGS_PATH}/global/logoUrl`));
    if (snapshot.exists()) {
      const url = snapshot.val();
      localStorage.setItem(LOGO_CACHE_KEY, url);
      return url;
    }
  } catch (e) {}
  return "https://zippy-gold-pjtvv4rnrb-199jsywth2.edgeone.dev/31055.png";
};

export const saveLogo = async (url: string) => {
  await ensureAuth();
  await update(ref(db, `${SETTINGS_PATH}/global`), { logoUrl: url });
  localStorage.setItem(LOGO_CACHE_KEY, url);
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

  // Use multi-path updates for atomicity
  const updates: any = {};
  
  data.anime.forEach((a: Anime) => {
     if (a.id) updates[`${ANIME_PATH}/${a.id}`] = a;
  });

  data.banners.forEach((b: Banner) => {
    if (b.id) updates[`${BANNER_PATH}/${b.id}`] = b;
  });

  if (typeof data.logo === 'string') {
     updates[`${SETTINGS_PATH}/global/logoUrl`] = data.logo;
     localStorage.setItem(LOGO_CACHE_KEY, data.logo);
  }

  await update(ref(db), updates);
};

// --- HISTORY (HYBRID) ---
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
      try {
        const userHistRef = ref(db, `${USERS_PATH}/${user.uid}/history`);
        const snapshot = await get(userHistRef);
        let history: HistoryItem[] = snapshot.exists() ? snapshot.val() : [];
        
        history = history.filter(h => h.animeId !== anime.id);
        history.unshift(newItem);
        if (history.length > 50) history.pop();
        
        await set(userHistRef, history);
      } catch (e) { console.error("History save failed", e); }
  } else {
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
        const snapshot = await get(ref(db, `${USERS_PATH}/${user.uid}/history`));
        if (snapshot.exists()) {
            return snapshot.val() || [];
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

// --- FAVORITES (HYBRID) ---
export const toggleFavorite = async (anime: Anime): Promise<boolean> => {
  await ensureAuth();
  const user = auth.currentUser;
  
  if (user && !user.isAnonymous) {
      try {
        const userFavRef = ref(db, `${USERS_PATH}/${user.uid}/favorites`);
        const snapshot = await get(userFavRef);
        let favs: Anime[] = snapshot.exists() ? snapshot.val() : [];
        
        const exists = favs.find(f => f.id === anime.id);
        if (exists) {
          favs = favs.filter(f => f.id !== anime.id);
        } else {
          favs.push(anime);
        }
        await set(userFavRef, favs);
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
         const snapshot = await get(ref(db, `${USERS_PATH}/${user.uid}/favorites`));
         if (snapshot.exists()) {
             const favs = snapshot.val() || [];
             return !!favs.find((f: Anime) => f.id === animeId);
         }
         return false;
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
            const snapshot = await get(ref(db, `${USERS_PATH}/${user.uid}/favorites`));
            if (snapshot.exists()) {
                return snapshot.val() || [];
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

// --- COMMENTS (REALTIME DB) ---
export const addComment = async (animeId: string, userName: string, text: string) => {
  await ensureAuth();
  try {
    const commentsRef = ref(db, COMMENTS_PATH);
    const newCommentRef = push(commentsRef);
    await set(newCommentRef, {
      animeId,
      userName,
      text,
      timestamp: Date.now()
    });
  } catch (e) {
    console.error("Failed to post comment", e);
  }
};

export const subscribeToComments = (animeId: string, callback: (comments: Comment[]) => void) => {
  // Query comments for specific anime
  const commentsQuery = query(
      ref(db, COMMENTS_PATH), 
      orderByChild('animeId'), 
      equalTo(animeId)
  );

  const unsubscribe = onValue(commentsQuery, (snapshot) => {
      if (snapshot.exists()) {
          const data = snapshot.val();
          const loadedComments = Object.entries(data).map(([key, val]: [string, any]) => ({
              id: key,
              ...val
          }));
          // Sort client-side by timestamp descending since RTDB only sorts by one child
          loadedComments.sort((a, b) => b.timestamp - a.timestamp);
          callback(loadedComments);
      } else {
          callback([]);
      }
  });
  
  return unsubscribe;
};

// --- NOTIFICATIONS & TOKENS ---
export const saveTokenToDb = async (token: string) => {
    await ensureAuth();
    const user = auth.currentUser;
    const uid = user ? user.uid : 'guest';
    
    try {
        // Save to fcm_tokens node
        await set(ref(db, `${TOKENS_PATH}/${token}`), {
            uid: uid,
            timestamp: Date.now()
        });
        
        // Save to user profile
        if (user && !user.isAnonymous) {
            await update(ref(db, `${USERS_PATH}/${user.uid}`), { fcmToken: token });
        }
    } catch (e) {
        console.warn("Failed to save FCM token", e);
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
    await update(ref(db, `${SETTINGS_PATH}/global`), { fcmServerKey: key });
};

export const getFcmServerKey = async (): Promise<string> => {
    await ensureAuth();
    try {
        const snapshot = await get(ref(db, `${SETTINGS_PATH}/global/fcmServerKey`));
        return snapshot.exists() ? snapshot.val() : '';
    } catch (e) { return ''; }
};

// --- NOTIFICATION HISTORY ---
export const saveNotificationHistory = async (notif: Omit<NotificationLog, 'id'>) => {
    await ensureAuth();
    const listRef = ref(db, NOTIF_HISTORY_PATH);
    const newRef = push(listRef);
    await set(newRef, notif);
};

export const getNotificationHistory = async (): Promise<NotificationLog[]> => {
    await ensureAuth();
    try {
        const snapshot = await get(ref(db, NOTIF_HISTORY_PATH));
        if (snapshot.exists()) {
            const data = snapshot.val();
            return Object.entries(data)
                .map(([id, val]: [string, any]) => ({ id, ...val }))
                .sort((a, b) => b.timestamp - a.timestamp);
        }
        return [];
    } catch (e) { return []; }
};
