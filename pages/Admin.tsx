
import React, { useState, useEffect } from 'react';
import { getAnimeList, saveAnime, deleteAnime, getBanners, saveBanner, deleteBanner, getLogo, saveLogo, createBackup, restoreBackup, getFcmServerKey, saveFcmServerKey, getAllFcmTokens, saveNotificationHistory, getNotificationHistory, NotificationLog } from '../services/storage';
import { Anime, Banner, Episode } from '../types';
import { Trash2, Edit2, Plus, X, Upload, Image as ImageIcon, Layers, Settings, Loader2, Download, RefreshCw, Lock, Mail, ArrowRight, Shield, LogOut, Link as LinkIcon, Save, Bell, User as UserIcon, LayoutDashboard, TrendingUp, Users, MessageSquare, Activity, Send, ExternalLink, FileJson, CheckCircle, AlertCircle, Home, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { auth, messaging, db } from '../services/firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile, onAuthStateChanged, signOut, User } from 'firebase/auth';
import { getToken, onMessage } from 'firebase/messaging';
import { ref, get } from 'firebase/database';

// --- JWT Helper Functions for Service Account Auth (Client Side) ---
const importPrivateKey = async (pem: string) => {
  // Clean the key string
  const binaryDerString = window.atob(
    pem.replace(/-----BEGIN PRIVATE KEY-----/g, '')
       .replace(/-----END PRIVATE KEY-----/g, '')
       .replace(/\s/g, '')
  );
  const binaryDer = new Uint8Array(
    [...binaryDerString].map((char) => char.charCodeAt(0))
  ).buffer;

  return window.crypto.subtle.importKey(
    "pkcs8",
    binaryDer,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );
};

const createJWT = async (serviceAccount: any) => {
  const header = { alg: "RS256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const claim = {
    iss: serviceAccount.client_email,
    scope: "https://www.googleapis.com/auth/firebase.messaging",
    aud: "https://oauth2.googleapis.com/token",
    exp: now + 3600,
    iat: now,
  };

  const base64UrlEncode = (str: string) => 
    btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedClaim = base64UrlEncode(JSON.stringify(claim));
  const data = `${encodedHeader}.${encodedClaim}`;

  const key = await importPrivateKey(serviceAccount.private_key);
  const signature = await window.crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key,
    new TextEncoder().encode(data)
  );
  
  const encodedSignature = base64UrlEncode(
    String.fromCharCode(...new Uint8Array(signature))
  );

  return `${data}.${encodedSignature}`;
};

const getAccessToken = async (serviceAccount: any) => {
  try {
      const jwt = await createJWT(serviceAccount);
      // Use CORS proxy because Google Token Endpoint blocks browser requests
      const response = await fetch("https://corsproxy.io/?https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
      });
      const data = await response.json();
      if (data.error) throw new Error(data.error_description || data.error);
      return data.access_token;
  } catch (e: any) {
      console.error("Failed to generate access token:", e);
      throw new Error(`Auth Error: ${e.message}`);
  }
};
// -----------------------------------------------------------------

