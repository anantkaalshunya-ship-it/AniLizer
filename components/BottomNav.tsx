
import React from 'react';
import { Home, Tv, History, Menu, Heart } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';

export const BottomNav: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="fixed bottom-0 left-0 w-full bg-[#0B0F19] border-t border-white/5 flex justify-around py-3 px-2 z-50">
      <div 
        className={`flex flex-col items-center gap-1.5 cursor-pointer transition-colors ${isActive('/') ? 'text-white' : 'text-gray-500 hover:text-white'}`}
        onClick={() => {
            navigate('/');
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
      >
        <Home size={22} />
        <span className="text-[10px] font-medium">Home</span>
      </div>
      
      <div 
        className={`flex flex-col items-center gap-1.5 cursor-pointer transition-colors ${isActive('/series') ? 'text-white' : 'text-gray-500 hover:text-white'}`}
        onClick={() => navigate('/series')}
      >
        <Tv size={22} />
        <span className="text-[10px] font-medium">Series</span>
      </div>

      <div 
        className={`flex flex-col items-center gap-1.5 cursor-pointer transition-colors ${isActive('/favorites') ? 'text-white' : 'text-gray-500 hover:text-white'}`}
        onClick={() => navigate('/favorites')}
      >
        <Heart size={22} />
        <span className="text-[10px] font-medium">Favorites</span>
      </div>

      <div 
        className={`flex flex-col items-center gap-1.5 cursor-pointer transition-colors ${isActive('/history') ? 'text-white' : 'text-gray-500 hover:text-white'}`}
        onClick={() => navigate('/history')}
      >
        <History size={22} />
        <span className="text-[10px] font-medium">History</span>
      </div>

      <div 
        className={`flex flex-col items-center gap-1.5 cursor-pointer transition-colors ${isActive('/profile') ? 'text-white' : 'text-gray-500 hover:text-white'}`}
        onClick={() => navigate('/profile')}
      >
        <Menu size={22} />
        <span className="text-[10px] font-medium">More</span>
      </div>
    </div>
  );
};
