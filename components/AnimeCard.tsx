
import React from 'react';
import { Anime } from '../types';
import { useNavigate } from 'react-router-dom';

interface AnimeCardProps {
  anime: Anime;
  className?: string;
}

const getGenreStyle = (genre: string) => {
  switch (genre?.toLowerCase()) {
    case 'action': return 'bg-[#E60026] text-white shadow-[0_0_10px_#E60026]';
    case 'adventure': return 'bg-[#10B981] text-white shadow-[0_0_10px_#10B981]'; // Green
    case 'sci-fi': return 'bg-[#06B6D4] text-white shadow-[0_0_10px_#06B6D4]'; // Cyan
    case 'fantasy': return 'bg-[#8B5CF6] text-white shadow-[0_0_10px_#8B5CF6]'; // Purple
    case 'drama': return 'bg-[#EC4899] text-white shadow-[0_0_10px_#EC4899]'; // Pink
    case 'horror': return 'bg-[#7F1D1D] text-white shadow-[0_0_10px_#7F1D1D]'; // Dark Red
    case 'romance': return 'bg-[#F43F5E] text-white shadow-[0_0_10px_#F43F5E]'; // Rose
    case 'comedy': return 'bg-[#F59E0B] text-black shadow-[0_0_10px_#F59E0B]'; // Orange
    case 'mystery': return 'bg-[#6366F1] text-white shadow-[0_0_10px_#6366F1]'; // Indigo
    case 'thriller': return 'bg-[#475569] text-white shadow-[0_0_10px_#475569]'; // Slate
    default: return 'bg-[#FFD200] text-black shadow-[0_0_10px_#FFD200]'; // Default Yellow
  }
};

export const AnimeCard: React.FC<AnimeCardProps> = ({ anime, className }) => {
  const navigate = useNavigate();
  const genreStyle = getGenreStyle(anime.genre);

  return (
    <div 
      className={`flex-shrink-0 cursor-pointer relative flex flex-col bg-[#110F15]/80 p-[10px] rounded-[12px] border border-[#E60026] shadow-[0_0_25px_rgba(230,0,38,0.6)] hover:scale-105 hover:shadow-[0_0_40px_rgba(230,0,38,0.9)] transition-all duration-250 group ${className || 'w-[140px]'}`}
      onClick={() => navigate(`/watch/${anime.id}`)}
    >
      {/* Badge with Dynamic Genre Color - Size Decreased */}
      <div className={`absolute top-[8px] left-[8px] text-[10px] font-bold px-[6px] py-[2px] rounded-[4px] z-10 ${genreStyle}`}>
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
