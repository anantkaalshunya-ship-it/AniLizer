import React from 'react';
import { Anime } from '../types';
import { useNavigate } from 'react-router-dom';

interface AnimeCardProps {
  anime: Anime;
  className?: string;
}

export const AnimeCard: React.FC<AnimeCardProps> = ({ anime, className }) => {
  const navigate = useNavigate();

  return (
    <div 
      className={`flex-shrink-0 cursor-pointer relative flex flex-col bg-[#110F15]/80 p-[10px] rounded-[12px] border border-[#E60026] shadow-[0_0_25px_rgba(230,0,38,0.6)] hover:scale-105 hover:shadow-[0_0_40px_rgba(230,0,38,0.9)] transition-all duration-250 group ${className || 'w-[140px]'}`}
      onClick={() => navigate(`/watch/${anime.id}`)}
    >
      {/* Badge */}
      <div className="absolute top-[10px] left-[10px] bg-yellow-custom text-black text-[12px] font-bold px-[8px] py-[4px] rounded-[6px] z-10">
         {anime.language || anime.genre || 'Hindi'}
      </div>

      <div className="relative w-full aspect-[2/3] rounded-[10px] overflow-hidden mb-[10px]">
        <img 
          src={anime.poster} 
          alt={anime.title} 
          className="w-full h-full object-cover"
        />
      </div>
      
      {/* Title */}
      <div className="w-full text-left">
        <h3 className="text-white font-semibold text-[14px] truncate leading-tight">
            {anime.title}
        </h3>
      </div>
    </div>
  );
};