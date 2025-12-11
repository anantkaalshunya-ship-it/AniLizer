
import React, { useState, useEffect } from 'react';
import { 
  User, LogOut, Home, Mail, Lock, Loader2, Heart, History
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { BottomNav } from '../components/BottomNav';
import { getLogo, checkIsAdmin } from '../services/storage';
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
  const [isAdmin, setIsAdmin] = useState(false);
  
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
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
        if (currentUser && !currentUser.isAnonymous) {
            setUser({
                name: currentUser.displayName || 'User',
                email: currentUser.email || ''
            });
            // Check Admin Status
            const adminStatus = await checkIsAdmin(currentUser);
            setIsAdmin(adminStatus);
        } else {
            setUser(null);
            setIsAdmin(false);
        }
        setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setError('');

    try {
        if (isLoginView) {
            await signInWithEmailAndPassword(auth, inputEmail, inputPassword);
        } else {
            if (!inputName) throw new Error("Name is required");
            const cred = await createUserWithEmailAndPassword(auth, inputEmail, inputPassword);
            
            // Critical: Update profile AND force reload so the name is available immediately
            await updateProfile(cred.user, { displayName: inputName });
            await cred.user.reload();
            
            // Manually set state to ensure immediate UI feedback
            setUser({
                name: inputName,
                email: cred.user.email || ''
            });
        }
    } catch (err: any) {
        console.error(err);
        let msg = "Authentication failed";
        const errCode = err.code;
        const errMsg = err.message || '';

        // Specific error codes
        if (errCode === 'auth/invalid-email') {
            msg = "Invalid email address";
        } else if (errCode === 'auth/user-not-found') {
            msg = "Account does not exist. Please Sign Up.";
        } else if (errCode === 'auth/wrong-password') {
            msg = "Incorrect password";
        } else if (errCode === 'auth/invalid-credential' || errMsg.includes('invalid-credential')) {
            msg = "Incorrect Email or Password";
        } else if (errCode === 'auth/email-already-in-use') {
            msg = "Email already in use";
        } else if (errCode === 'auth/weak-password') {
            msg = "Password should be at least 6 characters";
        } else if (errMsg) {
            // Fallback: clean up the raw firebase message
            msg = errMsg.replace('Firebase: ', '').replace('Error ', '').replace(/\(auth\/.*\)\.?/, '').trim();
        }
        
        setError(msg || "Authentication failed");
    } finally {
        setAuthLoading(false);
    }
  };

  const handleLogout = async () => {
      await signOut(auth);
      navigate('/');
  };

  if (loading) {
      return (
          <div className="min-h-screen bg-[#0B0F19] flex items-center justify-center">
              <Loader2 className="animate-spin text-[#E60026]" size={40} />
          </div>
      );
  }

  // If Logged In
  if (user) {
    return (
      <div className="min-h-screen bg-[#0B0F19] pb-24 font-sans text-white pt-12 px-4">
        <div className="flex flex-col items-center mb-8">
             <div className="w-[100px] h-[100px] rounded-full border-[3px] border-[#E60026] bg-[#1A1E2A] flex items-center justify-center shadow-[0_0_15px_#E60026] overflow-hidden mb-4 relative">
                  <span className="text-4xl font-bold text-white">{user.name?.charAt(0)?.toUpperCase() || 'U'}</span>
             </div>
             
             <h2 className="text-2xl font-bold text-white drop-shadow-[0_0_5px_rgba(255,255,255,0.5)]">{user.name}</h2>
             <p className="text-gray-400 text-sm">{user.email}</p>
        </div>

        <div className="max-w-md mx-auto space-y-4">
             <button onClick={() => navigate('/history')} className="w-full bg-[#1A1E2A] p-4 rounded-xl border border-white/5 flex items-center gap-4 hover:border-[#E60026] transition-all group">
                 <div className="p-2 bg-[#E60026]/10 rounded-lg group-hover:bg-[#E60026]/20 transition-colors">
                     <History className="text-[#E60026]" size={24} />
                 </div>
                 <span className="font-semibold text-lg">Watch History</span>
             </button>

             <button onClick={() => navigate('/favorites')} className="w-full bg-[#1A1E2A] p-4 rounded-xl border border-white/5 flex items-center gap-4 hover:border-[#E60026] transition-all group">
                 <div className="p-2 bg-[#E60026]/10 rounded-lg group-hover:bg-[#E60026]/20 transition-colors">
                     <Heart className="text-[#E60026]" size={24} />
                 </div>
                 <span className="font-semibold text-lg">My Watchlist</span>
             </button>

             <button onClick={handleLogout} className="w-full bg-red-900/20 p-4 rounded-xl border border-red-500/20 flex items-center gap-4 hover:bg-red-900/40 transition-all text-red-500 mt-8">
                 <LogOut size={24} />
                 <span className="font-semibold text-lg">Logout</span>
             </button>
             
             {/* Admin Entry Point (Only visible to verified admins) */}
             {isAdmin && (
                 <div className="flex justify-center mt-6">
                     <button onClick={() => navigate('/admin')} className="text-[10px] text-gray-700 hover:text-gray-500">
                         Admin Access
                     </button>
                 </div>
             )}
        </div>
        
        <BottomNav />
      </div>
    );
  }

  // Login / Signup View
  return (
    <div className="min-h-screen bg-[#0B0F19] flex flex-col items-center justify-start p-6 pb-24 relative overflow-hidden pt-8">
        {/* Background Elements */}
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-[#E60026]/10 rounded-full blur-[100px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-[#00F0FF]/10 rounded-full blur-[100px]" />

        <div className="w-full max-w-sm relative z-10">
            <div className="flex justify-center mb-6">
                <img src={logoUrl || "https://zippy-gold-pjtvv4rnrb-199jsywth2.edgeone.dev/31055.png"} alt="Logo" className="w-[80px] h-[80px] object-contain drop-shadow-[0_0_15px_#E60026]" />
            </div>

            <div className="bg-[#110F15]/80 backdrop-blur-xl border border-white/10 p-8 rounded-3xl shadow-neon-card relative">
                 <div className="absolute top-4 right-4">
                     <button onClick={() => navigate('/admin')} className="text-[10px] text-gray-500 hover:text-[#E60026] transition-colors">Enter as Admin</button>
                 </div>

                 <h2 className="text-3xl font-bold text-white mb-2 text-center">{isLoginView ? 'Welcome Back' : 'Join AniLizer'}</h2>
                 <p className="text-gray-400 text-center mb-8 text-sm">{isLoginView ? 'Login to sync your history & favorites' : 'Create an account to unlock full features'}</p>

                 <form onSubmit={handleAuth} className="space-y-5">
                      {!isLoginView && (
                          <div className="relative group">
                              <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-[#E60026] transition-colors" size={20} />
                              <input 
                                type="text" 
                                placeholder="Username" 
                                className="w-full bg-[#1A1E2A] border border-white/10 rounded-xl py-3.5 pl-12 pr-4 text-white outline-none focus:border-[#E60026] transition-all"
                                value={inputName}
                                onChange={e => setInputName(e.target.value)}
                              />
                          </div>
                      )}

                      <div className="relative group">
                          <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-[#E60026] transition-colors" size={20} />
                          <input 
                            type="email" 
                            placeholder="Email Address" 
                            className="w-full bg-[#1A1E2A] border border-white/10 rounded-xl py-3.5 pl-12 pr-4 text-white outline-none focus:border-[#E60026] transition-all"
                            value={inputEmail}
                            onChange={e => setInputEmail(e.target.value)}
                          />
                      </div>

                      <div className="relative group">
                          <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-[#E60026] transition-colors" size={20} />
                          <input 
                            type="password" 
                            placeholder="Password" 
                            className="w-full bg-[#1A1E2A] border border-white/10 rounded-xl py-3.5 pl-12 pr-4 text-white outline-none focus:border-[#E60026] transition-all"
                            value={inputPassword}
                            onChange={e => setInputPassword(e.target.value)}
                          />
                      </div>

                      {error && (
                          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-red-500 text-xs text-center">
                              {error}
                          </div>
                      )}

                      <button 
                        type="submit" 
                        disabled={authLoading}
                        className="w-full bg-[#E60026] hover:bg-[#ff1f45] text-white font-bold py-3.5 rounded-xl shadow-[0_0_15px_rgba(230,0,38,0.4)] hover:shadow-[0_0_25px_rgba(230,0,38,0.6)] transition-all flex items-center justify-center gap-2"
                      >
                          {authLoading ? <Loader2 className="animate-spin" /> : (isLoginView ? 'Sign In' : 'Create Account')}
                      </button>
                 </form>

                 <div className="mt-6 text-center">
                     <p className="text-gray-400 text-sm">
                         {isLoginView ? "Don't have an account?" : "Already have an account?"}
                         <button 
                           onClick={() => { setIsLoginView(!isLoginView); setError(''); }}
                           className="text-[#E60026] font-bold ml-2 hover:underline"
                         >
                             {isLoginView ? 'Sign Up' : 'Login'}
                         </button>
                     </p>
                 </div>
            </div>
            
            <button onClick={() => navigate('/')} className="w-full mt-6 text-gray-500 hover:text-white flex items-center justify-center gap-2 transition-colors">
                <Home size={18} /> Continue as Guest
            </button>
        </div>
        
        <BottomNav />
    </div>
  );
};
