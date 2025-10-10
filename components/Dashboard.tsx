import React, { useState, useEffect } from 'react';
import { getDailyInspiration, getDynamicWelcomeMessage } from '../services/geminiService';
import Spinner from './Spinner';
import { View, DailyInspiration, User } from '../types';
import { SermonIcon, MeditationIcon, ChallengeIcon, RefreshIcon, ShareIcon, PhotoIcon, UsersIcon, DownloadIcon } from './Icons';
import CommunityShoutOuts from './CommunityShoutOuts';

interface DashboardProps {
  setView: (view: View) => void;
  user: User;
  onAddToLibrary: (name: string, content: string, mimeType: string) => Promise<void>;
  addToast: (message: string) => void;
}

const CACHE_DURATION_SUCCESS = 6 * 60 * 60 * 1000; // 6 hours
const CACHE_DURATION_FAILURE = 5 * 60 * 1000; // 5 minutes

const fallbackInspirations: Omit<DailyInspiration, 'posterImage'>[] = [
    { text: "Even when the sky is cloudy, the sun is still shining behind the clouds. ☀️" },
    { text: "The journey of a thousand miles begins with a single step. Keep going. 🌱" },
    { text: "Kindness is a gift everyone can afford to give. Share it freely. ❤️" },
    { text: "Patience is not the ability to wait, but the ability to keep a good attitude while waiting. 🙏" },
];

// Helper to convert base64 to a File object for sharing
const base64toFile = (base64: string, filename: string, mimeType: string): File => {
    const byteCharacters = atob(base64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: mimeType });
    return new File([blob], filename, { type: mimeType });
}

