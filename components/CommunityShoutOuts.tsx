import React, { useState, useEffect, useCallback } from 'react';
import { generateCommunityShoutOut } from '../services/geminiService';
import Spinner from './Spinner';
import { SparklesIcon, RefreshIcon } from './Icons';

// Mock data to simulate community activity
const mockAchievements = [
    { userName: 'Elena', achievement: '7 Days of Gratitude' },
    { userName: 'David', achievement: 'Mindful Morning' },
    { userName: 'Maria', achievement: 'Act of Kindness' },
    { userName: 'Kenji', achievement: 'Nature Walk' },
    { userName: 'Sarah', achievement: 'Reflective Journaling' }
];

const CACHE_DURATION_SUCCESS = 30 * 60 * 1000; // 30 minutes
const CACHE_DURATION_FAILURE = 5 * 60 * 1000; // 5 minutes

const CommunityShoutOuts: React.FC = () => {
  const [shoutOut, setShoutOut] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchShoutOut = useCallback(async (forceRefresh = false) => {
    setLoading(true);
    setError('');

    if (!forceRefresh) {
        try {
            const cachedItem = localStorage.getItem('shoutOutCache');
            if (cachedItem) {
                const { data, timestamp, isError } = JSON.parse(cachedItem);
                const duration = isError ? CACHE_DURATION_FAILURE : CACHE_DURATION_SUCCESS;
                if (Date.now() - timestamp < duration) {
                    if (isError) {
                        setError('Could not fetch a new shout out. Please try again later.');
                    } else {
                        setShoutOut(data);
                    }
                    setLoading(false);
                    return;
                }
            }
        } catch (e) { console.error("Failed to read shout out cache", e); }
    }
    
    setShoutOut('');

    try {
      const randomAchievement = mockAchievements[Math.floor(Math.random() * mockAchievements.length)];
      const result = await generateCommunityShoutOut(randomAchievement.userName, randomAchievement.achievement);
      if (result) {
        setShoutOut(result);
        try {
            localStorage.setItem('shoutOutCache', JSON.stringify({ data: result, timestamp: Date.now(), isError: false }));
        } catch (e) { console.error("Failed to write shout out cache", e); }
      } else {
          setError('Could not fetch a new shout out. Please try again later.');
          try {
              localStorage.setItem('shoutOutCache', JSON.stringify({ data: null, timestamp: Date.now(), isError: true }));
          } catch (e) { console.error("Failed to write failure cache", e); }
      }
    } catch (error) {
      console.error("Failed to generate shout out:", error);
      setError('Could not fetch a new shout out. Please try again later.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchShoutOut(false);
  }, [fetchShoutOut]);

  return (
    <div className="bg-slate-800/50 backdrop-blur-sm p-6 rounded-xl shadow-lg border border-slate-700">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold text-amber-400 flex items-center">
            <SparklesIcon className="w-6 h-6 mr-2 text-purple-400" />
            Community Shout Outs
        </h2>
        <button 
            onClick={() => fetchShoutOut(true)} 
            disabled={loading}
            className="text-slate-400 hover:text-white transition-colors disabled:opacity-50"
            aria-label="New Shout Out"
        >
            <RefreshIcon className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-16">
          <Spinner />
        </div>
      ) : (
        <div className="text-center p-4 bg-slate-700/50 rounded-lg animate-fade-in-short min-h-[72px] flex items-center justify-center">
          {error ? (
             <p className="text-red-400">{error}</p>
          ) : (
            shoutOut && <p className="text-slate-300 text-lg italic">"{shoutOut}"</p>
          )}
        </div>
      )}
    </div>
  );
};

export default CommunityShoutOuts;