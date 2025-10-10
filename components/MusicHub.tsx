import React, { useState, useEffect } from 'react';
import { composeAIMusic, generateMusicVisualizer, suggestMusicGenre, getTrendingTracks, generateMusicSharePost, analyzeLyricsAndSuggestSongParameters, composeSongFromLyrics, SongParameters } from '../services/geminiService';
import { AIMusicTrack, Comment, User } from '../types';
import Spinner from './Spinner';
import { SparklesIcon, MusicIcon, VideoIcon, HeartIcon, ShareIcon, ChatIcon, SendIcon, ScrollIcon } from './Icons';
import NarrationAgent from './NarrationAgent';

interface MusicHubProps {
  user: User;
  onAddToLibrary: (name: string, content: string, mimeType: string) => Promise<void>;
  addToast: (message: string) => void;
  favoriteTrackIds: string[];
  onToggleFavorite: (trackId: string) => void;
}

const genres = ['Cinematic', 'Lo-fi', 'Ambient', 'Electronic', 'Orchestral', 'Jazz', 'Classical', 'New Age', 'World Music', 'Acoustic', 'Minimalist', 'Choral'];
const moods = ['Happy', 'Sad', 'Calm', 'Energetic', 'Romantic', 'Mysterious', 'Epic', 'Uplifting', 'Melancholic', 'Peaceful'];
const tempos = ['Slow', 'Medium', 'Fast'];
const instrumentations = ['Piano', 'Orchestra', 'Synth', 'Acoustic Guitar', 'Electric Guitar', 'Drums', 'Strings', 'Choir'];
const instrumentalVocals = ['None', 'Male', 'Female', 'Choir'];

// For Lyrics to Song feature
const songGenres = ['Pop', 'Rock', 'Folk', 'R&B', 'Gospel', 'Ambient', 'Electronic', 'Acoustic Ballad'];
const songMoods = ['Hopeful', 'Melancholic', 'Joyful', 'Reflective', 'Energetic', 'Peaceful', 'Worshipful'];
const songInstrumentations = ['Piano and Strings', 'Acoustic Guitar', 'Full Band (Drums, Bass, Guitar)', 'Synth Pad and E-Piano', 'Orchestral Ensemble', 'Gospel Choir with Organ'];
const songVocals: SongParameters['vocals'][] = ['Male Lead', 'Female Lead', 'Harmonized Vocals', 'Rap', 'None'];

const colorPalettes = ['Cool (blues, purples)', 'Warm (reds, oranges)', 'Pastel', 'Neon', 'Earthy (greens, browns)', 'Monochromatic (black & white)'];
const motionIntensities = ['Gentle', 'Moderate', 'Dynamic', 'Pulsing'];

const timeAgo = (dateString: string): string => {
    const date = new Date(dateString);
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    let interval = seconds / 31536000;
    if (interval > 1) return `${Math.floor(interval)}y ago`;
    interval = seconds / 2592000;
    if (interval > 1) return `${Math.floor(interval)}mo ago`;
    interval = seconds / 86400;
    if (interval > 1) return `${Math.floor(interval)}d ago`;
    interval = seconds / 3600;
    if (interval > 1) return `${Math.floor(interval)}h ago`;
    interval = seconds / 60;
    if (interval > 1) return `${Math.floor(interval)}m ago`;
    return `${Math.floor(seconds)}s ago`;
};

