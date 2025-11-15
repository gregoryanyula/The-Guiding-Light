import React, { useState, useEffect, useCallback } from 'react';
import { generatePrayer, generatePrayerAudio, generateSermonVideo, suggestPrayerAudioStyles, suggestPrayerVideoStyles, generatePrayerPoster, ensureVeoApiKey } from '../services/geminiService';
import { PrayerContent, User } from '../types';
import Spinner from './Spinner';
import { VideoIcon, AudioIcon, DownloadIcon, ClipboardIcon, SparklesIcon, PhotoIcon, CheckCircleIcon } from './Icons';

interface PrayerGeneratorProps {
  user: User;
  onPrayerGenerated: () => void;
  onAddToLibrary: (name: string, content: string, mimeType: string) => Promise<void>;
  addToast: (message: string) => void;
}

interface StyleSuggestion {
  title: string;
  description: string;
}

// FIX: Changed to a named export to resolve import error in AppLayout.tsx.
export const PrayerGenerator: React.FC<PrayerGeneratorProps> = ({ user, onPrayerGenerated, onAddToLibrary, addToast }) => {
  const [topic, setTopic] = useState('A Prayer for Peace');
  const [length, setLength] = useState('1-minute');
  const [tone, setTone] = useState('reverent');
  const [prayerContent, setPrayerContent] = useState<PrayerContent | null>({
    prayerText: "In moments of shadow and doubt, when the path is unclear and my heart is heavy, I seek Your light. Grant me the serenity to accept the things I cannot change, the courage to change the things I can, and the wisdom to know the difference. Let a wave of peace wash over me, calming the storms within. May I find strength not in the absence of struggle, but in the presence of Your unwavering guidance. Fill me with a gentle, hopeful spirit, that I may be a beacon of calm for others. Amen.",
    videoPrompt: 'Abstract, soft-focus visuals of light gently breaking through clouds, with shimmering particles of gold and blue, creating a feeling of hope and tranquility.',
    audioPrompt: 'A gentle, hopeful voice with a soft, instrumental background.'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [copySuccess, setCopySuccess] = useState('');
  const [showRewardMessage, setShowRewardMessage] = useState(false);

  // Multimedia State
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioError, setAudioError] = useState('');
  const [audioStatus, setAudioStatus] = useState('');
  const [audioStyles, setAudioStyles] = useState<StyleSuggestion[] | null>(null);
  const [selectedAudioStyle, setSelectedAudioStyle] = useState<string>('');
  const [isSuggestingAudioStyles, setIsSuggestingAudioStyles] = useState(false);
  const [audioStyleError, setAudioStyleError] = useState('');

  const [isGeneratingVideo, setIsGeneratingVideo] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [videoError, setVideoError] = useState('');
  const [videoStatus, setVideoStatus] = useState('');
  const [videoGenerationProgress, setVideoGenerationProgress] = useState(0);
  const [videoStyles, setVideoStyles] = useState<StyleSuggestion[] | null>(null);
  const [selectedVideoStyle, setSelectedVideoStyle] = useState<string>('');
  const [isSuggestingVideoStyles, setIsSuggestingVideoStyles] = useState(false);
  const [videoStyleError, setVideoStyleError] = useState('');
  const [videoAspectRatio, setVideoAspectRatio] = useState<'16:9' | '9:16'>('16:9');

  const [isGeneratingPoster, setIsGeneratingPoster] = useState(false);
  const [posterImage, setPosterImage] = useState<string | null>(null);
  const [posterMimeType, setPosterMimeType] = useState<'image/jpeg' | 'image/png'>('image/jpeg');
  const [selectedPosterType, setSelectedPosterType] = useState<'image/jpeg' | 'image/png'>('image/jpeg');
  const [selectedAspectRatio, setSelectedAspectRatio] = useState<'3:4' | '16:9'>('3:4');
  const [posterError, setPosterError] = useState('');

  useEffect(() => {
    return () => {
      if (videoUrl) {
        URL.revokeObjectURL(videoUrl);
      }
    };
  }, [videoUrl]);
  
  const handleSuggestVideoStyles = useCallback(async () => {
    if (!prayerContent?.prayerText) return;
    setIsSuggestingVideoStyles(true);
    setVideoStyles(null);
    setSelectedVideoStyle('');
    setVideoStyleError('');
    setVideoUrl(null);
    setVideoError('');
    const styles = await suggestPrayerVideoStyles(prayerContent.prayerText);
    if (styles) {
      setVideoStyles(styles);
    } else {
      setVideoStyleError('Could not suggest video styles.');
    }
    setIsSuggestingVideoStyles(false);
  }, [prayerContent]);

  const handleSuggestAudioStyles = useCallback(async () => {
    if (!prayerContent?.prayerText) return;
    setIsSuggestingAudioStyles(true);
    setAudioStyles(null);
    setSelectedAudioStyle('');
    setAudioStyleError('');
    setAudioUrl(null);
    setAudioError('');
    const styles = await suggestPrayerAudioStyles(prayerContent.prayerText);
    if (styles) {
        setAudioStyles(styles);
    } else {
        setAudioStyleError('Could not suggest audio styles.');
    }
    setIsSuggestingAudioStyles(false);
  }, [prayerContent]);

  const handleGenerateAudio = useCallback(async () => {
    if (!prayerContent?.prayerText || !selectedAudioStyle) return;
    setIsGeneratingAudio(true); setAudioUrl(null); setAudioError('');
    const statusMessages = ["Finding a reverent tone...", "Narrating your prayer...", "Adding a gentle soundscape..."];
    let i = 0; setAudioStatus(statusMessages[i]);
    const interval = setInterval(() => { i = (i + 1) % statusMessages.length; setAudioStatus(statusMessages[i]); }, 2000);
    const result = await generatePrayerAudio(prayerContent.prayerText, selectedAudioStyle);
    clearInterval(interval);
    if (result) { setAudioUrl(result); }
    else { setAudioError('Failed to generate audio. Please try again.'); }
    setIsGeneratingAudio(false); setAudioStatus('');
  }, [prayerContent?.prayerText, selectedAudioStyle]);

  useEffect(() => {
    if (prayerContent) {
      handleSuggestVideoStyles();
      handleSuggestAudioStyles();
      // Auto-select the style on initial load
      const requestedAudioStyle = 'A gentle, hopeful voice with a soft, instrumental background.';
      setSelectedAudioStyle(requestedAudioStyle);
    }
  }, [prayerContent, handleSuggestVideoStyles, handleSuggestAudioStyles]);
  
  // This new effect will trigger generation when a style is selected
  useEffect(() => {
    if (selectedAudioStyle && !audioUrl && !isGeneratingAudio) {
      handleGenerateAudio();
    }
  }, [selectedAudioStyle, audioUrl, isGeneratingAudio, handleGenerateAudio]);


  const resetMultimediaState = () => {
    setAudioUrl(null); setAudioError(''); setIsGeneratingAudio(false); setAudioStatus(''); setAudioStyles(null); setSelectedAudioStyle(''); setIsSuggestingAudioStyles(false); setAudioStyleError('');
    setVideoUrl(null); setVideoError(''); setIsGeneratingVideo(false); setVideoStatus(''); setVideoGenerationProgress(0); setVideoStyles(null); setSelectedVideoStyle(''); setIsSuggestingVideoStyles(false); setVideoStyleError('');
    setPosterImage(null); setPosterError(''); setIsGeneratingPoster(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic) {
      setError('Please enter a topic for your prayer.');
      return;
    }
    setError('');
    setLoading(true);
    setPrayerContent(null);
    setCopySuccess('');
    resetMultimediaState();

    const result = await generatePrayer(topic, length, tone);
    // FIX: Handle 'QUOTA_EXCEEDED' case before setting state or accessing properties.
    if (result === 'QUOTA_EXCEEDED') {
      setError('Prayer generation quota has been reached. Please try again later.');
    } else if (result) {
      setPrayerContent(result);
      try {
        const textBase64 = btoa(unescape(encodeURIComponent(result.prayerText)));
        await onAddToLibrary(`Prayer: ${topic}`, textBase64, 'text/plain');
      } catch (e) {
        console.error("Failed to save prayer text to library", e);
      }
      onPrayerGenerated();
      setShowRewardMessage(true);
      setTimeout(() => setShowRewardMessage(false), 3000);
    } else {
      setError('Failed to generate prayer. Please try again.');
    }
    setLoading(false);
  };

  const handleCopyToClipboard = (text: string, message: string) => {
    navigator.clipboard.writeText(text).then(() => {
        setCopySuccess(message);
        setTimeout(() => setCopySuccess(''), 2000);
    });
  };
  
  const handleDownload = () => {
    if (!prayerContent) return;
    const blob = new Blob([prayerContent.prayerText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${topic.replace(/\s+/g, '_')}_prayer.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleGenerateVideo = async () => {
    if (!prayerContent?.prayerText || !selectedVideoStyle) return;
    setIsGeneratingVideo(true); setVideoUrl(null); setVideoError(''); setVideoGenerationProgress(0);
    
    const keyReady = await ensureVeoApiKey();
    if (!keyReady) {
        setVideoError("API Key selection is required for video generation. Please select a key via the button and retry.");
        setIsGeneratingVideo(false);
        return;
    }

    const statusMessages = ["Casting a serene scene...", "Rendering ethereal light...", "This can take a few minutes...", "Finalizing your visual prayer..."];
    let i = 0; setVideoStatus(statusMessages[i]);
    const interval = setInterval(() => { i = (i + 1) % statusMessages.length; setVideoStatus(statusMessages[i]); }, 7000);
    const url = await generateSermonVideo(prayerContent.prayerText, selectedVideoStyle, setVideoGenerationProgress, videoAspectRatio);
    clearInterval(interval);
    if (url === 'QUOTA_EXCEEDED') { setVideoError('Video generation quota reached. Please try again later.'); }
    else if (url) { setVideoUrl(url); }
    else { setVideoError('Failed to generate video. Your API key might be invalid. Please re-select it and try again.'); }
    setIsGeneratingVideo(false); setVideoStatus('');
  };
  
  const handleGeneratePoster = async () => {
    if (!prayerContent?.prayerText) return;
    setIsGeneratingPoster(true); setPosterImage(null); setPosterError('');
    const result = await generatePrayerPoster(prayerContent.prayerText, selectedPosterType, selectedAspectRatio);
    if (result && result.imageBytes) {
      setPosterImage(result.imageBytes);
      setPosterMimeType(result.mimeType);
      await onAddToLibrary(`Prayer Poster: ${topic}`, result.imageBytes, result.mimeType);
    } else {
      setPosterError('Failed to generate poster. Please try again.');
    }
    setIsGeneratingPoster(false);
  };
  
  const handleDownloadPoster = () => {
    if (!posterImage || !topic) return;
    const extension = posterMimeType === 'image/png' ? 'png' : 'jpeg';
    const link = document.createElement('a');
    link.href = `data:${posterMimeType};base64,${posterImage}`;
    link.download = `${topic.replace(/\s+/g, '_')}_prayer_poster.${extension}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="animate-fade-in space-y-8">
      <div>
        <h1 className="text-3xl sm:text-4xl font-bold text-white">AI Prayer Generator</h1>
        <p className="mt-2 text-lg text-slate-400">Craft a personal prayer for moments of reflection, gratitude, or need. 🙏</p>
      </div>

      <form onSubmit={handleSubmit} className="bg-slate-800/50 backdrop-blur-sm p-6 rounded-xl shadow-lg border border-slate-700 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label htmlFor="topic" className="block text-sm font-medium text-slate-300 mb-1">Topic or Intention</label>
            <input type="text" id="topic" value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="e.g., 'Gratitude for a new day'" className="w-full bg-slate-700 border border-slate-600 rounded-md p-2 text-white" />
          </div>
          <div>
            <label htmlFor="length" className="block text-sm font-medium text-slate-300 mb-1">Length</label>
            <select id="length" value={length} onChange={(e) => setLength(e.target.value)} className="w-full bg-slate-700 border border-slate-600 rounded-md p-2 text-white">
              <option>Short (30s)</option>
              <option>1-minute</option>
              <option>3-minute</option>
            </select>
          </div>
          <div>
            <label htmlFor="tone" className="block text-sm font-medium text-slate-300 mb-1">Tone</label>
            <select id="tone" value={tone} onChange={(e) => setTone(e.target.value)} className="w-full bg-slate-700 border border-slate-600 rounded-md p-2 text-white">
              <option>Reverent</option>
              <option>Grateful</option>
              <option>Supplicant</option>
              <option>Praiseful</option>
            </select>
          </div>
        </div>
        {error && <p className="text-red-400">{error}</p>}
        <button type="submit" disabled={loading} className="w-full bg-amber-500 text-slate-900 font-bold py-3 px-4 rounded-md hover:bg-amber-400 transition-colors disabled:bg-slate-600 flex items-center justify-center">
          {loading ? <Spinner /> : 'Generate New Prayer'}
        </button>
      </form>
      
      {showRewardMessage && (
        <div className="mt-4 p-3 bg-green-500/20 border border-green-500 text-green-300 rounded-lg text-center animate-fade-in">
          +1 Prayer Generated! Your progress has been updated in 'My Journey'.
        </div>
      )}

      {loading && <div className="flex justify-center"><Spinner /></div>}

      {prayerContent && (
        <div className="bg-slate-800/50 backdrop-blur-sm p-6 rounded-xl shadow-lg border border-slate-700 space-y-6 animate-fade-in">
          <div>
            <h2 className="text-2xl font-bold mb-4">Your Prayer for "{topic}"</h2>
            <div className="prose prose-invert max-w-none text-slate-300 whitespace-pre-wrap">{prayerContent.prayerText}</div>
          </div>
          
          <div className="flex items-center flex-wrap gap-4 py-2 relative">
            <button onClick={handleDownload} className="flex items-center gap-2 text-slate-300 hover:text-white transition-colors text-sm font-semibold">
                <DownloadIcon className="w-5 h-5" /> Download .txt
            </button>
            <button onClick={() => handleCopyToClipboard(prayerContent.prayerText, 'Prayer copied!')} className="flex items-center gap-2 text-slate-300 hover:text-white transition-colors text-sm font-semibold">
                <ClipboardIcon className="w-5 h-5" /> Copy Text
            </button>
            {copySuccess && <span className="text-green-400 text-sm animate-fade-in">{copySuccess}</span>}
          </div>

          <div className="pt-6 border-t border-slate-700">
            <h3 className="text-xl font-semibold text-amber-400 mb-4">AI Multimedia Agents</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-slate-700/50 p-4 rounded-lg flex flex-col">
                <h4 className="font-semibold text-lg flex items-center mb-2"><VideoIcon className="w-6 h-6 mr-2 text-blue-400"/> Visual Prayer</h4>
                <div className="flex-grow flex flex-col justify-center">
                  {isGeneratingVideo ? (
                      <div className="flex flex-col items-center justify-center p-6 space-y-3 bg-slate-800 rounded-lg">
                          <p className="text-slate-300 font-semibold">{videoStatus}</p>
                          <div className="w-full bg-slate-700 rounded-full h-2.5"><div className="bg-amber-400 h-2.5 rounded-full" style={{ width: `${videoGenerationProgress}%` }}></div></div>
                          <p className="text-lg font-bold text-white">{videoGenerationProgress}%</p>
                      </div>
                  ) : videoError ? (
                      <div className="flex flex-col items-center justify-center bg-slate-800 text-slate-400 rounded-lg p-4 text-center space-y-3">
                          <p className="font-semibold text-slate-300">Visuals Unavailable</p>
                          <p className="text-sm">{videoError}</p>
                           <p className="text-xs text-slate-500">Video generation requires a user-selected API key. <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noopener noreferrer" className="underline">Learn more</a></p>
                          <button onClick={handleGenerateVideo} disabled={!selectedVideoStyle} className="mt-2 px-4 py-2 bg-slate-600 text-slate-200 rounded-lg hover:bg-slate-500 disabled:opacity-50">Retry</button>
                      </div>
                  ) : videoUrl ? (
                      <div className="aspect-video rounded-lg overflow-hidden"><video src={videoUrl} controls autoPlay loop className="w-full h-full object-cover" /></div>
                  ) : (
                    <div className="space-y-4">
                        {isSuggestingVideoStyles ? <div className="flex justify-center"><Spinner /></div> : videoStyleError ? <p className="text-red-300">{videoStyleError}</p> : videoStyles && (
                          <div className="w-full space-y-3 animate-fade-in-short">
                             <p className="text-sm font-medium text-slate-300">Choose a visual style:</p>
                             <div className="thin-scrollbar flex gap-2 overflow-x-auto pb-2">
                                {videoStyles.map((style, index) => {
                                    const isSelected = selectedVideoStyle === style.description;
                                    return (
                                        <button key={index} onClick={() => setSelectedVideoStyle(style.description)} className={`relative flex-shrink-0 w-44 text-left p-3 rounded-xl border-2 transition-all ${ isSelected ? 'bg-blue-500/20 border-blue-400 scale-105' : 'bg-slate-900/60 border-slate-700 hover:border-slate-500'}`}>
                                            {isSelected && <div className="absolute top-1 right-1 w-5 h-5 bg-slate-800 rounded-full flex items-center justify-center"><CheckCircleIcon className="w-5 h-5 text-blue-400"/></div>}
                                            <h5 className="font-bold text-sm text-white mb-1 pr-4">{style.title}</h5>
                                        </button>
                                    )
                                })}
                             </div>
                             <select value={videoAspectRatio} onChange={e => setVideoAspectRatio(e.target.value as '16:9' | '9:16')} className="w-full bg-slate-900 border border-slate-700 rounded-md p-2 text-white text-sm">
                                <option value="16:9">Landscape (16:9)</option>
                                <option value="9:16">Portrait (9:16)</option>
                             </select>
                             <button onClick={handleGenerateVideo} disabled={!selectedVideoStyle} className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-500/20 text-blue-300 hover:bg-blue-500/30 font-semibold rounded-lg disabled:opacity-50">
                                 <SparklesIcon className="w-5 h-5" /> Generate Video
                             </button>
                          </div>
                        )}
                    </div>
                  )}
                </div>
              </div>

               <div className="bg-slate-700/50 p-4 rounded-lg flex flex-col">
                 <h4 className="font-semibold text-lg flex items-center mb-2"><AudioIcon className="w-6 h-6 mr-2 text-green-400"/> Audio Prayer</h4>
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
                              <div className="thin-scrollbar flex gap-2 overflow-x-auto pb-2">
                                 {audioStyles.map((style, index) => {
                                     const isSelected = selectedAudioStyle === style.description;
                                     return (
                                        <button key={index} onClick={() => setSelectedAudioStyle(style.description)} className={`relative flex-shrink-0 w-44 text-left p-3 rounded-xl border-2 transition-all ${ isSelected ? 'bg-green-500/20 border-green-400 scale-105' : 'bg-slate-900/60 border-slate-700 hover:border-slate-500'}`}>
                                            {isSelected && <div className="absolute top-1 right-1 w-5 h-5 bg-slate-800 rounded-full flex items-center justify-center"><CheckCircleIcon className="w-5 h-5 text-green-400"/></div>}
                                            <h5 className="font-bold text-sm text-white mb-1 pr-4">{style.title}</h5>
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

          <div className="pt-6 border-t border-slate-700">
              <h3 className="font-semibold text-lg flex items-center mb-2"><PhotoIcon className="w-6 h-6 mr-2 text-purple-400"/> AI Prayer Poster Agent</h3>
              <p className="text-slate-400 mb-4">Create a unique, downloadable poster that visually represents the prayer's core message.</p>
              <div className="bg-slate-700/50 p-4 rounded-lg">
                {isGeneratingPoster ? (
                  <div className="flex flex-col justify-center items-center h-48 space-y-3"><Spinner /><p className="text-slate-400">AI Poster Agent is creating your visual...</p></div>
                ) : posterError ? (
                  <div className="text-red-400 text-center p-4">{posterError}</div>
                ) : posterImage ? (
                  <div className="text-center animate-fade-in space-y-4">
                    <img src={`data:${posterMimeType};base64,${posterImage}`} alt="Generated Prayer Poster" className="rounded-lg max-h-96 mx-auto"/>
                    <button onClick={handleDownloadPoster} className="flex items-center gap-2 px-4 py-2 bg-slate-700 text-slate-300 rounded-lg hover:bg-slate-600 hover:text-white transition-colors mx-auto"><DownloadIcon className="w-5 h-5" />Download Poster</button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1">Format</label>
                            <select value={selectedPosterType} onChange={(e) => setSelectedPosterType(e.target.value as any)} className="w-full bg-slate-800 border border-slate-600 rounded-md p-2 text-white">
                                <option value="image/jpeg">JPEG (Smaller Size)</option>
                                <option value="image/png">PNG (Higher Quality)</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1">Aspect Ratio</label>
                            <select value={selectedAspectRatio} onChange={(e) => setSelectedAspectRatio(e.target.value as any)} className="w-full bg-slate-800 border border-slate-600 rounded-md p-2 text-white">
                                <option value="3:4">Portrait (3:4)</option>
                                <option value="16:9">Landscape (16:9)</option>
                            </select>
                        </div>
                    </div>
                    <button onClick={handleGeneratePoster} className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-purple-500/20 text-purple-300 hover:bg-purple-500/30 font-semibold rounded-lg transition-colors">
                        <SparklesIcon className="w-5 h-5" /> Generate Poster
                    </button>
                  </div>
                )}
              </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PrayerGenerator;