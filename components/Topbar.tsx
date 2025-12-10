import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User } from 'lucide-react';
import { getLogo } from '../services/storage';

export const Topbar: React.FC = () => {
  const navigate = useNavigate();
  const [logoUrl, setLogoUrl] = useState('');

  useEffect(() => {
    const loadLogo = async () => {
        const url = await getLogo();
        setLogoUrl(url);
    };
    loadLogo();
  }, []);

  return (
    <div className="w-full py-[18px] px-[15px] bg-black/25 border-b border-white/5 flex items-center gap-[10px] relative z-40">
      <div 
        className="flex items-center gap-2 cursor-pointer"
        onClick={() => navigate('/')}
      >
        <img 
          src={logoUrl || "https://zippy-gold-pjtvv4rnrb-199jsywth2.edgeone.dev/31055.png"} 
          alt="Logo" 
          className="w-[40px] h-[40px] object-contain"
        />
        <span className="text-[26px] font-bold text-white">
          AniLizer
        </span>
      </div>
      
      <div className="ml-auto">
        <div 
          onClick={() => navigate('/profile')}
          className="w-[32px] h-[32px] bg-[#1A1E2A] rounded-full flex items-center justify-center border border-primary cursor-pointer hover:bg-[#2A2E3A] transition-colors"
        >
          <User size={18} className="text-white" />
        </div>
      </div>
    </div>
  );
};