const Dashboard: React.FC<DashboardProps> = ({ setView, user, onAddToLibrary, addToast }) => {
  const [inspiration, setInspiration] = useState<DailyInspiration | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFallback, setIsFallback] = useState(false);
  const [error, setError] = useState('');
  const [welcomeMessage, setWelcomeMessage] = useState(`Welcome, ${user.name} 🙏`);

  useEffect(() => {
    getDynamicWelcomeMessage(user.name).then(setWelcomeMessage);
  }, [user.name]);

  const fetchInspiration = async (forceRefresh = false) => {
    setLoading(true);
    setIsFallback(false);
    setError('');

    if (!forceRefresh) {
        try {
            const cachedItem = localStorage.getItem('dailyInspirationCache');
            if (cachedItem) {
                const { data, timestamp, isError } = JSON.parse(cachedItem);
                const duration = isError ? CACHE_DURATION_FAILURE : CACHE_DURATION_SUCCESS;

                if (Date.now() - timestamp < duration) {
                    if (isError) {
                        const fallback = fallbackInspirations[Math.floor(Math.random() * fallbackInspirations.length)];
                        setInspiration({ ...fallback, posterImage: '' });
                        setIsFallback(true);
                    } else {
                        setInspiration(data);
                    }
                    setLoading(false);
                    return;
                }
            }
        } catch (e) {
            console.error("Failed to read from cache", e);
        }
    }
    
    // If we're fetching, clear current inspiration to show spinner
    setInspiration(null); 

    const result = await getDailyInspiration();
    if (result === 'QUOTA_EXCEEDED') {
        setError('Daily inspiration quota reached. Please try again later.');
        const fallback = fallbackInspirations[Math.floor(Math.random() * fallbackInspirations.length)];
        setInspiration({ ...fallback, posterImage: '' });
        setIsFallback(true);
        try {
            const cacheItem = { data: null, timestamp: Date.now(), isError: true };
            localStorage.setItem('dailyInspirationCache', JSON.stringify(cacheItem));
        } catch (e) {
            console.error("Failed to write failure cache", e);
        }
    } else if (result) {
        setInspiration(result);
        if (result.posterImage) {
            await onAddToLibrary('Daily Inspiration Poster', result.posterImage, 'image/jpeg');
        }
        try {
            const cacheItem = { data: result, timestamp: Date.now(), isError: false };
            localStorage.setItem('dailyInspirationCache', JSON.stringify(cacheItem));
        } catch (e) {
            console.error("Failed to write to cache", e);
        }
    } else {
        const fallback = fallbackInspirations[Math.floor(Math.random() * fallbackInspirations.length)];
        setInspiration({ ...fallback, posterImage: '' });
        setIsFallback(true);
        try {
            const cacheItem = { data: null, timestamp: Date.now(), isError: true };
            localStorage.setItem('dailyInspirationCache', JSON.stringify(cacheItem));
        } catch (e) {
            console.error("Failed to write failure cache", e);
        }
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchInspiration();
  }, []);

  const handleShare = async () => {
    if (inspiration?.text && inspiration.posterImage) {
        try {
            const imageFile = base64toFile(inspiration.posterImage, 'inspiration.jpeg', 'image/jpeg');
            if (navigator.canShare && navigator.canShare({ files: [imageFile] })) {
                await navigator.share({
                    title: 'An inspiration from The Guiding Light AI',
                    text: `"${inspiration.text}"`,
                    files: [imageFile],
                });
            } else { // Fallback for browsers that don't support file sharing
                await navigator.share({
                    title: 'An inspiration from The Guiding Light AI',
                    text: `"${inspiration.text}"`,
                });
            }
        } catch (error) {
            console.log('Share cancelled or failed', error);
        }
    } else if (navigator.share && inspiration?.text) {
        try {
            await navigator.share({
                title: 'An inspiration from The Guiding Light AI',
                text: `"${inspiration.text}"`,
            });
        } catch (error) {
            console.log('Share cancelled or failed', error);
        }
    }
  };

  const handleDownload = () => {
    if (inspiration?.posterImage) {
      const link = document.createElement('a');
      link.href = `data:image/jpeg;base64,${inspiration.posterImage}`;
      link.download = 'daily_inspiration.jpeg';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const suggestionCards = [
    {
      title: 'Need Guidance?',
      description: 'Generate a personalized sermon on a topic that matters to you.',
      icon: <SermonIcon className="w-8 h-8 text-amber-400" />,
      view: View.Sermons,
      color: 'from-blue-500/20 to-indigo-500/20',
    },
    {
      title: 'Find Your Calm',
      description: 'Experience a unique, AI-guided meditation tailored to your needs.',
      icon: <MeditationIcon className="w-8 h-8 text-green-400" />,
      view: View.Meditations,
      color: 'from-green-500/20 to-teal-500/20',
    },
     {
      title: 'Community Hub',
      description: 'Connect with others, join groups, and share your spiritual journey.',
      icon: <UsersIcon className="w-8 h-8 text-cyan-400" />,
      view: View.Community,
      color: 'from-cyan-500/20 to-sky-500/20',
    },
  ];

  return (
    <div className="animate-fade-in space-y-8">
      <div>
        <h1 className="text-3xl sm:text-4xl font-bold text-white">{welcomeMessage}</h1>
        <p className="mt-2 text-lg text-slate-400">May your day be filled with peace, clarity, and purpose.</p>
      </div>

      <CommunityShoutOuts />

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        {/* Combined Daily Inspiration Card */}
        <div className="lg:col-span-3">
          <div className="bg-slate-800/50 backdrop-blur-sm p-6 rounded-xl shadow-lg border border-slate-700 h-full flex flex-col">
            {/* Card Header */}
            <div className="flex justify-between items-center mb-4 gap-2">
              <h2 className="text-xl font-semibold text-amber-400 flex-shrink-0">Your Daily Inspiration</h2>
               <div className="flex-grow text-right">
                {error ? <span className="text-xs text-red-400">{error}</span> 
                       : isFallback && <span className="text-xs text-slate-500">AI is resting. Here's a classic thought.</span>}
               </div>
              <button
                onClick={() => fetchInspiration(true)}
                disabled={loading}
                className="flex items-center text-sm text-slate-400 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                aria-label="Get new inspiration"
              >
                <RefreshIcon className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                New Inspiration
              </button>
            </div>

            {/* Content Area */}
            <div className="flex-grow flex flex-col justify-center">
              {loading ? (
                <div className="flex-grow flex items-center justify-center">
                  <Spinner />
                </div>
              ) : inspiration ? (
                <div className="flex flex-col flex-grow animate-fade-in">
                  {/* Poster Image with Quote Overlay */}
                  <div className="aspect-square flex-grow flex items-center justify-center bg-slate-900/50 rounded-lg overflow-hidden relative group">
                    {inspiration.posterImage ? (
                      <>
                        <img
                          src={`data:image/jpeg;base64,${inspiration.posterImage}`}
                          alt="AI-generated motivational poster"
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent flex items-end p-6">
                          <blockquote className="text-slate-100 text-xl italic drop-shadow-lg">
                            "{inspiration.text}"
                          </blockquote>
                        </div>
                      </>
                    ) : (
                      <div className="text-slate-500 p-6 text-center flex flex-col items-center justify-center">
                        <PhotoIcon className="w-16 h-16 text-slate-600 mb-4" />
                        <p className="font-semibold text-slate-300 text-lg mb-4">{isFallback ? "A Moment of Reflection" : "Image Not Available"}</p>
                        <blockquote className="text-slate-100 text-xl italic drop-shadow-lg">
                          "{inspiration.text}"
                        </blockquote>
                        <p className="text-xs mt-4">{isFallback ? "Our AI is resting, but inspiration never sleeps." : "The image could not be created."}</p>
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="mt-4 flex justify-center gap-4">
                    {inspiration.posterImage && (
                      <button
                        onClick={handleDownload}
                        className="flex items-center gap-2 px-4 py-2 bg-slate-700 text-slate-300 rounded-lg hover:bg-slate-600 hover:text-white transition-colors"
                        aria-label="Download this inspiration poster"
                      >
                        <DownloadIcon className="w-5 h-5" />
                        <span>Download</span>
                      </button>
                    )}
                    {navigator.share && (
                      <button
                        onClick={handleShare}
                        className="flex items-center gap-2 px-4 py-2 bg-slate-700 text-slate-300 rounded-lg hover:bg-slate-600 hover:text-white transition-colors"
                        aria-label="Share this inspiration"
                      >
                        <ShareIcon className="w-5 h-5" />
                        <span>Share</span>
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex-grow flex items-center justify-center p-4 text-center">
                  <p className="text-slate-500">No inspiration available at the moment.</p>
                </div>
              )}
            </div>
          </div>
        </div>


        {/* Suggestion Cards - taking 2/5 width */}
        <div className="lg:col-span-2">
            <h2 className="text-2xl font-bold text-white mb-4">How can I guide you today?</h2>
            <div className="space-y-6">
              {suggestionCards.map((card) => (
                <button
                  key={card.title}
                  onClick={() => setView(card.view)}
                  className={`w-full bg-gradient-to-br ${card.color} p-6 rounded-xl border border-slate-700 text-left hover:border-amber-400 transition-all duration-300 transform hover:-translate-y-1 group`}
                  aria-label={card.description}
                >
                  <div className="flex items-center mb-3">
                    {card.icon}
                    <h3 className="text-lg font-semibold text-white ml-3">{card.title}</h3>
                  </div>
                  <p className="text-slate-400 group-hover:text-slate-300">{card.description}</p>
                </button>
              ))}
               <button
                  onClick={() => setView(View.Challenges)}
                  className={`w-full bg-gradient-to-br from-purple-500/20 to-violet-500/20 p-6 rounded-xl border border-slate-700 text-left hover:border-amber-400 transition-all duration-300 transform hover:-translate-y-1 group`}
                  aria-label="Take on a spiritual challenge and earn rewards on your journey."
                >
                  <div className="flex items-center mb-3">
                    <ChallengeIcon className="w-8 h-8 text-purple-400" />
                    <h3 className="text-lg font-semibold text-white ml-3">Grow Your Spirit</h3>
                  </div>
                  <p className="text-slate-400 group-hover:text-slate-300">Take on a spiritual challenge and earn rewards on your journey.</p>
                </button>
            </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;