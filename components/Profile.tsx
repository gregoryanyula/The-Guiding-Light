import React, { useState, useRef, useEffect } from 'react';
import { challenges } from './Challenges';
import { TrophyIcon, UserIcon, MeditationIcon, SermonIcon, EditIcon, SaveIcon, CloseIcon, CameraIcon, LogoutIcon, SparklesIcon, UsersIcon, HeartIcon } from './Icons';
import { User, ProfileAnalysis } from '../types';
import { generateProfileAnalysis } from '../services/geminiService';
import Spinner from './Spinner';

// New sub-component for handling the editable title logic
interface EditableProfileTitleProps {
  title: string;
  onSave: (newTitle: string) => void;
  onSuggest: () => Promise<string | null>;
}

const EditableProfileTitle: React.FC<EditableProfileTitleProps> = ({ title, onSave, onSuggest }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [tempTitle, setTempTitle] = useState(title);
  const [isSuggesting, setIsSuggesting] = useState(false);

  // Sync with external changes (e.g., from AI suggestions)
  useEffect(() => {
    setTempTitle(title);
  }, [title]);

  const handleSave = () => {
    if (tempTitle.trim()) {
      onSave(tempTitle.trim());
      setIsEditing(false);
    }
  };
  
  const handleCancel = () => {
    setTempTitle(title); // Revert changes
    setIsEditing(false);
  };

  const handleSuggestion = async () => {
    setIsSuggesting(true);
    const suggestion = await onSuggest();
    if (suggestion) {
        setTempTitle(suggestion);
    }
    setIsSuggesting(false);
  };

  if (isEditing) {
    return (
      <div className="flex items-center gap-2 mb-1">
        <input 
          type="text"
          value={tempTitle}
          onChange={(e) => setTempTitle(e.target.value)}
          className="flex-grow bg-slate-700 border border-slate-600 rounded-md p-1 text-2xl font-bold text-white focus:ring-amber-400 focus:border-amber-400"
          autoFocus
          onKeyDown={(e) => e.key === 'Enter' && handleSave()}
        />
        <button 
            onClick={handleSuggestion} 
            disabled={isSuggesting}
            className="p-1 text-purple-400 hover:text-purple-300 disabled:opacity-50 flex-shrink-0"
            aria-label="Suggest a title"
            title="Suggest a title with AI"
        >
            {isSuggesting ? <Spinner /> : <SparklesIcon className="w-6 h-6" />}
        </button>
        <button onClick={handleSave} className="p-1 text-green-400 hover:text-green-300" aria-label="Save title">
          <SaveIcon className="w-6 h-6" />
        </button>
        <button onClick={handleCancel} className="p-1 text-red-400 hover:text-red-300" aria-label="Cancel edit">
          <CloseIcon className="w-6 h-6" />
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 mb-1">
      <h2 className="text-2xl font-bold text-white">{title}</h2>
      <button 
        onClick={() => setIsEditing(true)}
        className="text-slate-400 hover:text-white"
        aria-label="Edit title"
      >
        <EditIcon className="w-5 h-5" />
      </button>
    </div>
  );
};

interface ProfileProps {
  user: User;
  completedChallenges: number[];
  sermonsGeneratedCount: number;
  meditationsGeneratedCount: number;
  connectionsCount: number;
  groupsJoinedCount: number;
  favoriteTracksCount: number;
  userTitle: string;
  userAvatar: string | null;
  onSetTitle: (title: string) => void;
  onSetAvatar: (avatar: string) => void;
  onLogout: () => void;
}

const Profile: React.FC<ProfileProps> = ({ 
  user,
  completedChallenges, 
  sermonsGeneratedCount, 
  meditationsGeneratedCount,
  connectionsCount,
  groupsJoinedCount,
  favoriteTracksCount,
  userTitle,
  userAvatar,
  onSetTitle,
  onSetAvatar,
  onLogout
}) => {
  const myAchievements = challenges.filter(c => completedChallenges.includes(c.id));
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [analysis, setAnalysis] = useState<ProfileAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState('');
  const [titleAdopted, setTitleAdopted] = useState(false);

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          onSetAvatar(e.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleGetAnalysis = async () => {
    setIsAnalyzing(true);
    setAnalysis(null);
    setAnalysisError('');
    setTitleAdopted(false);
  
    const completedChallengeTitles = myAchievements.map(c => c.title);
  
    const result = await generateProfileAnalysis({
      sermons: sermonsGeneratedCount,
      meditations: meditationsGeneratedCount,
      challenges: completedChallenges.length,
      completedChallengeTitles: completedChallengeTitles,
      connections: connectionsCount,
      groups: groupsJoinedCount
    });
  
    if (result) {
      setAnalysis(result);
    } else {
      setAnalysisError('Could not generate analysis at this time. The AI may be busy.');
    }
    setIsAnalyzing(false);
  };

  const handleSuggestTitle = async (): Promise<string | null> => {
    const analysis = await generateProfileAnalysis({
      sermons: sermonsGeneratedCount,
      meditations: meditationsGeneratedCount,
      challenges: myAchievements.length,
      completedChallengeTitles: myAchievements.map(c => c.title),
      connections: connectionsCount,
      groups: groupsJoinedCount
    });
    return analysis?.suggestedTitle || null;
  };

  const stats = [
    { label: 'Achievements Unlocked', value: completedChallenges.length, icon: <TrophyIcon className="w-8 h-8 text-amber-400" /> },
    { label: 'Meditations Completed', value: meditationsGeneratedCount, icon: <MeditationIcon className="w-8 h-8 text-green-400" /> },
    { label: 'Sermons Generated', value: sermonsGeneratedCount, icon: <SermonIcon className="w-8 h-8 text-blue-400" /> },
    { label: 'Favorite Music Tracks', value: favoriteTracksCount, icon: <HeartIcon className="w-8 h-8 text-pink-400" /> },
  ];

  return (
    <div className="animate-fade-in space-y-8">
      <div className="flex justify-between items-start">
        <div>
            <h1 className="text-3xl sm:text-4xl font-bold text-white">My Spiritual Journey</h1>
            <p className="mt-2 text-lg text-slate-400">Track your progress, celebrate your growth, and reflect on your path.</p>
        </div>
        <button 
            onClick={onLogout}
            className="flex items-center gap-2 text-slate-400 hover:text-white bg-slate-800/50 px-4 py-2 rounded-lg border border-slate-700 hover:border-red-500 transition-colors"
        >
            <LogoutIcon className="w-5 h-5" />
            Sign Out
        </button>
      </div>

      {/* Profile Header */}
      <div className="bg-slate-800/50 backdrop-blur-sm p-6 rounded-xl shadow-lg border border-slate-700 flex items-center space-x-6">
        <div 
          className="relative group w-24 h-24 bg-slate-700 rounded-full flex-shrink-0 flex items-center justify-center border-2 border-amber-400 cursor-pointer overflow-hidden"
          onClick={handleAvatarClick}
        >
          {userAvatar ? (
            <img src={userAvatar} alt="User Avatar" className="w-full h-full object-cover" />
          ) : (
            <UserIcon className="w-16 h-16 text-slate-400" />
          )}
          <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <CameraIcon className="w-8 h-8 text-white" />
          </div>
        </div>
        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleFileChange} 
          className="hidden" 
          accept="image/png, image/jpeg" 
        />
        
        <div className="flex-grow">
            <EditableProfileTitle title={userTitle} onSave={onSetTitle} onSuggest={handleSuggestTitle} />
            <p className="text-slate-400">{user.name} ({user.email})</p>
            <div className="mt-2 text-sm text-amber-300 bg-amber-500/10 px-3 py-1 rounded-full inline-block">
                Spiritual Rank: Apprentice
            </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {stats.map(stat => (
            <div key={stat.label} className="bg-slate-800/50 backdrop-blur-sm p-6 rounded-xl shadow-lg border border-slate-700">
                <div className="flex items-center space-x-4">
                    {stat.icon}
                    <div>
                        <p className="text-3xl font-bold text-white">{stat.value}</p>
                        <p className="text-slate-400">{stat.label}</p>
                    </div>
                </div>
            </div>
        ))}
      </div>

      {/* AI Growth Analyst */}
      <div className="bg-slate-800/50 backdrop-blur-sm p-6 rounded-xl shadow-lg border border-slate-700">
          <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-3">
              <SparklesIcon className="w-7 h-7 text-purple-400" />
              AI Growth Analyst
          </h2>
          {isAnalyzing ? (
              <div className="flex justify-center items-center h-24">
                  <Spinner />
                  <p className="ml-4 text-slate-400">Analyzing your journey...</p>
              </div>
          ) : analysis ? (
              <div className="space-y-6 animate-fade-in">
                  {/* Suggested Title */}
                  {analysis.suggestedTitle && (
                    <div className="bg-slate-900/50 p-4 rounded-lg text-center border border-amber-400/50">
                        <h3 className="font-semibold text-amber-400 text-sm uppercase tracking-wider">Suggested New Title</h3>
                        <p className="text-2xl font-bold text-white my-2">"{analysis.suggestedTitle}"</p>
                        <button 
                            onClick={() => {
                                onSetTitle(analysis.suggestedTitle);
                                setTitleAdopted(true);
                            }}
                            disabled={titleAdopted}
                            className="text-sm bg-slate-700 hover:bg-slate-600 text-slate-300 font-semibold py-1 px-4 rounded-full transition-colors disabled:bg-green-500/20 disabled:text-green-300 disabled:cursor-not-allowed"
                        >
                            {titleAdopted ? 'Title Adopted ✓' : 'Adopt this Title'}
                        </button>
                    </div>
                  )}

                  {/* Analysis Details */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <div className="space-y-4">
                          <div>
                              <h3 className="font-semibold text-amber-400 mb-1">Journey Summary:</h3>
                              <p className="text-slate-300 text-sm">{analysis.journeySummary}</p>
                          </div>
                          <div>
                              <h3 className="font-semibold text-amber-400 mb-1">AI Observation:</h3>
                              <p className="text-slate-300 text-sm">{analysis.encouragingObservation}</p>
                          </div>
                      </div>
                      <div className="bg-slate-700/50 p-4 rounded-lg">
                          <h3 className="font-semibold text-amber-400 mb-2">Suggested Next Step:</h3>
                          <p className="text-slate-300 text-sm">{analysis.nextStepSuggestion}</p>
                      </div>
                  </div>
                  
                  {/* Actions */}
                  <div className="flex justify-center pt-4 border-t border-slate-700">
                      <button onClick={() => setAnalysis(null)} className="text-sm text-slate-400 hover:text-white transition-colors">
                          Close Analysis
                      </button>
                  </div>
              </div>
          ) : (
              <div className="text-center py-4">
                <p className="text-slate-400 mb-6 max-w-xl mx-auto">Curious about your spiritual progress? Our AI can analyze your activity—sermons created, meditations completed, challenges conquered, and community engagement—to provide personalized insights and suggest your next steps.</p>
                {analysisError && <p className="text-red-400 mb-4">{analysisError}</p>}
                <button 
                    onClick={handleGetAnalysis}
                    className="bg-amber-500 text-slate-900 font-bold py-3 px-8 rounded-full hover:bg-amber-400 transition-all duration-300 transform hover:scale-105 shadow-lg flex items-center gap-3 mx-auto"
                >
                    <SparklesIcon className="w-6 h-6" />
                    Analyze My Journey
                </button>
              </div>
          )}
      </div>

      {/* Achievements */}
      <div>
        <h2 className="text-2xl font-bold text-white mb-4">My Achievements 🏆</h2>
        <div className="bg-slate-800/50 backdrop-blur-sm p-6 rounded-xl shadow-lg border border-slate-700">
          {myAchievements.length > 0 ? (
            <ul className="space-y-4">
              {myAchievements.map(challenge => (
                <li key={challenge.id} className="p-4 bg-slate-700/50 rounded-lg flex items-center space-x-4">
                  <span className="text-3xl">{challenge.emoji}</span>
                  <div>
                    <h3 className="font-semibold text-white">{challenge.title}</h3>
                    <p className="text-sm text-slate-400">Reward: <span className="text-amber-400">{challenge.reward}</span></p>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-slate-400 text-center py-8">You haven't unlocked any achievements yet. Complete some challenges to begin your collection!</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Profile;