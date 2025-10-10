import React, { useState, useEffect } from 'react';
import { Event } from '../types';
import { generateEventPlan, generateIcsFileContent, generateEventSocialPost } from '../services/geminiService';
import Spinner from './Spinner';
import { SparklesIcon, CloseIcon, CalendarPlusIcon, ShareIcon, ClipboardIcon, DownloadIcon } from './Icons';

// Mock data for events with dynamic start times
const now = new Date();
const mockEvents: Event[] = [
  { id: 1, title: 'Deep Dive: The Art of Letting Go', description: 'Join us for a community discussion on releasing what no longer serves you.', startTime: new Date(now.getTime() + 2 * 60 * 60 * 1000), durationMinutes: 45 },
  { id: 2, title: 'Live Reflection: Finding Stillness', description: 'A guided session on discovering peace in the present moment. This event is currently live.', startTime: new Date(now.getTime() - 10 * 60 * 1000), durationMinutes: 30 },
  { id: 3, title: 'Community Connect: Gratitude Circle', description: 'Share and listen to stories of gratitude in a supportive and open environment.', startTime: new Date(now.getTime() + 24 * 60 * 60 * 1000), durationMinutes: 60 },
  { id: 4, title: 'Wisdom Workshop: The Stoic Mind', description: 'Explore ancient wisdom for modern challenges. This event has concluded.', startTime: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000), durationMinutes: 60 },
];

const getEventStatus = (event: Event): { status: 'Live' | 'Upcoming' | 'Finished'; color: string } => {
  const now = new Date().getTime();
  const startTime = event.startTime.getTime();
  const endTime = startTime + event.durationMinutes * 60 * 1000;

  if (now >= startTime && now < endTime) {
    return { status: 'Live', color: 'bg-red-500' };
  }
  if (now < startTime) {
    return { status: 'Upcoming', color: 'bg-blue-500' };
  }
  return { status: 'Finished', color: 'bg-slate-600' };
};

