import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getAnimeById, toggleFavorite, isFavorite, addComment, subscribeToComments } from '../services/storage';
import { Anime, Episode, Comment } from '../types';
import { Topbar } from '../components/Topbar';
import { Play, ArrowLeft, Loader2, Heart, SkipForward, Send, MessageSquare, X, Share2, Copy, Check, ChevronDown } from 'lucide-react';
import { auth } from '../services/firebase';
import { onAuthStateChanged } from 'firebase/auth';

export const Watch: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [anime, setAnime] = useState<Anime | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFavorited, setIsFavorited] = useState(false);
  
  // Comments State
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [userName, setUserName] = useState('');
  const [showComments, setShowComments] = useState(false);

  // Share State
  const [showShareModal, setShowShareModal] = useState(false);
  const [copied, setCopied] = useState(false);

  // Season Logic
  const [selectedSeason, setSelectedSeason] = useState<string>('1');
  const [isSeasonOpen, setIsSeasonOpen] = useState(false); // New state for custom dropdown
  
  // Interaction State
  const [selectedEpisodeId, setSelectedEpisodeId] = useState<string | null>(null);

  // Monitor Auth State for Comments
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
        if (user && !user.isAnonymous) {
            setUserName(user.displayName || 'User');
        } else {
            // Fallback to local session if available or default to Guest
            const session = localStorage.getItem('anilizer_active_session');
            if (session) {
                try {
                   setUserName(JSON.parse(session).name); 
                } catch(e) { setUserName('Guest'); }
            } else {
                setUserName('Guest');
            }
        }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    const fetchAnime = async () => {
        if (id) {
            try {
                const data = await getAnimeById(id);
                if (data) {
                    setAnime(data);
                    
                    // Check favorites async
                    const favStatus = await isFavorite(id);
                    setIsFavorited(favStatus);

                    const episodes = data.episodes || [];
                    const seasons = Array.from(new Set(episodes.map(ep => ep.season || '1'))).sort();
                    if (seasons.length > 0) setSelectedSeason(seasons[0]);
                    
                    // Subscribe to comments
                    unsubscribe = subscribeToComments(id, setComments);
                }
            } catch (e) {
                console.error("Error fetching anime", e);
            }
        }
        setLoading(false);
    };
    fetchAnime();

    return () => {
        if (unsubscribe) unsubscribe();
    };
  }, [id]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const closeDropdown = () => setIsSeasonOpen(false);
    if (isSeasonOpen) {
        window.addEventListener('click', closeDropdown);
    }
    return () => window.removeEventListener('click', closeDropdown);
  }, [isSeasonOpen]);

  const handlePlay = (episode: Episode) => {
    setSelectedEpisodeId(episode.id);
    if (anime) {
      navigate(`/player/${anime.id}/${episode.id}`);
    }
  };

  const handleToggleFavorite = async () => {
    if (anime) {
       // Toggle returns promise now
       const newState = await toggleFavorite(anime);
       setIsFavorited(newState);
    }
  };

  const handlePostComment = async () => {
    if (!newComment.trim() || !id) return;
    // Double check name before posting
    const name = userName || (auth.currentUser?.displayName) || 'Guest'; 
    await addComment(id, name, newComment);
    setNewComment('');
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareTo = (platform: string) => {
    const text = `Check out ${anime?.title || 'this anime'} on AniLizer!`;
    const url = encodeURIComponent(window.location.href);
    const msg = encodeURIComponent(text);
    
    let targetUrl = '';
    if (platform === 'whatsapp') targetUrl = `https://wa.me/?text=${msg} ${url}`;
    if (platform === 'telegram') targetUrl = `https://t.me/share/url?url=${url}&text=${msg}`;
    if (platform === 'twitter') targetUrl = `https://twitter.com/intent/tweet?text=${msg}&url=${url}`;
    
    if (targetUrl) window.open(targetUrl, '_blank');
  };

  if (loading) return <div className="min-h-screen bg-[#08070D] flex items-center justify-center text-white"><Loader2 className="animate-spin text-primary" size={40} /></div>;
  if (!anime) return <div className="min-h-screen bg-background flex flex-col items-center justify-center text-white">Anime Not Found <button onClick={() => navigate('/')}>Home</button></div>;

  const safeEpisodes = anime.episodes || [];
  const uniqueSeasons = Array.from(new Set(safeEpisodes.map(ep => ep.season || '1'))).sort();
  const filteredEpisodes = safeEpisodes.filter(ep => (ep.season || '1') === selectedSeason);

  return (
    <div className="min-h-screen bg-[#08070D] font-sans pb-10">
      <Topbar />

      <div className="max-w-[1100px] mx-auto mt-0 mb-[18px] px-[14px] py-[2px]">
        {/* Navigation Row */}
        <div className="flex items-center justify-between my-2">
            <button onClick={() => navigate('/')} className="flex items-center gap-2 text-gray-400 hover:text-[#E60026] group transition-colors">
               <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" /> Back to Home
            </button>
            
            <div className="flex gap-3">
                <button 
                    onClick={() => setShowShareModal(true)}
                    className="p-2 bg-black/40 rounded-full hover:bg-white/10 transition-colors border border-white/10 shadow-[0_0_10px_rgba(230,0,38,0.4)]"
                >
                     <Share2 size={24} className="text-[#E60026]" />
                </button>
                <button 
                    onClick={() => setShowComments(true)}
                    className="p-2 bg-black/40 rounded-full hover:bg-white/10 transition-colors border border-white/10 shadow-[0_0_10px_rgba(230,0,38,0.4)]"
                >
                     <MessageSquare size={24} className="text-[#E60026]" />
                </button>
                <button 
                    onClick={handleToggleFavorite}
                    className="p-2 bg-black/40 rounded-full hover:bg-white/10 transition-colors border border-white/10 shadow-[0_0_10px_rgba(230,0,38,0.4)]"
                >
                     <Heart size={24} className={isFavorited ? "fill-[#E60026] text-[#E60026]" : "text-white"} />
                </button>
            </div>
        </div>

        {/* INFO CARD */}
        <div className="flex flex-col md:flex-row gap-[22px] items-start bg-red-600/5 border border-[rgba(255,0,50,0.18)] p-[22px] rounded-[18px] backdrop-blur-[8px] shadow-[0_0_15px_rgba(255,0,50,0.2)] relative">
          <div className="w-full md:w-[260px] rounded-[12px] overflow-hidden flex-shrink-0 border-[3px] border-[#E60026] shadow-[0_0_20px_#E60026]">
            <img src={anime.poster} alt={anime.title} className="w-full aspect-[3/4] object-cover" />
          </div>

          <div className="flex-1">
            <h1 className="text-[26px] font-bold text-white drop-shadow-[0_0_6px_#FF2B4F]">{anime.title}</h1>
            <div className="mt-[8px] text-[14px] text-[#C9AEB6]">{anime.year} • {anime.genre} • {anime.status}</div>
            
            <div className="mt-[16px]">
               {filteredEpisodes.length > 0 ? (
                 <button onClick={() => handlePlay(filteredEpisodes[0])} className="bg-[#E60026] px-[22px] py-[12px] rounded-[12px] text-white font-bold text-[18px] shadow-[0_0_15px_#E60026] hover:scale-105 transition-transform">▶ Watch Now</button>
               ) : (
                 <button disabled className="bg-gray-800 px-[22px] py-[12px] rounded-[12px] text-gray-500 font-bold cursor-not-allowed">No Episodes</button>
               )}
            </div>
            <div className="mt-[16px] bg-[rgba(0,240,255,0.05)] border border-[#00F0FF] p-[14px] rounded-[12px] leading-[1.52] shadow-[0_0_15px_rgba(0,240,255,0.4)] text-white">{anime.description}</div>
          </div>
        </div>

        {/* SEASONS & EPISODES (HIDDEN FOR MOVIES) */}
        {anime.type !== 'Movie' && (
          <>
            <div className="mt-[24px] mb-[16px] flex items-center justify-between z-30 relative">
                <h2 className="text-[28px] font-bold text-white drop-shadow-[0_0_10px_rgba(230,0,38,0.8)]">
                    Episodes
                </h2>

                {/* Custom Neon Season Dropdown */}
                {uniqueSeasons.length > 0 && (
                    <div className="relative">
                        <button 
                            onClick={(e) => { e.stopPropagation(); setIsSeasonOpen(!isSeasonOpen); }}
                            className={`flex items-center gap-2 bg-[#110F15] text-white py-2 pl-5 pr-4 rounded-full border-[2px] border-[#E60026] shadow-[0_0_15px_rgba(230,0,38,0.5)] transition-all duration-300 hover:shadow-[0_0_25px_rgba(230,0,38,0.8)] ${isSeasonOpen ? 'bg-[#E60026]/10' : ''}`}
                        >
                            <span className="font-bold text-sm tracking-wide">Season {selectedSeason}</span>
                            <ChevronDown size={18} className={`text-[#E60026] transition-transform duration-300 ${isSeasonOpen ? 'rotate-180' : ''}`} />
                        </button>

                        {/* Dropdown Popup */}
                        {isSeasonOpen && (
                            <div className="absolute right-0 top-[120%] w-[180px] bg-[#110F15]/95 backdrop-blur-xl border border-[#E60026] rounded-xl overflow-hidden shadow-[0_0_30px_rgba(230,0,38,0.4)] z-50 flex flex-col p-1.5 animate-in fade-in zoom-in-95 duration-200">
                                {uniqueSeasons.map(s => (
                                    <button
                                        key={s}
                                        onClick={() => setSelectedSeason(s)}
                                        className={`text-left px-4 py-3 rounded-lg text-sm font-bold transition-all flex items-center justify-between mb-0.5 last:mb-0 ${
                                            selectedSeason === s
                                            ? 'bg-[#E60026] text-white shadow-[0_0_15px_#E60026]'
                                            : 'text-gray-300 hover:bg-[#E60026]/10 hover:text-[#E60026] hover:shadow-[inset_0_0_10px_rgba(230,0,38,0.2)]'
                                        }`}
                                    >
                                        Season {s}
                                        {selectedSeason === s && <div className="w-2 h-2 rounded-full bg-white shadow-[0_0_5px_white]" />}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>

            <div className="flex flex-col gap-3">
              {filteredEpisodes.length > 0 ? (
                filteredEpisodes.map((ep, idx) => {
                  const isSelected = selectedEpisodeId === ep.id;
                  const displayName = ep.number ? `Ep ${ep.number}: ${ep.title}` : ep.title;
                  return (
                      <div 
                        key={ep.id} 
                        tabIndex={0}
                        onClick={() => handlePlay(ep)} 
                        className={`flex items-center gap-3 bg-[#110F15] p-2 rounded-[12px] border transition-all duration-300 cursor-pointer group outline-none ${
                            isSelected 
                            ? "border-[#00FF7F] shadow-[0_0_15px_rgba(0,255,127,0.9)] bg-[#161b22]" 
                            : "border-[#00FF7F] shadow-none hover:shadow-[0_0_12px_rgba(0,255,127,1)] hover:bg-[#161b22] focus:shadow-[0_0_12px_rgba(0,255,127,1)] focus:bg-[#161b22] active:shadow-[0_0_8px_rgba(0,255,127,1)] active:scale-[0.98]"
                        }`}
                      >
                        {/* Thumbnail with Red Play Overlay */}
                        <div className="relative w-[100px] h-[60px] flex-shrink-0 rounded-[8px] overflow-hidden">
                            <img src={ep.thumbnail || anime.poster} className="w-full h-full object-cover" alt={ep.title} />
                            <div className="absolute inset-0 flex items-center justify-center transition-colors">
                                 <Play size={24} className="text-[#E60026] fill-[#E60026] drop-shadow-[0_0_5px_rgba(0,0,0,0.8)]" />
                            </div>
                        </div>

                        {/* Text Info */}
                        <div className="flex-1">
                             <h4 className="font-bold text-white text-[14px] leading-tight mb-0.5">{displayName}</h4>
                             <p className="text-xs text-gray-400">Season {ep.season || '1'}</p>
                        </div>
                      </div>
                  );
                })
              ) : (
                <div className="flex flex-col items-center justify-center py-12 border border-dashed border-white/10 rounded-2xl bg-white/5">
                    <p className="text-gray-500 font-medium">No episodes available for Season {selectedSeason}</p>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* SHARE MODAL */}
      {showShareModal && (
        <div className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setShowShareModal(false)}>
            <div className="bg-[#110F15] w-full max-w-sm rounded-2xl border border-[#E60026] shadow-[0_0_20px_rgba(230,0,38,0.3)] p-6 relative" onClick={e => e.stopPropagation()}>
                <button onClick={() => setShowShareModal(false)} className="absolute top-4 right-4 bg-white/10 p-1.5 rounded-full hover:bg-white/20"><X size={18} /></button>
                
                <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                    <Share2 className="text-[#E60026]" /> Share to
                </h3>
                
                <div className="grid grid-cols-3 gap-4 mb-6">
                    <button onClick={() => shareTo('whatsapp')} className="flex flex-col items-center gap-2 p-3 bg-[#1A1E2A] rounded-xl hover:bg-[#25D366]/20 border border-white/5 hover:border-[#25D366] transition-all group">
                        <div className="w-10 h-10 rounded-full bg-[#25D366]/20 flex items-center justify-center text-[#25D366] group-hover:scale-110 transition-transform">
                            <MessageSquare size={20} />
                        </div>
                        <span className="text-xs text-gray-300">WhatsApp</span>
                    </button>
                     <button onClick={() => shareTo('telegram')} className="flex flex-col items-center gap-2 p-3 bg-[#1A1E2A] rounded-xl hover:bg-[#0088cc]/20 border border-white/5 hover:border-[#0088cc] transition-all group">
                        <div className="w-10 h-10 rounded-full bg-[#0088cc]/20 flex items-center justify-center text-[#0088cc] group-hover:scale-110 transition-transform">
                            <Send size={20} />
                        </div>
                        <span className="text-xs text-gray-300">Telegram</span>
                    </button>
                     <button onClick={() => shareTo('twitter')} className="flex flex-col items-center gap-2 p-3 bg-[#1A1E2A] rounded-xl hover:bg-[#1DA1F2]/20 border border-white/5 hover:border-[#1DA1F2] transition-all group">
                        <div className="w-10 h-10 rounded-full bg-[#1DA1F2]/20 flex items-center justify-center text-[#1DA1F2] group-hover:scale-110 transition-transform">
                            <Share2 size={20} />
                        </div>
                        <span className="text-xs text-gray-300">Twitter</span>
                    </button>
                </div>

                <div className="bg-[#1A1E2A] p-3 rounded-xl border border-white/10 flex items-center gap-3">
                    <div className="flex-1 bg-black/30 p-2 rounded text-xs text-gray-400 truncate font-mono">
                        {window.location.href}
                    </div>
                    <button onClick={copyToClipboard} className={`p-2 rounded-lg transition-colors ${copied ? 'bg-green-500 text-white' : 'bg-white/10 text-white hover:bg-white/20'}`}>
                        {copied ? <Check size={18} /> : <Copy size={18} />}
                    </button>
                </div>
            </div>
        </div>
      )}

      {/* COMMENTS POPUP */}
      {showComments && (
        <div className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setShowComments(false)}>
            <div className="bg-[#110F15] w-full max-w-lg h-[80vh] rounded-2xl border border-[#E60026] shadow-[0_0_20px_rgba(230,0,38,0.3)] flex flex-col relative overflow-hidden" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="p-4 border-b border-white/10 flex justify-between items-center bg-[#1A1E2A]">
                    <h3 className="font-bold text-white flex items-center gap-2">
                        <MessageSquare size={20} className="text-[#E60026]"/> Comments
                    </h3>
                    <button onClick={() => setShowComments(false)} className="bg-white/10 p-1.5 rounded-full hover:bg-white/20 transition-colors">
                        <X size={20} className="text-white"/>
                    </button>
                </div>

                {/* Comments List */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                    {comments.length > 0 ? comments.map(c => (
                         <div key={c.id} className="bg-[#1A1E2A]/50 p-3 rounded-lg border border-white/5">
                            <div className="flex justify-between items-center mb-1">
                               <span className="font-bold text-[#E60026] text-sm">{c.userName}</span>
                               <span className="text-xs text-gray-500">{new Date(c.timestamp).toLocaleDateString()}</span>
                            </div>
                            <p className="text-sm text-gray-300">{c.text}</p>
                         </div>
                    )) : <div className="text-center text-gray-500 mt-10">No comments yet. Be the first!</div>}
                </div>

                {/* Input Area */}
                <div className="p-4 border-t border-white/10 bg-[#1A1E2A]">
                     <div className="flex gap-2">
                         <input 
                           type="text" placeholder="Add a comment..." 
                           className="flex-1 bg-[#110F15] rounded-lg px-4 py-3 text-white border border-white/5 focus:border-[#E60026] outline-none transition-colors"
                           value={newComment} onChange={e => setNewComment(e.target.value)}
                           onKeyDown={e => e.key === 'Enter' && handlePostComment()}
                         />
                         <button onClick={handlePostComment} className="bg-[#E60026] text-white px-4 rounded-lg font-bold hover:bg-[#ff1f45] transition-colors">
                             <Send size={18} />
                         </button>
                     </div>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};