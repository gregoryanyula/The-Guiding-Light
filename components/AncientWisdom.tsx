import React, { useState, useEffect } from 'react';
import { getWisdomOfTheDay, getWisdomFromText, getBiblicalParable, getFurtherReading, generateWisdomAudio, askQuestionAboutText } from '../services/geminiService';
import { WisdomContent, BiblicalParable, FurtherReading } from '../types';
import Spinner from './Spinner';
import { ScrollIcon, SparklesIcon, ShareIcon, UserIcon, AudioIcon, BookIcon, DownloadIcon } from './Icons';

interface WisdomLibraryProps {
    sermonTopicsHistory: string[];
    meditationGoalsHistory: string[];
    onAddToLibrary: (name: string, content: string, mimeType: string) => Promise<void>;
    addToast: (message: string) => void;
}

const ancientTexts = ['Tao Te Ching', 'Meditations by Marcus Aurelius', 'The Art of War'];
const biblicalParables = ['The Good Samaritan', 'The Prodigal Son', 'The Sower'];

type ActiveContent = WisdomContent | BiblicalParable;

const WisdomLibrary: React.FC<WisdomLibraryProps> = ({ sermonTopicsHistory, meditationGoalsHistory, onAddToLibrary, addToast }) => {
    const [wisdomOfTheDay, setWisdomOfTheDay] = useState<WisdomContent | null>(null);
    const [activeContent, setActiveContent] = useState<ActiveContent | null>(null);
    const [furtherReading, setFurtherReading] = useState<FurtherReading[] | null>(null);
    const [audio, setAudio] = useState<{ url: string; contentId: string } | null>(null);

    const [loadingDaily, setLoadingDaily] = useState(true);
    const [loadingContent, setLoadingContent] = useState(false);
    const [loadingReading, setLoadingReading] = useState(false);
    const [loadingAudio, setLoadingAudio] = useState(false);

    const [conversation, setConversation] = useState<{ question: string; answer: string }[]>([]);
    const [question, setQuestion] = useState('');
    const [isAsking, setIsAsking] = useState(false);

    // Initial load: Fetch Wisdom of the Day
    useEffect(() => {
        const fetchDailyWisdom = async () => {
            setLoadingDaily(true);
            const result = await getWisdomOfTheDay({ recentSermonTopics: sermonTopicsHistory, recentMeditationGoals: meditationGoalsHistory });
            if (result) {
                setWisdomOfTheDay(result);
                setActiveContent(result);
                await onAddToLibrary(`Wisdom Image: ${result.source}`, result.imageUrl, 'image/jpeg');
            }
            setLoadingDaily(false);
        };
        fetchDailyWisdom();
    }, [sermonTopicsHistory, meditationGoalsHistory]);

    // When active content changes, fetch further reading
    useEffect(() => {
        const fetchReading = async () => {
            if (!activeContent) return;
            setLoadingReading(true);
            setFurtherReading(null);
            const topic = 'source' in activeContent ? activeContent.source : activeContent.title;
            const result = await getFurtherReading(topic);
            setFurtherReading(result);
            setLoadingReading(false);
        };
        fetchReading();
    }, [activeContent]);

    const handleDownloadImage = (base64Image: string, filename: string) => {
        const link = document.createElement('a');
        link.href = `data:image/jpeg;base64,${base64Image}`;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleSelectContent = async (type: 'ancient' | 'parable', name: string) => {
        setLoadingContent(true);
        setActiveContent(null);
        setConversation([]);
        setAudio(null);
        let result: ActiveContent | null = null;
        if (type === 'ancient') {
            result = await getWisdomFromText(name);
        } else {
            result = await getBiblicalParable(name);
        }
        if (result) {
            setActiveContent(result);
            await onAddToLibrary(`Wisdom Image: ${'source' in result ? result.source : result.title}`, result.imageUrl, 'image/jpeg');
        }
        setLoadingContent(false);
    };

    const handleGenerateAudio = async () => {
        if (!activeContent || loadingAudio) return;
        const contentId = 'source' in activeContent ? activeContent.source : activeContent.title;
        if(audio?.contentId === contentId) return; // Don't regenerate for same content

        setLoadingAudio(true);
        setAudio(null);
        const result = await generateWisdomAudio(activeContent.audioPrompt);
        if (result) {
            setAudio({ url: result, contentId });
        }
        setLoadingAudio(false);
    };

    const handleAskQuestion = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!question.trim() || !activeContent || isAsking) return;
    
        setIsAsking(true);
        const currentQuestion = question.trim();
        setConversation(prev => [...prev, { question: currentQuestion, answer: '...' }]);
        setQuestion('');
    
        const answer = await askQuestionAboutText(activeContent, currentQuestion);
        setConversation(prev => 
          prev.map(c => c.question === currentQuestion ? { ...c, answer } : c)
        );
        setIsAsking(false);
    };
    
    const handleDownloadText = (content: ActiveContent) => {
        const isWisdom = 'source' in content;
        const textContent = `
    Source: ${isWisdom ? content.source : content.title}
    ${'scriptureReference' in content ? `Scripture: ${content.scriptureReference}\n` : ''}

    =========================
    ### Excerpt / Summary
    =========================
    "${isWisdom ? content.excerpt : content.summary}"

    =========================
    ### ${isWisdom ? "Historical Context" : "Core Teaching"}
    =========================
    ${isWisdom ? content.historicalContext : content.coreTeaching}

    =========================
    ### AI Interpretation for Today
    =========================
    ${isWisdom ? content.modernApplication : content.modernRelevance}
        `.trim();

        const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${(isWisdom ? content.source : content.title).replace(/\s+/g, '_')}.txt`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    const ContentDisplay: React.FC<{ content: ActiveContent }> = ({ content }) => (
        <div className="bg-slate-800/50 p-6 rounded-xl border border-slate-700 space-y-6 animate-fade-in">
            <div className="flex justify-between items-start">
                <h2 className="text-2xl font-bold text-white pr-4">{'source' in content ? `From "${content.source}"` : content.title}</h2>
                <button
                    onClick={() => handleDownloadText(content)}
                    className="flex-shrink-0 flex items-center gap-2 px-3 py-2 bg-slate-700 text-slate-300 rounded-lg hover:bg-slate-600 hover:text-white transition-colors text-sm"
                >
                    <DownloadIcon className="w-5 h-5" />
                    Download Text
                </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                <div className="prose prose-invert max-w-none text-slate-300">
                    <p className="text-xl italic">"{'excerpt' in content ? content.excerpt : content.summary}"</p>
                    {'scriptureReference' in content && <p className="text-right not-italic font-semibold text-amber-400">{content.scriptureReference}</p>}
                </div>
                 <div>
                    <img src={`data:image/jpeg;base64,${content.imageUrl}`} alt={ 'source' in content ? content.source : content.title } className="rounded-lg shadow-lg w-full h-auto object-cover aspect-video" />
                    <div className="mt-4 flex justify-center">
                        <button
                            onClick={() => handleDownloadImage(content.imageUrl, ('source' in content ? content.source : content.title).replace(/\s+/g, '_') + '.jpeg')}
                            className="flex items-center gap-2 px-4 py-2 bg-slate-700 text-slate-300 rounded-lg hover:bg-slate-600 hover:text-white transition-colors"
                            aria-label="Download Image"
                        >
                            <DownloadIcon className="w-5 h-5" />
                            <span>Download Image</span>
                        </button>
                    </div>
                </div>
            </div>

            <div className="border-t border-slate-700 pt-6 space-y-4">
                <h3 className="text-xl font-semibold text-white">{'coreTeaching' in content ? "Core Teaching" : "Historical Context"}</h3>
                <p className="text-slate-400">{'coreTeaching' in content ? content.coreTeaching : content.historicalContext}</p>
            </div>
            
            <div className="border-t border-slate-700 pt-6 bg-slate-700/50 p-5 rounded-lg">
                <h3 className="font-semibold text-lg flex items-center mb-2 text-purple-300"><SparklesIcon className="w-6 h-6 mr-2"/> AI Interpretation for Today</h3>
                <p className="text-slate-400">{'modernRelevance' in content ? content.modernRelevance : content.modernApplication}</p>
            </div>

            <div className="border-t border-slate-700 pt-6">
                <h3 className="text-xl font-semibold text-white mb-2">Listen to a Reflection</h3>
                {loadingAudio ? <Spinner/> : audio?.contentId === ('source' in content ? content.source : content.title) ? (
                    <audio controls src={audio.url} className="w-full">Your browser does not support the audio element.</audio>
                ) : (
                    <button onClick={handleGenerateAudio} className="flex items-center gap-2 px-4 py-2 bg-slate-700 text-slate-300 rounded-lg hover:bg-slate-600">
                        <AudioIcon className="w-5 h-5"/> Generate AI Narration
                    </button>
                )}
            </div>
        </div>
    );

    return (
        <div className="animate-fade-in space-y-8">
            <div>
                <h1 className="text-3xl sm:text-4xl font-bold text-white">Wisdom Library</h1>
                <p className="mt-2 text-lg text-slate-400">Personalized insights from ancient texts and biblical parables, enriched by AI. 📚</p>
            </div>

            {/* Wisdom of the Day */}
            <section className="bg-slate-800/50 backdrop-blur-sm p-6 rounded-xl shadow-lg border border-amber-400">
                <h2 className="text-2xl font-bold text-white mb-4">Wisdom for Your Day</h2>
                {loadingDaily ? <div className="flex justify-center h-64 items-center"><Spinner /></div> : wisdomOfTheDay ? (
                    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-center animate-fade-in">
                        <div className="lg:col-span-3">
                           <img src={`data:image/jpeg;base64,${wisdomOfTheDay.imageUrl}`} alt={wisdomOfTheDay.source} className="rounded-lg shadow-lg w-full h-auto object-cover aspect-video"/>
                        </div>
                        <div className="lg:col-span-2 space-y-3">
                            <p className="text-sm text-amber-300 italic">✨ {wisdomOfTheDay.relevanceReason}</p>
                            <blockquote className="border-l-4 border-amber-400 pl-4">
                                <p className="text-slate-300 text-lg italic">"{wisdomOfTheDay.excerpt}"</p>
                                <cite className="block text-right mt-1 text-slate-400 not-italic font-semibold">- {wisdomOfTheDay.source}</cite>
                            </blockquote>
                        </div>
                    </div>
                ) : <p className="text-slate-400">Could not load daily wisdom.</p>}
            </section>
            
            {loadingContent && <div className="flex justify-center py-8"><Spinner/></div>}
            
            {activeContent && (
                <div className="space-y-8">
                    <ContentDisplay content={activeContent} />
                    
                    {/* Further Reading & Q&A */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* Further Reading */}
                        <div className="bg-slate-800/50 p-6 rounded-xl border border-slate-700">
                            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2"><BookIcon className="w-6 h-6"/> Further Reading</h2>
                            {loadingReading ? <Spinner/> : furtherReading ? (
                                <div className="space-y-4">
                                    {furtherReading.map((item, i) => (
                                        <div key={i} className="border-b border-slate-700/50 pb-3">
                                            <p className="font-semibold text-white">{item.title} <span className="text-xs bg-slate-600 text-slate-300 px-2 py-0.5 rounded-full ml-2">{item.type}</span></p>
                                            <p className="text-sm text-slate-400 mb-1">by {item.author}</p>
                                            <p className="text-sm text-slate-300 italic">✨ "{item.summary}"</p>
                                        </div>
                                    ))}
                                </div>
                            ) : <p className="text-slate-500">No suggestions available.</p>}
                        </div>
                        
                        {/* Q&A */}
                        <div className="bg-slate-800/50 p-6 rounded-xl border border-slate-700 flex flex-col">
                            <h2 className="text-2xl font-bold text-white mb-4">Deepen Your Understanding</h2>
                            <div className="flex-grow space-y-4 max-h-72 overflow-y-auto pr-2 mb-4">
                               {conversation.map((entry, index) => (
                                    <div key={index} className="space-y-2">
                                        <p className="text-right text-blue-300">{entry.question}</p>
                                        <p className="bg-slate-700/50 p-3 rounded-lg text-slate-300 whitespace-pre-wrap">{entry.answer === '...' ? <Spinner/> : entry.answer}</p>
                                    </div>
                                ))}
                            </div>
                             <form onSubmit={handleAskQuestion} className="mt-auto flex items-center gap-2 pt-4 border-t border-slate-700">
                                <input type="text" value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="Ask about this text..." className="w-full bg-slate-700 rounded-md p-2 text-white" />
                                <button type="submit" disabled={isAsking || !question.trim()} className="bg-amber-500 text-slate-900 font-semibold py-2 px-4 rounded-md disabled:bg-slate-600">Ask</button>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* Library Exploration */}
            <section className="pt-8 border-t border-slate-700/50">
                <h2 className="text-2xl font-bold text-white mb-4">Explore the Library</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700">
                        <h3 className="font-semibold text-amber-400 mb-3">Ancient Texts</h3>
                        <div className="flex flex-wrap gap-2">
                            {ancientTexts.map(name => <button key={name} onClick={() => handleSelectContent('ancient', name)} className="bg-slate-700 text-slate-300 px-3 py-1 rounded-md hover:bg-slate-600">{name}</button>)}
                        </div>
                    </div>
                    <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700">
                        <h3 className="font-semibold text-amber-400 mb-3">Biblical Parables</h3>
                         <div className="flex flex-wrap gap-2">
                            {biblicalParables.map(name => <button key={name} onClick={() => handleSelectContent('parable', name)} className="bg-slate-700 text-slate-300 px-3 py-1 rounded-md hover:bg-slate-600">{name}</button>)}
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
};

export default WisdomLibrary;