
import React, { useState, useEffect } from 'react';
import { 
  User, LogOut, Home, Mail, Lock, Shield, Loader2, Heart
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { BottomNav } from '../components/BottomNav';
import { getLogo } from '../services/storage';
import { auth } from '../services/firebase';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  updateProfile, 
  signOut, 
  onAuthStateChanged 
} from 'firebase/auth';

export const Profile: React.FC = () => {
  const navigate = useNavigate();
  
  const [user, setUser] = useState<{name: string, email: string} | null>(null);
  const [loading, setLoading] = useState(true);
  const [logoUrl, setLogoUrl] = useState('');
  
  // Login Form States
  const [isLoginView, setIsLoginView] = useState(true);
  const [inputName, setInputName] = useState('');
  const [inputEmail, setInputEmail] = useState('');
  const [inputPassword, setInputPassword] = useState('');
  const [error, setError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  useEffect(() => {
    const fetchLogo = async () => {
        const url = await getLogo();
        setLogoUrl(url);
    };
    fetchLogo();

    // Listen to Firebase Auth state
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
        if (currentUser && !currentUser.isAnonymous) {
            setUser({
                name: currentUser.displayName || 'User',
                email: currentUser.email || ''
            });
        } else {
            setUser(null);
        }
        setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleAuth = async () => {
    setError('');
    if (!inputEmail || !inputPassword) {
      setError('Please fill in all fields');
      return;
    }
    
    setAuthLoading(true);

    try {
        if (isLoginView) {
            // LOGIN LOGIC
            await signInWithEmailAndPassword(auth, inputEmail, inputPassword);
        } else {
            // SIGN UP LOGIC
            if (!inputName) {
                setError('Please enter your name');
                setAuthLoading(false);
                return;
            }
            const credential = await createUserWithEmailAndPassword(auth, inputEmail, inputPassword);
            await updateProfile(credential.user, { displayName: inputName });
            // Force user update in state since onAuthStateChanged might not catch the display name update immediately
            setUser({ name: inputName, email: inputEmail });
        }
    } catch (e: any) {
        console.error(e);
        let msg = "Authentication failed";
        if (e.code === 'auth/invalid-email') msg = "Invalid email address";
        if (e.code === 'auth/user-not-found') msg = "Account does not exist. Please Sign Up.";
        if (e.code === 'auth/wrong-password') msg = "Incorrect password";
        if (e.code === 'auth/invalid-credential') msg = "Invalid email or password. If you don't have an account, please Sign Up.";
        if (e.code === 'auth/email-already-in-use') msg = "Email already in use";
        if (e.code === 'auth/weak-password') msg = "Password should be at least 6 characters";
        setError(msg);
    } finally {
        setAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
        await signOut(auth);
        setUser(null);
        setIsLoginView(true);
        setInputName('');
        setInputEmail('');
        setInputPassword('');
    } catch (e) {
        console.error("Logout failed", e);
    }
  };

  if (loading) {
    return <div className="min-h-screen bg-[#0B0F19] flex items-center justify-center"><Loader2 className="animate-spin text-primary" size={40} /></div>;
  }

  // --- LOGIN / REGISTER VIEW ---
  if (!user) {
    return (
      <div className="min-h-screen bg-[#0B0F19] text-white flex flex-col items-center justify-center p-6 relative overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[300px] h-[300px] bg-red-600/20 rounded-full blur-[100px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[300px] h-[300px] bg-red-600/10 rounded-full blur-[100px]" />

        <div className="w-full max-w-sm bg-[#110F15]/80 backdrop-blur-md border border-white/10 p-8 rounded-2xl shadow-neon-card relative z-10">
          
          {/* Enter as Admin Option */}
          <button 
            onClick={() => navigate('/admin')}
            className="absolute top-4 right-4 text-[10px] text-gray-500 hover:text-[#E60026] uppercase font-bold tracking-wider transition-colors"
          >
            Enter as Admin
          </button>

          <div className="flex justify-center mb-6 mt-2">
            <img 
              src={logoUrl || "https://zippy-gold-pjtvv4rnrb-199jsywth2.edgeone.dev/31055.png"} 
              alt="Logo" 
              className="w-16 h-16 object-contain drop-shadow-[0_0_10px_rgba(230,0,38,0.5)]"
            />
          </div>

          <h2 className="text-2xl font-bold text-center mb-1">
            {isLoginView ? 'Welcome Back' : 'Create Account'}
          </h2>
          <p className="text-gray-400 text-center text-sm mb-8">
            {isLoginView ? 'Sign in to sync your history & watchlist' : 'Join AniLizer to sync your data'}
          </p>

          <div className="space-y-4">
            {!isLoginView && (
              <div className="relative group">
                <User size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#E60026] transition-colors" />
                <input 
                  type="text" 
                  placeholder="Full Name" 
                  value={inputName}
                  onChange={(e) => setInputName(e.target.value)}
                  className="w-full bg-[#1A1E2A] border border-white/10 rounded-lg py-3 pl-10 pr-4 text-sm text-white focus:border-[#E60026] focus:outline-none transition-all placeholder-gray-500"
                />
              </div>
            )}
            
            <div className="relative group">
              <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#E60026] transition-colors" />
              <input 
                type="email" 
                placeholder="Email Address" 
                value={inputEmail}
                onChange={(e) => setInputEmail(e.target.value)}
                className="w-full bg-[#1A1E2A] border border-white/10 rounded-lg py-3 pl-10 pr-4 text-sm text-white focus:border-[#E60026] focus:outline-none transition-all placeholder-gray-500"
              />
            </div>

            <div className="relative group">
              <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#E60026] transition-colors" />
              <input 
                type="password" 
                placeholder="Password" 
                value={inputPassword}
                onChange={(e) => setInputPassword(e.target.value)}
                className="w-full bg-[#1A1E2A] border border-white/10 rounded-lg py-3 pl-10 pr-4 text-sm text-white focus:border-[#E60026] focus:outline-none transition-all placeholder-gray-500"
              />
            </div>
          </div>

          {error && <p className="text-red-500 text-xs mt-3 text-center">{error}</p>}

          <button 
            onClick={handleAuth}
            disabled={authLoading}
            className="w-full mt-6 bg-[#E60026] hover:bg-[#ff1f45] text-white font-bold py-3 rounded-lg shadow-[0_0_15px_rgba(230,0,38,0.4)] transition-all transform hover:scale-[1.02] flex items-center justify-center"
          >
            {authLoading ? <Loader2 className="animate-spin" size={20} /> : (isLoginView ? 'Sign In' : 'Sign Up')}
          </button>

          <div className="mt-6 text-center text-sm text-gray-400">
            {isLoginView ? "Don't have an account? " : "Already have an account? "}
            <button 
              onClick={() => { setIsLoginView(!isLoginView); setError(''); }}
              className="text-[#E60026] font-semibold hover:underline"
            >
              {isLoginView ? 'Sign Up' : 'Sign In'}
            </button>
          </div>
        </div>

        <button 
          onClick={() => navigate('/')} 
          className="mt-8 text-gray-500 hover:text-white text-sm flex items-center gap-2 relative z-50 transition-colors"
        >
           <Home size={16} /> Back to Home
        </button>
      </div>
    );
  }

  // --- PROFILE VIEW ---
  return (
    <div className="min-h-screen bg-[#0B0F19] text-white pb-24 font-sans">
        <div className="p-6 flex items-center gap-5 pt-10">
            <div className="w-[80px] h-[80px] rounded-full bg-[#E60026] flex items-center justify-center border-[3px] border-[#0B0F19] shadow-lg overflow-hidden">
                <span className="text-3xl font-bold">{user.name.charAt(0).toUpperCase()}</span>
            </div>
            <div>
                <h2 className="text-[#E60026] text-2xl font-bold tracking-wide capitalize">{user.name}</h2>
                <p className="text-gray-300 text-sm font-medium">{user.email}</p>
            </div>
        </div>

        <div className="px-6 mt-6 space-y-4">
             <button 
              onClick={() => navigate('/favorites')}
              className="w-full bg-[#15171E] rounded-xl py-4 flex items-center justify-center gap-2 border border-white/5 cursor-pointer hover:bg-gray-800 transition-all group shadow-md"
            >
                <Heart size={20} className="text-gray-200 group-hover:text-[#E60026] transition-colors" />
                <span className="text-[15px] font-semibold text-gray-200 group-hover:text-white">My Watchlist</span>
            </button>

            {/* Admin button removed as requested */}

            <button 
              onClick={handleLogout}
              className="w-full bg-[#15171E] rounded-xl py-4 flex items-center justify-center gap-2 border border-white/5 cursor-pointer hover:bg-red-900/20 hover:border-red-500/50 transition-all group shadow-md"
            >
                <LogOut size={20} className="text-gray-200 group-hover:text-red-500 transition-colors" />
                <span className="text-[15px] font-semibold text-gray-200 group-hover:text-white">Logout</span>
            </button>
        </div>

        <BottomNav />
    </div>
  );
};
