import React, { useState, useEffect, useRef, useCallback } from 'react';
import { getStreamContent, generateSermonVideo, generateSermonAudio, generateChatbotResponse, summarizeChat, getAIHostQuestion, getDynamicOverlay } from '../services/geminiService';
import { StreamContent, ChatMessage, View, TrendingTopic } from '../types';
import Spinner from './Spinner';
import { SendIcon, SparklesIcon, RefreshIcon } from './Icons';

const REFRESH_INTERVAL = 5 * 60 * 1000; // 5 minutes

const Streaming: React.FC = () => {
  const [streamContent, setStreamContent] = useState<StreamContent | null>(null);
  const [trendingTopics, setTrendingTopics] = useState<TrendingTopic[]>([]);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [videoGenerationProgress, setVideoGenerationProgress] = useState(0);
  const [error, setError] = useState('');
  
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [userInput, setUserInput] = useState('');
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [chatSummary, setChatSummary] = useState({ text: '', key: 0 });

  // New features state
  const [intentions, setIntentions] = useState<{ id: number, text: string, style: React.CSSProperties }[]>([]);
  const [intentionInput, setIntentionInput] = useState('');
  const [dynamicOverlay, setDynamicOverlay] = useState({ text: '', key: 0, positionClass: 'top-1/2 -translate-y-1/2' });
  const [currentAffirmation, setCurrentAffirmation] = useState({ text: '', key: 0 });
  const [lights, setLights] = useState<{ id: number; style: React.CSSProperties }[]>([]);


  const messagesEndRef = useRef<HTMLDivElement>(null);
  const refreshIntervalRef = useRef<number | null>(null);
  const videoUrlRef = useRef<string | null>(null);
  const chatMessagesRef = useRef(chatMessages);
  const dynamicOverlayRef = useRef(dynamicOverlay);

  useEffect(() => {
    chatMessagesRef.current = chatMessages;
  }, [chatMessages]);

  useEffect(() => {
    dynamicOverlayRef.current = dynamicOverlay;
  }, [dynamicOverlay]);

  useEffect(() => {
    const summaryInterval = setInterval(async () => {
      const currentMessages = chatMessagesRef.current;
      if (currentMessages.length > 3) {
        const history = currentMessages
          .filter(msg => msg.sender !== 'system')
          .slice(-10)
          .map(msg => `${msg.sender}: ${msg.text}`)
          .join('\n');
        
        const summaryText = await summarizeChat(history);
        if (summaryText) {
          setChatSummary(prev => ({ text: summaryText, key: prev.key + 1 }));
        }
      }
    }, 45000);

    return () => clearInterval(summaryInterval);
  }, []);

  // Effect for AI Host, Dynamic Overlays, and Affirmations
  useEffect(() => {
    if (!streamContent || isLoading) return;

    // AI Host Interval
    const hostInterval = setInterval(async () => {
        if (!streamContent.theme) return;
        const question = await getAIHostQuestion(streamContent.theme);
        if (question) {
            const aiMessage: ChatMessage = { sender: 'ai', text: question };
            setChatMessages(prev => [...prev, aiMessage]);
        }
    }, 75000);

    // Dynamic Overlay Interval
    const overlayInterval = setInterval(async () => {
        if (!streamContent.theme) return;
        const newQuote = await getDynamicOverlay(streamContent.theme);
        if (newQuote) {
            const overlayPositions = ['top-1/2 -translate-y-1/2', 'top-8', 'bottom-32'];
            const currentPosition = dynamicOverlayRef.current.positionClass;
            const availablePositions = overlayPositions.filter(p => p !== currentPosition);
            const newPositionClass = availablePositions[Math.floor(Math.random() * availablePositions.length)] || overlayPositions[0];
            setDynamicOverlay({ text: newQuote, key: Date.now(), positionClass: newPositionClass });
        }
    }, 60000);
    
    // Affirmation Interval
    const affirmations = streamContent.affirmations || [];
    let affirmationInterval: number;
    if (affirmations.length > 0) {
        let affirmationIndex = 0;
        const showNextAffirmation = () => {
            setCurrentAffirmation({ text: affirmations[affirmationIndex], key: Date.now() });
            affirmationIndex = (affirmationIndex + 1) % affirmations.length;
        };
        showNextAffirmation(); // Show first one immediately
        affirmationInterval = window.setInterval(showNextAffirmation, 9000); // 8s animation + 1s pause
    }


    return () => {
        clearInterval(hostInterval);
        clearInterval(overlayInterval);
        if (affirmationInterval) clearInterval(affirmationInterval);
    };
  }, [streamContent, isLoading]);


  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const fetchStreamContent = useCallback(async () => {
    if (!isLoading) setIsRefreshing(true);
    
    setError('');
    
    if (videoUrlRef.current) {
        URL.revokeObjectURL(videoUrlRef.current);
        videoUrlRef.current = null;
    }

    setVideoUrl(null);
    setAudioUrl(null);
    setVideoGenerationProgress(0);

    const content = await getStreamContent();
    if (content === 'QUOTA_EXCEEDED') {
      setError('Could not initialize the stream due to quota limits. Please try refreshing later.');
      setIsLoading(false);
      setIsRefreshing(false);
      return;
    }
    if (!content) {
      setError('Could not initialize the stream. The AI is busy. Please try refreshing the page.');
      setIsLoading(false);
      setIsRefreshing(false);
      return;
    }
    
    setStreamContent(content);
    setTrendingTopics(content.trendingTopics);
    setDynamicOverlay({ text: '', key: 0, positionClass: 'top-1/2 -translate-y-1/2' }); // Reset dynamic overlay on theme change
    
    if (isLoading) {
      setChatMessages([{ sender: 'ai', text: `Welcome to The Serenity Channel. Today's theme is "${content.theme}". Find your peace. ✨` }]);
    }

    const syntheticSermonText = `Theme: ${content.theme}. Reflection: ${content.overlayQuote}. The visuals should evoke feelings related to this theme.`;
    
    const videoPromise = generateSermonVideo(syntheticSermonText, content.theme, setVideoGenerationProgress)
      .then(url => {
          if (url === 'QUOTA_EXCEEDED') {
              throw new Error("QUOTA_EXCEEDED_VIDEO");
          }
          if (!url) {
              throw new Error("Video generation failed.");
          }
          setVideoUrl(url);
          videoUrlRef.current = url;
      });

    const audioPromise = generateSermonAudio(content.audioPrompt, content.theme)
      .then(url => {
          if (!url) console.warn("Audio generation failed, continuing without background audio.");
          setAudioUrl(url);
      });
    
    try {
      await Promise.all([videoPromise, audioPromise]);
    } catch (e) {
      console.error("Error during stream media generation:", e);
      if (e instanceof Error && e.message === "QUOTA_EXCEEDED_VIDEO") {
        setError('The stream visuals could not be generated due to quota limits. Please try refreshing later.');
      } else {
        setError('There was an issue generating the stream visuals. Please try refreshing.');
      }
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [isLoading]);
  
  useEffect(() => {
    fetchStreamContent();
    
    refreshIntervalRef.current = window.setInterval(() => {
        fetchStreamContent();
    }, REFRESH_INTERVAL);

    return () => {
        if (refreshIntervalRef.current) {
            clearInterval(refreshIntervalRef.current);
        }
        if (videoUrlRef.current) {
            URL.revokeObjectURL(videoUrlRef.current);
        }
    };
  }, []);


  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userInput.trim() || isSendingMessage) return;

    const newUserMessage: ChatMessage = { sender: 'user', text: userInput.trim() };
    const newMessages = [...chatMessages, newUserMessage];
    setChatMessages(newMessages);
    setUserInput('');
    setIsSendingMessage(true);

    const aiResponseText = await generateChatbotResponse(newMessages.filter(m => m.sender !== 'system'), View.Streaming);
    
    const aiMessage: ChatMessage = { sender: 'ai', text: aiResponseText || "I'm here to listen. Feel free to share more." };
    setChatMessages(prev => [...prev, aiMessage]);
    setIsSendingMessage(false);
  };

  const handleIntentionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const word = intentionInput.trim();
    if (word && !word.includes(' ')) {
        const newIntention = {
            id: Date.now() + Math.random(),
            text: word,
            style: {
                left: `${10 + Math.random() * 80}%`,
            },
        };
        setIntentions(prev => [...prev, newIntention]);
        setIntentionInput('');

        // Clean up the intention from state after its animation is complete
        setTimeout(() => {
            setIntentions(prev => prev.filter(i => i.id !== newIntention.id));
        }, 15000); // Must match the CSS animation duration for `float-up`
    } else {
        // Clear input on invalid submission
        setIntentionInput('');
    }
  };
  
  const handleSendLight = () => {
    const newLight = {
        id: Date.now() + Math.random(),
        style: {
            left: `${10 + Math.random() * 80}%`, // Random horizontal position
            animationDuration: `${8 + Math.random() * 5}s`, // Random duration
        },
    };
    setLights(prev => [...prev, newLight]);

    // Clean up after animation
    setTimeout(() => {
        setLights(prev => prev.filter(l => l.id !== newLight.id));
    }, 13000); // Must be longer than max animation duration
  };


  const renderVideoPlayer = () => {
    if (error && !videoUrl) {
      return (
        <div className="w-full h-full flex flex-col items-center justify-center bg-slate-900 text-center p-4">
          <p className="text-red-400 mb-4">{error}</p>
        </div>
      );
    }

    if (!videoUrl || isRefreshing) {
      return (
        <div className="w-full h-full flex flex-col items-center justify-center bg-slate-900 text-center p-4">
          {isLoading ? (
            <>
              <Spinner />
              <p className="mt-4 text-slate-400">AI is preparing the live stream...</p>
            </>
          ) : (
            <>
              <p className="text-slate-300 font-semibold mb-3">Generating new stream visuals for "{streamContent?.theme}"...</p>
              <div className="w-3/4 max-w-sm bg-slate-800 rounded-full h-2.5">
                  <div 
                      className="bg-amber-400 h-2.5 rounded-full transition-all duration-500 ease-in-out" 
                      style={{ width: `${videoGenerationProgress}%` }}
                  ></div>
              </div>
              <p className="text-lg font-bold text-white mt-2">{videoGenerationProgress}%</p>
              <p className="text-xs text-slate-500 mt-2">This may take a few minutes.</p>
            </>
          )}
        </div>
      );
    }

    return (
      <video
        key={videoUrl}
        src={videoUrl}
        autoPlay
        loop
        muted
        playsInline
        controls
        className="w-full h-full object-cover animate-fade-in"
        aria-label="Serene landscape video"
      />
    );
  };

  return (
    <div className="animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-6 gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2">The Serenity Channel</h1>
          <p className="text-lg text-slate-400">An AI-curated continuous stream of peace and reflection. 🔴 Live</p>
        </div>
        <button
          onClick={() => fetchStreamContent()}
          disabled={isRefreshing || isLoading}
          className="flex items-center gap-2 px-4 py-2 bg-slate-700 text-slate-300 rounded-lg hover:bg-slate-600 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-wait"
        >
          <RefreshIcon className={`w-5 h-5 ${(isRefreshing || isLoading) ? 'animate-spin' : ''}`} />
          <span>{isRefreshing ? 'Refreshing...' : 'Refresh Content'}</span>
        </button>
      </div>
      
      <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-14rem)] min-h-[650px]">
        {/* Left Column: Video and Trends */}
        <div className="flex-1 lg:w-2/3 flex flex-col gap-6">
          {/* Video Player */}
          <div className="flex-1 bg-slate-800 rounded-xl overflow-hidden shadow-lg border border-slate-700 relative min-h-[300px]">
            {renderVideoPlayer()}
            {audioUrl && !isRefreshing && <audio src={audioUrl} autoPlay loop />}
            
            {/* --- OVERLAYS --- */}
            <div className="absolute inset-0 pointer-events-none">
                {intentions.map(intention => (
                    <div key={intention.id} className="intention-text" style={intention.style}>
                        {intention.text}
                    </div>
                ))}

                {/* Light Orbs */}
                {lights.map(light => (
                    <div key={light.id} className="light-orb" style={light.style}></div>
                ))}
                
                <div className="absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/50 to-transparent flex items-center justify-between z-10">
                  <div className="flex items-center space-x-2">
                      <span className="relative flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                      </span>
                      <span className="text-white font-semibold bg-black/50 px-2 py-1 rounded">LIVE</span>
                  </div>
                </div>

                {/* Affirmation Overlay */}
                {currentAffirmation.text && (
                    <div key={currentAffirmation.key} className="affirmation-text absolute top-1/3 left-1/2 -translate-x-1/2 w-11/12 max-w-2xl text-center z-10">
                        <p className="text-white text-2xl font-semibold drop-shadow-lg" style={{ textShadow: '0 0 10px rgba(0,0,0,0.7)' }}>
                            {currentAffirmation.text}
                        </p>
                    </div>
                )}


                {dynamicOverlay.text && (
                    <div 
                        key={dynamicOverlay.key}
                        className={`dynamic-overlay-text absolute left-1/2 -translate-x-1/2 w-11/12 max-w-3xl bg-black/40 backdrop-blur-sm p-4 rounded-lg text-center z-10 ${dynamicOverlay.positionClass}`}
                    >
                        <p className="text-slate-200 text-xl italic drop-shadow-lg">"{dynamicOverlay.text}"</p>
                    </div>
                )}
                 
                 {chatSummary.text && (
                    <div 
                        key={chatSummary.key}
                        className="chat-summary-overlay absolute bottom-24 left-1/2 -translate-x-1/2 w-11/12 max-w-2xl bg-black/60 backdrop-blur-md p-3 rounded-lg text-center z-10"
                    >
                        <p className="text-slate-200 text-sm">{chatSummary.text}</p>
                    </div>
                )}

                 <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/70 to-transparent space-y-2">
                    <h2 className="text-white text-2xl font-bold">{streamContent?.theme || "Loading theme..."}</h2>
                    <blockquote className="text-slate-300 italic text-lg border-l-4 border-amber-400 pl-4">
                      "{streamContent?.overlayQuote || "..."}"
                    </blockquote>
                 </div>
            </div>
            {/* --- END OVERLAYS --- */}
          </div>

          {/* Trending Topics */}
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700 p-4">
            <h3 className="font-semibold text-amber-400 mb-3 flex items-center gap-2"><SparklesIcon className="w-5 h-5"/> Trending Now: AI Spiritual Analysis</h3>
            {(isLoading || isRefreshing) && !trendingTopics.length ? <div className="flex justify-center items-center h-20"><Spinner/></div> : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {trendingTopics.map((item, index) => (
                  <div key={index} className="bg-slate-700/50 p-3 rounded-lg animate-fade-in-short">
                    <h4 className="font-semibold text-white">{item.topic}</h4>
                    <p className="text-sm text-slate-400">{item.reason}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Chat & Intentions */}
        <div className="flex-1 lg:w-1/3 bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700 flex flex-col h-full">
          <div className="p-4 border-b border-slate-700">
            <h3 className="font-semibold text-white">Live Community Chat</h3>
          </div>
          <div className="flex-1 p-4 space-y-4 overflow-y-auto chatbot-messages">
            {chatMessages.map((msg, index) => (
              <div key={index} className={`flex items-start gap-3 ${msg.sender === 'user' ? 'justify-end' : ''}`}>
                {msg.sender === 'ai' && <div className="w-8 h-8 flex-shrink-0 bg-amber-500/80 rounded-full flex items-center justify-center p-1 text-slate-900 font-bold">AI</div>}
                <div className={`p-3 rounded-xl max-w-xs animate-fade-in-short ${msg.sender === 'user' ? 'bg-blue-600 text-white rounded-br-none' : 'bg-slate-700 text-slate-300 rounded-bl-none'}`}>
                  <p className="whitespace-pre-wrap">{msg.text}</p>
                </div>
              </div>
            ))}
            {isSendingMessage && (
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 flex-shrink-0 bg-amber-500/80 rounded-full flex items-center justify-center p-1 text-slate-900 font-bold">AI</div>
                <div className="p-3 rounded-xl max-w-xs bg-slate-700 text-slate-300 rounded-bl-none flex items-center">
                    <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                    <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.15s] mx-1"></div>
                    <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
          <form onSubmit={handleSendMessage} className="p-4 border-t border-slate-700">
            <div className="flex items-center space-x-2">
              <input
                type="text"
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                placeholder="Share your thoughts..."
                className="flex-grow bg-slate-700 border border-slate-600 rounded-full py-2 px-3 text-white focus:ring-amber-400 focus:border-amber-400"
              />
              <button 
                type="submit"
                className="bg-amber-500 text-slate-900 font-semibold w-10 h-10 rounded-full hover:bg-amber-400 transition-colors disabled:opacity-50 flex items-center justify-center flex-shrink-0"
                disabled={!userInput.trim() || isSendingMessage}
                aria-label="Send message"
              >
                <SendIcon className="w-5 h-5" />
              </button>
            </div>
          </form>
          {/* Interaction Bar */}
          <div className="p-4 border-t border-slate-700 bg-slate-900/50 grid grid-cols-2 gap-4">
            {/* Intention Wall Form */}
            <form onSubmit={handleIntentionSubmit} className="space-y-2 flex flex-col">
              <label className="text-xs text-amber-400 font-semibold block text-center">Collective Intention</label>
              <div className="flex items-center space-x-2 flex-grow">
                <input
                  type="text"
                  value={intentionInput}
                  onChange={(e) => setIntentionInput(e.target.value)}
                  placeholder="Add a word..."
                  className="flex-grow bg-slate-700 border border-slate-600 rounded-full py-2 px-3 text-white text-sm focus:ring-amber-400 focus:border-amber-400"
                />
                <button
                  type="submit"
                  className="bg-purple-500 text-white font-semibold w-9 h-9 rounded-full hover:bg-purple-400 transition-colors disabled:opacity-50 flex items-center justify-center flex-shrink-0"
                  disabled={!intentionInput.trim() || intentionInput.includes(' ')}
                  aria-label="Send Intention"
                >
                  <SparklesIcon className="w-5 h-5" />
                </button>
              </div>
            </form>
            {/* Send a Light */}
            <div className="space-y-2 flex flex-col items-center">
                <label className="text-xs text-yellow-300 font-semibold block text-center">Send a Light of Hope</label>
                <button 
                    onClick={handleSendLight} 
                    className="w-full h-full bg-yellow-400/20 border border-yellow-400/50 rounded-lg flex items-center justify-center text-yellow-300 hover:bg-yellow-400/30 hover:text-yellow-200 transition-colors"
                    aria-label="Send a Light"
                >
                    <SparklesIcon className="w-5 h-5 mr-2" />
                    Send a Light
                </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Streaming;