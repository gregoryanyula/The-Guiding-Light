import React, { useState, useEffect } from 'react';
import { View, User, ConnectionRequest, Group, MeditationContent, ProfileAnalysis, RewardPoster, LibraryItem, LibraryItemType } from './types';
import Header from './components/Header';
import Dashboard from './components/Dashboard';
// FIX: Changed to a named import to resolve the module export error.
import { SermonGenerator } from './components/SermonGenerator';
// FIX: Changed to a named import to resolve the module export error.
import { PrayerGenerator } from './components/PrayerGenerator';
// FIX: Changed to a named import to resolve the module not found error, consistent with other components.
import { MeditationGenerator } from './components/MeditationGenerator';
import Challenges, { challenges } from './components/Challenges';
import Streaming from './components/Streaming';
import Profile from './components/Profile';
// FIX: Changed to a named import to match the updated export in Events.tsx
import { Events } from './components/Events';
import StudyAssistant from './components/BibleStudy';
import WisdomLibrary from './components/AncientWisdom';
import Celebration from './components/Celebration';
import Community from './components/Community';
import Bible from './components/Bible';
import Library from './components/Library';
import ResourceCentre from './components/ResourceCentre';
import Chatbot from './components/Chatbot';
import Spinner from './components/Spinner';
import { CloseIcon, DownloadIcon } from './components/Icons';
import { generateMeditation, generatePrayer, generateProfileAnalysis, generateRewardPoster, generateRewardSoundscape, generateTagsForFile } from './services/geminiService';
import MusicHub from './components/MusicHub';
import ImageGenerator from './components/ImageGenerator';
import ImageAnalysis from './components/ImageAnalysis';
import VideoAnalysis from './components/VideoAnalysis';
import Transcription from './components/Transcription';

// --- MOCK DATA ---
const mockUsers: User[] = [
  { id: 'elena@example.com', name: 'Elena', email: 'elena@example.com' },
  { id: 'david@example.com', name: 'David', email: 'david@example.com' },
  { id: 'maria@example.com', name: 'Maria', email: 'maria@example.com' },
  { id: 'kenji@example.com', name: 'Kenji', email: 'kenji@example.com' },
];

const mockGroups: Group[] = [
    { id: 'group-1', name: 'Mindfulness Practitioners', description: 'A space for those dedicated to daily mindfulness and meditation. Share techniques, experiences, and support one another.', members: [mockUsers[0], mockUsers[2]], admins: [mockUsers[0]], isPublic: true },
    { id: 'group-2', name: 'Seekers of Ancient Wisdom', description: 'Discussing stoicism, eastern philosophy, and timeless texts. Join us to explore how ancient insights apply to modern life.', members: [mockUsers[1], mockUsers[3]], admins: [mockUsers[1]], isPublic: true },
    { id: 'group-3', name: 'Gratitude Journalers', description: 'A private group for sharing daily gratitude entries and fostering a positive mindset.', members: [], admins: [], isPublic: false }
];
// --- END MOCK DATA ---

// Helper to determine library item type from MIME type
const getLibraryItemType = (mimeType: string): LibraryItemType => {
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType.startsWith('video/')) return 'video';
    if (mimeType.startsWith('audio/')) return 'audio';
    if (['application/pdf', 'text/plain'].includes(mimeType)) return 'document';
    return 'other';
};

// --- REWARD MODAL COMPONENT ---
interface RewardModalProps {
  isOpen: boolean;
  onClose: () => void;
  isGenerating: boolean;
  reward: { title: string; content: any; type: string } | null;
}

