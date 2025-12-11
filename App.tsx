
import React, { useEffect } from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import { Home } from './pages/Home';
import { Admin } from './pages/Admin';
import { Watch } from './pages/Watch';
import { Profile } from './pages/Profile';
import { History } from './pages/History';
import { Favorites } from './pages/Favorites';
import { Series } from './pages/Series';
import { Movies } from './pages/Movies';
import { Player } from './pages/Player';
import { requestForToken } from './services/firebase';
import { saveTokenToDb } from './services/storage';

const App: React.FC = () => {
  
  // Ask for Android System Notification Permission on App Load
  useEffect(() => {
    const initNotifications = async () => {
        const token = await requestForToken();
        if (token) {
            await saveTokenToDb(token);
        }
    };
    initNotifications();
  }, []);

  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/series" element={<Series />} />
        <Route path="/movies" element={<Movies />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/watch/:id" element={<Watch />} />
        <Route path="/player/:animeId/:episodeId" element={<Player />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/history" element={<History />} />
        <Route path="/favorites" element={<Favorites />} />
      </Routes>
    </HashRouter>
  );
};

export default App;