const TrackItem: React.FC<{
  track: AIMusicTrack;
  isFavorite: boolean;
  onLike: (trackId: string) => void;
  onAddComment: (trackId: string, text: string) => void;
  onShare: (track: AIMusicTrack) => void;
}> = ({ track, isFavorite, onLike, onAddComment, onShare }) => {
  const [commentText, setCommentText] = useState('');
  const [showComments, setShowComments] = useState(false);
  const [isLiking, setIsLiking] = useState(false);

  const handleCommentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (commentText.trim()) {
      onAddComment(track.id, commentText.trim());
      setCommentText('');
    }
  };
  
  const handleLikeClick = () => {
    onLike(track.id);
    setIsLiking(true); // Trigger animation
  };

  return (
    <div className="bg-slate-700/50 p-4 rounded-lg flex flex-col gap-4 border border-slate-700">
        <div className="flex gap-4">
            <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-lg overflow-hidden flex-shrink-0 bg-slate-800">
                {track.imageUrl ? (
                    <img src={track.imageUrl.startsWith('data:') ? track.imageUrl : `data:image/jpeg;base64,${track.imageUrl}`} alt={track.title} className="w-full h-full object-cover" />
                ) : <MusicIcon className="w-full h-full text-slate-600 p-4" />}
            </div>
            <div className="flex-grow">
                <h3 className="text-xl font-bold text-white">{track.title}</h3>
                <p className="text-slate-400">by {track.artist}</p>
                <p className="text-xs text-slate-500 mt-1">Created by {track.createdBy} &middot; {timeAgo(track.createdAt)}</p>
                <audio controls src={track.audioUrl} className="mt-2 w-full"></audio>
            </div>
        </div>
        <div className="bg-slate-800/50 p-3 rounded-md">
            <p className="text-xs font-semibold text-amber-300 mb-1">PROMPT</p>
            <p className="text-sm text-slate-300 italic">"{track.prompt}"</p>
        </div>
        {track.lyrics && (
            <div className="border-t border-slate-700 pt-3">
                <details>
                    <summary className="font-semibold text-amber-300 cursor-pointer flex items-center gap-2 hover:text-amber-200 transition-colors">
                        <ScrollIcon className="w-5 h-5"/>
                        <span className="details-arrow">View Lyrics</span>
                    </summary>
                    <div className="mt-2 prose prose-sm prose-invert max-w-none text-slate-300 whitespace-pre-wrap max-h-48 overflow-y-auto thin-scrollbar pr-2">
                        {track.lyrics}
                    </div>
                </details>
            </div>
        )}
        <div className="flex items-center gap-4 text-slate-400 border-t border-slate-700 pt-3">
            <button 
              onClick={handleLikeClick} 
              className={`flex items-center gap-1.5 transition-colors ${isFavorite ? 'text-pink-400' : 'hover:text-white'}`}
              aria-label={isFavorite ? 'Unlike track' : 'Like track'}
              aria-pressed={isFavorite}
            >
                <HeartIcon 
                  className={`w-5 h-5 ${isFavorite ? 'fill-current' : ''} ${isLiking ? 'animate-pulse-like' : ''}`}
                  onAnimationEnd={() => setIsLiking(false)}
                />
                <span className="text-sm font-semibold">{track.likes}</span>
            </button>
            <button 
              onClick={() => setShowComments(!showComments)} 
              className="flex items-center gap-1.5 hover:text-white transition-colors"
              aria-label="Show comments"
            >
                <ChatIcon className="w-5 h-5" />
                <span className="text-sm font-semibold">{track.comments.length}</span>
            </button>
            <button 
              onClick={() => onShare(track)} 
              className="flex items-center gap-1.5 hover:text-white transition-colors"
              aria-label="Share track"
            >
                <ShareIcon className="w-5 h-5" />
                <span className="text-sm font-semibold">{track.shares}</span>
            </button>
        </div>

        {showComments && (
            <div className="border-t border-slate-700 pt-3 space-y-3 animate-fade-in-short">
                <div className="max-h-48 overflow-y-auto space-y-3 pr-2 thin-scrollbar">
                    {track.comments.length > 0 ? [...track.comments].reverse().map(comment => (
                        <div key={comment.id} className="text-sm">
                            <div className="flex justify-between items-baseline">
                                <span className="font-semibold text-white">{comment.userName}</span>
                                <span className="text-xs text-slate-500">{timeAgo(comment.createdAt)}</span>
                            </div>
                            <p className="text-slate-300">{comment.text}</p>
                        </div>
                    )) : <p className="text-sm text-slate-500 text-center">No comments yet. Be the first!</p>}
                </div>
                <form onSubmit={handleCommentSubmit} className="flex items-center gap-2">
                    <input type="text" value={commentText} onChange={e => setCommentText(e.target.value)} placeholder="Add a comment..." className="w-full bg-slate-800 border border-slate-600 rounded-full py-1 px-3 text-sm text-white focus:ring-amber-400" />
                    <button type="submit" className="bg-amber-500 text-slate-900 rounded-full w-8 h-8 flex-shrink-0 flex items-center justify-center hover:bg-amber-400 transition-colors"><SendIcon className="w-4 h-4" /></button>
                </form>
            </div>
        )}
    </div>
  );
};

