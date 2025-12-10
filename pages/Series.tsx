import React, { useState, useEffect } from 'react';
import { getAnimeList } from '../services/storage';
import { Anime } from '../types';
import { AnimeCard } from '../components/AnimeCard';
import { Topbar } from '../components/Topbar';
import { BottomNav } from '../components/BottomNav';
import { Search, Filter, Loader2, Tv } from 'lucide-react';

export const Series: React.FC = () => {
  const [animeList, setAnimeList] = useState<Anime[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await getAnimeList();
        setAnimeList(data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const filteredList = animeList.filter(a => 
    a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    a.genre.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0B0F19] flex items-center justify-center">
         <Loader2 className="animate-spin text-[#E60026]" size={40} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0B0F19] pb-24">
      <Topbar />

      <div className="p-[15px]">
        {/* Header */}
        <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
           <Tv className="text-[#E60026]" /> All Content
        </h2>

        {/* Search Bar */}
        <div className="relative flex items-center mb-8">
             <div className="absolute left-0 top-0 bottom-0 w-[45px] flex items-center justify-center bg-[#1A1E2A] rounded-l-[10px] border-y border-l border-[#E60026] z-10">
                <Filter size={20} className="text-[#E60026]" />
             </div>

            <input 
              type="text" 
              placeholder="Search anime & series..." 
              className="w-full bg-[#12141E] border-y border-r border-[#E60026] rounded-r-[10px] rounded-l-none py-[12px] pl-[60px] pr-[50px] text-[16px] text-white focus:outline-none placeholder-gray-400 transition-shadow h-[50px]"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            
            <Search className="absolute right-4 text-[#E60026] z-10" size={22} />
        </div>
        
        {/* Grid */}
        {filteredList.length > 0 ? (
          <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-[10px]">
            {filteredList.map(anime => (
               <AnimeCard key={anime.id} anime={anime} className="w-full" />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-[40vh] text-gray-500">
             <Search size={48} className="mb-2 opacity-50" />
             <p>No results found for "{searchQuery}"</p>
          </div>
        )}
      </div>
      <BottomNav />
    </div>
  );
};