const RewardModal: React.FC<RewardModalProps> = ({ isOpen, onClose, isGenerating, reward }) => {
    if (!isOpen) return null;

    const renderContent = () => {
        if (isGenerating) {
            return (
                <div className="flex flex-col items-center justify-center h-64">
                    <Spinner />
                    <p className="mt-4 text-slate-400">Your reward is being prepared by the AI...</p>
                </div>
            );
        }
        if (!reward || !reward.content) {
            return (
                <div className="text-center h-64 flex items-center justify-center">
                    <p className="text-red-400">Could not generate your reward. Please try again later.</p>
                </div>
            );
        }

        switch (reward.type) {
            case 'meditation':
                const meditation = reward.content as MeditationContent;
                return (
                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold text-white">Exclusive Meditation: "Sunrise and new beginnings"</h3>
                        <div className="prose prose-invert max-w-none text-slate-300 bg-slate-900/50 p-4 rounded-lg max-h-60 overflow-y-auto whitespace-pre-wrap">
                            {meditation.meditationScript}
                        </div>
                    </div>
                );
            case 'poster':
                const poster = reward.content as RewardPoster;
                return (
                    <div className="text-center space-y-4">
                        <p className="text-lg italic text-slate-300">"{poster.text}"</p>
                        <img src={`data:image/jpeg;base64,${poster.image}`} alt="Inspirational Poster" className="rounded-lg max-h-80 mx-auto" />
                         <a 
                            href={`data:image/jpeg;base64,${poster.image}`} 
                            download="inspirational_poster.jpeg"
                            className="inline-flex items-center justify-center gap-2 text-sm text-slate-300 hover:text-white transition-colors font-semibold bg-slate-700 px-4 py-2 rounded-lg"
                        >
                            <DownloadIcon className="w-5 h-5" />
                            <span>Download Poster</span>
                        </a>
                    </div>
                );
            case 'soundscape':
                const audioUrl = reward.content as string;
                return (
                     <div className="space-y-4">
                        <h3 className="text-lg font-semibold text-white">Calming Nature Soundscape</h3>
                        <audio controls src={audioUrl} className="w-full">Your browser does not support the audio element.</audio>
                         <a 
                            href={audioUrl} 
                            download="calming_soundscape.mp3"
                            className="inline-flex items-center justify-center gap-2 text-sm text-slate-300 hover:text-white transition-colors font-semibold bg-slate-700 px-4 py-2 rounded-lg"
                        >
                            <DownloadIcon className="w-5 h-5" />
                            <span>Download Soundscape</span>
                        </a>
                    </div>
                );
            case 'insight':
                const insight = reward.content as ProfileAnalysis;
                return (
                    <div className="space-y-3">
                        <h3 className="text-lg font-semibold text-white">Personalized Growth Insight</h3>
                         <div className="bg-slate-700/50 p-4 rounded-lg">
                            <h4 className="font-semibold text-amber-400">Journey Summary:</h4>
                            <p className="text-slate-300">{insight.journeySummary}</p>
                        </div>
                        <div className="bg-slate-700/50 p-4 rounded-lg">
                            <h4 className="font-semibold text-amber-400">AI Observation:</h4>
                            <p className="text-slate-300">{insight.encouragingObservation}</p>
                        </div>
                        <div className="bg-slate-700/50 p-4 rounded-lg">
                            <h4 className="font-semibold text-amber-400">Suggested Next Step:</h4>
                            <p className="text-slate-300">{insight.nextStepSuggestion}</p>
                        </div>
                    </div>
                );
            default:
                return <p>Reward unlocked!</p>;
        }
    };

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
            <div className="bg-slate-800 border border-amber-400 rounded-2xl shadow-lg w-full max-w-lg p-6 space-y-4 animate-fade-in-short relative">
                 <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-white"><CloseIcon className="w-6 h-6"/></button>
                 <h2 className="text-2xl font-bold text-amber-400 text-center">{reward?.title || 'Unlocking Your Reward...'}</h2>
                 <div className="max-h-[70vh] overflow-y-auto pr-2">
                    {renderContent()}
                 </div>
                 <button onClick={onClose} className="w-full mt-4 bg-amber-500 text-slate-900 font-bold py-2 rounded-md hover:bg-amber-400">
                    Awesome!
                 </button>
            </div>
        </div>
    );
};


interface AppLayoutProps {
    user: User;
    onLogout: () => void;
}

