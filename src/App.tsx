/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { LandingPage } from './components/LandingPage';
import { AdminPanel } from './components/AdminPanel';
import { ArtworkDetail } from './components/ArtworkDetail';
import { Layout } from './components/Layout';
import { useEffect, useState } from 'react';
import { authService } from './lib/auth';
import { artService } from './services/artService';
import { User } from '@supabase/supabase-js';
import { SiteSettings } from './types';

export default function App() {
  const [user, setUser] = useState<User | null>(undefined);
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubAuth = authService.onAuthChange((user) => {
      setUser(user);
      setLoading(false);
    });

    const unsubSettings = artService.subscribeToSettings((data) => {
      setSettings(data);
    });

    return () => {
      unsubAuth();
      unsubSettings();
    };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f5f2ed]">
        <div className="animate-pulse flex flex-col items-center">
          <div className="w-12 h-12 border-4 border-[#1a1a1a] border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-[#1a1a1a] font-serif italic text-lg text-center">Cargando Galería...</p>
        </div>
      </div>
    );
  }

  const isAdmin = user && authService.isAdmin(user);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout user={user || null} settings={settings} />}>
          <Route index element={<LandingPage settings={settings} />} />
          <Route path="artwork/:id" element={<ArtworkDetail settings={settings} />} />
          <Route
            path="admin"
            element={
              isAdmin
                ? <AdminPanel user={user} />
                : <Navigate to="/" replace />
            }
          />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
