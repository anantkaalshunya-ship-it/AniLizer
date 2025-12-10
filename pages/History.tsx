
import React, { useState, useEffect } from 'react';
import { getHistory } from '../services/storage';
import { HistoryItem } from '../types';
import { Topbar } from '../components/Topbar';
import { BottomNav } from '../components/BottomNav';
import { History as HistoryIcon, Play } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const History: React.FC = () => {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchHistory = async () => {
        const data = await getHistory();
        setHistory(data);
    };
    fetchHistory();
  }, []);

  return (
    <div className="min-h-screen bg-[#0B0F19] pb-24">
      <Topbar />
      <div className="p-4">
        <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
           <HistoryIcon className="text-[#00F0FF]" /> Watch History
        </h2>
        
        {history.length > 0 ? (
          <div className="space-y-4">
            {history.map((item, idx) => (
               <div 
                 key={idx} 
                 onClick={() => navigate(`/watch/${item.animeId}`)}
                 className="flex items-center gap-4 bg-[#110F15] p-3 rounded-xl border border-white/5 hover:border-[#00F0FF] transition-all cursor-pointer group"
               >
                  <img src={item.animePoster} className="w-[80px] h-[50px] object-cover rounded-lg" alt="" />
                  <div className="flex-1">
                      <h3 className="font-bold text-white truncate">{item.animeTitle}</h3>
                      <p className="text-sm text-gray-400">Episode {item.episodeNumber}: {item.episodeTitle}</p>
                      <p className="text-xs text-[#00F0FF] mt-1">{new Date(item.timestamp).toLocaleDateString()}</p>
                  </div>
                  <div className="bg-[#00F0FF]/10 p-3 rounded-full group-hover:bg-[#00F0FF] transition-colors">
                      <Play size={16} className="text-[#00F0FF] group-hover:text-black fill-current" />
                  </div>
               </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-[50vh] text-gray-500">
             <HistoryIcon size={48} className="mb-2 opacity-50" />
             <p>No watch history yet.</p>
          </div>
        )}
      </div>
      <BottomNav />
    </div>
  );
};
