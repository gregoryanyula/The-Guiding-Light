import React, { useState } from 'react';
import { SermonOutline, LeadershipArticle, SpiritualCommunity, RecommendedReading, StudyCurriculum, CounselingPrompt, InterfaithDialogue } from '../types';
import { generateSermonOutline, generateLeadershipArticle, findLocalCommunities, getRecommendedReading, generateStudyCurriculum, generateCounselingPrompts, generateInterfaithDialogue } from '../services/geminiService';
import Spinner from './Spinner';
import { BriefcaseIcon, CloseIcon, SparklesIcon, SearchIcon, BookIcon, UsersIcon, ClipboardIcon } from './Icons';

interface ResourceCentreProps {
    onAddToLibrary: (name: string, content: string, mimeType: string) => Promise<void>;
    addToast: (message: string) => void;
}

// Modal component for displaying detailed content
const ContentModal: React.FC<{ title: string; children: React.ReactNode; onClose: () => void; }> = ({ title, children, onClose }) => (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
        <div className="bg-slate-800 border border-slate-700 rounded-2xl shadow-lg w-full max-w-3xl p-6 animate-fade-in-short relative max-h-[90vh] flex flex-col">
            <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-white z-10"><CloseIcon className="w-6 h-6" /></button>
            <h2 className="text-2xl font-bold text-amber-400 mb-4 flex-shrink-0">{title}</h2>
            <div className="flex-grow overflow-y-auto pr-2 thin-scrollbar">
                {children}
            </div>
        </div>
    </div>
);

// Display components for generated content
const SermonOutlineDisplay: React.FC<{ outline: SermonOutline }> = ({ outline }) => {
    const [copySuccess, setCopySuccess] = useState(false);

    const fullOutlineText = `
Sermon Title: ${outline.title}
Key Verse: ${outline.keyVerse}

---

## Introduction
${outline.introduction}

---

## Main Points

${outline.points.map((point, index) => `
### ${index + 1}. ${point.title}
**Scripture:** ${point.scripture}
**Details:** ${point.details}
`).join('\n---\n\n')}

---

## Conclusion
${outline.conclusion}
    `.trim();

    const handleCopy = () => {
        navigator.clipboard.writeText(fullOutlineText).then(() => {
            setCopySuccess(true);
            setTimeout(() => setCopySuccess(false), 2000);
        });
    };
    
    return (
        <div className="space-y-6">
            <div className="flex justify-between items-start">
                <div className="pr-8">
                    <p className="text-sm text-amber-400 uppercase tracking-wider">Key Verse</p>
                    <blockquote className="mt-1 text-lg italic text-slate-300 border-l-4 border-amber-400 pl-4">
                        {outline.keyVerse}
                    </blockquote>
                </div>
                <button 
                    onClick={handleCopy}
                    className="flex-shrink-0 flex items-center gap-2 px-3 py-2 bg-slate-700 text-slate-300 rounded-lg hover:bg-slate-600 hover:text-white transition-colors text-sm"
                >
                    <ClipboardIcon className="w-5 h-5" />
                    {copySuccess ? 'Copied!' : 'Copy Outline'}
                </button>
            </div>
            
            <div className="space-y-4">
                <div>
                    <h3 className="text-xl font-semibold text-white mb-2">Introduction</h3>
                    <p className="text-slate-400 whitespace-pre-wrap">{outline.introduction}</p>
                </div>

                <div>
                    <h3 className="text-xl font-semibold text-white mb-3">Main Points</h3>
                    <div className="space-y-4">
                        {outline.points.map((point, index) => (
                            <div key={index} className="bg-slate-900/50 p-4 rounded-lg border border-slate-700">
                                <h4 className="font-bold text-amber-400">{index + 1}. {point.title}</h4>
                                <p className="text-sm text-slate-500 mt-1 mb-2">Supporting Scripture: {point.scripture}</p>
                                <p className="text-slate-300 whitespace-pre-wrap">{point.details}</p>
                            </div>
                        ))}
                    </div>
                </div>

                <div>
                    <h3 className="text-xl font-semibold text-white mb-2">Conclusion</h3>
                    <p className="text-slate-400 whitespace-pre-wrap">{outline.conclusion}</p>
                </div>
            </div>
        </div>
    );
};


