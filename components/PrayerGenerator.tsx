import React, { useState, useEffect, useCallback } from 'react';
import { generatePrayer, generateSermonAudio, generateSermonVideo, suggestPrayerAudioStyles, suggestPrayerVideoStyles, generatePrayerPoster } from '../services/geminiService';
import { PrayerContent } from '../types';
import Spinner from './Spinner';
import { VideoIcon, AudioIcon, DownloadIcon, ClipboardIcon, SparklesIcon, PhotoIcon, CheckCircleIcon } from './Icons';

interface PrayerGeneratorProps {
  onPrayerGenerated: () => void;
  onAddToLibrary: (name: string, content: string, mimeType: string) => Promise<void>;
  addToast: (message: string) => void;
}

interface StyleSuggestion {
  title: string;
  description: string;
}

const PrayerGenerator: React.FC<PrayerGeneratorProps> = ({ onPrayerGenerated, onAddToLibrary, addToast }) => {
  const [topic, setTopic] = useState('');
  const [length, setLength] = useState('1-minute');
  const [tone, setTone] = useState('reverent');
  const [prayerContent, setPrayerContent] = useState<PrayerContent | null>(null);
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

  useEffect(() => {
    if (prayerContent) {
      handleSuggestVideoStyles();
      handleSuggestAudioStyles();
    }
  }, [prayerContent, handleSuggestVideoStyles, handleSuggestAudioStyles]);

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
    const statusMessages = ["Casting a serene scene...", "Rendering ethereal light...", "This can take a few minutes...", "Finalizing your visual prayer..."];
    let i = 0; setVideoStatus(statusMessages[i]);
    const interval = setInterval(() => { i = (i + 1) % statusMessages.length; setVideoStatus(statusMessages[i]); }, 7000);
    const url = await generateSermonVideo(prayerContent.prayerText, selectedVideoStyle, setVideoGenerationProgress);
    clearInterval(interval);
    if (url === 'QUOTA_EXCEEDED') { setVideoError('Video generation quota reached. Please try again later.'); }
    else if (url) { setVideoUrl(url); }
    else { setVideoError('Failed to generate video. Please try again.'); }
    setIsGeneratingVideo(false); setVideoStatus('');
  };
  
  const handleGenerateAudio = async () => {
    if (!prayerContent?.audioPrompt || !selectedAudioStyle) return;
    setIsGeneratingAudio(true); setAudioUrl(null); setAudioError('');
    const statusMessages = ["Finding a reverent tone...", "Narrating your prayer...", "Adding a gentle soundscape..."];
    let i = 0; setAudioStatus(statusMessages[i]);
    const interval = setInterval(() => { i = (i + 1) % statusMessages.length; setAudioStatus(statusMessages[i]); }, 2000);
    const result = await generateSermonAudio(prayerContent.audioPrompt, selectedAudioStyle);
    clearInterval(interval);
    if (result) { setAudioUrl(result); }
    else { setAudioError('Failed to generate audio. Please try again.'); }
    setIsGeneratingAudio(false); setAudioStatus('');
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
            <input type="text" id="topic" value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="e.g., 'Gratitude for a new day'" className="w-full bg-slate-700 border border-slate-600 rounded-md p-2 text-white focus:ring-amber-400 focus:border-amber-400" />
          </div>
          <div>
            <label htmlFor="length" className="block text-sm font-medium text-slate-300 mb-1">Length</label>
            <select id="length" value={length} onChange={(e) => setLength(e.target.value)} className="w-full bg-slate-700 border border-slate-600 rounded-md p-2 text-white focus:ring-amber-400 focus:border-amber-400">
              <option>30-second</option> <option>1-minute</option> <option>3-minute</option>
            </select>
          </div>
          <div>
            <label htmlFor="tone" className="block text-sm font-medium text-slate-300 mb-1">Tone</label>
            <select id="tone" value={tone} onChange={(e) => setTone(e.target.value)} className="w-full bg-slate-700 border border-slate-600 rounded-md p-2 text-white focus:ring-amber-400 focus:border-amber-400">
              <option>Reverent</option> <option>Grateful</option> <option>Pleading</option> <option>Praising</option> <option>Reflective</option>
            </select>
          </div>
        </div>
        {error && <p className="text-red-400">{error}</p>}
        <button type="submit" disabled={loading} className="w-full bg-amber-500 text-slate-900 font-bold py-3 px-4 rounded-md hover:bg-amber-400 transition-colors disabled:bg-slate-600 flex items-center justify-center">
          {loading ? <Spinner /> : 'Generate Prayer'}
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
            <blockquote className="border-l-4 border-amber-400 pl-4 py-2 bg-slate-900/50 rounded-r-lg">
                <p className="text-slate-300 whitespace-pre-wrap italic text-lg leading-relaxed">{prayerContent.prayerText}</p>
            </blockquote>
          </div>
          
          <div className="flex items-center flex-wrap gap-4 py-2 relative">
            <button onClick={() => handleCopyToClipboard(prayerContent.prayerText, 'Prayer copied!')} className="flex items-center gap-2 text-slate-300 hover:text-white transition-colors text-sm font-semibold">
                <ClipboardIcon className="w-5 h-5" /> Copy Text
            </button>
             <button onClick={handleDownload} className="flex items-center gap-2 text-slate-300 hover:text-white transition-colors text-sm font-semibold">
                <DownloadIcon className="w-5 h-5" /> Download .txt
            </button>
            {copySuccess && <span className="text-green-400 text-sm animate-fade-in">{copySuccess}</span>}
          </div>

          <div className="pt-6 border-t border-slate-700">
            <h3 className="text-xl font-semibold text-amber-400 mb-4">AI Multimedia Agents</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Video Agent */}
              <div className="bg-slate-700/50 p-4 rounded-lg flex flex-col">
                  <h4 className="font-semibold text-lg flex items-center mb-2"><VideoIcon className="w-6 h-6 mr-2 text-blue-400"/> AI Creative Director</h4>
                  <p className="text-slate-400 text-sm mb-4">Generate a symbolic video for your prayer.</p>
                  <div className="flex-grow flex flex-col justify-center">
                  {isGeneratingVideo ? <div className="flex flex-col items-center justify-center p-6 space-y-3 bg-slate-800 rounded-lg"><p className="text-slate-300 font-semibold">{videoStatus}</p><div className="w-full bg-slate-700 rounded-full h-2.5"><div className="bg-amber-400 h-2.5 rounded-full" style={{ width: `${videoGenerationProgress}%` }}></div></div><p className="text-lg font-bold text-white">{videoGenerationProgress}%</p></div>
                  : videoError ? <div className="text-red-300 text-center">{videoError}</div>
                  : videoUrl ? <div className="aspect-video rounded-lg overflow-hidden"><video src={videoUrl} controls autoPlay loop muted className="w-full h-full object-cover bg-black" /></div>
                  : <div className="space-y-3">{isSuggestingVideoStyles ? <div className="flex justify-center"><Spinner/></div> : videoStyleError ? <p className="text-red-400">{videoStyleError}</p> : videoStyles ? <div className="w-full space-y-3"><p className="text-sm font-medium text-slate-300">Choose a visual style:</p><div className="thin-scrollbar flex gap-2 overflow-x-auto pb-2">{videoStyles.map((s, i) => <button key={i} onClick={()=>setSelectedVideoStyle(s.description)} className={`relative flex-shrink-0 w-40 text-left p-3 rounded-xl border-2 ${selectedVideoStyle===s.description ? 'border-blue-400' : 'border-slate-700 hover:border-slate-500'}`}>{selectedVideoStyle===s.description && <CheckCircleIcon className="w-5 h-5 text-blue-400 absolute top-1 right-1"/>}<h5 className="font-bold text-sm text-white">{s.title}</h5></button>)}</div><button onClick={handleGenerateVideo} disabled={!selectedVideoStyle} className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-500/20 text-blue-300 disabled:opacity-50"><SparklesIcon className="w-5 h-5" /> Generate Video</button></div> : null}</div>}
                  </div>
              </div>
              {/* Audio Agent */}
              <div className="bg-slate-700/50 p-4 rounded-lg flex flex-col">
                <h4 className="font-semibold text-lg flex items-center mb-2"><AudioIcon className="w-6 h-6 mr-2 text-green-400"/> AI Narrator Agent</h4>
                <p className="text-slate-400 text-sm mb-4">Generate a narrated audio version of your prayer.</p>
                <div className="flex-grow flex flex-col justify-center">
                  {isGeneratingAudio ? <div className="flex flex-col items-center justify-center p-6 space-y-3"><Spinner /><p>{audioStatus}</p></div>
                  : audioError ? <div className="text-red-300 text-center">{audioError}</div>
                  : audioUrl ? <audio controls src={audioUrl} className="w-full"></audio>
                  : <div className="space-y-3">{isSuggestingAudioStyles ? <div className="flex justify-center"><Spinner/></div> : audioStyleError ? <p className="text-red-400">{audioStyleError}</p> : audioStyles ? <div className="w-full space-y-3"><p className="text-sm font-medium text-slate-300">Choose an audio style:</p><div className="thin-scrollbar flex gap-2 overflow-x-auto pb-2">{audioStyles.map((s,i) => <button key={i} onClick={()=>setSelectedAudioStyle(s.description)} className={`relative flex-shrink-0 w-40 text-left p-3 rounded-xl border-2 ${selectedAudioStyle===s.description ? 'border-green-400':'border-slate-700 hover:border-slate-500'}`}>{selectedAudioStyle===s.description && <CheckCircleIcon className="w-5 h-5 text-green-400 absolute top-1 right-1"/>}<h5 className="font-bold text-sm text-white">{s.title}</h5></button>)}</div><button onClick={handleGenerateAudio} disabled={!selectedAudioStyle} className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-green-500/20 text-green-300 disabled:opacity-50"><SparklesIcon className="w-5 h-5" /> Generate Audio</button></div> : null}</div>}
                </div>
              </div>
            </div>
          </div>

          {/* Poster Agent */}
           <div className="pt-6 border-t border-slate-700">
              <h3 className="font-semibold text-lg flex items-center mb-2"><PhotoIcon className="w-6 h-6 mr-2 text-purple-400"/> AI Prayer Poster Agent</h3>
              <p className="text-slate-400 mb-4">Create a unique poster that visually represents the prayer's core message.</p>
              <div className="bg-slate-700/50 p-4 rounded-lg">
                {isGeneratingPoster ? <div className="flex justify-center"><Spinner /></div>
                : posterError ? <p className="text-red-400 text-center">{posterError}</p>
                : posterImage ? <div className="text-center space-y-4"><img src={`data:${posterMimeType};base64,${posterImage}`} alt="Prayer Poster" className="rounded-lg max-h-96 mx-auto"/><button onClick={handleDownloadPoster} className="flex items-center gap-2 px-4 py-2 bg-slate-700 text-slate-300 rounded-lg mx-auto"><DownloadIcon className="w-5 h-5" /> Download Poster</button></div>
                : <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div><label className="block text-sm font-medium text-slate-300 mb-1">Format</label><select value={selectedPosterType} onChange={(e) => setSelectedPosterType(e.target.value as any)} className="w-full bg-slate-800 border border-slate-600 rounded-md p-2 text-white"><option value="image/jpeg">JPEG</option><option value="image/png">PNG</option></select></div>
                        <div><label className="block text-sm font-medium text-slate-300 mb-1">Aspect Ratio</label><select value={selectedAspectRatio} onChange={(e) => setSelectedAspectRatio(e.target.value as any)} className="w-full bg-slate-800 border border-slate-600 rounded-md p-2 text-white"><option value="3:4">Portrait</option><option value="16:9">Landscape</option></select></div>
                    </div>
                    <button onClick={handleGeneratePoster} className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-purple-500/20 text-purple-300 font-semibold rounded-lg"><SparklesIcon className="w-5 h-5" /> Generate Poster</button>
                  </div>
                }
              </div>
            </div>

        </div>
      )}
    </div>
  );
};

export default PrayerGenerator;