export const Events: React.FC = () => {
  const [signUps, setSignUps] = useState<number[]>([]);
  const [showPlanner, setShowPlanner] = useState(false);
  const [topic, setTopic] = useState('');
  const [generatedPlan, setGeneratedPlan] = useState<any | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState('');
  const [generatingIcs, setGeneratingIcs] = useState<number | null>(null);
  const [copyPlannerSuccess, setCopyPlannerSuccess] = useState('');

  const [shareableTexts, setShareableTexts] = useState<{ [key: number]: string }>({});
  const [generatingShareTextId, setGeneratingShareTextId] = useState<number | null>(null);
  const [copyShareSuccessId, setCopyShareSuccessId] = useState<number | null>(null);


  useEffect(() => {
    const storedSignUps = localStorage.getItem('eventSignUps');
    if (storedSignUps) {
      setSignUps(JSON.parse(storedSignUps));
    }
  }, []);

  const handleSignUp = (eventId: number) => {
    const newSignUps = signUps.includes(eventId)
      ? signUps.filter(id => id !== eventId)
      : [...signUps, eventId];
    setSignUps(newSignUps);
    localStorage.setItem('eventSignUps', JSON.stringify(newSignUps));
  };

  const handleGeneratePlan = async () => {
    if (!topic.trim()) {
        setError("Please enter a topic.");
        return;
    }
    setError('');
    setIsGenerating(true);
    setGeneratedPlan(null);
    const plan = await generateEventPlan(topic);
    if (plan) {
        setGeneratedPlan(plan);
    } else {
        setError("Failed to generate an event plan. The AI may be busy, please try again.");
    }
    setIsGenerating(false);
  };
  
  const resetPlanner = () => {
      setShowPlanner(false);
      setTopic('');
      setGeneratedPlan(null);
      setError('');
  };

  const handleAddToCalendar = async (event: Event) => {
    setGeneratingIcs(event.id);
    const icsContent = await generateIcsFileContent(event);
    if (icsContent) {
        const blob = new Blob([icsContent], { type: 'text/calendar' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${event.title.replace(/ /g, '_')}.ics`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    } else {
        alert('Could not generate the calendar file. Please try again.');
    }
    setGeneratingIcs(null);
  };

  const planToString = (plan: any, topic: string) => {
    return `
Event Plan for: "${topic}"
=========================

Title: ${plan.eventTitle}

Description: ${plan.eventDescription}

Opening Meditation:
"${plan.openingMeditation}"

Discussion Points:
${plan.discussionPoints.map((point: string) => `- ${point}`).join('\n')}
    `.trim();
  };

  const handleCopyPlanner = () => {
    if (!generatedPlan) return;
    const planText = planToString(generatedPlan, topic);
    navigator.clipboard.writeText(planText).then(() => {
        setCopyPlannerSuccess('Plan copied to clipboard!');
        setTimeout(() => setCopyPlannerSuccess(''), 2000);
    });
  };
  
  const handleDownloadPlanner = () => {
    if (!generatedPlan) return;
    const planText = planToString(generatedPlan, topic);
    const blob = new Blob([planText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `event_plan_${topic.replace(/\s+/g, '_')}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleSharePlanner = async () => {
    if (!generatedPlan || !navigator.share) return;
    const shareText = `Check out this event plan for "${topic}" generated by The Guiding Light AI:\n\nTitle: ${generatedPlan.eventTitle}\n\n${generatedPlan.eventDescription}`;
    try {
        await navigator.share({
            title: `Event Plan: ${generatedPlan.eventTitle}`,
            text: shareText,
        });
    } catch (error) {
        console.error('Sharing failed', error);
    }
  };

  const handleGenerateShareText = async (event: Event) => {
    setGeneratingShareTextId(event.id);
    try {
      const postText = await generateEventSocialPost(event);
      setShareableTexts(prev => ({...prev, [event.id]: postText}));
    } catch (e) {
      console.error("Failed to generate share text", e);
    } finally {
      setGeneratingShareTextId(null);
    }
  };

  const handleCopyShareText = (text: string, eventId: number) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopyShareSuccessId(eventId);
      setTimeout(() => setCopyShareSuccessId(null), 2000);
    });
  };

  const handleSharePost = async (text: string, title: string, eventId: number) => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Event: ${title}`,
          text: text,
        });
      } catch (error) {
        if (error instanceof Error && error.name !== 'AbortError') {
          console.error('Sharing failed', error);
        }
      }
    } else {
      // Fallback for browsers that don't support Web Share API
      handleCopyShareText(text, eventId);
    }
  };


  return (
    <div className="animate-fade-in space-y-8">
      <div>
        <h1 className="text-3xl sm:text-4xl font-bold text-white">AI-Hosted Spiritual Events</h1>
        <p className="mt-2 text-lg text-slate-400">Join our community for live discussions, workshops, and shared reflections. 🗓️</p>
      </div>

      {/* AI Event Planner */}
      <div className="bg-slate-800/50 backdrop-blur-sm p-6 rounded-xl shadow-lg border border-slate-700">
        <div className="flex justify-between items-start">
            <div>
                <h2 className="text-xl font-semibold text-amber-400 mb-2 flex items-center gap-2">
                    <SparklesIcon className="w-6 h-6"/> AI Event Planner
                </h2>
                <p className="text-slate-400">Have an idea for a discussion? Let our AI help you plan it.</p>
            </div>
            {!showPlanner && (
                <button onClick={() => setShowPlanner(true)} className="bg-amber-500 text-slate-900 font-bold py-2 px-4 rounded-md hover:bg-amber-400 transition-colors">
                    Suggest a Topic
                </button>
            )}
        </div>

        {showPlanner && (
            <div className="mt-4 pt-4 border-t border-slate-700 space-y-4 animate-fade-in-short">
                {generatedPlan ? (
                    <div>
                        <h3 className="text-lg font-bold text-white">Generated Event Plan for "{topic}"</h3>
                        <div className="mt-4 space-y-4 bg-slate-700/50 p-4 rounded-lg">
                            <p><strong className="text-slate-300">Title:</strong> {generatedPlan.eventTitle}</p>
                            <p><strong className="text-slate-300">Description:</strong> {generatedPlan.eventDescription}</p>
                            <p><strong className="text-slate-300">Opening Meditation:</strong> <em>"{generatedPlan.openingMeditation}"</em></p>
                            <div>
                                <strong className="text-slate-300">Discussion Points:</strong>
                                <ul className="list-disc list-inside text-slate-400 mt-1">
                                    {generatedPlan.discussionPoints.map((point: string, index: number) => <li key={index}>{point}</li>)}
                                </ul>
                            </div>
                        </div>
                        <div className="mt-4 pt-4 border-t border-slate-700 flex items-center gap-4">
                            <button onClick={handleDownloadPlanner} className="flex items-center gap-2 text-sm bg-slate-700 text-slate-300 hover:bg-slate-600 font-semibold py-2 px-3 rounded-md transition-colors">
                                <DownloadIcon className="w-5 h-5" /> Download Plan
                            </button>
                            <button onClick={handleCopyPlanner} className="flex items-center gap-2 text-sm bg-slate-700 text-slate-300 hover:bg-slate-600 font-semibold py-2 px-3 rounded-md transition-colors">
                                <ClipboardIcon className="w-5 h-5" /> Copy Plan
                            </button>
                            {navigator.share && (
                                <button onClick={handleSharePlanner} className="flex items-center gap-2 text-sm bg-slate-700 text-slate-300 hover:bg-slate-600 font-semibold py-2 px-3 rounded-md transition-colors">
                                    <ShareIcon className="w-5 h-5" /> Share
                                </button>
                            )}
                            {copyPlannerSuccess && <span className="text-green-400 text-sm animate-fade-in">{copyPlannerSuccess}</span>}
                        </div>
                        <button onClick={resetPlanner} className="mt-4 text-sm text-slate-400 hover:text-white transition-colors">Plan another event</button>
                    </div>
                ) : (
                    <div>
                        <label htmlFor="topic-suggestion" className="block text-sm font-medium text-slate-300 mb-1">What topic would you like to discuss?</label>
                        <div className="flex items-center gap-2">
                            <input
                              type="text"
                              id="topic-suggestion"
                              value={topic}
                              onChange={(e) => setTopic(e.target.value)}
                              placeholder="e.g., 'The Nature of Consciousness'"
                              className="flex-grow bg-slate-700 border border-slate-600 rounded-md p-2 text-white focus:ring-amber-400 focus:border-amber-400"
                            />
                            <button onClick={handleGeneratePlan} disabled={isGenerating} className="bg-blue-500 text-white font-semibold py-2 px-4 rounded-md hover:bg-blue-400 transition-colors disabled:bg-slate-600 flex items-center justify-center">
                                {isGenerating ? <Spinner/> : 'Generate Plan'}
                            </button>
                            <button onClick={resetPlanner} className="p-2 text-slate-400 hover:text-white" aria-label="Close planner"><CloseIcon className="w-6 h-6"/></button>
                        </div>
                        {error && <p className="text-red-400 mt-2">{error}</p>}
                    </div>
                )}
            </div>
        )}
      </div>

      {/* Event Listings */}
      <div className="space-y-6">
        {mockEvents.sort((a, b) => a.startTime.getTime() - b.startTime.getTime()).map(event => {
          const { status, color } = getEventStatus(event);
          const isFinished = status === 'Finished';
          const isSignedUp = signUps.includes(event.id);
          const shareText = shareableTexts[event.id];

          return (
            <div key={event.id} className="bg-slate-800/50 p-6 rounded-xl border border-slate-700 flex flex-col sm:flex-row items-start gap-4">
              <div className="flex-grow">
                <div className="flex items-center gap-3 mb-2">
                  <span className={`text-xs font-bold uppercase px-2 py-1 rounded-full text-white ${color}`}>{status}</span>
                  <p className="text-slate-400 text-sm">{event.startTime.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</p>
                </div>
                <h3 className="text-lg font-bold text-white">{event.title}</h3>
                <p className="text-slate-400">{event.description}</p>
                
                {shareText && (
                  <div className="mt-4 pt-4 border-t border-slate-700/50 space-y-3 animate-fade-in-short">
                    <p className="text-sm font-semibold text-slate-300">AI-Generated Share Post:</p>
                    <p className="bg-slate-700/50 p-3 rounded-md text-slate-300 text-sm whitespace-pre-wrap">{shareText}</p>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => handleSharePost(shareText, event.title, event.id)}
                        className="flex items-center gap-2 text-sm bg-slate-700 text-slate-300 hover:bg-slate-600 font-semibold py-2 px-3 rounded-md transition-colors"
                      >
                        <ShareIcon className="w-5 h-5" />
                        <span>Share Post</span>
                      </button>
                      {copyShareSuccessId === event.id && <span className="text-green-400 text-sm animate-fade-in">Copied!</span>}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex-shrink-0 flex flex-col sm:items-end w-full sm:w-auto gap-2 mt-4 sm:mt-0">
                <div className="flex flex-wrap items-center gap-2">
                  {!shareText && (
                      <button
                          onClick={() => handleGenerateShareText(event)}
                          disabled={generatingShareTextId != null}
                          className="flex items-center gap-2 text-sm bg-slate-700 text-slate-300 hover:bg-slate-600 font-semibold py-2 px-3 rounded-md transition-colors disabled:opacity-50"
                      >
                          {generatingShareTextId === event.id ? <Spinner/> : <SparklesIcon className="w-5 h-5"/>}
                          Create Post
                      </button>
                    )}
                  {!isFinished && (
                    <button
                      onClick={() => handleAddToCalendar(event)}
                      disabled={generatingIcs != null}
                      className="flex items-center gap-2 text-sm bg-slate-700 text-slate-300 hover:bg-slate-600 font-semibold py-2 px-3 rounded-md transition-colors disabled:opacity-50"
                    >
                      {generatingIcs === event.id ? <Spinner/> : <CalendarPlusIcon className="w-5 h-5" />}
                      Add to Calendar
                    </button>
                  )}
                </div>
                {!isFinished && (
                  <button
                    onClick={() => handleSignUp(event.id)}
                    className={`w-full sm:w-auto py-2 px-6 rounded-md font-bold transition-colors ${
                      isSignedUp
                        ? 'bg-slate-600 text-slate-300 hover:bg-slate-500'
                        : 'bg-amber-500 text-slate-900 hover:bg-amber-400'
                    }`}
                  >
                    {isSignedUp ? '✓ Signed Up' : 'Sign Up'}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Events;