const LeadershipArticleDisplay: React.FC<{ article: LeadershipArticle }> = ({ article }) => (
    <div className="prose prose-invert max-w-none text-slate-300 space-y-4">
        <p className="italic bg-slate-700/50 p-3 rounded-lg">{article.summary}</p>
        {article.sections.map((section, index) => (
            <div key={index}>
                <h3>{section.heading}</h3>
                <p>{section.content}</p>
            </div>
        ))}
    </div>
);

const StudyCurriculumDisplay: React.FC<{ curriculum: StudyCurriculum }> = ({ curriculum }) => (
    <div className="space-y-6 text-slate-300">
        <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-700">
             <p>A <strong>{curriculum.duration}</strong> study plan on the topic of <strong>"{curriculum.topic}"</strong>, designed to foster deep discussion and practical application.</p>
        </div>
        {curriculum.weeklyBreakdown.map(week => (
            <div key={week.week} className="bg-slate-700/30 p-4 rounded-lg border-l-4 border-amber-400">
                <h3 className="text-xl font-bold text-white">Week {week.week}: <span className="text-amber-300">{week.theme}</span></h3>
                <div className="mt-4 space-y-3">
                    <p><strong>Reading:</strong> <span className="italic">{week.reading}</span></p>
                    <div>
                        <strong className="block mb-1">Discussion Questions:</strong>
                        <ul className="list-disc list-inside space-y-1 text-slate-400">
                            {week.discussionQuestions.map((q, i) => <li key={i}>{q}</li>)}
                        </ul>
                    </div>
                    <p><strong>Activity:</strong> {week.activity}</p>
                </div>
            </div>
        ))}
    </div>
);

const CounselingPromptsDisplay: React.FC<{ prompts: CounselingPrompt }> = ({ prompts }) => (
     <div className="space-y-4">
        {prompts.prompts.map((p, i) => (
            <div key={i} className="bg-slate-700/50 p-4 rounded-lg">
                <p className="text-white font-semibold">"{p.prompt}"</p>
                <p className="text-sm text-slate-400 mt-1"><strong>Purpose:</strong> {p.purpose}</p>
            </div>
        ))}
    </div>
);

const InterfaithDialogueDisplay: React.FC<{ dialogue: InterfaithDialogue }> = ({ dialogue }) => (
    <div className="prose prose-invert max-w-none text-slate-300 space-y-4">
        <p className="italic bg-slate-700/50 p-3 rounded-lg">{dialogue.introduction}</p>
        {dialogue.starters.map((s, i) => (
            <div key={i} className="border-l-4 border-slate-600 pl-4 py-2">
                <h4>{s.question}</h4>
                <p><strong>Context:</strong> {s.context}</p>
            </div>
        ))}
    </div>
);


