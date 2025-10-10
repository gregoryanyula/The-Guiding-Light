import React, { useState, useEffect, useCallback } from 'react';
import { generateSermon, generateSocialPost, generateRatingFeedback, generateSermonAudio, generateSermonVideo, generateSermonPoster, suggestSermonVideoStyles, suggestSermonAudioStyles } from '../services/geminiService';
import { SermonContent } from '../types';
import Spinner from './Spinner';
import { VideoIcon, AudioIcon, StarIcon, DownloadIcon, ClipboardIcon, SparklesIcon, ShareIcon, PhotoIcon, RefreshIcon, TrophyIcon, CheckCircleIcon } from './Icons';

interface SermonGeneratorProps {
  onSermonGenerated: (topic: string) => void;
  onAddToLibrary: (name: string, content: string, mimeType: string) => Promise<void>;
  addToast: (message: string) => void;
}

interface StyleSuggestion {
  title: string;
  description: string;
}

// FIX: Changed to a named export to resolve import error in AppLayout.tsx
export const SermonGenerator: React.FC<SermonGeneratorProps> = ({ onSermonGenerated, onAddToLibrary, addToast }) => {
  const [topic, setTopic] = useState('');
  const [length, setLength] = useState('5-minute');
  const [tone, setTone] = useState('inspirational');
  const [sermonContent, setSermonContent] = useState<SermonContent | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [ratings, setRatings] = useState<{ [topic: string]: number[] }>({});
  const [currentRating, setCurrentRating] = useState(0);
  const [averageRating, setAverageRating] = useState({ avg: 0, count: 0 });
  const [hoverRating, setHoverRating] = useState(0);
  const [ratingFeedback, setRatingFeedback] = useState('');
  const [isGeneratingFeedback, setIsGeneratingFeedback] = useState(false);

  const [isGeneratingPost, setIsGeneratingPost] = useState(false);
  const [socialPost, setSocialPost] = useState('');
  const [copySuccess, setCopySuccess] = useState('');
  
  const [showRewardMessage, setShowRewardMessage] = useState(false);

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
  const [isSharing, setIsSharing] = useState(false);

  useEffect(() => {
    // Cleanup for generated video object URLs to prevent memory leaks
    return () => {
        if (videoUrl) {
            URL.revokeObjectURL(videoUrl);
        }
    };
  }, [videoUrl]);

  useEffect(() => {
    try {
        const storedRatings = localStorage.getItem('sermonRatings');
        if (storedRatings) {
            setRatings(JSON.parse(storedRatings));
        }
    } catch (error) {
        console.error("Failed to parse ratings from localStorage", error);
        setRatings({});
    }
  }, []);

  const handleSuggestVideoStyles = useCallback(async () => {
    if (!sermonContent?.sermonText) return;
    setIsSuggestingVideoStyles(true);
    setVideoStyles(null);
    setSelectedVideoStyle('');
    setVideoStyleError('');
    setVideoUrl(null);
    setVideoError('');
  
    const styles = await suggestSermonVideoStyles(sermonContent.sermonText);
    
    if (styles) {
      setVideoStyles(styles);
    } else {
      setVideoStyleError('Could not suggest video styles. Please try again.');
    }
    setIsSuggestingVideoStyles(false);
  }, [sermonContent]);

  const handleSuggestAudioStyles = useCallback(async () => {
    if (!sermonContent?.sermonText) return;
    setIsSuggestingAudioStyles(true);
    setAudioStyles(null);
    setSelectedAudioStyle('');
    setAudioStyleError('');
    setAudioUrl(null);
    setAudioError('');

    const styles = await suggestSermonAudioStyles(sermonContent.sermonText);
    
    if (styles) {
        setAudioStyles(styles);
    } else {
        setAudioStyleError('Could not suggest audio styles. Please try again.');
    }
    setIsSuggestingAudioStyles(false);
  }, [sermonContent]);

  useEffect(() => {
    if (sermonContent) {
      handleSuggestVideoStyles();
      handleSuggestAudioStyles();
    }
  }, [sermonContent, handleSuggestVideoStyles, handleSuggestAudioStyles]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic) {
      setError('Please enter a topic.');
      return;
    }
    setError('');
    setLoading(true);
    setSermonContent(null);
    setSocialPost('');
    setCopySuccess('');
    setRatingFeedback('');
    setCurrentRating(0);
    setAverageRating({ avg: 0, count: 0 });
    setAudioUrl(null);
    setAudioError('');
    setIsGeneratingAudio(false);
    setAudioStatus('');
    setAudioStyles(null);
    setSelectedAudioStyle('');
    setIsSuggestingAudioStyles(false);
    setAudioStyleError('');
    setVideoUrl(null);
    setVideoError('');
    setIsGeneratingVideo(false);
    setVideoStatus('');
    setVideoGenerationProgress(0);
    setVideoStyles(null);
    setSelectedVideoStyle('');
    setIsSuggestingVideoStyles(false);
    setVideoStyleError('');
    setPosterImage(null);
    setPosterError('');
    setIsGeneratingPoster(false);

    const result = await generateSermon(topic, length, tone);
    if (result === 'QUOTA_EXCEEDED') {
      setError('Sermon generation quota has been reached. Please try again later.');
    } else if (result) {
      setSermonContent(result);
      
      const topicKey = topic.toLowerCase();
      const topicRatings = ratings[topicKey] || [];
      if (topicRatings.length > 0) {
        const sum = topicRatings.reduce((a, b) => a + b, 0);
        const avg = sum / topicRatings.length;
        setAverageRating({ avg: parseFloat(avg.toFixed(1)), count: topicRatings.length });
      }

      // Automatically save the sermon text to the library
      try {
        const textBase64 = btoa(unescape(encodeURIComponent(result.sermonText)));
        await onAddToLibrary(`Sermon: ${topic}`, textBase64, 'text/plain');
      } catch (e) {
        console.error("Failed to save sermon text to library", e);
      }

      onSermonGenerated(topic);
      setShowRewardMessage(true);
      setTimeout(() => setShowRewardMessage(false), 3000);

    } else {
      setError('Failed to generate sermon. Please try again.');
    }
    setLoading(false);
  };

  const handleSetRating = async (newRating: number) => {
    if (currentRating > 0) return; // Prevent re-rating
    
    const topicKey = topic.toLowerCase();
    setCurrentRating(newRating);

    const updatedRatings = { ...ratings };
    const topicRatings = updatedRatings[topicKey] || [];
    topicRatings.push(newRating);
    updatedRatings[topicKey] = topicRatings;
    
    setRatings(updatedRatings);
    localStorage.setItem('sermonRatings', JSON.stringify(updatedRatings));

    const sum = topicRatings.reduce((a, b) => a + b, 0);
    const avg = sum / topicRatings.length;
    setAverageRating({ avg: parseFloat(avg.toFixed(1)), count: topicRatings.length });

    setIsGeneratingFeedback(true);
    setRatingFeedback('');
    const feedback = await generateRatingFeedback(newRating, topic);
    setRatingFeedback(feedback);
    setIsGeneratingFeedback(false);
  };
  
  const handleDownload = () => {
    if (!sermonContent) return;
    const blob = new Blob([sermonContent.sermonText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${topic.replace(/\s+/g, '_')}_sermon.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleCopyToClipboard = (text: string, message: string) => {
    navigator.clipboard.writeText(text).then(() => {
        setCopySuccess(message);
        setTimeout(() => setCopySuccess(''), 2000);
    }, (err) => {
        console.error('Could not copy text: ', err);
    });
  };

  const handleGenerateSocialPost = async () => {
    if (!sermonContent?.sermonText) return;
    setIsGeneratingPost(true);
    setSocialPost(''); // clear previous post if any
    const post = await generateSocialPost(sermonContent.sermonText);
    setSocialPost(post);
    setIsGeneratingPost(false);
  };

  const handleShareSocialPost = async () => {
    if (!socialPost) return;

    // Check for Web Share API support
    if (navigator.share) {
      try {
        await navigator.share({
          title: `A post on "${topic}" from The Guiding Light AI`,
          text: socialPost,
        });
      } catch (error) {
        // Don't show an error if the user cancels the share sheet
        if (error instanceof Error && error.name !== 'AbortError') {
          console.error('Share failed:', error);
          // As a fallback for other errors, copy to clipboard
          handleCopyToClipboard(socialPost, 'Sharing failed. Post copied!');
        }
      }
    } else {
      // Fallback for browsers without Web Share API
      handleCopyToClipboard(socialPost, 'Post copied!');
    }
  };

  const handleShareSermonSummary = async () => {
    if (!sermonContent?.sermonText || !topic) return;

    setIsSharing(true);
    try {
      // Use the AI to generate a concise summary for better social media engagement.
      const shareableText = await generateSocialPost(sermonContent.sermonText);
      
      if (navigator.share) {
        await navigator.share({
          title: `A Sermon on "${topic}" from The Guiding Light AI`,
          text: shareableText,
        });
      } else {
        // Fallback to copy the generated summary
        handleCopyToClipboard(shareableText, 'AI summary copied to clipboard!');
      }
    } catch (error) {
      // The AbortError is thrown when a user cancels the share dialog, which is not a real error.
      if (error instanceof Error && error.name === 'AbortError') {
        console.log('Share was cancelled.');
      } else {
        console.error('Share or copy failed:', error);
      }
    } finally {
      setIsSharing(false);
    }
  };
  
  const handleGenerateAudio = async () => {
    if (!sermonContent?.audioPrompt || !selectedAudioStyle) return;

    setIsGeneratingAudio(true);
    setAudioUrl(null);
    setAudioError('');

    const statusMessages = [
        "The AI is warming up its vocal cords...",
        "Finding a perfectly tranquil tone...",
        "Narrating your sermon with a soothing voice...",
        "Adding gentle, inspiring background music...",
        "Mixing the final audio for you...",
    ];
    let messageIndex = 0;
    setAudioStatus(statusMessages[messageIndex]);
    const statusInterval = setInterval(() => {
        messageIndex = (messageIndex + 1) % statusMessages.length;
        setAudioStatus(statusMessages[messageIndex]);
    }, 2000);

    const result = await generateSermonAudio(sermonContent.audioPrompt, selectedAudioStyle);

    clearInterval(statusInterval);

    if (result) {
        setAudioUrl(result);
    } else {
        setAudioError('Failed to generate audio narration. Please try again.');
    }
    setIsGeneratingAudio(false);
    setAudioStatus('');
  };

  const handleGenerateVideo = async () => {
    if (!sermonContent?.sermonText || !selectedVideoStyle) return;
  
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

    const url = await generateSermonVideo(sermonContent.sermonText, selectedVideoStyle, onProgress);
  
    clearInterval(statusInterval);
  
    if (url === 'QUOTA_EXCEEDED') {
        setVideoError('The video generation quota has been reached. Please try again later.');
    } else if (url) {
        setVideoUrl(url);
        try {
            const response = await fetch(url);
            const blob = await response.blob();
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64Content = (reader.result as string).split(',')[1];
                onAddToLibrary(`Sermon Video: ${topic}`, base64Content, 'video/mp4');
            };
            reader.readAsDataURL(blob);
        } catch (e) {
            console.error("Failed to save video to library", e);
        }
    } else {
        setVideoError('Failed to generate sermon video. Please try again.');
    }
    setIsGeneratingVideo(false);
    setVideoStatus('');
  };

  const handleGeneratePoster = async () => {
    if (!sermonContent?.sermonText) return;

    setIsGeneratingPoster(true);
    setPosterImage(null);
    setPosterError('');

    const result = await generateSermonPoster(sermonContent.sermonText, selectedPosterType, selectedAspectRatio);

    if (result && result.imageBytes) {
      setPosterImage(result.imageBytes);
      setPosterMimeType(result.mimeType);
      await onAddToLibrary(`Sermon Poster: ${topic}`, result.imageBytes, result.mimeType);
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
    link.download = `${topic.replace(/\s+/g, '_')}_poster.${extension}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };


  return (
    <div className="animate-fade-in space-y-8">
      <div>
        <h1 className="text-3xl sm:text-4xl font-bold text-white">Sermon & Discourse Generation</h1>
        <p className="mt-2 text-lg text-slate-400">Craft a personalized sermon to illuminate your path. 📖</p>
      </div>

      <form onSubmit={handleSubmit} className="bg-slate-800/50 backdrop-blur-sm p-6 rounded-xl shadow-lg border border-slate-700 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label htmlFor="topic" className="block text-sm font-medium text-slate-300 mb-1">Topic</label>
            <input
              type="text"
              id="topic"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g., 'The Power of Forgiveness'"
              className="w-full bg-slate-700 border border-slate-600 rounded-md p-2 text-white focus:ring-amber-400 focus:border-amber-400"
            />
          </div>
          <div>
            <label htmlFor="length" className="block text-sm font-medium text-slate-300 mb-1">Length</label>
            <select id="length" value={length} onChange={(e) => setLength(e.target.value)} className="w-full bg-slate-700 border border-slate-600 rounded-md p-2 text-white focus:ring-amber-400 focus:border-amber-400">
              <option>3-minute</option>
              <option>5-minute</option>
              <option>10-minute</option>
            </select>
          </div>
          <div>
            <label htmlFor="tone" className="block text-sm font-medium text-slate-300 mb-1">Tone</label>
            <select id="tone" value={tone} onChange={(e) => setTone(e.target.value)} className="w-full bg-slate-700 border border-slate-600 rounded-md p-2 text-white focus:ring-amber-400 focus:border-amber-400">
              <option>Inspirational</option>
              <option>Comforting</option>
              <option>Reflective</option>
              <option>Scholarly</option>
            </select>
          </div>
        </div>
        {error && <p className="text-red-400">{error}</p>}
        <button type="submit" disabled={loading} className="w-full bg-amber-500 text-slate-900 font-bold py-3 px-4 rounded-md hover:bg-amber-400 transition-colors disabled:bg-slate-600 flex items-center justify-center">
          {loading ? <Spinner /> : 'Generate Sermon'}
        </button>
      </form>

      {showRewardMessage && (
        <div className="mt-4 p-3 bg-green-500/20 border border-green-500 text-green-300 rounded-lg text-center animate-fade-in">
            +1 Sermon Generated! Your progress has been updated in 'My Journey'.
        </div>
      )}

      {loading && <div className="flex justify-center"><Spinner /></div>}

      {sermonContent && (
        <div className="bg-slate-800/50 backdrop-blur-sm p-6 rounded-xl shadow-lg border border-slate-700 space-y-6 animate-fade-in">
          <div>
            <h2 className="text-2xl font-bold mb-4">Your Sermon on "{topic}"</h2>
            <div className="prose prose-invert max-w-none text-slate-300 whitespace-pre-wrap">{sermonContent.sermonText}</div>
          </div>
          
          <div className="flex items-center flex-wrap gap-4 py-2 relative">
            <button onClick={handleDownload} className="flex items-center gap-2 text-slate-300 hover:text-white transition-colors text-sm font-semibold">
                <DownloadIcon className="w-5 h-5" /> Download .txt
            </button>
            <button onClick={() => handleCopyToClipboard(sermonContent.sermonText, 'Sermon copied!')} className="flex items-center gap-2 text-slate-300 hover:text-white transition-colors text-sm font-semibold">
                <ClipboardIcon className="w-5 h-5" /> Copy Text
            </button>
             <button
              onClick={handleShareSermonSummary}
              disabled={isSharing}
              className="flex items-center gap-2 text-slate-300 hover:text-white transition-colors text-sm font-semibold disabled:opacity-50"
            >
              {isSharing ? <Spinner /> : <ShareIcon className="w-5 h-5" />}
              Share Summary
            </button>
            {copySuccess && <span className="text-green-400 text-sm animate-fade-in">{copySuccess}</span>}
          </div>

          {/* Sermon Rating */}
          <div className="pt-6 border-t border-slate-700">
            <h3 className="font-semibold text-lg mb-2 text-white">Rate this Sermon</h3>
            <div className="flex items-center gap-4">
                <div className="flex items-center">
                    {[1, 2, 3, 4, 5].map((star) => (
                    <button
                        key={star}
                        onClick={() => handleSetRating(star)}
                        onMouseEnter={() => setHoverRating(star)}
                        onMouseLeave={() => setHoverRating(0)}
                        className={`transition-colors text-3xl ${
                        (hoverRating || currentRating) >= star ? 'text-amber-400' : 'text-slate-600'
                        }`}
                        disabled={currentRating > 0}
                    >
                        <StarIcon />
                    </button>
                    ))}
                </div>
                {averageRating.count > 0 && <p className="text-sm text-slate-400">Avg: {averageRating.avg} ({averageRating.count} ratings)</p>}
            </div>
            {(ratingFeedback || isGeneratingFeedback) && (
                <div className="mt-3 text-sm text-slate-300 italic h-5">
                    {isGeneratingFeedback ? 'Thinking of a response...' : ratingFeedback}
                </div>
            )}
          </div>

          {/* Multimedia Agents */}
          <div className="pt-6 border-t border-slate-700">
            <h3 className="text-xl font-semibold text-amber-400 mb-4">AI Multimedia Agents</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Video Card */}
              <div className="bg-slate-700/50 p-4 rounded-lg flex flex-col">
                <h4 className="font-semibold text-lg flex items-center mb-2"><VideoIcon className="w-6 h-6 mr-2 text-blue-400"/> AI Creative Director</h4>
                <p className="text-slate-400 text-sm mb-4">Generate a symbolic video to accompany your sermon.</p>
                <div className="flex-grow flex flex-col justify-center">
                  {isGeneratingVideo ? (
                      <div className="flex flex-col items-center justify-center p-6 space-y-3 bg-slate-800 rounded-lg">
                          <p className="text-slate-300 font-semibold">{videoStatus}</p>
                          <div className="w-full bg-slate-700 rounded-full h-2.5">
                              <div 
                                  className="bg-amber-400 h-2.5 rounded-full transition-all duration-500 ease-in-out" 
                                  style={{ width: `${videoGenerationProgress}%` }}
                              ></div>
                          </div>
                          <p className="text-lg font-bold text-white">{videoGenerationProgress}%</p>
                          <p className="text-xs text-slate-500 text-center">Video generation can take several minutes.</p>
                      </div>
                  ) : videoError ? (
                      <div className="flex flex-col items-center justify-center bg-red-900/20 text-red-300 rounded-lg p-4 text-center">
                          <p>{videoError}</p>
                          <button
                              onClick={handleGenerateVideo}
                              className="mt-4 flex items-center gap-2 px-4 py-2 bg-amber-500 text-slate-900 rounded-lg hover:bg-amber-400 transition-colors font-semibold"
                          >
                              Retry
                          </button>
                      </div>
                  ) : videoUrl ? (
                      <div className="aspect-video rounded-lg overflow-hidden border border-slate-600">
                          <video src={videoUrl} controls autoPlay loop muted className="w-full h-full object-cover bg-black" />
                      </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center min-h-[150px] bg-slate-800 rounded-lg p-4 text-center space-y-4">
                        {isSuggestingVideoStyles ? (
                            <div className="flex flex-col items-center gap-2 text-slate-400">
                                <Spinner />
                                <span>AI Creative Director is analyzing...</span>
                            </div>
                        ) : videoStyleError ? (
                            <div className="flex flex-col items-center justify-center text-red-300 text-center">
                                <p>{videoStyleError}</p>
                                <button
                                    onClick={handleSuggestVideoStyles}
                                    className="mt-2 flex items-center gap-2 px-4 py-2 bg-amber-500 text-slate-900 rounded-lg hover:bg-amber-400 transition-colors font-semibold"
                                >
                                    Retry
                                </button>
                            </div>
                        ) : videoStyles ? (
                            <div className="w-full space-y-3 animate-fade-in-short">
                                <div className="flex justify-between items-center">
                                    <p className="text-sm font-medium text-slate-300">Choose a visual style:</p>
                                    <button
                                        onClick={handleSuggestVideoStyles}
                                        disabled={isSuggestingVideoStyles}
                                        className="text-xs text-slate-400 hover:text-white transition-colors disabled:opacity-50"
                                    >
                                        Suggest Again
                                    </button>
                                </div>
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
                                                <h5 className="font-bold text-lg text-white mb-2 transition-colors group-hover:text-amber-300 pr-6">
                                                    {style.title}
                                                </h5>
                                                <p className="text-slate-400 text-sm flex-grow">{style.description}</p>
                                            </button>
                                        )
                                    })}
                                </div>
                                <button
                                    onClick={handleGenerateVideo}
                                    disabled={!selectedVideoStyle}
                                    className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-500/20 text-blue-300 hover:bg-blue-500/30 font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-2"
                                >
                                    <SparklesIcon className="w-5 h-5" />
                                    Generate Video
                                </button>
                            </div>
                        ) : (
                            <div className="flex justify-center items-center">
                                <Spinner />
                            </div>
                        )}
                    </div>
                  )}
                </div>
              </div>

              {/* Audio Card */}
               <div className="bg-slate-700/50 p-4 rounded-lg flex flex-col">
                 <h4 className="font-semibold text-lg flex items-center mb-2"><AudioIcon className="w-6 h-6 mr-2 text-green-400"/> AI Narrator Agent</h4>
                 <p className="text-slate-400 text-sm mb-4">Generate a narrated audio version of your sermon.</p>
                  <div className="flex-grow flex flex-col justify-center">
                     {isGeneratingAudio ? (
                        <div className="flex flex-col items-center justify-center p-6 space-y-3 bg-slate-800 rounded-lg">
                           <Spinner />
                           <p className="text-slate-300 font-semibold text-center">{audioStatus}</p>
                        </div>
                     ) : audioError ? (
                        <div className="flex flex-col items-center justify-center bg-red-900/20 text-red-300 rounded-lg p-4 text-center">
                           <p>{audioError}</p>
                           <button
                              onClick={handleGenerateAudio}
                              disabled={!selectedAudioStyle}
                              className="mt-4 flex items-center gap-2 px-4 py-2 bg-amber-500 text-slate-900 rounded-lg hover:bg-amber-400 transition-colors font-semibold disabled:opacity-50"
                           >
                              Retry
                           </button>
                        </div>
                     ) : audioUrl ? (
                         <div className="animate-fade-in space-y-3 bg-slate-800 p-3 rounded-lg border border-slate-600">
                             <audio controls src={audioUrl} className="w-full">Your browser does not support the audio element.</audio>
                             <div className="border-t border-slate-700/50 mt-3 pt-3">
                                 <a href={audioUrl} download={`${topic.replace(/\s+/g, '_')}_narration.mp3`} className="flex items-center justify-center gap-2 text-sm text-slate-300 hover:text-amber-300 transition-colors font-semibold">
                                     <DownloadIcon className="w-5 h-5" />
                                     <span>Download Narration (MP3)</span>
                                 </a>
                             </div>
                         </div>
                     ) : (
                       <div className="flex flex-col items-center justify-center min-h-[150px] bg-slate-800 rounded-lg p-4 text-center space-y-4">
                         {isSuggestingAudioStyles ? (
                             <div className="flex flex-col items-center gap-2 text-slate-400">
                                 <Spinner />
                                 <span>AI is designing audio styles...</span>
                             </div>
                         ) : audioStyleError ? (
                             <div className="flex flex-col items-center justify-center text-red-300 text-center">
                                 <p>{audioStyleError}</p>
                                 <button onClick={handleSuggestAudioStyles} className="mt-2 flex items-center gap-2 px-4 py-2 bg-amber-500 text-slate-900 rounded-lg hover:bg-amber-400 transition-colors font-semibold">
                                     Retry
                                 </button>
                             </div>
                         ) : audioStyles ? (
                           <div className="w-full space-y-3 animate-fade-in-short">
                             <div className="flex justify-between items-center">
                               <p className="text-sm font-medium text-slate-300">Choose an audio style:</p>
                               <button onClick={handleSuggestAudioStyles} disabled={isSuggestingAudioStyles} className="text-xs text-slate-400 hover:text-white transition-colors disabled:opacity-50">Suggest Again</button>
                             </div>
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
                             <button
                                 onClick={handleGenerateAudio}
                                 disabled={!selectedAudioStyle}
                                 className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-green-500/20 text-green-300 hover:bg-green-500/30 font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-2"
                             >
                                 <SparklesIcon className="w-5 h-5" />
                                 Generate Audio Narration
                             </button>
                           </div>
                         ) : (
                           <div className="flex justify-center items-center"><Spinner /></div>
                         )}
                       </div>
                     )}
                   </div>
               </div>
            </div>
          </div>

          {/* Social Media and Poster Agents */}
          <div className="pt-6 border-t border-slate-700 space-y-8">
            {/* Social Post Agent */}
            <div>
              <h3 className="font-semibold text-lg flex items-center mb-2"><SparklesIcon className="w-6 h-6 mr-2 text-cyan-400"/> AI Social Media Agent</h3>
              <p className="text-slate-400 mb-4">Share your insights. Let our AI agent create a post for your social media.</p>
              {!socialPost && (
                <button onClick={handleGenerateSocialPost} disabled={isGeneratingPost} className="flex items-center justify-center gap-2 px-4 py-2 bg-slate-700 text-slate-300 rounded-lg hover:bg-slate-600 hover:text-white transition-colors disabled:opacity-50">
                  {isGeneratingPost ? <><Spinner /> Generating...</> : 'Generate Social Post'}
                </button>
              )}
              {socialPost && (
                <div className="bg-slate-700/50 p-4 rounded-lg space-y-3 relative animate-fade-in">
                  <textarea readOnly value={socialPost} className="w-full h-32 bg-slate-800 border border-slate-600 rounded-md p-2 text-white resize-none" />
                  <div className="flex items-center gap-4">
                    <button onClick={() => handleCopyToClipboard(socialPost, 'Social post copied!')} className="flex items-center gap-2 text-slate-300 hover:text-white transition-colors text-sm font-semibold">
                      <ClipboardIcon className="w-5 h-5" /> Copy Post
                    </button>
                    {navigator.share && (
                        <button onClick={handleShareSocialPost} className="flex items-center gap-2 text-slate-300 hover:text-white transition-colors text-sm font-semibold">
                            <ShareIcon className="w-5 h-5" /> Share Post
                        </button>
                    )}
                  </div>
                </div>
              )}
            </div>
            
            {/* Poster Agent */}
            <div>
              <h3 className="font-semibold text-lg flex items-center mb-2"><PhotoIcon className="w-6 h-6 mr-2 text-purple-400"/> AI Sermon Poster Agent</h3>
              <p className="text-slate-400 mb-4">Create a unique, downloadable poster that visually represents the sermon's core message.</p>
              <div className="bg-slate-700/50 p-4 rounded-lg">
                {isGeneratingPoster ? (
                  <div className="flex flex-col justify-center items-center h-48 space-y-3">
                      <Spinner />
                      <p className="text-slate-400">AI Poster Agent is creating your visual...</p>
                  </div>
                ) : posterError ? (
                  <div className="text-red-400 text-center p-4">{posterError}</div>
                ) : posterImage ? (
                  <div className="text-center animate-fade-in space-y-4">
                    <img src={`data:${posterMimeType};base64,${posterImage}`} alt="Generated Sermon Poster" className="rounded-lg max-h-96 mx-auto"/>
                    <button onClick={handleDownloadPoster} className="flex items-center gap-2 px-4 py-2 bg-slate-700 text-slate-300 rounded-lg hover:bg-slate-600 hover:text-white transition-colors mx-auto">
                        <DownloadIcon className="w-5 h-5" />
                        Download Poster
                    </button>
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
                        <SparklesIcon className="w-5 h-5" />
                        Generate Poster
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};