const MusicHub: React.FC<MusicHubProps> = ({ user, onAddToLibrary, addToast, favoriteTrackIds, onToggleFavorite }) => {
    const [activeTab, setActiveTab] = useState<'composer' | 'lyrics' | 'trending'>('composer');
    const [composedTrack, setComposedTrack] = useState<AIMusicTrack | null>(null);
    const [isComposing, setIsComposing] = useState(false);
    const [composeError, setComposeError] = useState('');
    
    // Composer Form State
    const [prompt, setPrompt] = useState('');
    const [genre, setGenre] = useState(genres[1]);
    const [mood, setMood] = useState(moods[2]);
    const [tempo, setTempo] = useState(tempos[0]);
    const [instrumentation, setInstrumentation] = useState(instrumentations[0]);
    const [vocal, setVocal] = useState(instrumentalVocals[0]);

    // Lyrics to Song State
    const [lyrics, setLyrics] = useState('');
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [songSuggestions, setSongSuggestions] = useState<SongParameters | null>(null);
    const [analysisError, setAnalysisError] = useState('');

    const [isGeneratingVisualizer, setIsGeneratingVisualizer] = useState(false);
    const [visualizerProgress, setVisualizerProgress] = useState(0);
    const [visualizerError, setVisualizerError] = useState('');
    const [visualizerColor, setVisualizerColor] = useState(colorPalettes[0]);
    const [visualizerMotion, setVisualizerMotion] = useState(motionIntensities[0]);
    
    // Trending State
    const [trendingTracks, setTrendingTracks] = useState<AIMusicTrack[]>([]);
    const [isLoadingTrending, setIsLoadingTrending] = useState(false);
    const [trendingError, setTrendingError] = useState('');

    useEffect(() => {
        const fetchTrending = async () => {
            if (activeTab === 'trending') {
                setIsLoadingTrending(true);
                setTrendingError('');
                try {
                    const tracks = await getTrendingTracks();
                     const imagePromises = tracks.map(track => {
                        if (track.imageUrl.startsWith('PLACEHOLDER_')) {
                            return composeAIMusic(track.prompt, track.genre, track.mood, track.instrumentation, track.tempo, track.vocals)
                                .then(result => (result as any)?.imageUrl || '');
                        }
                        return Promise.resolve(track.imageUrl);
                    });
                    const images = await Promise.all(imagePromises);
                    const tracksWithImages = tracks.map((track, i) => ({...track, imageUrl: images[i]}));
                    setTrendingTracks(tracksWithImages);
                } catch (e) {
                    setTrendingError('Could not load trending tracks.');
                }
                setIsLoadingTrending(false);
            }
        };
        fetchTrending();
    }, [activeTab]);

    const handleSuggestGenre = async () => {
        if (!prompt) return;
        const suggested = await suggestMusicGenre(prompt);
        if (suggested && genres.includes(suggested)) {
            setGenre(suggested);
            addToast(`AI suggested the '${suggested}' genre!`);
        }
    };

    const handleCompose = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsComposing(true);
        setComposeError('');
        setComposedTrack(null);

        addToast('The AI Composer has begun crafting your music... 🎶');
        const result = await composeAIMusic(prompt, genre, mood, instrumentation, tempo, vocal);
        
        if (result && result !== 'QUOTA_EXCEEDED') {
            const newTrack: AIMusicTrack = {
                id: `comp-${Date.now()}`,
                title: result.title,
                artist: result.artist,
                audioUrl: result.audioUrl,
                imageUrl: result.imageUrl,
                prompt, genre, mood, instrumentation, tempo, vocals: vocal,
                likes: 0, shares: 0, comments: [],
                createdBy: user.name,
                createdAt: new Date().toISOString()
            };
            setComposedTrack(newTrack);
            await onAddToLibrary(`AI Music Art: ${result.title}`, result.imageUrl, 'image/jpeg');
        } else if (result === 'QUOTA_EXCEEDED') {
            setComposeError('Music generation quota reached for today. Please try again later.');
        } else {
            setComposeError('The AI composer failed to create music. Please try a different prompt.');
        }
        setIsComposing(false);
    };

     const handleAnalyzeLyrics = async () => {
        if (!lyrics.trim()) return;
        setIsAnalyzing(true);
        setAnalysisError('');
        setSongSuggestions(null);
        setComposedTrack(null);
        addToast('AI Producer is analyzing your lyrics...');
        const suggestions = await analyzeLyricsAndSuggestSongParameters(lyrics);
        if (suggestions) {
            setSongSuggestions(suggestions);
        } else {
            setAnalysisError('The AI could not analyze the lyrics. Please try again.');
        }
        setIsAnalyzing(false);
    };
    
    const handleComposeFromLyrics = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!songSuggestions) return;
        
        setIsComposing(true);
        setComposeError('');
        setComposedTrack(null);
        addToast('The AI Composer has begun crafting your song... 🎤');

        const result = await composeSongFromLyrics(lyrics, songSuggestions);

        if (result && result !== 'QUOTA_EXCEEDED') {
            const newTrack: AIMusicTrack = {
                id: `song-${Date.now()}`,
                title: songSuggestions.title,
                artist: result.artist,
                audioUrl: result.audioUrl,
                imageUrl: result.imageUrl,
                prompt: `A song based on provided lyrics.`,
                genre: songSuggestions.genre,
                mood: songSuggestions.mood,
                instrumentation: songSuggestions.instrumentation,
                tempo: songSuggestions.tempo,
                vocals: songSuggestions.vocals,
                lyrics: lyrics,
                likes: 0, shares: 0, comments: [],
                createdBy: user.name,
                createdAt: new Date().toISOString()
            };
            setComposedTrack(newTrack);
            await onAddToLibrary(`AI Song Art: ${newTrack.title}`, result.imageUrl, 'image/jpeg');
        } else if (result === 'QUOTA_EXCEEDED') {
            setComposeError('Song generation quota reached for today. Please try again later.');
        } else {
            setComposeError('The AI composer failed to create your song. Please try again.');
        }
        setIsComposing(false);
    };

    const handleGenerateVisualizer = async () => {
        if (!composedTrack || !composedTrack.prompt) return;
        setIsGeneratingVisualizer(true);
        setVisualizerProgress(0);
        setVisualizerError('');
        addToast('Generating music visualizer... this may take a few minutes.');

        const result = await generateMusicVisualizer(composedTrack.prompt, visualizerColor, visualizerMotion, setVisualizerProgress);

        if (result) {
            setComposedTrack(prev => prev ? { ...prev, visualizerVideoUrl: result } : null);
        } else {
            setVisualizerError('Failed to generate visualizer video.');
        }
        setIsGeneratingVisualizer(false);
    };

    const handleLikeTrack = (trackId: string) => {
        onToggleFavorite(trackId);
        const isNowFavorite = !favoriteTrackIds.includes(trackId);
        const increment = isNowFavorite ? 1 : -1;

        if (composedTrack?.id === trackId) {
            setComposedTrack(prev => prev ? { ...prev, likes: Math.max(0, prev.likes + increment) } : null);
        }
        setTrendingTracks(prev => prev.map(t => t.id === trackId ? { ...t, likes: Math.max(0, t.likes + increment) } : t));
    };
    
    const handleAddComment = (trackId: string, text: string) => {
        const newComment: Comment = {
            id: `c-${Date.now()}`,
            userName: user.name,
            text,
            createdAt: new Date().toISOString()
        };
        if (composedTrack?.id === trackId) {
            setComposedTrack(prev => prev ? { ...prev, comments: [...prev.comments, newComment] } : null);
        }
        setTrendingTracks(prev => prev.map(t => t.id === trackId ? { ...t, comments: [...t.comments, newComment] } : t));
    };

    const handleShareTrack = async (track: AIMusicTrack) => {
        addToast('Generating shareable post...');
        const shareText = await generateMusicSharePost(track);
        try {
            await navigator.share({
                title: `Listen to "${track.title}" by ${track.artist}`,
                text: shareText,
            });
            if (composedTrack?.id === track.id) {
                setComposedTrack(prev => prev ? { ...prev, shares: prev.shares + 1 } : null);
            }
            setTrendingTracks(prev => prev.map(t => t.id === track.id ? { ...t, shares: t.shares + 1 } : t));
        } catch (error) {
            if (error instanceof Error && error.name !== 'AbortError') {
              console.error('Share failed:', error);
            }
        }
    };

    return (
        <div className="animate-fade-in space-y-8">
            <div>
                <h1 className="text-3xl sm:text-4xl font-bold text-white flex items-center gap-3"><MusicIcon className="w-10 h-10" />AI Music & Song Hub</h1>
                <p className="mt-2 text-lg text-slate-400">Compose original music, turn your words into songs, and discover new AI-generated sounds.</p>
            </div>
            
            <div className="bg-slate-800/50 p-1 rounded-lg border border-slate-700 inline-flex gap-1">
                <button onClick={() => setActiveTab('composer')} className={`px-4 py-2 text-sm font-semibold rounded-md transition-colors ${activeTab === 'composer' ? 'bg-amber-400 text-slate-900' : 'text-slate-300 hover:bg-slate-700'}`}>AI Composer</button>
                <button onClick={() => setActiveTab('lyrics')} className={`px-4 py-2 text-sm font-semibold rounded-md transition-colors ${activeTab === 'lyrics' ? 'bg-amber-400 text-slate-900' : 'text-slate-300 hover:bg-slate-700'}`}>Lyrics to Song</button>
                <button onClick={() => setActiveTab('trending')} className={`px-4 py-2 text-sm font-semibold rounded-md transition-colors ${activeTab === 'trending' ? 'bg-amber-400 text-slate-900' : 'text-slate-300 hover:bg-slate-700'}`}>Trending</button>
            </div>

            {activeTab === 'composer' && (
              <div className="space-y-8 animate-fade-in-short">
                <div className="bg-slate-800/50 backdrop-blur-sm p-6 rounded-xl shadow-lg border border-slate-700">
                    <h2 className="text-2xl font-bold text-white mb-4">AI Music Composer (Instrumental)</h2>
                    <form onSubmit={handleCompose} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1">Describe your music</label>
                            <textarea value={prompt} onChange={e => setPrompt(e.target.value)} rows={3} placeholder="e.g., A calm piano melody for a rainy afternoon" className="w-full bg-slate-700 border border-slate-600 rounded-md p-2 text-white" />
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                           <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1">Genre</label>
                                <div className="flex items-center gap-1">
                                    <select value={genre} onChange={e => setGenre(e.target.value)} className="w-full bg-slate-700 border border-slate-600 rounded-md p-2 text-white text-sm">
                                        {genres.map(g => <option key={g}>{g}</option>)}
                                    </select>
                                    <button type="button" onClick={handleSuggestGenre} disabled={!prompt} className="p-2 bg-purple-500/20 text-purple-300 rounded-md disabled:opacity-50" title="Suggest Genre with AI"><SparklesIcon className="w-5 h-5"/></button>
                                </div>
                           </div>
                           <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1">Mood</label>
                                <select value={mood} onChange={e => setMood(e.target.value)} className="w-full bg-slate-700 border border-slate-600 rounded-md p-2 text-white text-sm">
                                    {moods.map(m => <option key={m}>{m}</option>)}
                                </select>
                           </div>
                           <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1">Tempo</label>
                                <select value={tempo} onChange={e => setTempo(e.target.value)} className="w-full bg-slate-700 border border-slate-600 rounded-md p-2 text-white text-sm">
                                    {tempos.map(t => <option key={t}>{t}</option>)}
                                </select>
                           </div>
                           <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1">Instrumentation</label>
                                <select value={instrumentation} onChange={e => setInstrumentation(e.target.value)} className="w-full bg-slate-700 border border-slate-600 rounded-md p-2 text-white text-sm">
                                    {instrumentations.map(i => <option key={i}>{i}</option>)}
                                </select>
                           </div>
                           <div className="col-span-2 md:col-span-1">
                                <label className="block text-sm font-medium text-slate-300 mb-1">Vocals</label>
                                <select value={vocal} onChange={e => setVocal(e.target.value)} className="w-full bg-slate-700 border border-slate-600 rounded-md p-2 text-white text-sm">
                                    {instrumentalVocals.map(v => <option key={v}>{v}</option>)}
                                </select>
                           </div>
                        </div>
                        <button type="submit" disabled={isComposing || !prompt} className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-amber-500 text-slate-900 font-bold rounded-lg hover:bg-amber-400 disabled:bg-slate-600">
                            {isComposing ? <Spinner /> : <><SparklesIcon className="w-5 h-5" /> Compose Music</>}
                        </button>
                    </form>
                </div>
                
                <div className="min-h-[200px]">
                    {isComposing ? <div className="flex justify-center p-8"><Spinner /></div> : composeError ? <p className="text-red-400 text-center">{composeError}</p> : composedTrack ? (
                        <div className="animate-fade-in space-y-4">
                            <h2 className="text-xl font-bold text-white">Your Creation</h2>
                            <TrackItem track={composedTrack} isFavorite={favoriteTrackIds.includes(composedTrack.id)} onLike={handleLikeTrack} onAddComment={handleAddComment} onShare={handleShareTrack} />
                            
                            <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700">
                                <NarrationAgent textToNarrate={composedTrack.prompt} />
                            </div>

                            <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700">
                                <h3 className="font-semibold text-lg text-white mb-2">Generate Visualizer</h3>
                                <div className="grid grid-cols-2 gap-4 mb-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-300 mb-1">Color Palette</label>
                                        <select value={visualizerColor} onChange={e => setVisualizerColor(e.target.value)} className="w-full bg-slate-700 border border-slate-600 rounded-md p-2 text-white text-sm">
                                            {colorPalettes.map(c => <option key={c}>{c}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-300 mb-1">Motion Intensity</label>
                                        <select value={visualizerMotion} onChange={e => setVisualizerMotion(e.target.value)} className="w-full bg-slate-700 border border-slate-600 rounded-md p-2 text-white text-sm">
                                            {motionIntensities.map(m => <option key={m}>{m}</option>)}
                                        </select>
                                    </div>
                                </div>
                                <button disabled={isGeneratingVisualizer} onClick={handleGenerateVisualizer} className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-500/20 text-blue-300 hover:bg-blue-500/30 font-semibold rounded-lg transition-colors disabled:opacity-50">
                                    {isGeneratingVisualizer ? <Spinner /> : <><VideoIcon className="w-5 h-5"/> Generate Looping Video</>}
                                </button>
                                {isGeneratingVisualizer && <div className="w-full bg-slate-700 rounded-full h-2.5 mt-2"><div className="bg-blue-400 h-2.5 rounded-full" style={{width: `${visualizerProgress}%`}}></div></div>}
                                {visualizerError && <p className="text-red-400 text-xs mt-1">{visualizerError}</p>}
                                {composedTrack.visualizerVideoUrl && <div className="aspect-video rounded-lg overflow-hidden bg-black mt-4"><video src={composedTrack.visualizerVideoUrl} autoPlay loop muted playsInline className="w-full h-full object-cover" /></div>}
                            </div>
                        </div>
                    ) : null}
                </div>
              </div>
            )}

            {activeTab === 'lyrics' && (
                <div className="space-y-8 animate-fade-in-short">
                    <div className="bg-slate-800/50 backdrop-blur-sm p-6 rounded-xl shadow-lg border border-slate-700">
                        <h2 className="text-2xl font-bold text-white mb-4">Lyrics to Song Generator</h2>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1">Paste your lyrics, poem, or text here</label>
                                <textarea value={lyrics} onChange={e => setLyrics(e.target.value)} rows={8} placeholder="In fields of gold, beneath the sun..." className="w-full bg-slate-700 border border-slate-600 rounded-md p-2 text-white" />
                            </div>
                            <button onClick={handleAnalyzeLyrics} disabled={isAnalyzing || !lyrics.trim()} className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-purple-500 text-white font-bold rounded-lg hover:bg-purple-600 disabled:bg-slate-600">
                                {isAnalyzing ? <Spinner /> : <><SparklesIcon className="w-5 h-5" /> Analyze Lyrics & Suggest Music Style</>}
                            </button>
                        </div>
                    </div>

                    {isAnalyzing ? <div className="flex justify-center p-8"><Spinner/></div> : analysisError ? <p className="text-red-400 text-center">{analysisError}</p> : songSuggestions && (
                        <div className="bg-slate-800/50 p-6 rounded-xl border border-slate-700 animate-fade-in-short">
                            <h3 className="text-xl font-bold text-white mb-4">AI Music Producer's Suggestions</h3>
                            <form onSubmit={handleComposeFromLyrics} className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-300 mb-1">Song Title</label>
                                        <input value={songSuggestions.title} onChange={e => setSongSuggestions({...songSuggestions, title: e.target.value})} className="w-full bg-slate-700 border border-slate-600 rounded-md p-2 text-white font-semibold"/>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-300 mb-1">Vocal Style</label>
                                        <select value={songSuggestions.vocals} onChange={e => setSongSuggestions({...songSuggestions, vocals: e.target.value as any})} className="w-full bg-slate-700 border border-slate-600 rounded-md p-2 text-white">
                                            {songVocals.map(v => <option key={v}>{v}</option>)}
                                        </select>
                                    </div>
                                     <div>
                                        <label className="block text-sm font-medium text-slate-300 mb-1">Genre</label>
                                        <select value={songSuggestions.genre} onChange={e => setSongSuggestions({...songSuggestions, genre: e.target.value})} className="w-full bg-slate-700 border border-slate-600 rounded-md p-2 text-white">
                                            {songGenres.map(v => <option key={v}>{v}</option>)}
                                        </select>
                                    </div>
                                     <div>
                                        <label className="block text-sm font-medium text-slate-300 mb-1">Mood</label>
                                        <select value={songSuggestions.mood} onChange={e => setSongSuggestions({...songSuggestions, mood: e.target.value})} className="w-full bg-slate-700 border border-slate-600 rounded-md p-2 text-white">
                                            {songMoods.map(v => <option key={v}>{v}</option>)}
                                        </select>
                                    </div>
                                </div>
                                <button type="submit" disabled={isComposing} className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-amber-500 text-slate-900 font-bold rounded-lg hover:bg-amber-400 disabled:bg-slate-600">
                                    {isComposing ? <Spinner /> : <><MusicIcon className="w-5 h-5" /> Compose Full Song</>}
                                </button>
                            </form>
                        </div>
                    )}

                    <div className="min-h-[200px]">
                        {isComposing ? <div className="flex justify-center p-8"><Spinner /></div> : composeError ? <p className="text-red-400 text-center">{composeError}</p> : composedTrack ? (
                            <div className="animate-fade-in space-y-4">
                                <h2 className="text-xl font-bold text-white">Your New Song</h2>
                                <TrackItem track={composedTrack} isFavorite={favoriteTrackIds.includes(composedTrack.id)} onLike={handleLikeTrack} onAddComment={handleAddComment} onShare={handleShareTrack} />
                                <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700">
                                   <NarrationAgent textToNarrate={composedTrack.lyrics || composedTrack.prompt} />
                                </div>
                            </div>
                        ) : null}
                    </div>
                </div>
            )}

            {activeTab === 'trending' && (
                <div className="animate-fade-in-short">
                    <h2 className="text-2xl font-bold text-white mb-4">Trending Tracks</h2>
                    {isLoadingTrending ? <div className="flex justify-center p-8"><Spinner /></div> : 
                     trendingError ? <p className="text-red-400 text-center">{trendingError}</p> :
                     (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {trendingTracks.map(track => (
                                <TrackItem key={track.id} track={track} isFavorite={favoriteTrackIds.includes(track.id)} onLike={handleLikeTrack} onAddComment={handleAddComment} onShare={handleShareTrack} />
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default MusicHub;