const ResourceCentre: React.FC<ResourceCentreProps> = ({ onAddToLibrary, addToast }) => {
    const [modalContent, setModalContent] = useState<{ title: string; content: React.ReactNode } | null>(null);

    // State for all tools
    const [sermonTopic, setSermonTopic] = useState('');
    const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>({});
    const [errorStates, setErrorStates] = useState<Record<string, string>>({});

    const [leadershipTopic, setLeadershipTopic] = useState('Preventing Pastoral Burnout');
    const [communityQuery, setCommunityQuery] = useState('');
    const [communities, setCommunities] = useState<SpiritualCommunity[] | null>(null);
    const [readingTopic, setReadingTopic] = useState('');
    const [curriculumTopic, setCurriculumTopic] = useState('');
    const [curriculumDuration, setCurriculumDuration] = useState('4 Weeks');
    const [counselingCategory, setCounselingCategory] = useState('Grief and Loss');
    const [faith1, setFaith1] = useState('Christianity');
    const [faith2, setFaith2] = useState('Buddhism');
    const [dialogueTopic, setDialogueTopic] = useState('Compassion');

    // Generic handler to manage loading and error states for different generators
    const handleGenerate = async (
        key: string,
        generatorFn: () => Promise<any>,
        displayFn: (result: any) => { title: string; content: React.ReactNode },
        saveInfo: (result: any) => { name: string, content: string },
        startMessage: string
    ) => {
        addToast(startMessage);
        setLoadingStates(prev => ({ ...prev, [key]: true }));
        setErrorStates(prev => ({ ...prev, [key]: '' }));
        const result = await generatorFn();
        if (result) {
            setModalContent(displayFn(result));
            const { name, content } = saveInfo(result);
            const contentBase64 = btoa(unescape(encodeURIComponent(content)));
            await onAddToLibrary(name, contentBase64, 'text/plain');
        } else {
            setErrorStates(prev => ({ ...prev, [key]: `Could not generate content for ${key}. Please try again.` }));
        }
        setLoadingStates(prev => ({ ...prev, [key]: false }));
    };
    
    const handleFindCommunities = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!communityQuery.trim()) return;
        
        addToast('Searching for communities...');
        setLoadingStates(prev => ({ ...prev, community: true }));
        setErrorStates(prev => ({ ...prev, community: '' }));
        setCommunities(null);

        const result = await findLocalCommunities(communityQuery);
        
        if (result) {
            setCommunities(result);
        } else {
            setErrorStates(prev => ({ ...prev, community: 'Could not find communities. The AI may be busy or the location is not recognized.' }));
        }
        
        setLoadingStates(prev => ({ ...prev, community: false }));
    };

    return (
        <div className="animate-fade-in space-y-8">
            {modalContent && <ContentModal title={modalContent.title} onClose={() => setModalContent(null)}>{modalContent.content}</ContentModal>}

            <div>
                <h1 className="text-3xl sm:text-4xl font-bold text-white flex items-center gap-3"><BriefcaseIcon className="w-10 h-10" />Resource Centre</h1>
                <p className="mt-2 text-lg text-slate-400">AI-powered tools and resources for spiritual growth and leadership.</p>
            </div>

            {/* --- FOR SPIRITUAL LEADERS --- */}
            <section>
                <h2 className="text-2xl font-bold text-white mb-4">For Spiritual Leaders</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {/* Sermon Prep */}
                    <div className="bg-slate-800/50 p-6 rounded-xl border border-slate-700 flex flex-col">
                        <h3 className="font-semibold text-lg text-amber-400 mb-2">Sermon Prep Assistant</h3>
                        <p className="text-sm text-slate-400 mb-4 flex-grow">Generate structured outlines with key verses, points, and illustrations.</p>
                        <form onSubmit={e => { e.preventDefault(); if(sermonTopic) handleGenerate('sermon', () => generateSermonOutline(sermonTopic), res => ({ title: `Sermon Outline: ${res.title}`, content: <SermonOutlineDisplay outline={res} /> }), res => ({ name: `Sermon Outline: ${res.title}`, content: JSON.stringify(res, null, 2) }), 'AI is preparing your sermon outline...' )}} className="space-y-2 mt-auto">
                            <input type="text" value={sermonTopic} onChange={e => setSermonTopic(e.target.value)} placeholder="Sermon Topic..." className="w-full bg-slate-700 border border-slate-600 rounded-md p-2 text-white" />
                            <button type="submit" disabled={loadingStates.sermon || !sermonTopic} className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-500/20 text-blue-300 hover:bg-blue-500/30 font-semibold rounded-lg transition-colors disabled:opacity-50">
                                {loadingStates.sermon ? <Spinner /> : <><SparklesIcon className="w-5 h-5" /> Generate Outline</>}
                            </button>
                            {errorStates.sermon && <p className="text-red-400 text-xs mt-1">{errorStates.sermon}</p>}
                        </form>
                    </div>
                     {/* Curriculum Generator */}
                    <div className="bg-slate-800/50 p-6 rounded-xl border border-slate-700 flex flex-col">
                        <h3 className="font-semibold text-lg text-amber-400 mb-2">Curriculum Generator</h3>
                        <p className="text-sm text-slate-400 mb-4 flex-grow">Create multi-week study guides for small groups on any spiritual topic.</p>
                        <form onSubmit={e => { e.preventDefault(); if(curriculumTopic) handleGenerate('curriculum', () => generateStudyCurriculum(curriculumTopic, curriculumDuration), res => ({ title: res.title, content: <StudyCurriculumDisplay curriculum={res}/>}), res => ({ name: `Curriculum: ${res.title}`, content: JSON.stringify(res, null, 2) }), 'AI is designing your curriculum...' )}} className="space-y-2 mt-auto">
                            <input type="text" value={curriculumTopic} onChange={e => setCurriculumTopic(e.target.value)} placeholder="e.g., 'The Beatitudes'" className="w-full bg-slate-700 border border-slate-600 rounded-md p-2 text-white" />
                            <select value={curriculumDuration} onChange={e => setCurriculumDuration(e.target.value)} className="w-full bg-slate-700 border border-slate-600 rounded-md p-2 text-white">
                                <option>2 Weeks</option>
                                <option>3 Weeks</option>
                                <option>4 Weeks</option>
                                <option>6 Weeks</option>
                                <option>8 Weeks</option>
                            </select>
                            <button type="submit" disabled={loadingStates.curriculum || !curriculumTopic} className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-500/20 text-blue-300 hover:bg-blue-500/30 font-semibold rounded-lg transition-colors disabled:opacity-50">
                                {loadingStates.curriculum ? <Spinner /> : <><SparklesIcon className="w-5 h-5" /> Generate Curriculum</>}
                            </button>
                            {errorStates.curriculum && <p className="text-red-400 text-xs mt-1">{errorStates.curriculum}</p>}
                        </form>
                    </div>
                     {/* Counseling Assistant */}
                    <div className="bg-slate-800/50 p-6 rounded-xl border border-slate-700 flex flex-col">
                        <h3 className="font-semibold text-lg text-amber-400 mb-2">Spiritual Counseling Assistant</h3>
                        <p className="text-sm text-slate-400 mb-4 flex-grow">Get thoughtful, AI-generated prompts for guiding difficult conversations.</p>
                        <div className="space-y-2 mt-auto">
                            <select value={counselingCategory} onChange={e => setCounselingCategory(e.target.value)} className="w-full bg-slate-700 border border-slate-600 rounded-md p-2 text-white">
                                <option>Grief and Loss</option><option>Anxiety and Fear</option><option>Relationship Conflict</option><option>Finding Purpose</option>
                            </select>
                            <button onClick={() => handleGenerate('counseling', () => generateCounselingPrompts(counselingCategory), res => ({ title: `Counseling Prompts for ${res.category}`, content: <CounselingPromptsDisplay prompts={res}/>}), res => ({ name: `Counseling Prompts: ${res.category}`, content: JSON.stringify(res, null, 2) }), 'AI is generating counseling prompts...' )} disabled={loadingStates.counseling} className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-500/20 text-blue-300 hover:bg-blue-500/30 font-semibold rounded-lg transition-colors disabled:opacity-50">
                                {loadingStates.counseling ? <Spinner /> : <><SparklesIcon className="w-5 h-5" /> Get Prompts</>}
                            </button>
                            {errorStates.counseling && <p className="text-red-400 text-xs mt-1">{errorStates.counseling}</p>}
                        </div>
                    </div>
                </div>
            </section>
            
            {/* --- FOR PERSONAL GROWTH --- */}
            <section className="pt-8 border-t border-slate-700/50">
                 <h2 className="text-2xl font-bold text-white mb-4">For Personal Growth</h2>
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {/* Leadership Advisor */}
                    <div className="bg-slate-800/50 p-6 rounded-xl border border-slate-700 flex flex-col">
                        <h3 className="font-semibold text-lg text-amber-400 mb-2">Leadership & Growth Advisor</h3>
                        <p className="text-sm text-slate-400 mb-4 flex-grow">Access AI-generated articles on pastoral care, community building, and personal well-being.</p>
                        <div className="space-y-2 mt-auto">
                            <select value={leadershipTopic} onChange={e => setLeadershipTopic(e.target.value)} className="w-full bg-slate-700 border border-slate-600 rounded-md p-2 text-white">
                                <option>Preventing Pastoral Burnout</option>
                                <option>Fostering Community Engagement</option>
                                <option>The Practice of Forgiveness</option>
                                <option>Leading Through Crisis</option>
                            </select>
                            <button onClick={() => handleGenerate('leadership', () => generateLeadershipArticle(leadershipTopic), res => ({ title: res.title, content: <LeadershipArticleDisplay article={res}/>}), res => ({ name: `Article: ${res.title}`, content: JSON.stringify(res, null, 2) }), 'AI is writing your article...' )} disabled={loadingStates.leadership} className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-500/20 text-blue-300 hover:bg-blue-500/30 font-semibold rounded-lg transition-colors disabled:opacity-50">
                                {loadingStates.leadership ? <Spinner /> : 'Read Article'}
                            </button>
                             {errorStates.leadership && <p className="text-red-400 text-xs mt-1">{errorStates.leadership}</p>}
                        </div>
                    </div>
                    {/* Recommended Reading */}
                    <div className="bg-slate-800/50 p-6 rounded-xl border border-slate-700 flex flex-col">
                        <h3 className="font-semibold text-lg text-amber-400 mb-2">AI-Curated Reading List</h3>
                        <p className="text-sm text-slate-400 mb-4 flex-grow">Get a personalized list of books on any spiritual topic that interests you.</p>
                        <form onSubmit={e => { e.preventDefault(); if(readingTopic) handleGenerate('reading', () => getRecommendedReading(readingTopic), res => ({ title: `Recommended Reading on "${readingTopic}"`, content: <div className="space-y-4">{res.map((r: RecommendedReading, i: number) => <div key={i} className="border-b border-slate-700/50 pb-4 last:border-b-0 last:pb-0"><p className="font-bold text-lg text-white">{r.title}</p><p className="text-sm text-slate-400 mb-2">by {r.author}</p><p className="text-slate-300 italic bg-slate-900/50 p-3 rounded-md">✨ "{r.summary}"</p></div>)}</div>}), res => ({ name: `Reading List: ${readingTopic}`, content: JSON.stringify(res, null, 2) }), 'AI is curating your reading list...' )}} className="space-y-2 mt-auto">
                            <input type="text" value={readingTopic} onChange={e => setReadingTopic(e.target.value)} placeholder="Topic (e.g., Mindfulness)" className="w-full bg-slate-700 border border-slate-600 rounded-md p-2 text-white" />
                            <button type="submit" disabled={loadingStates.reading || !readingTopic} className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-500/20 text-blue-300 hover:bg-blue-500/30 font-semibold rounded-lg transition-colors disabled:opacity-50">
                                {loadingStates.reading ? <Spinner /> : <BookIcon className="w-5 h-5"/>}
                            </button>
                             {errorStates.reading && <p className="text-red-400 text-xs mt-1">{errorStates.reading}</p>}
                        </form>
                    </div>
                    {/* Interfaith Dialogue */}
                    <div className="bg-slate-800/50 p-6 rounded-xl border border-slate-700 flex flex-col">
                        <h3 className="font-semibold text-lg text-amber-400 mb-2">Interfaith Dialogue Starter</h3>
                        <p className="text-sm text-slate-400 mb-4 flex-grow">Generate respectful questions to foster understanding between different faiths on a shared theme.</p>
                         <div className="space-y-2 mt-auto">
                            <input type="text" value={faith1} onChange={e => setFaith1(e.target.value)} placeholder="First Faith..." className="w-full bg-slate-700 border border-slate-600 rounded-md p-2 text-white" />
                             <input type="text" value={faith2} onChange={e => setFaith2(e.target.value)} placeholder="Second Faith..." className="w-full bg-slate-700 border border-slate-600 rounded-md p-2 text-white" />
                             <input type="text" value={dialogueTopic} onChange={e => setDialogueTopic(e.target.value)} placeholder="Shared Topic..." className="w-full bg-slate-700 border border-slate-600 rounded-md p-2 text-white" />
                            <button onClick={() => handleGenerate('dialogue', () => generateInterfaithDialogue(faith1, faith2, dialogueTopic), res => ({ title: `Dialogue: ${res.faiths.join(' & ')} on ${res.topic}`, content: <InterfaithDialogueDisplay dialogue={res}/>}), res => ({ name: `Dialogue: ${dialogueTopic}`, content: JSON.stringify(res, null, 2) }), 'AI is preparing dialogue starters...' )} disabled={loadingStates.dialogue || !faith1 || !faith2 || !dialogueTopic} className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-500/20 text-blue-300 hover:bg-blue-500/30 font-semibold rounded-lg transition-colors disabled:opacity-50">
                                {loadingStates.dialogue ? <Spinner /> : <UsersIcon className="w-5 h-5"/>}
                            </button>
                             {errorStates.dialogue && <p className="text-red-400 text-xs mt-1">{errorStates.dialogue}</p>}
                        </div>
                    </div>
                 </div>
            </section>

             {/* Community Finder */}
            <section className="pt-8 border-t border-slate-700/50">
                <h2 className="text-2xl font-bold text-white mb-4">Find a Local Community</h2>
                <div className="bg-slate-800/50 p-6 rounded-xl border border-slate-700">
                    <form onSubmit={handleFindCommunities} className="flex items-center gap-2 mb-6">
                        <input type="text" value={communityQuery} onChange={e => setCommunityQuery(e.target.value)} placeholder="Enter your city or zip code..." className="w-full bg-slate-700 border border-slate-600 rounded-md p-2 text-white" />
                        <button type="submit" disabled={loadingStates.community} className="bg-amber-500 text-slate-900 font-bold py-2 px-4 rounded-md hover:bg-amber-400 disabled:bg-slate-600 flex-shrink-0">
                            {loadingStates.community ? <Spinner /> : <SearchIcon className="w-5 h-5" />}
                        </button>
                    </form>
                    {loadingStates.community ? (
                        <div className="flex justify-center py-8"><Spinner /></div>
                    ) : errorStates.community ? (
                        <p className="text-red-400 text-center">{errorStates.community}</p>
                    ) : communities ? (
                        communities.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fade-in-short">
                                {communities.map(c => (
                                    <div key={c.id} className="bg-slate-700/50 p-4 rounded-lg">
                                        <h4 className="font-semibold text-white">{c.name}</h4>
                                        <p className="text-sm text-slate-400">{c.denomination}</p>
                                        <p className="text-sm text-slate-500">{c.address}</p>
                                        <p className="text-sm text-slate-300 mt-2 pt-2 border-t border-slate-600/50 italic">✨ {c.summary}</p>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-center text-slate-500 py-8">No communities found for this location.</p>
                        )
                    ) : null}
                </div>
            </section>
        </div>
    );
};

export default ResourceCentre;