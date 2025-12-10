
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getAnimeById, addToHistory } from '../services/storage';
import { Anime, Episode } from '../types';
import { ArrowLeft, Loader2, Maximize } from 'lucide-react';

export const Player: React.FC = () => {
  const { animeId, episodeId } = useParams<{ animeId: string; episodeId: string }>();
  const navigate = useNavigate();
  const [anime, setAnime] = useState<Anime | null>(null);
  const [episode, setEpisode] = useState<Episode | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRotated, setIsRotated] = useState(false);

  useEffect(() => {
    const fetchDetails = async () => {
      if (animeId) {
        try {
          const data = await getAnimeById(animeId);
          if (data) {
            setAnime(data);
            const ep = data.episodes?.find(e => e.id === episodeId);
            if (ep) {
              setEpisode(ep);
              // Add to history
              const index = data.episodes.findIndex(e => e.id === episodeId);
              addToHistory(data, ep, index);
            }
          }
        } catch (e) {
          console.error("Failed to load player data", e);
        }
      }
      setLoading(false);
    };
    fetchDetails();
  }, [animeId, episodeId]);

  const handleEnterFullscreen = async () => {
    // 1. Rotate the UI via CSS state
    setIsRotated(true);

    // 2. Signal Android System to enter Immersive Mode (Hides Battery/Status Bar)
    try {
      if (document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen();
      } else if ((document.documentElement as any).webkitRequestFullscreen) {
        await (document.documentElement as any).webkitRequestFullscreen(); // Safari/Older Chrome
      } else if ((document.documentElement as any).msRequestFullscreen) {
        await (document.documentElement as any).msRequestFullscreen(); // IE/Edge
      }
    } catch (e) {
      console.warn("Fullscreen request denied or not supported:", e);
    }
  };

  const handleExit = async () => {
    // Exit system fullscreen if active
    if (document.fullscreenElement) {
        try {
            if (document.exitFullscreen) {
                await document.exitFullscreen();
            } else if ((document as any).webkitExitFullscreen) {
                await (document as any).webkitExitFullscreen();
            }
        } catch (e) { console.warn(e); }
    }
    navigate(-1);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
         <Loader2 className="animate-spin text-[#E60026]" size={40} />
      </div>
    );
  }

  if (!anime || !episode) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center gap-4">
        <p>Episode not found.</p>
        <button 
          onClick={() => navigate(-1)} 
          className="px-4 py-2 bg-[#E60026] rounded-lg font-bold"
        >
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div 
      className="bg-black overflow-hidden relative flex flex-col transition-all duration-500 ease-in-out"
      style={isRotated ? {
        position: 'fixed',
        top: '50%',
        left: '50%',
        width: '100dvh', // Use dynamic viewport height for better mobile support
        height: '100dvw',
        transform: 'translate(-50%, -50%) rotate(90deg)',
        zIndex: 9999,
        touchAction: 'none'
      } : {
        width: '100vw',
        height: '100vh',
        position: 'relative'
      }}
    >
       {/* Back Button */}
       <div className="absolute top-4 left-4 z-50">
          <button 
            onClick={handleExit}
            className="bg-black/50 text-white p-3 rounded-full backdrop-blur-md active:bg-[#E60026] md:hover:bg-[#E60026] transition-colors border border-white/10 group shadow-[0_0_15px_rgba(0,0,0,0.5)]"
          >
            <ArrowLeft size={24} className="group-hover:-translate-x-1 transition-transform" />
          </button>
       </div>

       {/* Custom Fullscreen/Rotate Button - Hides when rotated */}
       {!isRotated && (
         <div className="absolute top-4 right-4 z-50">
            <button 
              onClick={handleEnterFullscreen}
              className="flex items-center gap-2 bg-black/50 text-white px-4 py-3 rounded-full backdrop-blur-md active:bg-[#E60026] md:hover:bg-[#E60026] transition-colors border border-white/10 shadow-[0_0_15px_rgba(0,0,0,0.5)]"
            >
               <span className="text-xs font-bold uppercase tracking-wider">Click here to fullscreen</span>
               <Maximize size={20} />
            </button>
         </div>
       )}
       
       {/* Iframe Container */}
       <div className="w-full h-full flex-1 bg-black">
         <iframe 
            src={episode.videoUrl}
            title={episode.title}
            frameBorder="0"
            referrerPolicy="no-referrer"
            // Sandbox prevents redirects/popups. 
            // We include 'allow-scripts' so video works.
            // We OMIT 'allow-top-navigation' and 'allow-popups' to block redirects.
            sandbox="allow-forms allow-scripts allow-same-origin allow-presentation"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            className="w-full h-full border-none"
         />
       </div>
    </div>
  );
};
