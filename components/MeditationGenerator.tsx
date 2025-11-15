import React, { useState, useEffect, useCallback } from 'react';
import { generateMeditation, generateMeditationVideo, generateIcsForMeditation, generateMeditationAudio, suggestMeditationGoal, suggestMeditationAudioStyles, suggestMeditationVideoStyles, generateMeditationPoster, getMeditationThemes } from '../services/geminiService';
import { MeditationContent, User, ScheduledMeditation, MeditationTheme } from '../types';
import Spinner from './Spinner';
import { VideoIcon, AudioIcon, SparklesIcon, HourglassIcon, CalendarPlusIcon, DownloadIcon, PhotoIcon, CheckCircleIcon } from './Icons';
import AITimer from './AITimer';
import ScheduleMeditationModal from './ScheduleMeditationModal';

interface MeditationGeneratorProps {
  onMeditationGenerated: (goal: string) => void;
  user: User;
}

type Step = 'goal' | 'generate' | 'result';

interface StyleSuggestion {
  title: string;
  description: string;
}

// FIX: Added 'export' to create a named export, resolving an import error in AppLayout.tsx.
export const MeditationGenerator: React.FC<MeditationGeneratorProps> = ({ onMeditationGenerated, user }) => {
  const [step, setStep] = useState<Step>('goal');
  const [goal, setGoal] = useState('');
  const [customGoal, setCustomGoal] = useState('');
  const [length, setLength] = useState('5-minute');
  const [meditationContent, setMeditationContent] = useState<MeditationContent | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingSuggestion, setLoadingSuggestion] = useState(false);
  const [error, setError] = useState('');
  const [showRewardMessage, setShowRewardMessage] = useState(false);

  const [isGeneratingVideo, setIsGeneratingVideo] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [videoError, setVideoError] = useState('');
  const [videoStatus, setVideoStatus] = useState('');
  const [videoGenerationProgress, setVideoGenerationProgress] = useState(0);
  const [videoStyles, setVideoStyles] = useState<StyleSuggestion[] | null>(null);
  const [selectedVideoStyle, setSelectedVideoStyle] = useState<string>('');
  const [isSuggestingVideoStyles, setIsSuggestingVideoStyles] = useState(false);
  const [videoStyleError, setVideoStyleError] = useState('');

  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioError, setAudioError] = useState('');
  const [audioStatus, setAudioStatus] = useState('');
  const [audioStyles, setAudioStyles] = useState<StyleSuggestion[] | null>(null);
  const [selectedAudioStyle, setSelectedAudioStyle] = useState<string>('');
  const [isSuggestingAudioStyles, setIsSuggestingAudioStyles] = useState(false);
  const [audioStyleError, setAudioStyleError] = useState('');
  
  const [isGeneratingPoster, setIsGeneratingPoster] = useState(false);
  const [posterImage, setPosterImage] = useState<string | null>(null);
  const [posterMimeType, setPosterMimeType] = useState<'image/jpeg' | 'image/png'>('image/jpeg');
  const [selectedPosterType, setSelectedPosterType] = useState<'image/jpeg' | 'image/png'>('image/jpeg');
  const [selectedAspectRatio, setSelectedAspectRatio] = useState<'3:4' | '16:9'>('3:4');
  const [posterError, setPosterError] = useState('');


  const [showTimer, setShowTimer] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [isScheduling, setIsScheduling] = useState(false);

  const [themes, setThemes] = useState<MeditationTheme[] | null>(null);
  const [loadingThemes, setLoadingThemes] = useState(true);

  useEffect(() => {
    // Cleanup for generated video object URLs to prevent memory leaks
    return () => {
        if (videoUrl) {
            URL.revokeObjectURL(videoUrl);
        }
    };
  }, [videoUrl]);

  useEffect(() => {
    const fetchThemes = async () => {
        setLoadingThemes(true);
        setError('');
        const result = await getMeditationThemes();
        if (result === 'QUOTA_EXCEEDED') {
            setError('Could not load meditation themes due to quota limits. Please try again later.');
        } else if (result) {
            setThemes(result);
        } else {
            setError('Could not load meditation themes. Please refresh.');
        }
        setLoadingThemes(false);
    };

    if (step === 'goal') {
        fetchThemes();
    }
  }, [step]);


  const handleGoalSelect = (selectedGoal: string) => {
    setGoal(selectedGoal);
    setError('');
    setStep('generate');
  };

  const handleSuggestGoal = async () => {
    setLoadingSuggestion(true);
    setError('');
    const suggestion = await suggestMeditationGoal();
    if (suggestion) {
      setCustomGoal(suggestion);
    } else {
      setError('Could not suggest a goal right now. Please try again.');
    }
    setLoadingSuggestion(false);
  };

  const resetFlow = () => {
    setStep('goal');
    setGoal('');
    setCustomGoal('');
    setMeditationContent(null);
    setError('');
    setLoading(false);
    setShowTimer(false);
    setShowScheduleModal(false);
    setVideoUrl(null);
    setVideoError('');
    setVideoStyles(null);
    setSelectedVideoStyle('');
    setIsSuggestingVideoStyles(false);
    setVideoStyleError('');
    setAudioUrl(null);
    setAudioError('');
    setAudioStatus('');
    setAudioStyles(null);
    setSelectedAudioStyle('');
    setIsSuggestingAudioStyles(false);
    setAudioStyleError('');
    setShowRewardMessage(false);
    setPosterImage(null);
    setPosterError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!goal) {
      setError('Please enter a theme.');
      return;
    }
    setError('');
    setLoading(true);
    setMeditationContent(null);
    setShowTimer(false);
    setShowScheduleModal(false);
    
    setVideoUrl(null);
    setVideoError('');
    setIsGeneratingVideo(false);
    setVideoStatus('');
    setVideoGenerationProgress(0);
    setVideoStyles(null);
    setSelectedVideoStyle('');
    setIsSuggestingVideoStyles(false);
    setVideoStyleError('');
    
    setAudioUrl(null);
    setAudioError('');
    setIsGeneratingAudio(false);
    setAudioStatus('');
    setAudioStyles(null);
    setSelectedAudioStyle('');
    setIsSuggestingAudioStyles(false);
    setAudioStyleError('');
    
    setPosterImage(null);
    setPosterError('');
    setIsGeneratingPoster(false);

    const result = await generateMeditation(goal, length);
    if (result === 'QUOTA_EXCEEDED') {
        setError('Meditation generation quota has been reached. Please try again later.');
    } else if (result) {
      setMeditationContent(result);
      onMeditationGenerated(goal);
      setShowRewardMessage(true);
      setTimeout(() => setShowRewardMessage(false), 3000);
      setStep('result');
    } else {
      setError('Failed to generate meditation script. Please try again.');
    }
    setLoading(false);
  };

  const handleSuggestVideoStyles = useCallback(async () => {
    if (!meditationContent?.meditationScript) return;
    setIsSuggestingVideoStyles(true);
    setVideoStyles(null);
    setSelectedVideoStyle('');
    setVideoStyleError('');
    setVideoUrl(null);
    setVideoError('');
  
    const styles = await suggestMeditationVideoStyles(meditationContent.meditationScript);
    
    if (styles) {
      setVideoStyles(styles);
    } else {
      setVideoStyleError('Could not suggest video styles. Please try again.');
    }
    setIsSuggestingVideoStyles(false);
  }, [meditationContent]);

  const handleGenerateVideo = async () => {
    if (!meditationContent?.videoPrompt || !selectedVideoStyle) return;
  
    setIsGeneratingVideo(true);
    setVideoUrl(null);
    setVideoError('');
    setVideoGenerationProgress(0);
  
    const statusMessages = [
      "Casting the visual scene...",
      "Rendering the tranquil flow...",
      "Weaving together light and sound...",
      "This can take a few minutes...",
      "Finalizing your visual journey...",
      "Almost there, preparing your video...",
    ];
    let messageIndex = 0;
    setVideoStatus(statusMessages[messageIndex]);
    const statusInterval = setInterval(() => {
      messageIndex = (messageIndex + 1) % statusMessages.length;
      setVideoStatus(statusMessages[messageIndex]);
    }, 7000);
  
    const onProgress = (progress: number) => {
      setVideoGenerationProgress(progress);
    };

    const url = await generateMeditationVideo(meditationContent.videoPrompt, selectedVideoStyle, onProgress);
  
    clearInterval(statusInterval);
  
    if (url === 'QUOTA_EXCEEDED') {
        setVideoError('The video generation quota has been reached. Please try again later.');
    } else if (url) {
        setVideoUrl(url);
    } else {
        setVideoError('Failed to generate meditation video. Please try again.');
    }
    setIsGeneratingVideo(false);
    setVideoStatus('');
  };
  
  const handleSuggestAudioStyles = useCallback(async () => {
    if (!meditationContent?.meditationScript) return;
    setIsSuggestingAudioStyles(true);
    setAudioStyles(null);
    setSelectedAudioStyle('');
    setAudioStyleError('');
    setAudioUrl(null);
    setAudioError('');
  
    const styles = await suggestMeditationAudioStyles(meditationContent.meditationScript);
    
    if (styles) {
      setAudioStyles(styles);
    } else {
      setAudioStyleError('Could not suggest audio styles. Please try again.');
    }
    setIsSuggestingAudioStyles(false);
  }, [meditationContent]);

  useEffect(() => {
    if (meditationContent && step === 'result') {
      handleSuggestAudioStyles();
      handleSuggestVideoStyles();
    }
  }, [meditationContent, step, handleSuggestAudioStyles, handleSuggestVideoStyles]);

  const handleGenerateAudio = async () => {
    if (!meditationContent?.meditationScript || !selectedAudioStyle) return;
    
    setIsGeneratingAudio(true);
    setAudioUrl(null);
    setAudioError('');
    
    const statusMessages = [
      "The AI is warming up its vocal cords...",
      "Finding a perfectly tranquil tone...",
      "Narrating your script with a soothing voice...",
      "Adding gentle, ambient soundscapes...",
      "Mixing the final audio for you...",
    ];
    let messageIndex = 0;
    setAudioStatus(statusMessages[messageIndex]);
    const statusInterval = setInterval(() => {
      messageIndex = (messageIndex + 1) % statusMessages.length;
      setAudioStatus(statusMessages[messageIndex]);
    }, 2000);

    const result = await generateMeditationAudio(meditationContent.meditationScript, selectedAudioStyle);
    
    clearInterval(statusInterval);

    if (result) {
        setAudioUrl(result);
    } else {
        setAudioError('Failed to generate audio narration. Please try again.');
    }
    setIsGeneratingAudio(false);
    setAudioStatus('');
  };

  const handleGeneratePoster = async () => {
    if (!meditationContent?.meditationScript) return;

    setIsGeneratingPoster(true);
    setPosterImage(null);
    setPosterError('');

    const result = await generateMeditationPoster(meditationContent.meditationScript, selectedPosterType, selectedAspectRatio);

    if (result && result.imageBytes) {
      setPosterImage(result.imageBytes);
      setPosterMimeType(result.mimeType);
    } else {
      setPosterError('Failed to generate poster. Please try again.');
    }
    setIsGeneratingPoster(false);
  };
  
  const handleDownloadScript = () => {
    if (!meditationContent) return;
    const blob = new Blob([meditationContent.meditationScript], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${goal.replace(/\s+/g, '_')}_meditation_script.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleDownloadPoster = () => {
    if (!posterImage || !goal) return;
    const extension = posterMimeType === 'image/png' ? 'png' : 'jpeg';
    const link = document.createElement('a');
    link.href = `data:${posterMimeType};base64,${posterImage}`;
    link.download = `${goal.replace(/\s+/g, '_')}_poster.${extension}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleConfirmSchedule = async (dateTime: Date) => {
    if (!meditationContent) return;
    setIsScheduling(true);

    const newScheduledMeditation: ScheduledMeditation = {
        id: `med-${Date.now()}`,
        theme: goal,
        script: meditationContent.meditationScript,
        scheduledTime: dateTime.toISOString(),
        duration: length,
    };

    // Save to localStorage
    try {
        const key = `scheduledMeditations_${user.id}`;
        const existing = localStorage.getItem(key);
        const scheduled = existing ? JSON.parse(existing) : [];
        scheduled.push(newScheduledMeditation);
        localStorage.setItem(key, JSON.stringify(scheduled));
    } catch (e) {
        console.error("Failed to save scheduled meditation to localStorage", e);
    }
    
    // Generate and download ICS
    const icsContent = await generateIcsForMeditation(newScheduledMeditation);
    if (icsContent) {
        const blob = new Blob([icsContent], { type: 'text/calendar' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `Meditation_${goal.replace(/ /g, '_')}.ics`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    } else {
        alert('Could not generate the calendar file for your meditation. Please try again.');
    }

    setIsScheduling(false);
    setShowScheduleModal(false);
  };

  const renderGoalSelection = () => (
    <div className="bg-slate-800/50 backdrop-blur-sm p-6 rounded-xl shadow-lg border border-slate-700 space-y-6 animate-fade-in-short">
      <h2 className="text-2xl font-bold text-white text-center">Welcome. What is your intention for today's meditation?</h2>
      
      {loadingThemes ? (
        <div className="flex justify-center items-center h-64"><Spinner /></div>
      ) : error ? (
        <p className="text-red-400 text-center">{error}</p>
      ) : themes ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {themes.map((theme, index) => (
            <button
              key={index}
              onClick={() => handleGoalSelect(theme.title)}
              className="relative aspect-square rounded-xl overflow-hidden group border-2 border-transparent hover:border-amber-400 focus:border-amber-400 transition-all duration-300 transform hover:scale-105 focus:scale-105"
            >
              <img src={`data:image/jpeg;base64,${theme.image}`} alt={theme.title} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent flex flex-col justify-end text-left p-4">
                <h3 className="text-lg font-bold text-white drop-shadow-md">{theme.title}</h3>
                <p className="text-sm text-slate-200 opacity-0 group-hover:opacity-100 transition-opacity duration-300 drop-shadow-md">"{theme.quote}"</p>
              </div>
            </button>
          ))}
        </div>
      ) : (
        <p className="text-slate-400 text-center">No themes available.</p>
      )}

      {/* Keep the custom goal input as a fallback or alternative */}
      <div className="relative flex py-2 items-center">
        <div className="flex-grow border-t border-slate-600"></div>
        <span className="flex-shrink mx-4 text-slate-400">OR</span>
        <div className="flex-grow border-t border-slate-600"></div>
      </div>
      <div className="space-y-4">
        <div>
          <label htmlFor="customGoal" className="block text-sm font-medium text-slate-300 mb-1">Enter a custom goal...</label>
          <form onSubmit={(e) => { e.preventDefault(); if (customGoal.trim()) handleGoalSelect(customGoal); }} className="flex items-center gap-2">
            <input
              type="text"
              id="customGoal"
              value={customGoal}
              onChange={(e) => setCustomGoal(e.target.value)}
              placeholder="e.g., 'Cultivate self-compassion'"
              className="w-full bg-slate-700 border border-slate-600 rounded-md p-2 text-white focus:ring-amber-400 focus:border-amber-400"
            />
             <button type="submit" disabled={!customGoal.trim()} className="bg-amber-500 text-slate-900 font-bold py-2 px-4 rounded-md hover:bg-amber-400 transition-colors disabled:opacity-50">
              Go
            </button>
          </form>
        </div>
        <button
          onClick={handleSuggestGoal}
          disabled={loadingSuggestion}
          className="w-full flex items-center justify-center gap-2 bg-purple-500/20 text-purple-300 hover:bg-purple-500/30 font-semibold py-2 px-4 rounded-md transition-colors disabled:opacity-50"
        >
          {loadingSuggestion ? <Spinner /> : <SparklesIcon className="w-5 h-5" />}
          Suggest a Custom Goal for Me
        </button>
      </div>
    </div>
  );
  
  const renderGeneratorForm = () => (
    <form onSubmit={handleSubmit} className="bg-slate-800/50 backdrop-blur-sm p-6 rounded-xl shadow-lg border border-slate-700 space-y-4 animate-fade-in-short">
      <button type="button" onClick={() => setStep('goal')} className="text-sm text-slate-400 hover:text-white transition-colors mb-2">‹ Back to goals</button>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="theme" className="block text-sm font-medium text-slate-300 mb-1">Goal</label>
          <input
            type="text"
            id="theme"
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            className="w-full bg-slate-700 border border-slate-600 rounded-md p-2 text-white focus:ring-amber-400 focus:border-amber-400"
          />
        </div>
        <div>
          <label htmlFor="length" className="block text-sm font-medium text-slate-300 mb-1">Length</label>
          <select id="length" value={length} onChange={(e) => setLength(e.target.value)} className="w-full bg-slate-700 border border-slate-600 rounded-md p-2 text-white focus:ring-amber-400 focus:border-amber-400">
            <option>3-minute</option>
            <option>5-minute</option>
            <option>10-minute</option>
            <option>15-minute</option>
          </select>
        </div>
      </div>
      {error && <p className="text-red-400">{error}</p>}
      <button type="submit" disabled={loading} className="w-full bg-amber-500 text-slate-900 font-bold py-3 px-4 rounded-md hover:bg-amber-400 transition-colors disabled:bg-slate-600 flex items-center justify-center">
        {loading ? <Spinner /> : 'Generate Meditation'}
      </button>
    </form>
  );

  const renderResult = () => (
    meditationContent && (
      <div className="bg-slate-800/50 backdrop-blur-sm p-6 rounded-xl shadow-lg border border-slate-700 animate-fade-in">
        {/* Header and Script */}
        <div>
          <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-4 gap-3">
            <h2 className="text-2xl font-bold">Your Guided Meditation: "{goal}"</h2>
            <button onClick={resetFlow} className="text-sm text-slate-400 hover:text-white transition-colors self-start sm:self-center flex-shrink-0">‹ Start a new meditation</button>
          </div>
          <div className="prose prose-invert max-w-none text-slate-300 bg-slate-900/50 p-4 rounded-lg whitespace-pre-wrap leading-relaxed">
            {meditationContent.meditationScript}
          </div>
           <div className="mt-4">
            <button
              onClick={handleDownloadScript}
              className="flex items-center gap-2 px-4 py-2 bg-slate-700 text-slate-300 rounded-lg hover:bg-slate-600 hover:text-white transition-colors text-sm font-semibold"
            >
              <DownloadIcon className="w-5 h-5" />
              Download Script (.txt)
            </button>
          </div>
        </div>

        {/* Multimedia Agents & Tools */}
        <div className="pt-6 border-t border-slate-700 space-y-8">
          <div>
            <h3 className="text-xl font-semibold text-amber-400 mb-4">Enhance Your Session</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Video Card */}
              <div className="bg-slate-700/50 p-4 rounded-lg flex flex-col">
                <h4 className="font-semibold text-lg flex items-center mb-2"><VideoIcon className="w-6 h-6 mr-2 text-blue-400"/> Immersive Visuals</h4>
                <div className="flex-grow flex flex-col justify-center">
                  {isGeneratingVideo ? (
                      <div className="flex flex-col items-center justify-center p-6 space-y-3 bg-slate-800 rounded-lg">
                          <p className="text-slate-300 font-semibold">{videoStatus}</p>
                          <div className="w-full bg-slate-700 rounded-full h-2.5"><div className="bg-amber-400 h-2.5 rounded-full" style={{ width: `${videoGenerationProgress}%` }}></div></div>
                          <p className="text-lg font-bold text-white">{videoGenerationProgress}%</p>
                          <p className="text-xs text-slate-500">Video generation may take minutes.</p>
                      </div>
                  ) : videoError ? (
                      <div className="text-red-300 text-center p-4">{videoError}</div>
                  ) : videoUrl ? (
                      <div className="aspect-video rounded-lg overflow-hidden"><video src={videoUrl} controls autoPlay loop className="w-full h-full object-cover" /></div>
                  ) : (
                    <div className="space-y-4">
                        {isSuggestingVideoStyles ? <div className="flex justify-center"><Spinner /></div> : videoStyleError ? <p className="text-red-300">{videoStyleError}</p> : videoStyles && (
                          <div className="w-full space-y-3 animate-fade-in-short">
                             <p className="text-sm font-medium text-slate-300">Choose a visual style:</p>
                             <div className="thin-scrollbar flex gap-4 overflow-x-auto py-2 -mx-4 px-4">
                                {videoStyles.map((style, index) => {
                                    const isSelected = selectedVideoStyle === style.description;
                                    return (
                                        <button
                                            key={index}
                                            onClick={() => setSelectedVideoStyle(style.description)}
                                            className={`relative flex-shrink-0 w-56 text-left p-4 rounded-xl border-2 transition-all duration-300 flex flex-col group ${
                                                isSelected
                                                    ? 'bg-blue-500/20 border-blue-400 shadow-lg scale-105'
                                                    : 'bg-slate-900/60 border-slate-700 hover:border-slate-500 hover:-translate-y-1'
                                            }`}
                                        >
                                            {isSelected && (
                                                <div className="absolute top-2 right-2 w-6 h-6 bg-slate-800 rounded-full flex items-center justify-center">
                                                    <CheckCircleIcon className="w-6 h-6 text-blue-400" />
                                                </div>
                                            )}
                                            <h5 className="font-bold text-lg text-white mb-2 transition-colors group-hover:text-amber-300 pr-6">{style.title}</h5>
                                            <p className="text-slate-400 text-sm flex-grow">{style.description}</p>
                                        </button>
                                    )
                                })}
                             </div>
                             <button onClick={handleGenerateVideo} disabled={!selectedVideoStyle} className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-500/20 text-blue-300 hover:bg-blue-500/30 font-semibold rounded-lg disabled:opacity-50">
                                 <SparklesIcon className="w-5 h-5" /> Generate Video
                             </button>
                          </div>
                        )}
                    </div>
                  )}
                </div>
              </div>

              {/* Audio Card */}
               <div className="bg-slate-700/50 p-4 rounded-lg flex flex-col">
                 <h4 className="font-semibold text-lg flex items-center mb-2"><AudioIcon className="w-6 h-6 mr-2 text-green-400"/> Guided Narration</h4>
                  <div className="flex-grow flex flex-col justify-center">
                     {isGeneratingAudio ? (
                        <div className="flex flex-col items-center justify-center p-6 space-y-3"><Spinner /><p className="text-slate-300 font-semibold text-center">{audioStatus}</p></div>
                     ) : audioError ? (
                        <div className="text-red-300 text-center p-4">{audioError}</div>
                     ) : audioUrl ? (
                         <audio controls src={audioUrl} className="w-full"></audio>
                     ) : (
                       <div className="space-y-4">
                         {isSuggestingAudioStyles ? <div className="flex justify-center"><Spinner /></div> : audioStyleError ? <p className="text-red-300">{audioStyleError}</p> : audioStyles && (
                           <div className="w-full space-y-3 animate-fade-in-short">
                             <p className="text-sm font-medium text-slate-300">Choose an audio style:</p>
                              <div className="thin-scrollbar flex gap-4 overflow-x-auto py-2 -mx-4 px-4">
                                 {audioStyles.map((style, index) => {
                                     const isSelected = selectedAudioStyle === style.description;
                                     return (
                                        <button
                                            key={index}
                                            onClick={() => setSelectedAudioStyle(style.description)}
                                            className={`relative flex-shrink-0 w-56 text-left p-4 rounded-xl border-2 transition-all duration-300 flex flex-col group ${
                                                isSelected
                                                    ? 'bg-green-500/20 border-green-400 shadow-lg scale-105'
                                                    : 'bg-slate-900/60 border-slate-700 hover:border-slate-500 hover:-translate-y-1'
                                            }`}
                                        >
                                            {isSelected && (
                                                <div className="absolute top-2 right-2 w-6 h-6 bg-slate-800 rounded-full flex items-center justify-center">
                                                    <CheckCircleIcon className="w-6 h-6 text-green-400" />
                                                </div>
                                            )}
                                            <h5 className="font-bold text-lg text-white mb-2 transition-colors group-hover:text-amber-300 pr-6">{style.title}</h5>
                                            <p className="text-slate-400 text-sm flex-grow">{style.description}</p>
                                        </button>
                                     )
                                 })}
                              </div>
                             <button onClick={handleGenerateAudio} disabled={!selectedAudioStyle} className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-green-500/20 text-green-300 hover:bg-green-500/30 font-semibold rounded-lg disabled:opacity-50">
                                 <SparklesIcon className="w-5 h-5" /> Generate Audio
                             </button>
                           </div>
                         )}
                       </div>
                     )}
                   </div>
               </div>
            </div>
          </div>
          
          {/* Tools: Timer and Poster */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-slate-700/50 p-4 rounded-lg flex flex-col">
              <h4 className="font-semibold text-lg flex items-center mb-2"><HourglassIcon className="w-6 h-6 mr-2 text-purple-400"/> AI Guided Timer</h4>
              <p className="text-slate-400 text-sm mb-4 flex-grow">Start an immersive timer that displays instructions from the script at the right moments.</p>
              <button onClick={() => setShowTimer(true)} className="mt-auto w-full flex items-center justify-center gap-2 px-4 py-2 bg-purple-500/20 text-purple-300 hover:bg-purple-500/30 font-semibold rounded-lg transition-colors">Start Timed Session</button>
            </div>
            
             <div className="bg-slate-700/50 p-4 rounded-lg flex flex-col">
                <h4 className="font-semibold text-lg flex items-center mb-2"><PhotoIcon className="w-6 h-6 mr-2 text-pink-400"/> AI Poster Generator</h4>
                <p className="text-slate-400 text-sm mb-4 flex-grow">Create a unique poster representing your meditation's theme.</p>
                {isGeneratingPoster ? <div className="flex justify-center"><Spinner/></div> : posterError ? <p className="text-red-400">{posterError}</p> : posterImage ? (
                  <div className="space-y-2 text-center">
                    <img src={`data:${posterMimeType};base64,${posterImage}`} alt="Generated Poster" className="rounded-lg max-h-32 mx-auto"/>
                    <button onClick={handleDownloadPoster} className="text-xs flex items-center gap-1 px-2 py-1 bg-slate-600 rounded-md mx-auto"><DownloadIcon className="w-4 h-4"/> Download</button>
                  </div>
                ) : (
                    <div className="space-y-2 mt-auto">
                        <div className="grid grid-cols-2 gap-2 text-sm">
                            <select value={selectedPosterType} onChange={e => setSelectedPosterType(e.target.value as any)} className="w-full bg-slate-800 border-slate-600 rounded-md p-1 text-white"><option value="image/jpeg">JPEG</option><option value="image/png">PNG</option></select>
                            <select value={selectedAspectRatio} onChange={e => setSelectedAspectRatio(e.target.value as any)} className="w-full bg-slate-800 border-slate-600 rounded-md p-1 text-white"><option value="3:4">Portrait</option><option value="16:9">Landscape</option></select>
                        </div>
                        <button onClick={handleGeneratePoster} className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-pink-500/20 text-pink-300 hover:bg-pink-500/30 font-semibold rounded-lg transition-colors"><SparklesIcon className="w-5 h-5" /> Generate Poster</button>
                    </div>
                )}
             </div>
          </div>
           {showTimer && <AITimer script={meditationContent.meditationScript} duration={length} onClose={() => setShowTimer(false)} audioUrl={audioUrl} />}
          {showScheduleModal && <ScheduleMeditationModal isOpen={true} onClose={() => setShowScheduleModal(false)} onConfirm={handleConfirmSchedule} theme={goal} isScheduling={isScheduling}/>}
        </div>
      </div>
    )
  );

  return (
    <div className="animate-fade-in space-y-8">
      {showRewardMessage && (
        <div className="mb-4 p-3 bg-green-500/20 border border-green-500 text-green-300 rounded-lg text-center animate-fade-in">
            +1 Meditation Completed! Your progress has been updated in 'My Journey'.
        </div>
      )}
      <div>
        <h1 className="text-3xl sm:text-4xl font-bold text-white">AI-Guided Meditation</h1>
        <p className="mt-2 text-lg text-slate-400">Find your center with a meditation experience crafted just for you. 🧘‍♀️</p>
      </div>

      {step === 'goal' && renderGoalSelection()}
      {step === 'generate' && renderGeneratorForm()}
      {step === 'result' && renderResult()}
    </div>
  );
};