const AppLayout: React.FC<AppLayoutProps> = ({ user, onLogout }) => {
  const [currentView, setCurrentView] = useState<View>(View.Dashboard);
  
  // --- LOCAL STORAGE STATE ---
  const [completedChallenges, setCompletedChallenges] = useState<number[]>(() => {
      const saved = localStorage.getItem(`completedChallenges_${user.id}`);
      return saved ? JSON.parse(saved) : [];
  });
  const [sermonsGeneratedCount, setSermonsGeneratedCount] = useState(() => {
    const saved = localStorage.getItem(`sermonsGeneratedCount_${user.id}`);
    return saved ? JSON.parse(saved) : 0;
  });
  const [prayersGeneratedCount, setPrayersGeneratedCount] = useState(() => {
    const saved = localStorage.getItem(`prayersGeneratedCount_${user.id}`);
    return saved ? JSON.parse(saved) : 0;
  });
  const [meditationsGeneratedCount, setMeditationsGeneratedCount] = useState(() => {
    const saved = localStorage.getItem(`meditationsGeneratedCount_${user.id}`);
    return saved ? JSON.parse(saved) : 0;
  });
  const [sermonTopicsHistory, setSermonTopicsHistory] = useState<string[]>(() => {
    const saved = localStorage.getItem(`sermonTopicsHistory_${user.id}`);
    return saved ? JSON.parse(saved) : ['The Power of Forgiveness', 'Finding Stillness'];
  });
  const [meditationGoalsHistory, setMeditationGoalsHistory] = useState<string[]>(() => {
    const saved = localStorage.getItem(`meditationGoalsHistory_${user.id}`);
    return saved ? JSON.parse(saved) : ['Cultivating Inner Peace', 'Letting Go of Attachment'];
  });
  const [userTitle, setUserTitle] = useState<string>(() => {
    return localStorage.getItem(`userTitle_${user.id}`) || 'Seeker of Light';
  });
  const [userAvatar, setUserAvatar] = useState<string | null>(() => {
    return localStorage.getItem(`userAvatar_${user.id}`);
  });
  const [showCelebration, setShowCelebration] = useState(false);

  // --- REWARD STATE ---
  const [unlockedRewardContent, setUnlockedRewardContent] = useState<{title: string, content: any, type: string} | null>(null);
  const [isGeneratingReward, setIsGeneratingReward] = useState(false);

  // --- COMMUNITY STATE (Mocked) ---
  const [allUsers] = useState<User[]>([...mockUsers, user]);
  const [groups, setGroups] = useState<Group[]>(mockGroups);
  const [connections, setConnections] = useState<User[]>(() => [mockUsers[0]]);
  const [connectionRequests, setConnectionRequests] = useState<ConnectionRequest[]>(() => [
      { id: 'req-1', fromUser: mockUsers[1], toUser: user },
      { id: 'req-2', fromUser: mockUsers[2], toUser: user }
  ]);
  const [userGroups, setUserGroups] = useState<string[]>(() => [mockGroups[0].id]);

  // --- LIBRARY STATE ---
  const [libraryItems, setLibraryItems] = useState<LibraryItem[]>([]);
  const libraryStorageKey = `libraryItems_${user.id}`;

  // --- MUSIC HUB STATE ---
  const [favoriteTrackIds, setFavoriteTrackIds] = useState<string[]>(() => {
      const saved = localStorage.getItem(`favoriteTracks_${user.id}`);
      return saved ? JSON.parse(saved) : [];
  });

  // --- TOAST NOTIFICATION STATE ---
  const [toasts, setToasts] = useState<{ id: number, message: string }[]>([]);

  const addToast = (message: string) => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message }]);
    setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, 3000);
  };

  useEffect(() => {
      try {
          const savedItems = localStorage.getItem(libraryStorageKey);
          if (savedItems) setLibraryItems(JSON.parse(savedItems));
      } catch (e) { console.error("Failed to load library items", e); }
  }, [libraryStorageKey]);

  useEffect(() => {
      localStorage.setItem(libraryStorageKey, JSON.stringify(libraryItems));
  }, [libraryItems, libraryStorageKey]);

  // Add initial prayer to user's library on first load.
  useEffect(() => {
    const addInitialPrayer = async () => {
        const prayerAddedKey = `initialPrayerAdded_v2_${user.id}`;
        if (localStorage.getItem(prayerAddedKey)) return;

        const prayerName = "Prayer for Peace in Difficult Times";
        // Check if already present to avoid duplicates if local storage is cleared
        if (libraryItems.some(item => item.name === prayerName)) {
            localStorage.setItem(prayerAddedKey, 'true');
            return;
        }

        console.log("Generating initial prayer for user library...");
        const prayerContent = await generatePrayer('finding peace in difficult times', '1-minute', 'reverent');
        
        if (prayerContent && typeof prayerContent !== 'string') {
            const prayerText = prayerContent.prayerText;
            const contentBase64 = btoa(unescape(encodeURIComponent(prayerText)));
            
            const newItem: LibraryItem = {
                id: `lib-initial-${Date.now()}`,
                name: prayerName,
                type: 'document',
                mimeType: 'text/plain',
                content: contentBase64,
                tags: ['prayer', 'peace', 'guidance'],
                createdAt: new Date().toISOString(),
            };

            setLibraryItems(prev => [newItem, ...prev]);
            addToast(`A '${prayerName}' has been added to your library.`);
            localStorage.setItem(prayerAddedKey, 'true');
        }
    };

    addInitialPrayer();
    // This effect should run once when the library is loaded.
    // The flag in localStorage prevents it from running again for the same user.
    // The dependency on libraryItems ensures we don't add a duplicate if it already exists.
  }, [user.id, libraryItems]);


  const handleAddToLibrary = async (name: string, content: string, mimeType: string) => {
    const type = getLibraryItemType(mimeType);
    // We get tags but don't show them yet in the UI. Ready for future use.
    const tags = await generateTagsForFile(name, type);
    const newItem: LibraryItem = {
        id: `lib-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        name,
        type,
        mimeType,
        content,
        tags,
        createdAt: new Date().toISOString(),
    };
    setLibraryItems(prev => [newItem, ...prev]);
    addToast('✓ Saved to Library!');
  };

  const handleDeleteFromLibrary = (id: string) => {
      setLibraryItems(prev => prev.filter(item => item.id !== id));
  };


  useEffect(() => {
    localStorage.setItem(`completedChallenges_${user.id}`, JSON.stringify(completedChallenges));
  }, [completedChallenges, user.id]);
  useEffect(() => {
    localStorage.setItem(`sermonsGeneratedCount_${user.id}`, JSON.stringify(sermonsGeneratedCount));
  }, [sermonsGeneratedCount, user.id]);
  useEffect(() => {
    localStorage.setItem(`prayersGeneratedCount_${user.id}`, JSON.stringify(prayersGeneratedCount));
  }, [prayersGeneratedCount, user.id]);
  useEffect(() => {
    localStorage.setItem(`meditationsGeneratedCount_${user.id}`, JSON.stringify(meditationsGeneratedCount));
  }, [meditationsGeneratedCount, user.id]);
  useEffect(() => {
    localStorage.setItem(`sermonTopicsHistory_${user.id}`, JSON.stringify(sermonTopicsHistory));
  }, [sermonTopicsHistory, user.id]);
  useEffect(() => {
    localStorage.setItem(`meditationGoalsHistory_${user.id}`, JSON.stringify(meditationGoalsHistory));
  }, [meditationGoalsHistory, user.id]);
  useEffect(() => {
    localStorage.setItem(`userTitle_${user.id}`, userTitle);
  }, [userTitle, user.id]);
  useEffect(() => {
    if (userAvatar) {
      localStorage.setItem(`userAvatar_${user.id}`, userAvatar);
    } else {
      localStorage.removeItem(`userAvatar_${user.id}`);
    }
  }, [userAvatar, user.id]);
   useEffect(() => {
    localStorage.setItem(`favoriteTracks_${user.id}`, JSON.stringify(favoriteTrackIds));
  }, [favoriteTrackIds, user.id]);


  const handleCompleteChallenge = async (challengeId: number) => {
    if (completedChallenges.includes(challengeId)) return;

    const newCompletedChallenges = [...completedChallenges, challengeId];
    setCompletedChallenges(newCompletedChallenges);
    setShowCelebration(true);

    const challenge = challenges.find(c => c.id === challengeId);
    if (!challenge) return;

    const generativeRewards = [
        'Exclusive "Sunrise" meditation',
        'Inspirational quote poster',
        'Calming nature soundscape',
        'Personalized growth insight'
    ];

    if (!generativeRewards.includes(challenge.reward)) return;

    // Open modal immediately in loading state
    setUnlockedRewardContent({
        title: `Unlocking: ${challenge.reward}`,
        content: null,
        type: 'loading'
    });
    setIsGeneratingReward(true);

    let rewardContent: any = null;
    let rewardType: string = 'generic';

    switch (challenge.reward) {
        case 'Exclusive "Sunrise" meditation':
            rewardType = 'meditation';
            rewardContent = await generateMeditation('Sunrise and new beginnings', '5-minute');
            if (rewardContent && typeof rewardContent !== 'string') {
                const textBase64 = btoa(unescape(encodeURIComponent(rewardContent.meditationScript)));
                await handleAddToLibrary('Reward: Sunrise Meditation Script', textBase64, 'text/plain');
            }
            break;
        case 'Inspirational quote poster':
            rewardType = 'poster';
            rewardContent = await generateRewardPoster(challenge.title);
            if (rewardContent?.image) {
                await handleAddToLibrary(`Reward Poster: ${challenge.title}`, rewardContent.image, 'image/jpeg');
            }
            break;
        case 'Calming nature soundscape':
            rewardType = 'soundscape';
            rewardContent = await generateRewardSoundscape();
            // Note: Saving mocked audio URLs to library is not feasible. This would work with real base64 audio data.
            break;
        case 'Personalized growth insight':
            rewardType = 'insight';
            const completedChallengeTitles = challenges
                .filter(c => newCompletedChallenges.includes(c.id))
                .map(c => c.title);
            rewardContent = await generateProfileAnalysis({
                sermons: sermonsGeneratedCount,
                meditations: meditationsGeneratedCount,
                challenges: newCompletedChallenges.length,
                completedChallengeTitles,
                connections: connections.length,
                groups: userGroups.length
            });
            break;
    }
    
    // Update modal with content
    setUnlockedRewardContent({
        title: `Reward Unlocked: ${challenge.reward}`,
        content: rewardContent,
        type: rewardType
    });
    setIsGeneratingReward(false);
  };

  const handleSermonGenerated = (topic: string) => {
    setSermonsGeneratedCount(prev => prev + 1);
    // Keep the last 5 topics for focused personalization
    setSermonTopicsHistory(prev => [topic, ...prev].slice(0, 5));
  };
   const handlePrayerGenerated = () => {
    setPrayersGeneratedCount(prev => prev + 1);
  };
  const handleMeditationGenerated = (goal: string) => {
    setMeditationsGeneratedCount(prev => prev + 1);
    // Keep the last 5 goals
    setMeditationGoalsHistory(prev => [goal, ...prev].slice(0, 5));
  };

  // --- COMMUNITY HANDLERS ---
  const handleRequestResponse = (requestId: string, accepted: boolean) => {
    const request = connectionRequests.find(r => r.id === requestId);
    if (request && accepted) {
        setConnections(prev => [...prev, request.fromUser]);
    }
    setConnectionRequests(prev => prev.filter(r => r.id !== requestId));
  };
  
  const handleJoinGroup = (groupId: string) => {
      if (!userGroups.includes(groupId)) {
          setUserGroups(prev => [...prev, groupId]);
          setGroups(prevGroups => prevGroups.map(g => g.id === groupId ? {...g, members: [...g.members, user]} : g));
      }
  };

  const handleCreateGroup = (name: string, description: string) => {
      const newGroup: Group = {
          id: `group-${Date.now()}`,
          name,
          description,
          members: [user],
          admins: [user],
          isPublic: true,
      };
      setGroups(prev => [...prev, newGroup]);
      setUserGroups(prev => [...prev, newGroup.id]);
  };
  
  const handleToggleFavorite = (trackId: string) => {
    setFavoriteTrackIds(prev =>
        prev.includes(trackId)
            ? prev.filter(id => id !== trackId)
            : [...prev, trackId]
    );
  };

  const renderContent = () => {
    const completedChallengeTitles = challenges
        .filter(c => completedChallenges.includes(c.id))
        .map(c => c.title);
    const userGroupNames = groups
        .filter(g => userGroups.includes(g.id))
        .map(g => g.name);
    
    const commonProps = {
        onAddToLibrary: handleAddToLibrary,
        addToast: addToast,
    };

    switch (currentView) {
      case View.Dashboard:
        return <Dashboard setView={setCurrentView} user={user} {...commonProps} />;
      case View.Community:
        return <Community 
            currentUser={user}
            allUsers={allUsers}
            connections={connections}
            connectionRequests={connectionRequests}
            groups={groups}
            userGroups={userGroups}
            onRequestResponse={handleRequestResponse}
            onJoinGroup={handleJoinGroup}
            onCreateGroup={handleCreateGroup}
        />;
      case View.Sermons:
        return <SermonGenerator 
            user={user}
            onSermonGenerated={handleSermonGenerated}
            sermonTopicsHistory={sermonTopicsHistory}
            meditationGoalsHistory={meditationGoalsHistory}
            {...commonProps} 
        />;
      case View.Prayers:
        return <PrayerGenerator user={user} onPrayerGenerated={handlePrayerGenerated} {...commonProps} />;
      case View.ResourceCentre:
        return <ResourceCentre {...commonProps} />;
      case View.StudyAssistant:
        return <StudyAssistant 
            sermonTopicsHistory={sermonTopicsHistory}
            meditationGoalsHistory={meditationGoalsHistory}
            completedChallengeTitles={completedChallengeTitles}
            userGroupNames={userGroupNames}
        />;
      case View.Bible:
        return <Bible 
            sermonTopicsHistory={sermonTopicsHistory}
            meditationGoalsHistory={meditationGoalsHistory}
            completedChallengeTitles={completedChallengeTitles}
            userGroupNames={userGroupNames}
        />;
      case View.Library:
        return <Library user={user} items={libraryItems} onDelete={handleDeleteFromLibrary} />;
      case View.WisdomLibrary:
        return <WisdomLibrary 
            sermonTopicsHistory={sermonTopicsHistory}
            meditationGoalsHistory={meditationGoalsHistory}
            {...commonProps}
        />;
      case View.Meditations:
        return <MeditationGenerator onMeditationGenerated={handleMeditationGenerated} user={user} />;
      case View.MusicHub:
        return <MusicHub 
            user={user} 
            {...commonProps} 
            favoriteTrackIds={favoriteTrackIds}
            onToggleFavorite={handleToggleFavorite}
        />;
      case View.Challenges:
        return (
          <Challenges
            user={user}
            completedChallenges={completedChallenges}
            onCompleteChallenge={handleCompleteChallenge}
          />
        );
      case View.Streaming:
        return <Streaming />;
      case View.Events:
        return <Events />;
      case View.ImageGeneration:
        return <ImageGenerator {...commonProps} />;
      case View.ImageAnalysis:
        return <ImageAnalysis />;
      case View.VideoAnalysis:
        return <VideoAnalysis />;
      case View.Transcription:
        return <Transcription />;
      case View.Profile:
        return (
          <Profile 
            user={user}
            completedChallenges={completedChallenges} 
            sermonsGeneratedCount={sermonsGeneratedCount}
            meditationsGeneratedCount={meditationsGeneratedCount}
            connectionsCount={connections.length}
            groupsJoinedCount={userGroups.length}
            favoriteTrackIds={favoriteTrackIds.length}
            userTitle={userTitle}
            userAvatar={userAvatar}
            onSetTitle={setUserTitle}
            onSetAvatar={setUserAvatar}
            onLogout={onLogout}
          />
        );
      default:
        return <Dashboard setView={setCurrentView} user={user} {...commonProps} />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-slate-200">
      <Celebration show={showCelebration} onClose={() => setShowCelebration(false)} />
      <RewardModal
        isOpen={!!unlockedRewardContent}
        onClose={() => setUnlockedRewardContent(null)}
        isGenerating={isGeneratingReward}
        reward={unlockedRewardContent}
      />
       {/* Toast Notifications */}
      <div className="fixed bottom-24 right-6 z-[70] space-y-2">
          {toasts.map(toast => (
              <div key={toast.id} className="bg-green-600/90 text-white px-4 py-2 rounded-lg shadow-lg animate-fade-in-short">
                  {toast.message}
              </div>
          ))}
      </div>

      <div className="flex flex-col md:flex-row">
        <Header 
          currentView={currentView} 
          setView={setCurrentView} 
          completedChallengesCount={completedChallenges.length} 
          isLoggedIn={true}
        />
        <main className="flex-1 p-4 sm:p-6 lg:p-8 md:ml-64">
          {renderContent()}
        </main>
      </div>
      <Chatbot context={currentView} user={user} />
    </div>
  );
};

export default AppLayout;
