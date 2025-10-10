import React, { useState, useEffect } from 'react';
import { getBibleStudyResponse, generateBibleStudySocialPost, getBibleInsights, suggestNarrationStyles, generateNarration } from '../services/geminiService';
import { BibleStudyResponse, BibleInsight } from '../types';
import Spinner from './Spinner';
import { SparklesIcon, ClipboardIcon, UsersIcon, AudioIcon, CheckCircleIcon } from './Icons';

interface StudyAssistantProps {
    sermonTopicsHistory: string[];
    meditationGoalsHistory: string[];
    completedChallengeTitles: string[];
    userGroupNames: string[];
}

interface StyleSuggestion {
  title: string;
  description: string;
}

const StudyAssistant: React.FC<StudyAssistantProps> = ({
    sermonTopicsHistory,
    meditationGoalsHistory,
    completedChallengeTitles,
    userGroupNames,
}) => {
  // State for the Q&A section
  const [query, setQuery] = useState('');
  const [useSearch, setUseSearch] = useState(false);
  const [response, setResponse] = useState<BibleStudyResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [isGeneratingPost, setIsGeneratingPost] = useState(false);
  const [socialPost, setSocialPost] = useState('');
  const [copySuccess, setCopySuccess] = useState('');
  
  // State for the new Insights Hub
  const [insights, setInsights] = useState<BibleInsight | null>(null);
  const [loadingInsights, setLoadingInsights] = useState(true);
  const [insightsError, setInsightsError] = useState('');
  
  // Narration state
  const [narrationStyles, setNarrationStyles] = useState<StyleSuggestion[] | null>(null);
  const [selectedNarrationStyle, setSelectedNarrationStyle] = useState<string>('');
  const [isSuggestingNarrationStyles, setIsSuggestingNarrationStyles] = useState(false);
  const [narrationStyleError, setNarrationStyleError] = useState('');
  const [isGeneratingNarration, setIsGeneratingNarration] = useState(false);
  const [narrationUrl, setNarrationUrl] = useState<string | null>(null);
  const [narrationError, setNarrationError] = useState('');

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
    if (response) {
        setNarrationUrl(null);
        setSelectedNarrationStyle('');
        const fetchStyles = async () => {
            setIsSuggestingNarrationStyles(true);
            setNarrationStyleError('');
            const textSample = `${response.directAnswer.substring(0, 500)} ${response.agentInsights.substring(0, 500)}`;
            const styles = await suggestNarrationStyles(textSample);
            if (styles) {
                setNarrationStyles(styles);
            } else {
                setNarrationStyleError('Could not suggest narration styles.');
            }
            setIsSuggestingNarrationStyles(false);
        };
        fetchStyles();
    }
  }, [response]);

  const handleGenerateNarration = async () => {
    if (!response || !selectedNarrationStyle) return;
    setIsGeneratingNarration(true);
    setNarrationUrl(null);
    setNarrationError('');
    const fullText = `Direct Answer: ${response.directAnswer}\n\nAI Theologian Insights: ${response.agentInsights}`;
    const result = await generateNarration(fullText, selectedNarrationStyle);
    if (result) {
        setNarrationUrl(result);
    } else {
        setNarrationError('Failed to generate narration.');
    }
    setIsGeneratingNarration(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) {
      setError('Please enter a question or topic.');
      return;
    }
    setError('');
    setLoading(true);
    setResponse(null);
    setSocialPost('');
    setCopySuccess('');
    setNarrationUrl(null);
    setNarrationStyles(null);
    setSelectedNarrationStyle('');

    const result = await getBibleStudyResponse(query, useSearch);
    if (result) {
      setResponse(result);
    } else {
      setError('Failed to get a response. The AI may be busy, please try again.');
    }
    setLoading(false);
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
    if (!response) return;
    setIsGeneratingPost(true);
    setSocialPost('');
    const post = await generateBibleStudySocialPost(query, response);
    setSocialPost(post);
    setIsGeneratingPost(false);
  };
  
  const handleTopicClick = (topic: string) => {
    setQuery(topic);
    // Smoothly scroll to the form
    document.getElementById('deep-dive-study')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="animate-fade-in space-y-8">
      <div>
        <h1 className="text-3xl sm:text-4xl font-bold text-white">AI Study Hub</h1>
        <p className="mt-2 text-lg text-slate-400">Your personalized starting point for deeper scriptural understanding. 🕊️</p>
      </div>

      {/* AI Insights Dashboard */}
      <div className="bg-slate-800/50 backdrop-blur-sm p-6 rounded-xl shadow-lg border border-slate-700">
        <h2 className="text-2xl font-bold text-white mb-4">Your AI-Curated Daily Briefing</h2>
        {loadingInsights ? <div className="flex justify-center h-64 items-center"><Spinner /></div> :
         insightsError ? <p className="text-red-400 text-center">{insightsError}</p> :
         insights && (
             <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in-short">
                 {/* Verse of the Day */}
                 <div className="lg:col-span-2 bg-slate-700/50 p-6 rounded-lg">
                    <h3 className="font-semibold text-amber-400 mb-2">Verse of the Day</h3>
                    <blockquote className="border-l-4 border-amber-400 pl-4 mb-4">
                        <p className="text-slate-300 italic text-lg">"{insights.verseOfTheDay.verse}"</p>
                        <cite className="block text-right mt-2 text-slate-400 not-italic font-semibold">{insights.verseOfTheDay.reference}</cite>
                    </blockquote>
                    <h4 className="font-semibold text-slate-300">AI Biblical Analyst Reflection:</h4>
                    <p className="text-slate-400">{insights.verseOfTheDay.reflection}</p>
                 </div>
                 <div className="space-y-6">
                    {/* Trending Topics */}
                    <div className="bg-slate-700/50 p-4 rounded-lg">
                        <h3 className="font-semibold text-amber-400 mb-2 flex items-center gap-2"><UsersIcon className="w-5 h-5"/> Trending Topics</h3>
                        <div className="flex flex-wrap gap-2">
                            {insights.trendingTopics.map(topic => (
                                <button key={topic} onClick={() => handleTopicClick(topic)} className="text-xs bg-slate-600 text-slate-300 px-2 py-1 rounded-full hover:bg-slate-500 transition-colors">
                                    {topic}
                                </button>
                            ))}
                        </div>
                    </div>
                    {/* Personalized Suggestion */}
                    <div className="bg-slate-700/50 p-4 rounded-lg">
                        <h3 className="font-semibold text-amber-400 mb-2">AI Study Planner Suggestion</h3>
                        <p className="font-semibold text-white">{insights.personalizedSuggestion.suggestion}</p>
                        <p className="text-sm text-slate-400 italic">✨ {insights.personalizedSuggestion.reason}</p>
                    </div>
                 </div>
             </div>
         )}
      </div>

      {/* Deep Dive Q&A Section */}
      <div id="deep-dive-study" className="pt-8">
        <h2 className="text-3xl font-bold text-white mb-4">Deep Dive Study</h2>
        <form onSubmit={handleSubmit} className="bg-slate-800/50 backdrop-blur-sm p-6 rounded-xl shadow-lg border border-slate-700 space-y-4">
          <div>
            <label htmlFor="bible-query" className="block text-sm font-medium text-slate-300 mb-1">Your Question or Topic</label>
            <input
              type="text"
              id="bible-query"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="e.g., 'What is the meaning of the parable of the sower?'"
              className="w-full bg-slate-700 border border-slate-600 rounded-md p-2 text-white focus:ring-amber-400 focus:border-amber-400"
            />
          </div>
          <div className="flex items-center">
              <input
                  type="checkbox"
                  id="use-search"
                  checked={useSearch}
                  onChange={(e) => setUseSearch(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-500 bg-slate-700 text-amber-500 focus:ring-amber-400"
              />
              <label htmlFor="use-search" className="ml-3 block text-sm text-slate-400">
                  Consult Google for up-to-date context (may provide external sources)
              </label>
          </div>
          {error && <p className="text-red-400">{error}</p>}
          <button type="submit" disabled={loading} className="w-full bg-amber-500 text-slate-900 font-bold py-3 px-4 rounded-md hover:bg-amber-400 transition-colors disabled:bg-slate-600 flex items-center justify-center">
            {loading ? <Spinner /> : 'Ask Assistant'}
          </button>
        </form>
      </div>

      {loading && <div className="flex justify-center"><Spinner /></div>}

      {response && (
        <div className="bg-slate-800/50 backdrop-blur-sm p-6 rounded-xl shadow-lg border border-slate-700 space-y-8 animate-fade-in mt-8">
          
          {/* Direct Answer */}
          <div>
            <h2 className="text-2xl font-bold text-white mb-3">Guidance on your Query</h2>
            <p className="text-slate-300 leading-relaxed whitespace-pre-wrap">{response.directAnswer}</p>
          </div>
          
          {/* Sources from Web */}
          {response.sources && response.sources.length > 0 && (
            <div className="border-t border-slate-700 pt-6">
                <h3 className="text-xl font-semibold text-white mb-4">Sources from the Web</h3>
                <ol className="space-y-2 list-decimal list-inside">
                {response.sources.map((source, index) => (
                    <li key={index} className="text-slate-400">
                    <a href={source.uri} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 hover:underline break-all">
                        {source.title || source.uri}
                    </a>
                    </li>
                ))}
                </ol>
            </div>
          )}

          {/* Relevant Verses */}
          <div className="border-t border-slate-700 pt-6">
            <h3 className="text-xl font-semibold text-white mb-4">Relevant Verses</h3>
            <div className="space-y-4">
              {response.relevantVerses.map((item, index) => (
                <blockquote key={index} className="border-l-4 border-amber-400 pl-4">
                  <p className="text-slate-300 italic">"{item.verse}"</p>
                  <cite className="block text-right mt-1 text-slate-400 not-italic font-semibold">{item.reference}</cite>
                </blockquote>
              ))}
            </div>
          </div>
          
          {/* AI Theologian Agent Insights */}
          <div className="border-t border-slate-700 pt-6">
            <div className="bg-slate-700/50 p-5 rounded-lg">
                <h3 className="font-semibold text-lg flex items-center mb-2 text-purple-300"><SparklesIcon className="w-6 h-6 mr-2"/> AI Theologian Agent Insights</h3>
                <p className="text-slate-400 leading-relaxed whitespace-pre-wrap">{response.agentInsights}</p>
            </div>
          </div>
          
          {/* AI Narrator Agent */}
          <div className="pt-6 border-t border-slate-700">
            <div className="bg-slate-700/30 p-4 rounded-lg">
                <h3 className="font-semibold text-lg flex items-center mb-2"><AudioIcon className="w-6 h-6 mr-2 text-green-400"/> AI Narrator Agent</h3>
                <p className="text-slate-400 text-sm mb-4">Listen to this study response with an AI-generated voice.</p>
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


          {/* AI Social Media Agent */}
          <div className="pt-6 border-t border-slate-700">
            <h3 className="font-semibold text-lg flex items-center mb-2"><SparklesIcon className="w-6 h-6 mr-2 text-blue-400"/> AI Social Media Agent</h3>
            <p className="text-slate-400 mb-4">Share your insights. Let our AI agent create a post for your social media.</p>
            {!socialPost && (
              <button onClick={handleGenerateSocialPost} disabled={isGeneratingPost} className="flex items-center justify-center gap-2 px-4 py-2 bg-slate-700 text-slate-300 rounded-lg hover:bg-slate-600 hover:text-white transition-colors disabled:opacity-50">
                {isGeneratingPost ? <><Spinner /> Generating...</> : 'Generate Social Post'}
              </button>
            )}
            {socialPost && (
              <div className="bg-slate-700/50 p-4 rounded-lg space-y-3 relative">
                <textarea readOnly value={socialPost} className="w-full h-32 bg-slate-800 border border-slate-600 rounded-md p-2 text-white resize-none" />
                <button onClick={() => handleCopyToClipboard(socialPost, 'Social post copied!')} className="flex items-center gap-2 text-slate-300 hover:text-white transition-colors text-sm font-semibold">
                  <ClipboardIcon className="w-5 h-5" /> Copy Post
                </button>
                {copySuccess && <span className="absolute left-32 top-4 text-green-400 text-sm animate-fade-in">{copySuccess}</span>}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default StudyAssistant;