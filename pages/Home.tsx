
import React, { useState, useEffect, useRef } from 'react';
import { Topbar } from '../components/Topbar';
import { getAnimeList, getBanners } from '../services/storage';
import { Anime, Banner } from '../types';
import { AnimeCard } from '../components/AnimeCard';
import { useNavigate } from 'react-router-dom';
import { BottomNav } from '../components/BottomNav';
import { ChevronLeft, ChevronRight, Filter, Search, Loader2, X } from 'lucide-react';

const GENRES = ['Action', 'Adventure', 'Sci-Fi', 'Fantasy'];
const NEON_COLORS = ['#FF2B4F', '#00F0FF', '#00FF7F', '#FFD200', '#D946EF'];

export const Home: React.FC = () => {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [currentBanner, setCurrentBanner] = useState(0);
  const [animeList, setAnimeList] = useState<Anime[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGenre, setSelectedGenre] = useState('');
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const navigate = useNavigate();
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [fetchedBanners, fetchedAnime] = await Promise.all([
          getBanners(),
          getAnimeList()
        ]);
        setBanners(fetchedBanners);
        setAnimeList(fetchedAnime);
      } catch (e) {
        console.error("Failed to load home data", e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    if (banners.length === 0 || !isAutoPlaying) return;
    const interval = setInterval(() => {
      setCurrentBanner((prev) => (prev + 1) % banners.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [banners, isAutoPlaying]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsAutoPlaying(false);
    setCurrentBanner((prev) => (prev + 1) % banners.length);
  };

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsAutoPlaying(false);
    setCurrentBanner((prev) => (prev - 1 + banners.length) % banners.length);
  };

  // Magic Search for Admin (Optional fallback if they forget password but know this trick)
  useEffect(() => {
    if (searchQuery === 'Mr AniLizer') {
       navigate('/admin');
    }
  }, [searchQuery, navigate]);

  const filteredAnime = animeList.filter(a => {
    const matchesSearch = a.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          a.genre.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesGenre = selectedGenre ? a.genre === selectedGenre : true;
    return matchesSearch && matchesGenre;
  });

  const trendingAnime = animeList.filter(a => a.isTrending && a.type === 'Anime');
  const trendingMovies = animeList.filter(a => a.isTrending && a.type === 'Movie');
  const webSeries = animeList.filter(a => a.type === 'WebSeries');

  const isSearchActive = showDropdown || searchQuery.length > 0;

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
         <Loader2 className="animate-spin text-primary" size={40} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20 relative overflow-x-hidden">
      <Topbar />

      {isSearchActive && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-[6px] z-40 transition-opacity duration-300" />
      )}

      {/* Search Bar */}
      <div className="px-[15px] py-[12px] relative z-50" ref={searchContainerRef}>
        <div className="relative flex items-center">
             <div className="absolute left-0 top-0 bottom-0 w-[45px] flex items-center justify-center bg-[#1A1E2A] rounded-l-[10px] border-y border-l border-[#E60026] z-10">
                <Filter size={20} className="text-[#E60026]" />
             </div>

            <input 
              type="text" 
              placeholder="Search anime..." 
              className="w-full bg-[#12141E] border-y border-r border-[#E60026] rounded-r-[10px] rounded-l-none py-[12px] pl-[60px] pr-[50px] text-[16px] text-white focus:outline-none placeholder-gray-400 transition-shadow h-[50px]"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setShowDropdown(true);
              }}
              onFocus={() => setShowDropdown(true)}
            />
            
            {isSearchActive ? (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setShowDropdown(false);
                  }}
                  className="absolute right-2 p-2 text-[#E60026] hover:text-white transition-colors z-20"
                >
                  <X size={22} />
                </button>
            ) : (
                <Search className="absolute right-4 text-[#E60026] z-10" size={22} />
            )}
        </div>

        {/* Live Search Dropdown */}
        {showDropdown && searchQuery && filteredAnime.length > 0 && (
          <div className="absolute top-[calc(100%+10px)] left-[15px] right-[15px] bg-[#110F15] rounded-xl border border-white/10 shadow-2xl overflow-hidden z-50 flex flex-col gap-2 p-2 max-h-[60vh] overflow-y-auto custom-scrollbar">
            {filteredAnime.map((anime, index) => {
               const neonColor = NEON_COLORS[index % NEON_COLORS.length];
               return (
                  <div 
                    key={anime.id}
                    onClick={() => navigate(`/watch/${anime.id}`)}
                    className="flex items-center gap-4 p-2 rounded-lg bg-[#1A1E2A] border cursor-pointer transition-all hover:bg-[#2A2E3A]"
                    style={{ 
                      borderColor: neonColor,
                      boxShadow: `0 0 10px ${neonColor}40` 
                    }}
                  >
                    <img 
                      src={anime.poster} 
                      alt={anime.title} 
                      className="w-[50px] h-[70px] object-cover rounded-md flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                       <h4 className="text-white font-bold text-[16px] truncate">{anime.title}</h4>
                       <div className="flex items-center gap-2 text-xs text-gray-400 mt-1">
                          <span className="uppercase font-semibold tracking-wider text-white/70">{anime.type.toUpperCase()}</span>
                          <span>•</span>
                          <span>{anime.episodes?.length || 0} Episodes</span>
                       </div>
                    </div>
                    <ChevronRight size={18} style={{ color: neonColor }} />
                  </div>
               );
            })}
          </div>
        )}
      </div>

      {/* Banner Slider */}
      {!searchQuery && !selectedGenre && banners.length > 0 && (
        <div className="relative w-full max-w-[calc(100%-30px)] mx-auto mt-[10px] mb-[20px] group">
          <div className="relative w-full h-[220px] md:h-[350px] overflow-hidden rounded-[15px] bg-[#111] border-[2px] border-[#E60026] shadow-[0_0_15px_#E60026]">
             
             {/* Fade Transition Logic */}
             {banners.map((banner, index) => (
               <div 
                 key={banner.id}
                 className={`absolute inset-0 w-full h-full transition-opacity duration-500 ease-in-out cursor-pointer ${index === currentBanner ? 'opacity-100 z-10' : 'opacity-0 z-0'}`}
                 onClick={() => {
                     if (banner.animeId) {
                         navigate(`/watch/${banner.animeId}`);
                     } else if (banner.linkUrl && banner.linkUrl !== '#') {
                         window.open(banner.linkUrl, '_blank');
                     }
                 }}
               >
                 <img src={banner.imageUrl} alt="Banner" className="w-full h-full object-cover" />
               </div>
             ))}

             <button 
                onClick={handlePrev}
                className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-[#E60026] text-white p-2 rounded-full backdrop-blur-sm border border-white/10 transition-all z-20"
             >
               <ChevronLeft size={24} />
             </button>
             
             <button 
                onClick={handleNext}
                className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-[#E60026] text-white p-2 rounded-full backdrop-blur-sm border border-white/10 transition-all z-20"
             >
               <ChevronRight size={24} />
             </button>

              <div className="absolute bottom-[10px] w-full flex justify-center gap-[8px] z-20">
                {banners.map((_, idx) => (
                  <div 
                    key={idx} 
                    className={`w-[10px] h-[10px] rounded-full cursor-pointer transition-all ${idx === currentBanner ? 'bg-[#E60026] shadow-[0_0_8px_#E60026]' : 'bg-white/30'}`}
                    onClick={() => { setIsAutoPlaying(false); setCurrentBanner(idx); }}
                  />
                ))}
              </div>
          </div>
        </div>
      )}

      {/* Genre Filters */}
      <div className="flex gap-3 px-[15px] overflow-x-auto no-scrollbar mb-4 relative z-0">
        <button
          onClick={() => setSelectedGenre('')}
          className={`flex-shrink-0 px-5 py-2 rounded-full border text-sm font-bold transition-all duration-300 ${!selectedGenre ? 'bg-[#E60026] border-[#E60026] text-white shadow-[0_0_10px_rgba(230,0,38,0.5)]' : 'bg-[#1A1E2A] border-white/10 text-gray-400 hover:text-white hover:border-white/30'}`}
        >
          All
        </button>
        {GENRES.map(genre => (
          <button
            key={genre}
            onClick={() => setSelectedGenre(genre === selectedGenre ? '' : genre)}
            className={`flex-shrink-0 px-5 py-2 rounded-full border text-sm font-bold transition-all duration-300 ${selectedGenre === genre ? 'bg-[#E60026] border-[#E60026] text-white shadow-[0_0_10px_rgba(230,0,38,0.5)]' : 'bg-[#1A1E2A] border-white/10 text-gray-400 hover:text-white hover:border-white/30'}`}
          >
            {genre}
          </button>
        ))}
      </div>

      <div className="space-y-4 relative z-0">
        {/* Trending Anime */}
        {(trendingAnime.length > 0) && (
          <div>
             <h2 className="text-[22px] font-bold text-white mx-[15px] mt-[10px] mb-[10px] relative pl-[10px]">
                <span className="absolute left-[-10px] top-[2px] w-[5px] h-[22px] bg-red-custom rounded-[3px]"></span>
                Trending Anime
             </h2>
             <div className="flex gap-[15px] overflow-x-auto no-scrollbar px-[15px] pb-[15px]">
               {trendingAnime.map(anime => (
                 <AnimeCard key={anime.id} anime={anime} />
               ))}
             </div>
          </div>
        )}

        {/* Trending Movies (NEW SECTION) */}
        {(trendingMovies.length > 0) && (
          <div>
             <h2 className="text-[22px] font-bold text-white mx-[15px] mt-[10px] mb-[10px] relative pl-[10px]">
                <span className="absolute left-[-10px] top-[2px] w-[5px] h-[22px] bg-red-custom rounded-[3px]"></span>
                Top Trending Movies
             </h2>
             <div className="flex gap-[15px] overflow-x-auto no-scrollbar px-[15px] pb-[15px]">
               {trendingMovies.map(anime => (
                 <AnimeCard key={anime.id} anime={anime} />
               ))}
             </div>
          </div>
        )}

        {/* Web Series */}
        {(webSeries.length > 0) && (
          <div id="series-section">
             <h2 className="text-[22px] font-bold text-white mx-[15px] mt-[10px] mb-[10px] relative pl-[10px]">
                <span className="absolute left-[-10px] top-[2px] w-[5px] h-[22px] bg-red-custom rounded-[3px]"></span>
                Most Popular WebSeries
             </h2>
             <div className="flex gap-[15px] overflow-x-auto no-scrollbar px-[15px] pb-[15px]">
               {webSeries.map(anime => (
                 <AnimeCard key={anime.id} anime={anime} />
               ))}
             </div>
          </div>
        )}

        {/* Search/Filter Results */}
        {(selectedGenre) && (
           <div className="px-[15px]">
            <h2 className="text-[22px] font-bold text-white mb-[10px] relative pl-[10px]">
                <span className="absolute left-[-10px] top-[2px] w-[5px] h-[22px] bg-red-custom rounded-[3px]"></span>
                {`${selectedGenre} Anime`}
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-[15px]">
              {filteredAnime.map(anime => (
                <AnimeCard key={anime.id} anime={anime} />
              ))}
            </div>
            {filteredAnime.length === 0 && (
              <div className="text-center text-gray-500 mt-10">No results found.</div>
            )}
           </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
};