export const Admin: React.FC = () => {
  const navigate = useNavigate();
  
  // Auth State
  const [adminUser, setAdminUser] = useState<User | null>(null);
  const [authChecking, setAuthChecking] = useState(true);
  
  // Login/Signup Form States
  const [isLoginView, setIsLoginView] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [authError, setAuthError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  
  const [activeTab, setActiveTab] = useState<'dashboard' | 'banners' | 'anime' | 'settings' | 'notifications'>('dashboard');
  
  const [banners, setBanners] = useState<Banner[]>([]);
  const [animeList, setAnimeList] = useState<Anime[]>([]);
  const [siteLogo, setSiteLogo] = useState('');
  const [loading, setLoading] = useState(false);

  // Notification Send State
  const [notifTitle, setNotifTitle] = useState('');
  const [notifBody, setNotifBody] = useState('');
  const [notifImage, setNotifImage] = useState('');
  // fcmConfig can hold either the Legacy Server Key OR the JSON Service Account string
  const [fcmConfig, setFcmConfig] = useState('');
  const [sendingNotif, setSendingNotif] = useState(false);
  const [notifStatus, setNotifStatus] = useState<{type: 'success' | 'error' | 'info', msg: string} | null>(null);
  const [notifHistory, setNotifHistory] = useState<NotificationLog[]>([]);

  // Analytics State
  const [analytics, setAnalytics] = useState({
    totalUsers: 0,
    totalComments: 0,
    totalViews: 0,
    topAnime: [] as { title: string; views: number }[],
    recentComments: [] as { user: string; text: string; anime: string; time: number }[]
  });

  // Modal States
  const [showBannerModal, setShowBannerModal] = useState(false);
  const [editingBanner, setEditingBanner] = useState<Banner | null>(null);

  const [showAnimeModal, setShowAnimeModal] = useState(false);
  const [editingAnime, setEditingAnime] = useState<Anime | null>(null);

  // Form States (Anime)
  const [animeForm, setAnimeForm] = useState<Partial<Anime>>({});
  const [tempEpisodes, setTempEpisodes] = useState<Episode[]>([]);
  const [batchSeason, setBatchSeason] = useState('1'); 
  
  // Banner Form
  const [bannerForm, setBannerForm] = useState<Partial<Banner>>({});

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
        setAdminUser(user);
        setAuthChecking(false);
        if (user) {
            refreshData();
            fetchAnalytics();
            loadFcmConfig();
        }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
      if (activeTab === 'dashboard') {
          fetchAnalytics();
      }
      if (activeTab === 'notifications') {
          loadNotifHistory();
      }
  }, [activeTab]);

  const loadFcmConfig = async () => {
      const key = await getFcmServerKey();
      setFcmConfig(key);
  };

  const loadNotifHistory = async () => {
      const hist = await getNotificationHistory();
      setNotifHistory(hist);
  };

  const refreshData = async () => {
    setLoading(true);
    const [b, a, l] = await Promise.all([getBanners(), getAnimeList(), getLogo()]);
    setBanners(b);
    setAnimeList(a);
    setSiteLogo(l);
    setLoading(false);
  };

  const fetchAnalytics = async () => {
      // 1. Fetch Users & Views
      let userCount = 0;
      let viewMap: Record<string, number> = {};
      try {
          const usersSnapshot = await get(ref(db, 'users'));
          if (usersSnapshot.exists()) {
              const usersData = usersSnapshot.val();
              userCount = Object.keys(usersData).length;
              
              Object.values(usersData).forEach((u: any) => {
                  if (u.history) {
                      const history = Array.isArray(u.history) ? u.history : Object.values(u.history);
                      history.forEach((h: any) => {
                          viewMap[h.animeId] = (viewMap[h.animeId] || 0) + 1;
                      });
                  }
              });
          }
      } catch (e) {
          console.warn("Analytics: Users permission denied. Update Firebase rules.", e);
      }

      // 2. Fetch Comments
      let commentCount = 0;
      let recentCmts: any[] = [];
      try {
          const commentsSnapshot = await get(ref(db, 'comments'));
          if (commentsSnapshot.exists()) {
              const commentsData = commentsSnapshot.val();
              Object.keys(commentsData).forEach(animeId => {
                  const animeCmts = commentsData[animeId];
                  const list = Object.values(animeCmts) as any[];
                  commentCount += list.length;
                  
                  list.forEach(c => {
                      recentCmts.push({
                          user: c.userName,
                          text: c.text,
                          anime: animeId,
                          time: c.timestamp
                      });
                  });
              });
          }
      } catch (e) {
           console.warn("Analytics: Comments permission denied.", e);
      }

      // 3. Process Data
      const topAnime = Object.entries(viewMap)
          .map(([id, views]) => {
              const found = animeList.find(a => a.id === id);
              return { title: found?.title || 'Unknown Anime', views };
          })
          .sort((a, b) => b.views - a.views)
          .slice(0, 5);

      recentCmts.sort((a, b) => b.time - a.time);

      setAnalytics({
          totalUsers: userCount,
          totalComments: commentCount,
          totalViews: Object.values(viewMap).reduce((a, b) => a + b, 0),
          topAnime,
          recentComments: recentCmts.slice(0, 6)
      });
  };

  const handleAdminAuth = async (e: React.FormEvent) => {
      e.preventDefault();
      setAuthError('');
      setIsLoggingIn(true);
      try {
          if (isLoginView) {
              await signInWithEmailAndPassword(auth, email, password);
          } else {
              if (!name) throw new Error("Name is required");
              const cred = await createUserWithEmailAndPassword(auth, email, password);
              await updateProfile(cred.user, { displayName: name });
          }
      } catch (err: any) {
          let msg = "Authentication failed";
          if (err.code === 'auth/invalid-email') msg = "Invalid email";
          if (err.code === 'auth/user-not-found') msg = "User not found";
          if (err.code === 'auth/wrong-password') msg = "Wrong password";
          if (err.code === 'auth/email-already-in-use') msg = "Email already in use";
          if (err.code === 'auth/weak-password') msg = "Password too weak";
          if (err.message) msg = err.message;
          setAuthError(msg);
          setIsLoggingIn(false);
      }
  };

  const handleLogout = async () => {
    await signOut(auth);
    navigate('/');
  };

  const handleImageRead = (e: React.ChangeEvent<HTMLInputElement>, callback: (val: string) => void) => {
    const file = e.target.files?.[0];
    if (file) {
        const reader = new FileReader();
        reader.onloadend = () => callback(reader.result as string);
        reader.readAsDataURL(file);
    }
  };

  const handleSaveBanner = async () => {
    setLoading(true);
    let bannerToSave: Banner;
    if (editingBanner) {
        bannerToSave = { ...editingBanner, ...bannerForm } as Banner;
    } else {
        if (banners.length >= 3) { setLoading(false); return; }
        bannerToSave = { id: Date.now().toString(), ...bannerForm } as Banner;
    }
    await saveBanner(bannerToSave);
    setShowBannerModal(false);
    await refreshData();
  };

  const handleDeleteBanner = async (id: string) => {
    setLoading(true);
    await deleteBanner(id);
    await refreshData();
  };

  const openAnimeModal = (anime?: Anime) => {
    if (anime) {
      setEditingAnime(anime);
      setAnimeForm(anime);
      setTempEpisodes(anime.episodes || []);
      const lastEp = anime.episodes?.length ? anime.episodes[anime.episodes.length - 1] : null;
      setBatchSeason(lastEp?.season || '1');
    } else {
      setEditingAnime(null);
      setAnimeForm({ type: 'Anime', isTrending: false, genre: 'Action', status: 'Ongoing', poster: '', description: '', title: '', year: '2024' });
      setTempEpisodes([]);
      setBatchSeason('1');
    }
    setShowAnimeModal(true);
  };

  const addEpisode = () => {
    const newEp: Episode = {
      id: Date.now().toString(),
      title: `Episode ${tempEpisodes.length + 1}`,
      videoUrl: '', thumbnail: '', season: batchSeason
    };
    setTempEpisodes([...tempEpisodes, newEp]);
  };

  const applyBatchSeason = () => {
    setTempEpisodes(prev => prev.map(ep => ({ ...ep, season: batchSeason })));
  };

  const updateEpisode = (id: string, field: keyof Episode, value: any) => {
    setTempEpisodes(prev => prev.map(ep => ep.id === id ? { ...ep, [field]: value } : ep));
  };

  const removeEpisode = (id: string) => {
    setTempEpisodes(prev => prev.filter(ep => ep.id !== id));
  };

  const handleSaveAnime = async () => {
    setLoading(true);
    const payload: Anime = {
      ...(animeForm as Anime),
      id: editingAnime ? editingAnime.id : Date.now().toString(),
      episodes: tempEpisodes
    };
    await saveAnime(payload);
    setShowAnimeModal(false);
    await refreshData();
  };

  const handleDeleteAnime = async (id: string) => {
    setLoading(true);
    await deleteAnime(id);
    await refreshData();
  };

  const handleUpdateLogo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLoading(true);
      const reader = new FileReader();
      reader.onloadend = async () => { await saveLogo(reader.result as string); await refreshData(); };
      reader.readAsDataURL(file);
    }
  };
  const handleSaveLogoUrl = async () => {
      if (siteLogo) { setLoading(true); await saveLogo(siteLogo); await refreshData(); }
  }

  const handleExport = async () => { setLoading(true); await createBackup(); setLoading(false); };
  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          setLoading(true);
          const reader = new FileReader();
          reader.onload = async (event) => {
              try { await restoreBackup(JSON.parse(event.target?.result as string)); await refreshData(); alert("Data restored!"); } 
              catch (err) { alert("Invalid file"); }
              setLoading(false);
          };
          reader.readAsText(file);
      }
  };

  const handleSendNotification = async () => {
    setNotifStatus(null);
    if (!fcmConfig) {
        setNotifStatus({type: 'error', msg: "Please save your Service Account JSON or Server Key first."});
        return;
    }
    if (!notifTitle || !notifBody) {
        setNotifStatus({type: 'error', msg: "Title and Body are required."});
        return;
    }

    setSendingNotif(true);
    setNotifStatus({type: 'info', msg: "Initializing..."});

    try {
        const tokens = await getAllFcmTokens();
        if (tokens.length === 0) {
            setNotifStatus({type: 'error', msg: "No devices found. Visit the app home page on a device to register a token."});
            setSendingNotif(false);
            return;
        }

        let isServiceAccount = false;
        let serviceAccount: any = null;
        let accessToken = '';

        // Detect Config Type
        try {
            serviceAccount = JSON.parse(fcmConfig);
            if (serviceAccount.private_key && serviceAccount.client_email) {
                isServiceAccount = true;
            }
        } catch (e) {
            isServiceAccount = false; // It's a legacy string key
        }

        if (isServiceAccount) {
            // --- V1 API Flow (Service Account) ---
            setNotifStatus({type: 'info', msg: "Authenticating with Google (V1)..."});
            
            try {
                accessToken = await getAccessToken(serviceAccount);
            } catch (err: any) {
                setNotifStatus({type: 'error', msg: `Auth Failed: ${err.message}. Check JSON or Time.`});
                setSendingNotif(false);
                return;
            }
            
            setNotifStatus({type: 'info', msg: `Sending to ${tokens.length} devices...`});
            
            let successCount = 0;
            const projectId = serviceAccount.project_id || 'anilizer-4ec7f';

            await Promise.all(tokens.map(async (token) => {
                try {
                    // Use CORS Proxy for the send endpoint as well
                    const res = await fetch(`https://corsproxy.io/?https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${accessToken}`
                        },
                        body: JSON.stringify({
                            message: {
                                token: token,
                                notification: {
                                    title: notifTitle,
                                    body: notifBody,
                                    image: notifImage || undefined
                                },
                                android: {
                                    notification: {
                                        icon: 'stock_ticker_update',
                                        color: '#E60026'
                                    }
                                }
                            }
                        })
                    });
                    if (res.ok) successCount++;
                    else {
                        const errText = await res.text();
                        console.error("V1 Send Error", errText);
                    }
                } catch (e) { console.error("Network Error V1", e); }
            }));
            
            setNotifStatus({type: 'success', msg: `Sent successfully to ${successCount} out of ${tokens.length} devices!`});

        } else {
            // --- Legacy API Flow ---
            setNotifStatus({type: 'info', msg: "Sending via Legacy API..."});
            
            const chunkSize = 1000;
            for (let i = 0; i < tokens.length; i += chunkSize) {
                const batch = tokens.slice(i, i + chunkSize);
                
                const payload = {
                    registration_ids: batch,
                    notification: {
                        title: notifTitle,
                        body: notifBody,
                        image: notifImage || undefined,
                        icon: 'https://zippy-gold-pjtvv4rnrb-199jsywth2.edgeone.dev/31055.png'
                    }
                };

                const res = await fetch('https://fcm.googleapis.com/fcm/send', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `key=${fcmConfig}`
                    },
                    body: JSON.stringify(payload)
                });
                
                if(!res.ok) {
                    throw new Error("Legacy API Error: " + res.statusText);
                }
            }
            setNotifStatus({type: 'success', msg: `Broadcast sent to ${tokens.length} devices!`});
        }
        
        // Save to History
        await saveNotificationHistory({
            title: notifTitle,
            body: notifBody,
            image: notifImage,
            timestamp: Date.now(),
            sentBy: adminUser?.displayName || 'Admin'
        });
        
        // Clear form on success
        setNotifTitle('');
        setNotifBody('');
        setNotifImage('');
        
        // Reload History
        await loadNotifHistory();

    } catch (e: any) {
        console.error(e);
        setNotifStatus({type: 'error', msg: `Failed: ${e.message}`});
    } finally {
        setSendingNotif(false);
    }
  };

  const handleSaveConfig = async () => {
      await saveFcmServerKey(fcmConfig);
      alert("Configuration Saved!");
  }

  if (authChecking) return <div className="min-h-screen flex items-center justify-center bg-[#0B0F19]"><Loader2 className="animate-spin text-primary" size={40} /></div>;

  if (!adminUser) {
      return (
          <div className="min-h-screen bg-[#0B0F19] flex items-center justify-center p-4">
               <div className="w-full max-w-md bg-[#110F15] border border-white/10 rounded-2xl p-8 shadow-neon-card relative">
                   <h2 className="text-3xl font-bold text-[#E60026] mb-2 text-center">{isLoginView ? 'Admin Access' : 'Admin Signup'}</h2>
                   
                   <form onSubmit={handleAdminAuth} className="space-y-4">
                       {!isLoginView && (
                           <div className="relative">
                               <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                               <input type="text" placeholder="Admin Name" className="w-full bg-[#1A1E2A] border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white outline-none focus:border-[#E60026]" value={name} onChange={e => setName(e.target.value)} />
                           </div>
                       )}
                       
                       <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                            <input type="email" placeholder="Admin Email" className="w-full bg-[#1A1E2A] border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white outline-none focus:border-[#E60026]" value={email} onChange={e => setEmail(e.target.value)} />
                       </div>

                       <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                            <input type="password" placeholder="Password" className="w-full bg-[#1A1E2A] border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white outline-none focus:border-[#E60026]" value={password} onChange={e => setPassword(e.target.value)} />
                       </div>

                       {authError && <p className="text-red-500 text-sm text-center">{authError}</p>}
                       
                       <button type="submit" disabled={isLoggingIn} className="w-full bg-[#E60026] hover:bg-[#ff1f45] text-white font-bold py-3 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2">
                           {isLoggingIn ? <Loader2 className="animate-spin" /> : (isLoginView ? "Access Dashboard" : "Create Admin Account")}
                       </button>
                   </form>
               </div>
          </div>
      );
  }

  return (
    <div className="min-h-screen bg-[#0B0F19] pb-20 font-sans text-white">
      <div className="bg-[#110F15] border-b border-white/10 p-4 sticky top-0 z-30 flex items-center justify-between shadow-md">
        <h1 className="text-xl font-bold text-[#E60026] flex items-center gap-2"><Shield /> Admin Panel</h1>
        
        <div className="flex gap-2">
            <button onClick={() => navigate('/')} className="flex items-center gap-2 px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition-colors">
                <Home size={16} /> Home
            </button>
            <button onClick={handleLogout} className="flex items-center gap-2 px-4 py-2 bg-red-900/20 text-red-500 rounded-lg hover:bg-red-900/40 transition-colors">
                <LogOut size={16} /> Logout
            </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-4 md:p-6">
          <div className="flex gap-4 mb-8 overflow-x-auto pb-2 border-b border-white/5 no-scrollbar">
              <button onClick={() => setActiveTab('dashboard')} className={`px-6 py-3 rounded-t-lg border-b-2 capitalize transition-colors flex items-center gap-2 ${activeTab === 'dashboard' ? 'border-[#E60026] text-white bg-white/5' : 'border-transparent text-gray-400'}`}>
                  <LayoutDashboard size={18} /> Dashboard
              </button>
              {['banners', 'anime', 'notifications', 'settings'].map((tab) => (
                  <button key={tab} onClick={() => setActiveTab(tab as any)} className={`px-6 py-3 rounded-t-lg border-b-2 capitalize transition-colors ${activeTab === tab ? 'border-[#E60026] text-white bg-white/5' : 'border-transparent text-gray-400'}`}>
                      {tab}
                  </button>
              ))}
          </div>

          {loading && <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center backdrop-blur-sm"><Loader2 className="animate-spin text-[#E60026]" size={50} /></div>}

          {activeTab === 'dashboard' && (
              <div className="space-y-6">
                  {/* Stats Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="bg-[#1A1E2A] p-6 rounded-2xl border border-white/10 shadow-[0_0_15px_rgba(0,240,255,0.1)] hover:border-[#00F0FF]/50 transition-colors">
                          <div className="flex justify-between items-start mb-4">
                              <div>
                                  <p className="text-gray-400 text-sm font-medium">Total Users</p>
                                  <h3 className="text-3xl font-bold text-white mt-1">{analytics.totalUsers}</h3>
                              </div>
                              <div className="p-3 bg-[#00F0FF]/10 rounded-xl">
                                  <Users className="text-[#00F0FF]" size={24} />
                              </div>
                          </div>
                          <div className="text-xs text-gray-500">Registered accounts</div>
                      </div>

                      <div className="bg-[#1A1E2A] p-6 rounded-2xl border border-white/10 shadow-[0_0_15px_rgba(230,0,38,0.1)] hover:border-[#E60026]/50 transition-colors">
                          <div className="flex justify-between items-start mb-4">
                              <div>
                                  <p className="text-gray-400 text-sm font-medium">Total Content</p>
                                  <h3 className="text-3xl font-bold text-white mt-1">{animeList.length}</h3>
                              </div>
                              <div className="p-3 bg-[#E60026]/10 rounded-xl">
                                  <Layers className="text-[#E60026]" size={24} />
                              </div>
                          </div>
                          <div className="text-xs text-gray-500">Anime & Web Series</div>
                      </div>

                      <div className="bg-[#1A1E2A] p-6 rounded-2xl border border-white/10 shadow-[0_0_15px_rgba(0,255,127,0.1)] hover:border-[#00FF7F]/50 transition-colors">
                          <div className="flex justify-between items-start mb-4">
                              <div>
                                  <p className="text-gray-400 text-sm font-medium">Total Engagement</p>
                                  <h3 className="text-3xl font-bold text-white mt-1">{analytics.totalComments}</h3>
                              </div>
                              <div className="p-3 bg-[#00FF7F]/10 rounded-xl">
                                  <MessageSquare className="text-[#00FF7F]" size={24} />
                              </div>
                          </div>
                          <div className="text-xs text-gray-500">User Comments Posted</div>
                      </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Top Trending Anime */}
                      <div className="bg-[#1A1E2A] p-6 rounded-2xl border border-white/10">
                          <h3 className="font-bold text-lg mb-6 flex items-center gap-2">
                              <TrendingUp className="text-[#E60026]" size={20} /> Most Watched
                          </h3>
                          <div className="space-y-5">
                              {analytics.topAnime.length > 0 ? analytics.topAnime.map((item, idx) => (
                                  <div key={idx} className="relative">
                                      <div className="flex justify-between text-sm mb-2">
                                          <span className="font-medium text-white">{idx + 1}. {item.title}</span>
                                          <span className="text-[#E60026] font-bold">{item.views} views</span>
                                      </div>
                                      <div className="w-full bg-black/50 rounded-full h-2">
                                          <div 
                                              className="bg-[#E60026] h-2 rounded-full transition-all duration-1000" 
                                              style={{ width: `${(item.views / (analytics.topAnime[0].views || 1)) * 100}%` }}
                                          />
                                      </div>
                                  </div>
                              )) : (
                                  <div className="text-gray-500 text-center py-10">No viewing history yet</div>
                              )}
                          </div>
                      </div>

                      {/* Recent Activity */}
                      <div className="bg-[#1A1E2A] p-6 rounded-2xl border border-white/10">
                          <h3 className="font-bold text-lg mb-6 flex items-center gap-2">
                              <Activity className="text-[#00F0FF]" size={20} /> Recent Comments
                          </h3>
                          <div className="space-y-4">
                              {analytics.recentComments.length > 0 ? analytics.recentComments.map((cmt, idx) => {
                                  const animeTitle = animeList.find(a => a.id === cmt.anime)?.title || 'Unknown Anime';
                                  return (
                                    <div key={idx} className="flex gap-4 p-3 rounded-xl bg-black/20 border border-white/5 hover:border-white/10 transition-colors">
                                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center font-bold text-white text-sm border border-white/10 shrink-0">
                                            {cmt.user.charAt(0).toUpperCase()}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex justify-between items-center mb-1">
                                                <h4 className="text-sm font-bold text-white truncate">{cmt.user}</h4>
                                                <span className="text-[10px] text-gray-500">{new Date(cmt.time).toLocaleDateString()}</span>
                                            </div>
                                            <p className="text-xs text-[#00F0FF] mb-1 truncate">on {animeTitle}</p>
                                            <p className="text-sm text-gray-300 line-clamp-2">{cmt.text}</p>
                                        </div>
                                    </div>
                                  );
                              }) : (
                                  <div className="text-gray-500 text-center py-10">No recent activity</div>
                              )}
                          </div>
                      </div>
                  </div>
              </div>
          )}

          {activeTab === 'banners' && (
            <div>
              <div className="flex justify-between items-center mb-6">
                 <h2 className="text-2xl font-bold">Banners</h2>
                 <button onClick={() => { setEditingBanner(null); setBannerForm({}); setShowBannerModal(true); }} disabled={banners.length >= 3} className="bg-[#E60026] px-4 py-2 rounded-lg font-semibold flex items-center gap-2 disabled:opacity-50"><Plus size={20} /> Add</button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {banners.map((b) => (
                  <div key={b.id} className="bg-[#1A1E2A] rounded-xl overflow-hidden group border border-white/5">
                    <img src={b.imageUrl} className="h-40 w-full object-cover" />
                    <div className="p-3 flex justify-end gap-2">
                        <button onClick={() => { setEditingBanner(b); setBannerForm(b); setShowBannerModal(true); }} className="p-2 bg-blue-600 rounded-full"><Edit2 size={16} /></button>
                        <button onClick={() => handleDeleteBanner(b.id)} className="p-2 bg-red-600 rounded-full"><Trash2 size={16} /></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'anime' && (
            <div>
              <div className="flex justify-between items-center mb-6">
                 <h2 className="text-2xl font-bold">Anime List</h2>
                 <button onClick={() => openAnimeModal()} className="bg-[#E60026] px-4 py-2 rounded-lg font-semibold flex items-center gap-2"><Plus size={20} /> Add</button>
              </div>
              <div className="space-y-4">
                {animeList.map(a => (
                  <div key={a.id} className="bg-[#1A1E2A] p-4 rounded-xl border border-white/5 flex gap-4 hover:border-white/20">
                     <img src={a.poster} className="w-16 h-24 object-cover rounded" />
                     <div className="flex-1">
                        <h3 className="font-bold">{a.title}</h3>
                        <p className="text-sm text-gray-400">{a.genre} • {a.episodes?.length || 0} Eps</p>
                     </div>
                     <div className="flex gap-2">
                        <button onClick={() => openAnimeModal(a)} className="p-2 bg-gray-800 rounded border border-white/10"><Edit2 size={18}/></button>
                        <button onClick={() => handleDeleteAnime(a.id)} className="p-2 bg-gray-800 rounded border border-white/10 hover:text-red-500"><Trash2 size={18}/></button>
                     </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'notifications' && (
             <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                 <div className="bg-[#1A1E2A] p-6 rounded-2xl border border-white/10">
                     <h3 className="font-bold mb-6 flex items-center gap-2 text-xl"><Bell className="text-[#E60026]" /> Send Notification</h3>
                     
                     <div className="space-y-4">
                         <div>
                             <label className="block text-xs text-gray-400 mb-1">Title</label>
                             <input type="text" placeholder="New Episode Alert!" className="w-full bg-[#110F15] p-3 rounded-xl border border-white/10 focus:border-[#E60026] outline-none transition-colors" value={notifTitle} onChange={e => setNotifTitle(e.target.value)} />
                         </div>
                         <div>
                             <label className="block text-xs text-gray-400 mb-1">Body</label>
                             <textarea placeholder="One Punch Man Ep 2 is out now!" className="w-full bg-[#110F15] p-3 rounded-xl border border-white/10 focus:border-[#E60026] outline-none h-24 transition-colors" value={notifBody} onChange={e => setNotifBody(e.target.value)} />
                         </div>
                         <div>
                             <label className="block text-xs text-gray-400 mb-1">Image URL (Optional)</label>
                             <div className="flex gap-2">
                                <input type="text" placeholder="https://..." className="flex-1 bg-[#110F15] p-3 rounded-xl border border-white/10 focus:border-[#E60026] outline-none transition-colors" value={notifImage} onChange={e => setNotifImage(e.target.value)} />
                                <label className="bg-[#1A1E2A] border border-white/10 p-3 rounded-xl cursor-pointer hover:bg-white/5 flex items-center justify-center">
                                    <ImageIcon size={20} />
                                    <input type="file" className="hidden" onChange={(e) => handleImageRead(e, (val) => setNotifImage(val))} />
                                </label>
                             </div>
                             {notifImage && <img src={notifImage} className="mt-2 h-32 rounded-lg object-cover border border-white/10" />}
                         </div>

                         <button 
                            onClick={handleSendNotification} 
                            disabled={sendingNotif}
                            className="w-full bg-[#E60026] hover:bg-[#ff1f45] py-3 rounded-xl font-bold shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                         >
                            {sendingNotif ? <Loader2 className="animate-spin" /> : <><Send size={18} /> Send Broadcast</>}
                         </button>
                         
                         {/* Status Message Area */}
                         {notifStatus && (
                            <div className={`p-3 rounded-xl border flex items-start gap-2 text-xs transition-all ${
                                notifStatus.type === 'success' ? 'bg-green-500/10 border-green-500/30 text-green-400' :
                                notifStatus.type === 'error' ? 'bg-red-500/10 border-red-500/30 text-red-400' :
                                'bg-blue-500/10 border-blue-500/30 text-blue-400'
                            }`}>
                                {notifStatus.type === 'success' ? <CheckCircle size={16} className="mt-0.5 shrink-0"/> : 
                                 notifStatus.type === 'error' ? <AlertCircle size={16} className="mt-0.5 shrink-0"/> :
                                 <Loader2 size={16} className="mt-0.5 shrink-0 animate-spin"/>}
                                <span>{notifStatus.msg}</span>
                            </div>
                         )}
                         
                         <p className="text-xs text-gray-500 text-center">Will be sent to all devices that have granted permission.</p>
                     </div>
                 </div>

                 <div className="space-y-6">
                    <div className="bg-[#1A1E2A] p-6 rounded-2xl border border-white/10">
                        <h3 className="font-bold mb-4 flex items-center gap-2"><Settings className="text-gray-400" /> Configuration</h3>
                        
                        <div className="space-y-2">
                             <label className="block text-xs text-gray-400">Paste <b>Service Account JSON</b> (Recommended) OR <b>Legacy Server Key</b></label>
                             <div className="flex flex-col gap-2">
                                <textarea 
                                    rows={6}
                                    placeholder={`Paste the entire content of the JSON file you downloaded (starts with "type": "service_account"...) \nOR\nPaste a Legacy Server Key string (AIzaSy...)`}
                                    className="flex-1 bg-[#110F15] p-3 rounded-xl border border-white/10 focus:border-[#E60026] outline-none transition-colors text-xs font-mono" 
                                    value={fcmConfig} 
                                    onChange={e => setFcmConfig(e.target.value)} 
                                />
                                <button onClick={handleSaveConfig} className="bg-blue-600 px-4 py-2 rounded-xl font-bold text-sm hover:bg-blue-700 transition-colors self-end">Save Config</button>
                             </div>
                             
                             <div className="mt-3 p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
                                <p className="text-xs text-green-400 font-bold flex items-center gap-1"><FileJson size={14}/> Service Account Supported</p>
                                <p className="text-[10px] text-gray-400 mt-1">
                                    You can now paste the Service Account JSON file content directly. The system uses a secure proxy to authenticate via the HTTP v1 API.
                                </p>
                             </div>
                        </div>
                    </div>

                    {/* Sent History Section */}
                    <div className="bg-[#1A1E2A] p-6 rounded-2xl border border-white/10 max-h-[500px] flex flex-col">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-bold flex items-center gap-2"><Clock className="text-gray-400" /> Sent History</h3>
                            <button onClick={loadNotifHistory} className="text-xs text-blue-500 hover:text-blue-400"><RefreshCw size={14}/></button>
                        </div>
                        
                        <div className="overflow-y-auto custom-scrollbar flex-1 space-y-3 pr-2">
                            {notifHistory.length > 0 ? notifHistory.map((item) => (
                                <div key={item.id} className="bg-black/30 p-3 rounded-xl border border-white/5">
                                    <div className="flex justify-between items-start mb-1">
                                        <h4 className="font-bold text-sm text-white truncate w-3/4">{item.title}</h4>
                                        <span className="text-[10px] text-gray-500">{new Date(item.timestamp).toLocaleDateString()}</span>
                                    </div>
                                    <p className="text-xs text-gray-400 line-clamp-2 mb-2">{item.body}</p>
                                    <div className="flex justify-between items-center">
                                        <span className="text-[10px] text-[#00F0FF] bg-[#00F0FF]/10 px-2 py-0.5 rounded">Sent</span>
                                        {item.image && <span className="text-[10px] text-gray-500 flex items-center gap-1"><ImageIcon size={10}/> Image Attached</span>}
                                    </div>
                                </div>
                            )) : (
                                <div className="text-center py-8 text-gray-500 text-sm">No messages sent yet.</div>
                            )}
                        </div>
                    </div>
                 </div>
             </div>
          )}

          {activeTab === 'settings' && (
            <div className="space-y-6">
               <div className="bg-[#1A1E2A] p-6 rounded-2xl border border-white/10">
                  <h3 className="font-bold mb-4">Logo</h3>
                  <div className="flex gap-4 items-center flex-wrap">
                     <img src={siteLogo} className="h-12 object-contain bg-black/50 p-1 rounded" />
                     <div className="flex flex-col gap-2">
                         <div className="flex items-center gap-2">
                             <label className="bg-[#1A1E2A] border border-white/10 px-3 py-1 rounded cursor-pointer text-sm hover:bg-white/5 flex items-center gap-1">
                                 <ImageIcon size={14} /> Gallery
                                 <input type="file" className="hidden" onChange={handleUpdateLogo} />
                             </label>
                             <span className="text-xs text-gray-500">OR</span>
                             <input type="text" placeholder="Paste URL" className="bg-[#110F15] p-1.5 rounded text-sm border border-white/10 w-40" value={siteLogo} onChange={e => setSiteLogo(e.target.value)} />
                         </div>
                         <button onClick={handleSaveLogoUrl} className="bg-blue-600 px-3 py-1 rounded text-xs w-fit flex items-center gap-1"><Save size={12}/> Update</button>
                     </div>
                  </div>
               </div>

               <div className="bg-[#1A1E2A] p-6 rounded-2xl border border-white/10">
                   <h3 className="font-bold mb-4">Data Management</h3>
                   <div className="flex gap-4">
                       <button onClick={handleExport} className="flex items-center gap-2 px-4 py-2 bg-blue-600 rounded hover:bg-blue-700 transition-colors"><Download size={18}/> Backup Data</button>
                       <label className="flex items-center gap-2 px-4 py-2 bg-green-600 rounded cursor-pointer hover:bg-green-700 transition-colors"><RefreshCw size={18}/> Restore Data <input type="file" className="hidden" onChange={handleImport}/></label>
                   </div>
                   <p className="text-xs text-gray-400 mt-2">Download a JSON backup of all anime and banners, or restore from a previous file.</p>
               </div>
            </div>
          )}
      </div>

      {/* ANIME MODAL */}
      {showAnimeModal && (
        <div className="fixed inset-0 bg-black/90 z-50 overflow-y-auto backdrop-blur-sm">
           <div className="min-h-screen pt-24 pb-10 px-4 flex justify-center">
             <div className="bg-[#1A1E2A] w-full max-w-4xl rounded-2xl border border-white/10 shadow-2xl relative p-6">
                <button onClick={() => setShowAnimeModal(false)} className="absolute top-4 right-4 bg-white/10 p-2 rounded-full hover:bg-white/20"><X /></button>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="space-y-4">
                        <input type="text" placeholder="Title" className="w-full bg-[#110F15] p-3 rounded border border-white/10 focus:border-[#E60026] outline-none" value={animeForm.title || ''} onChange={e => setAnimeForm({...animeForm, title: e.target.value})} />
                        
                        <div className="aspect-[2/3] bg-[#110F15] rounded flex items-center justify-center border border-white/10 overflow-hidden relative group">
                            {animeForm.poster ? <img src={animeForm.poster} className="w-full h-full object-cover"/> : <span className="text-gray-600">No Poster</span>}
                        </div>
                        
                        <div className="flex gap-2 items-center">
                             <label className="flex-1 bg-[#1A1E2A] border border-white/10 p-2 rounded cursor-pointer text-xs flex items-center justify-center gap-1 hover:bg-white/5">
                                 <ImageIcon size={14}/> Gallery
                                 <input type="file" className="hidden" onChange={(e) => handleImageRead(e, (val) => setAnimeForm({...animeForm, poster: val}))} />
                             </label>
                             <span className="text-[10px] text-gray-500">OR</span>
                             <input type="text" placeholder="Poster URL" className="flex-[2] bg-[#110F15] p-2 text-xs rounded border border-white/10 focus:border-[#E60026] outline-none" value={animeForm.poster || ''} onChange={e => setAnimeForm({...animeForm, poster: e.target.value})} />
                        </div>

                        <select className="w-full bg-[#110F15] p-3 rounded border border-white/10 focus:border-[#E60026] outline-none" value={animeForm.genre || 'Action'} onChange={e => setAnimeForm({...animeForm, genre: e.target.value})}>
                            {['Action', 'Adventure', 'Sci-Fi', 'Fantasy'].map(g => <option key={g} value={g}>{g}</option>)}
                        </select>
                        <select className="w-full bg-[#110F15] p-3 rounded border border-white/10 focus:border-[#E60026] outline-none" value={animeForm.type || 'Anime'} onChange={e => setAnimeForm({...animeForm, type: e.target.value as any})}>
                            <option value="Anime">Anime</option>
                            <option value="WebSeries">Web Series</option>
                        </select>
                        <textarea placeholder="Description" className="w-full bg-[#110F15] p-3 rounded border border-white/10 focus:border-[#E60026] outline-none min-h-[100px]" value={animeForm.description || ''} onChange={e => setAnimeForm({...animeForm, description: e.target.value})} />
                        <button onClick={handleSaveAnime} className="w-full bg-[#E60026] hover:bg-[#ff1f45] py-3 rounded font-bold shadow-lg transition-all">Save Anime</button>
                    </div>
                    <div className="lg:col-span-2 flex flex-col h-full min-h-[500px]">
                        <div className="flex justify-between mb-4 bg-[#110F15] p-3 rounded-lg border border-white/5">
                            <h4 className="font-bold flex items-center gap-2"><Layers size={18}/> Episodes</h4>
                            <div className="flex gap-2 items-center">
                                <span className="text-xs text-gray-400">Batch Season:</span>
                                <input type="text" className="w-12 bg-[#1A1E2A] border border-white/10 rounded text-center text-sm py-1" value={batchSeason} onChange={e => setBatchSeason(e.target.value)} />
                                <button onClick={applyBatchSeason} className="bg-blue-600/20 text-blue-500 p-1.5 rounded hover:bg-blue-600 hover:text-white transition-colors" title="Apply to all"><Layers size={14} /></button>
                                <div className="w-[1px] h-6 bg-white/10 mx-1"></div>
                                <button onClick={addEpisode} className="bg-[#E60026] px-3 py-1.5 rounded text-sm font-bold flex items-center gap-1 hover:bg-[#ff1f45] transition-colors"><Plus size={14} /> Add Ep</button>
                            </div>
                        </div>
                        <div className="space-y-3 overflow-y-auto max-h-[600px] pr-2 custom-scrollbar">
                            {tempEpisodes.map((ep, idx) => (
                                <div key={ep.id} className="bg-[#110F15] p-3 rounded border border-white/5 flex flex-col gap-3 group hover:border-white/10 transition-colors">
                                    <div className="flex gap-2 items-center">
                                        <span className="text-gray-600 font-mono text-xs w-5">{idx+1}</span>
                                        <input type="text" placeholder="Title" className="flex-1 bg-[#1A1E2A] p-2 text-sm border border-white/10 rounded focus:border-[#E60026] outline-none" value={ep.title} onChange={e => updateEpisode(ep.id, 'title', e.target.value)} />
                                        <div className="flex items-center gap-1 bg-[#1A1E2A] border border-white/10 rounded px-2">
                                            <span className="text-[10px] text-gray-500 uppercase">Seas</span>
                                            <input type="text" className="w-6 bg-transparent text-sm text-center outline-none py-1.5" value={ep.season} onChange={e => updateEpisode(ep.id, 'season', e.target.value)} />
                                        </div>
                                        <button onClick={() => removeEpisode(ep.id)} className="text-gray-500 hover:text-red-500 p-1.5 transition-colors"><X size={16} /></button>
                                    </div>
                                    
                                    <div className="flex flex-col gap-2 pl-7">
                                        <input type="text" placeholder="Video URL (Embed/MP4)" className="w-full bg-[#1A1E2A] p-2 text-xs border border-white/10 rounded focus:border-[#E60026] outline-none font-mono text-gray-300" value={ep.videoUrl} onChange={e => updateEpisode(ep.id, 'videoUrl', e.target.value)} />
                                        
                                        <div className="flex gap-2 items-center">
                                            <div className="relative w-10 h-6 bg-black/50 rounded overflow-hidden flex-shrink-0 border border-white/10">
                                                {ep.thumbnail ? <img src={ep.thumbnail} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><ImageIcon size={10} className="text-gray-600"/></div>}
                                            </div>
                                            
                                            <label className="cursor-pointer bg-[#1A1E2A] border border-white/10 hover:bg-white/5 px-2 py-1.5 rounded flex items-center justify-center">
                                                <input type="file" className="hidden" onChange={(e) => handleImageRead(e, (val) => updateEpisode(ep.id, 'thumbnail', val))} />
                                                <Upload size={12} className="text-gray-400"/>
                                            </label>
                                            
                                            <input type="text" placeholder="Or Thumbnail URL" className="flex-1 bg-[#1A1E2A] p-1.5 text-xs border border-white/10 rounded focus:border-[#E60026] outline-none" value={ep.thumbnail} onChange={e => updateEpisode(ep.id, 'thumbnail', e.target.value)} />
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {tempEpisodes.length === 0 && (
                                <div className="text-center py-10 text-gray-600 border-2 border-dashed border-white/5 rounded-xl">
                                    <p>No episodes added yet.</p>
                                    <button onClick={addEpisode} className="text-[#E60026] text-sm mt-2 hover:underline">Add First Episode</button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
             </div>
           </div>
        </div>
      )}

      {/* BANNER MODAL */}
      {showBannerModal && (
         <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-[#1A1E2A] w-full max-w-lg rounded-2xl border border-white/10 p-6 shadow-neon-card">
               <h3 className="font-bold mb-4 text-xl">Manage Banner</h3>
               
               <div className="mb-4">
                   <div className="h-32 bg-[#110F15] rounded-lg border border-white/10 mb-2 overflow-hidden flex items-center justify-center relative">
                       {bannerForm.imageUrl ? <img src={bannerForm.imageUrl} className="w-full h-full object-cover" /> : <span className="text-gray-500 text-sm">Preview</span>}
                   </div>
                   <div className="flex gap-2">
                       <label className="flex-1 bg-[#1A1E2A] border border-white/10 p-2 rounded cursor-pointer text-sm flex items-center justify-center gap-2 hover:bg-white/5">
                           <ImageIcon size={16}/> Pick Image
                           <input type="file" className="hidden" onChange={(e) => handleImageRead(e, (val) => setBannerForm({...bannerForm, imageUrl: val}))} />
                       </label>
                       <input type="text" placeholder="Or Image URL" className="flex-[2] bg-[#110F15] p-2 text-sm rounded border border-white/10 focus:border-[#E60026] outline-none" value={bannerForm.imageUrl || ''} onChange={e => setBannerForm({...bannerForm, imageUrl: e.target.value})} />
                   </div>
               </div>

               <div className="mb-4">
                   <label className="block text-xs text-gray-400 mb-1">Link to Anime (Internal)</label>
                   <select 
                       className="w-full bg-[#110F15] p-3 rounded border border-white/10 focus:border-[#E60026] outline-none text-sm"
                       value={bannerForm.animeId || ''}
                       onChange={(e) => setBannerForm({...bannerForm, animeId: e.target.value})}
                   >
                       <option value="">-- None --</option>
                       {animeList.map(a => (
                           <option key={a.id} value={a.id}>{a.title}</option>
                       ))}
                   </select>
               </div>
               
               <div className="text-center text-xs text-gray-500 mb-2">- OR -</div>

               <input type="text" placeholder="External Link URL" className="w-full bg-[#110F15] p-3 rounded mb-6 border border-white/10 focus:border-[#E60026] outline-none" value={bannerForm.linkUrl || ''} onChange={e => setBannerForm({...bannerForm, linkUrl: e.target.value})} />
               
               <div className="flex gap-3">
                   <button onClick={() => setShowBannerModal(false)} className="flex-1 bg-gray-700 hover:bg-gray-600 py-3 rounded font-semibold transition-colors">Cancel</button>
                   <button onClick={handleSaveBanner} className="flex-1 bg-[#E60026] hover:bg-[#ff1f45] py-3 rounded font-bold shadow-lg transition-colors">Save Banner</button>
               </div>
            </div>
         </div>
      )}
    </div>
  );
};
