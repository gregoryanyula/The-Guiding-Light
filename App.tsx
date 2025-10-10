import React, { useState, useEffect } from 'react';
import { User } from './types';
import AppLayout from './AppLayout';
import Auth from './components/Auth';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    try {
      const storedUser = localStorage.getItem('guidingLightUser');
      if (storedUser) {
        setUser(JSON.parse(storedUser));
      }
    } catch (error) {
      console.error("Failed to parse user from localStorage", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleLogin = (loggedInUser: User) => {
    setUser(loggedInUser);
    localStorage.setItem('guidingLightUser', JSON.stringify(loggedInUser));
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('guidingLightUser');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white">
        <div className="w-16 h-16 border-4 border-t-amber-400 border-r-amber-400 border-b-slate-600 border-l-slate-600 rounded-full animate-spin"></div>
        <p className="mt-4 text-slate-400 animate-pulse">Illuminating your path...</p>
      </div>
    );
  }

  return (
    <>
      {user ? (
        <AppLayout user={user} onLogout={handleLogout} />
      ) : (
        <Auth onLogin={handleLogin} />
      )}
    </>
  );
};

export default App;