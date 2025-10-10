import React, { useState, useEffect, useMemo } from 'react';
import { getBibleChapter, searchBible, getBibleInsights, generateBibleStudyPlan, suggestNarrationStyles, generateNarration } from '../services/geminiService';
import { BIBLE_BOOKS } from '../data/bibleData';
import { BibleChapter, BibleSearchResult, BibleInsight, BibleStudyPlan } from '../types';
import Spinner from './Spinner';
import { BookIcon, SearchIcon, SparklesIcon, UsersIcon, AudioIcon, CheckCircleIcon } from './Icons';

type BibleView = 'INSIGHTS' | 'BROWSE' | 'SEARCH';

interface BibleProps {
    sermonTopicsHistory: string[];
    meditationGoalsHistory: string[];
    completedChallengeTitles: string[];
    userGroupNames: string[];
}

interface StyleSuggestion {
  title: string;
  description: string;
}

const Bible: React.FC<BibleProps> = ({ sermonTopicsHistory, meditationGoalsHistory, completedChallengeTitles, userGroupNames }) => {
    const [view, setView] = useState<BibleView>('INSIGHTS');
    
    // Browse state
    const [selectedBook, setSelectedBook] = useState(BIBLE_BOOKS[0].name);
    const [selectedChapter, setSelectedChapter] = useState(1);
    const [chapterData, setChapterData] = useState<BibleChapter | null>(null);
    const [loadingChapter, setLoadingChapter] = useState(false);
    const [browseError, setBrowseError] = useState('');
    const [userHasInteracted, setUserHasInteracted] = useState(false);

    // Search state
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResult, setSearchResult] = useState<BibleSearchResult | null>(null);
    const [isSearching, setIsSearching] = useState(false);
    const [searchError, setSearchError] = useState('');
    
    // Insights state
    const [insights, setInsights] = useState<BibleInsight | null>(null);
    const [loadingInsights, setLoadingInsights] = useState(true);
    const [insightsError, setInsightsError] = useState('');

    // Study Plan state
    const [studyPlanTopic, setStudyPlanTopic] = useState('');
    const [studyPlan, setStudyPlan] = useState<BibleStudyPlan | null>(null);
    const [generatingStudyPlan, setGeneratingStudyPlan] = useState(false);
    const [studyPlanError, setStudyPlanError] = useState('');
    
    // Narration state
    const [narrationStyles, setNarrationStyles] = useState<StyleSuggestion[] | null>(null);
    const [selectedNarrationStyle, setSelectedNarrationStyle] = useState<string>('');
    const [isSuggestingNarrationStyles, setIsSuggestingNarrationStyles] = useState(false);
    const [narrationStyleError, setNarrationStyleError] = useState('');
    const [isGeneratingNarration, setIsGeneratingNarration] = useState(false);
    const [narrationUrl, setNarrationUrl] = useState<string | null>(null);
    const [narrationError, setNarrationError] = useState('');


    const bookData = useMemo(() => BIBLE_BOOKS.find(b => b.name === selectedBook), [selectedBook]);
    const chapterOptions = useMemo(() => {
        return bookData ? Array.from({ length: bookData.chapters }, (_, i) => i + 1) : [];
    }, [bookData]);

    useEffect(() => {
        const fetchInsights = async () => {
            setLoadingInsights(true);
            setInsightsError('');
            const userActivity = {
                recentSermonTopics: sermonTopicsHistory,
                recentMeditationGoals: meditationGoalsHistory,
                completedChallenges: completedChallengeTitles,
                communityGroupTopics: userGroupNames,
            };
            const result = await getBibleInsights(userActivity);
            if (result) {
                setInsights(result);
            } else {
                setInsightsError('Could not load AI Insights at this time. Please try again later.');
            }
            setLoadingInsights(false);
        };
        fetchInsights();
    }, [sermonTopicsHistory, meditationGoalsHistory, completedChallengeTitles, userGroupNames]);

    useEffect(() => {
        if (!userHasInteracted) return;
        const fetchChapter = async () => {
            setLoadingChapter(true);
            setBrowseError('');
            setChapterData(null);
            // Reset narration state when chapter changes
            setNarrationUrl(null);
            setSelectedNarrationStyle('');
            setNarrationStyles(null);

            const data = await getBibleChapter(selectedBook, selectedChapter);
            if (data) {
                setChapterData(data);
            } else {
                setBrowseError('Failed to load chapter. The AI may be busy, or the reference may be invalid. Please try again.');
            }
            setLoadingChapter(false);
        };
        fetchChapter();
    }, [selectedBook, selectedChapter, userHasInteracted]);
    
    useEffect(() => {
        if (chapterData) {
            const fetchStyles = async () => {
                setIsSuggestingNarrationStyles(true);
                setNarrationStyleError('');
                const chapterTextSample = chapterData.verses.slice(0, 5).map(v => v.text).join(' ');
                const styles = await suggestNarrationStyles(chapterTextSample);
                if (styles) {
                    setNarrationStyles(styles);
                } else {
                    setNarrationStyleError('Could not suggest narration styles.');
                }
                setIsSuggestingNarrationStyles(false);
            };
            fetchStyles();
        }
    }, [chapterData]);

    const handleGenerateNarration = async () => {
        if (!chapterData || !selectedNarrationStyle) return;
        
        setIsGeneratingNarration(true);
        setNarrationUrl(null);
        setNarrationError('');

        const fullText = chapterData.verses.map(v => `${v.verse} ${v.text}`).join('\n');
        const result = await generateNarration(fullText, selectedNarrationStyle);

        if (result) {
            setNarrationUrl(result);
        } else {
            setNarrationError('Failed to generate audio narration.');
        }
        setIsGeneratingNarration(false);
    };

    const handleBookChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setSelectedBook(e.target.value);
        setSelectedChapter(1);
        setUserHasInteracted(true);
    };

    const handleChapterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setSelectedChapter(parseInt(e.target.value, 10));
        setUserHasInteracted(true);
    };

    const goToChapter = (offset: number) => {
        if (!bookData) return;
        setUserHasInteracted(true);
        const newChapter = selectedChapter + offset;
        if (newChapter > 0 && newChapter <= bookData.chapters) {
            setSelectedChapter(newChapter);
        } else if (newChapter > bookData.chapters) {
            const currentBookIndex = BIBLE_BOOKS.findIndex(b => b.name === selectedBook);
            if (currentBookIndex < BIBLE_BOOKS.length - 1) {
                setSelectedBook(BIBLE_BOOKS[currentBookIndex + 1].name);
                setSelectedChapter(1);
            }
        } else if (newChapter <= 0) {
            const currentBookIndex = BIBLE_BOOKS.findIndex(b => b.name === selectedBook);
            if (currentBookIndex > 0) {
                const prevBook = BIBLE_BOOKS[currentBookIndex - 1];
                setSelectedBook(prevBook.name);
                setSelectedChapter(prevBook.chapters);
            }
        }
    };
    
    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!searchQuery.trim()) return;
        setIsSearching(true);
        setSearchError('');
        setSearchResult(null);
        const result = await searchBible(searchQuery);
        if (result) {
            setSearchResult(result);
        } else {
            setSearchError('Search failed. The AI may be busy, please try again.');
        }
        setIsSearching(false);
    };

    const handleGenerateStudyPlan = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!studyPlanTopic.trim()) return;
        setGeneratingStudyPlan(true);
        setStudyPlanError('');
        setStudyPlan(null);
        const result = await generateBibleStudyPlan(studyPlanTopic, {
            recentSermonTopics: sermonTopicsHistory,
            recentMeditationGoals: meditationGoalsHistory,
        });
        if (result) {
            setStudyPlan(result);
        } else {
            setStudyPlanError('Could not generate a study plan. Please try again.');
        }
        setGeneratingStudyPlan(false);
    };

    const TabButton: React.FC<{ tabView: BibleView; label: string; icon: React.ReactElement }> = ({ tabView, label, icon }) => (
        <button
          onClick={() => setView(tabView)}
          className={`flex items-center px-4 py-2 text-sm font-semibold rounded-md transition-colors ${
            view === tabView 
              ? 'bg-amber-400 text-slate-900' 
              : 'text-slate-300 hover:bg-slate-700'
          }`}
        >
          {icon}
          {label}
        </button>
    );

    return (
        <div className="animate-fade-in space-y-8">
            <div>
                <h1 className="text-3xl sm:text-4xl font-bold text-white">The Holy Bible</h1>
                <p className="mt-2 text-lg text-slate-400">Explore scriptures with AI-powered insights, search, and reading plans.</p>
            </div>

            <div className="bg-slate-800/50 backdrop-blur-sm p-6 rounded-xl shadow-lg border border-slate-700">
                <div className="flex items-center justify-between mb-6">
                    <div className="bg-slate-800 p-1 rounded-lg inline-flex gap-2">
                        <TabButton tabView="INSIGHTS" label="AI Insights" icon={<SparklesIcon className="w-4 h-4 mr-2"/>} />
                        <TabButton tabView="BROWSE" label="Browse" icon={<BookIcon className="w-4 h-4 mr-2"/>}/>
                        <TabButton tabView="SEARCH" label="AI Search" icon={<SearchIcon className="w-4 h-4 mr-2"/>}/>
                    </div>
                </div>

                {view === 'INSIGHTS' && (
                    <div className="animate-fade-in-short space-y-8">
                        {loadingInsights ? <div className="flex justify-center h-64 items-center"><Spinner /></div> :
                         insightsError ? <p className="text-red-400 text-center">{insightsError}</p> :
                         insights && (() => {
                             const suggestionText = insights.personalizedSuggestion.suggestion;
                             const match = suggestionText.match(/on '(.*?)'/i);
                             const suggestedTopic = match ? match[1] : null;

                             return (
                                <div>
                                    <h2 className="text-2xl font-bold text-white mb-4">Your AI-Curated Daily Briefing</h2>
                                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                        <div className="lg:col-span-2 bg-slate-700/50 p-6 rounded-lg">
                                            <h3 className="font-semibold text-amber-400 mb-2">Verse of the Day</h3>
                                            <blockquote className="border-l-4 border-amber-400 pl-4 mb-4">
                                                <p className="text-slate-300 italic text-lg">"{insights.verseOfTheDay.verse}"</p>
                                                <cite className="block text-right mt-2 text-slate-400 not-italic font-semibold">{insights.verseOfTheDay.reference}</cite>
                                            </blockquote>
                                            <h4 className="font-semibold text-slate-300">AI Reflection:</h4>
                                            <p className="text-slate-400">{insights.verseOfTheDay.reflection}</p>
                                        </div>
                                        <div className="space-y-6">
                                            <div className="bg-slate-700/50 p-4 rounded-lg">
                                                <h3 className="font-semibold text-amber-400 mb-2 flex items-center gap-2"><UsersIcon className="w-5 h-5"/> Trending in Community</h3>
                                                <div className="flex flex-wrap gap-2">
                                                    {insights.trendingTopics.map(topic => (
                                                        <button key={topic} onClick={() => { setSearchQuery(topic); setView('SEARCH'); }} className="text-xs bg-slate-600 text-slate-300 px-2 py-1 rounded-full hover:bg-slate-500 transition-colors">
                                                            {topic}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                            <div className="bg-slate-700/50 p-4 rounded-lg flex flex-col">
                                                <h3 className="font-semibold text-amber-400 mb-2">For You</h3>
                                                <p className="font-semibold text-white flex-grow">{insights.personalizedSuggestion.suggestion}</p>
                                                <p className="text-sm text-slate-400 italic mb-4">✨ {insights.personalizedSuggestion.reason}</p>
                                                {suggestedTopic && (
                                                    <button
                                                        onClick={() => {
                                                            setStudyPlanTopic(suggestedTopic);
                                                            document.getElementById('study-plan-generator')?.scrollIntoView({ behavior: 'smooth' });
                                                        }}
                                                        className="mt-auto self-start text-sm bg-blue-500/20 text-blue-300 hover:bg-blue-500/30 font-semibold py-1 px-3 rounded-md transition-colors"
                                                    >
                                                        Create this study plan
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                             )
                         })()
                        }

                        <div id="study-plan-generator" className="pt-8 border-t border-slate-700">
                             <h2 className="text-2xl font-bold text-white mb-4">AI Study Plan Generator</h2>
                             <form onSubmit={handleGenerateStudyPlan} className="flex items-center gap-2 mb-6">
                                <input type="text" value={studyPlanTopic} onChange={e => setStudyPlanTopic(e.target.value)} placeholder="Enter a topic, e.g., 'Faith' or 'Leadership'" className="w-full bg-slate-700 border border-slate-600 rounded-md p-2 text-white" />
                                <button type="submit" disabled={generatingStudyPlan} className="bg-blue-500 text-white font-bold py-2 px-4 rounded-md hover:bg-blue-400 disabled:bg-slate-600 w-40 flex justify-center">
                                    {generatingStudyPlan ? <Spinner/> : 'Create Plan'}
                                </button>
                             </form>

                             {generatingStudyPlan ? <div className="flex justify-center"><Spinner /></div> :
                              studyPlanError ? <p className="text-red-400">{studyPlanError}</p> :
                              studyPlan && (
                                  <div className="bg-slate-900/50 p-6 rounded-lg animate-fade-in-short">
                                      <h3 className="text-xl font-bold text-amber-400 mb-1">{studyPlan.title}</h3>
                                      <p className="text-slate-400 mb-4">A {studyPlan.duration} plan to guide your study.</p>
                                      <div className="space-y-4">
                                          {studyPlan.dailyReadings.map(day => (
                                              <div key={day.day} className="p-4 border-l-4 border-amber-500 bg-slate-800/50 rounded-r-lg">
                                                  <p className="font-bold text-white"><span className="text-amber-400 font-bold">Day {day.day}:</span> {day.reading}</p>
                                                  <p className="text-sm text-slate-300 mt-2"><strong>Focus:</strong> {day.focusPoint}</p>
                                              </div>
                                          ))}
                                      </div>
                                  </div>
                              )}
                        </div>
                    </div>
                )}

                {view === 'BROWSE' && (
                    <div className="animate-fade-in-short">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                            <select value={selectedBook} onChange={handleBookChange} className="w-full bg-slate-700 border border-slate-600 rounded-md p-2 text-white focus:ring-amber-400 focus:border-amber-400">
                                {BIBLE_BOOKS.map(book => <option key={book.name} value={book.name}>{book.name}</option>)}
                            </select>
                            <select value={selectedChapter} onChange={handleChapterChange} className="w-full bg-slate-700 border border-slate-600 rounded-md p-2 text-white focus:ring-amber-400 focus:border-amber-400">
                                {chapterOptions.map(chap => <option key={chap} value={chap}>Chapter {chap}</option>)}
                            </select>
                        </div>
                        <div className="mt-6 bg-slate-900/50 p-6 rounded-lg min-h-[400px]">
                            {loadingChapter ? <div className="flex justify-center items-center h-full"><Spinner /></div> : 
                             browseError ? <p className="text-red-400 text-center">{browseError}</p> : 
                             chapterData ? (
                                <div>
                                    <h2 className="text-2xl font-bold text-amber-400 mb-4">{chapterData.book} {chapterData.chapter}</h2>
                                    <div className="text-slate-300 leading-loose space-y-2 text-lg">
                                        {chapterData.verses.map(v => <p key={v.verse}><sup className="font-semibold text-amber-300/70 mr-2">{v.verse}</sup>{v.text}</p>)}
                                    </div>
                                </div>
                             ) : <div className="flex flex-col justify-center items-center h-full text-center text-slate-500"><p className="text-lg">Select a book and chapter to begin reading.</p></div>}
                        </div>
                         <div className="flex justify-between items-center mt-4">
                            <button onClick={() => goToChapter(-1)} className="px-4 py-2 bg-slate-700 rounded-md hover:bg-slate-600 transition-colors">&larr; Previous</button>
                            <button onClick={() => goToChapter(1)} className="px-4 py-2 bg-slate-700 rounded-md hover:bg-slate-600 transition-colors">Next &rarr;</button>
                        </div>

                        {chapterData && (
                            <div className="mt-8 pt-6 border-t border-slate-700 animate-fade-in-short">
                                <div className="bg-slate-700/30 p-4 rounded-lg">
                                    <h3 className="font-semibold text-lg flex items-center mb-2"><AudioIcon className="w-6 h-6 mr-2 text-green-400"/> AI Narrator Agent</h3>
                                    <p className="text-slate-400 text-sm mb-4">Listen to this chapter with an AI-generated voice.</p>
                                    {isGeneratingNarration ? <div className="flex justify-center items-center h-24"><Spinner/></div> :
                                    narrationError ? <p className="text-red-400">{narrationError}</p> :
                                    narrationUrl ? <audio controls src={narrationUrl} className="w-full"></audio> :
                                    isSuggestingNarrationStyles ? <div className="flex justify-center items-center h-24"><Spinner/></div> :
                                    narrationStyleError ? <p className="text-red-400">{narrationStyleError}</p> :
                                    narrationStyles && (
                                        <div className="space-y-3">
                                            <p className="text-sm font-medium text-slate-300">Choose a voice style:</p>
                                            <div className="style-carousel flex gap-2 overflow-x-auto pb-2">
                                                {narrationStyles.map((style, index) => {
                                                    const isSelected = selectedNarrationStyle === style.description;
                                                    return (
                                                        <button key={index} onClick={() => setSelectedNarrationStyle(style.description)} className={`relative flex-shrink-0 w-44 text-left p-3 rounded-xl border-2 transition-all duration-200 group ${ isSelected ? 'bg-green-500/20 border-green-400 scale-105' : 'bg-slate-900/60 border-slate-700 hover:border-slate-500' }`}>
                                                            {isSelected && <div className="absolute top-1 right-1 w-5 h-5 bg-slate-800 rounded-full flex items-center justify-center"><CheckCircleIcon className="w-5 h-5 text-green-400"/></div>}
                                                            <h5 className="font-bold text-sm text-white mb-1 transition-colors group-hover:text-amber-300 pr-4">{style.title}</h5>
                                                        </button>
                                                    )
                                                })}
                                            </div>
                                            <button onClick={handleGenerateNarration} disabled={!selectedNarrationStyle} className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-green-500/20 text-green-300 hover:bg-green-500/30 font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-2">
                                                <SparklesIcon className="w-5 h-5" /> Generate Narration
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {view === 'SEARCH' && (
                    <div className="animate-fade-in-short">
                        <form onSubmit={handleSearch} className="flex items-center gap-2 mb-6">
                            <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="e.g., Love your neighbor as yourself" className="w-full bg-slate-700 border border-slate-600 rounded-md p-2 text-white focus:ring-amber-400 focus:border-amber-400" />
                            <button type="submit" disabled={isSearching} className="bg-amber-500 text-slate-900 font-bold py-2 px-4 rounded-md hover:bg-amber-400 disabled:bg-slate-600">
                                {isSearching ? <Spinner /> : 'Search'}
                            </button>
                        </form>
                        <div className="mt-6 bg-slate-900/50 p-6 rounded-lg min-h-[400px]">
                             {isSearching ? <div className="flex justify-center items-center h-full"><Spinner /></div> : 
                              searchError ? <p className="text-red-400 text-center">{searchError}</p> : 
                              searchResult ? (
                                <div className="space-y-6">
                                    <div>
                                        <h3 className="text-xl font-semibold text-amber-400 mb-2">AI Summary</h3>
                                        <p className="text-slate-300 italic">"{searchResult.summary}"</p>
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-semibold text-amber-400 mb-4">Relevant Verses</h3>
                                        <div className="space-y-4">
                                            {searchResult.results.map((v, i) => (
                                                <blockquote key={i} className="border-l-4 border-slate-600 pl-4">
                                                    <p className="text-slate-300">"{v.verse}"</p>
                                                    <cite className="block text-right mt-1 text-slate-400 not-italic font-semibold">{v.reference}</cite>
                                                </blockquote>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                              ) : <p className="text-slate-500 text-center pt-16">Enter a query to search the scriptures.</p>}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Bible;