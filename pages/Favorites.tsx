
import React, { useState, useEffect } from 'react';
import { getFavorites } from '../services/storage';
import { Anime } from '../types';
import { AnimeCard } from '../components/AnimeCard';
import { Topbar } from '../components/Topbar';
import { BottomNav } from '../components/BottomNav';
import { Heart } from 'lucide-react';

export const Favorites: React.FC = () => {
  const [favorites, setFavorites] = useState<Anime[]>([]);

  useEffect(() => {
    const fetchFavs = async () => {
        const data = await getFavorites();
        setFavorites(data);
    };
    fetchFavs();
  }, []);

  return (
    <div className="min-h-screen bg-[#0B0F19] pb-24">
      <Topbar />
      <div className="p-4">
        <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
           <Heart className="text-[#E60026] fill-[#E60026]" /> My Watchlist
        </h2>
        
        {favorites.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-[15px]">
            {favorites.map(anime => (
               <AnimeCard key={anime.id} anime={anime} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-[50vh] text-gray-500">
             <Heart size={48} className="mb-2 opacity-50" />
             <p>No favorites added yet.</p>
          </div>
        )}
      </div>
      <BottomNav />
    </div>
  );
};
