import React, { useState, useEffect } from 'react';
import { Challenge, User } from '../types';

type Priority = 'High' | 'Medium' | 'Low';

export const challenges: Challenge[] = [
  { id: 1, title: '7 Days of Gratitude', description: 'Each day, write down three things you are grateful for.', reward: 'New profile badge 🏆', emoji: '🙏' },
  { id: 2, title: 'Mindful Morning', description: 'Spend the first 10 minutes of your day in silent meditation, without any devices.', reward: 'Exclusive "Sunrise" meditation', emoji: '🌅' },
  { id: 3, title: 'Act of Kindness', description: 'Perform one random act of kindness for a stranger this week.', reward: 'Inspirational quote poster', emoji: '💖' },
  { id: 4, title: 'Digital Detox', description: 'Spend a full 24 hours without social media.', reward: 'Extended app features', emoji: '📵' },
  { id: 5, title: 'Nature Walk', description: 'Take a 30-minute walk in nature, focusing on your senses.', reward: 'Calming nature soundscape', emoji: '🌳' },
  { id: 6, title: 'Reflective Journaling', description: 'Journal your thoughts and feelings for 15 minutes before bed for 3 consecutive days.', reward: 'Personalized growth insight', emoji: '✍️' },
];

interface ChallengesProps {
  user: User;
  completedChallenges: number[];
  onCompleteChallenge: (challengeId: number) => void;
}

const Challenges: React.FC<ChallengesProps> = ({ user, completedChallenges, onCompleteChallenge }) => {
  const storageKey = `challengePriorities_${user.id}`;
  
  const [priorities, setPriorities] = useState<{ [key: number]: Priority }>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(priorities));
  }, [priorities, storageKey]);

  const handlePriorityChange = (challengeId: number, newPriority: string) => {
    if (newPriority === "none") {
      setPriorities(prev => {
        const newPriorities = { ...prev };
        delete newPriorities[challengeId];
        return newPriorities;
      });
    } else {
      setPriorities(prev => ({
        ...prev,
        [challengeId]: newPriority as Priority,
      }));
    }
  };

  const getPriorityBorderColor = (priority?: Priority): string => {
    switch (priority) {
      case 'High': return 'border-red-500';
      case 'Medium': return 'border-yellow-500';
      case 'Low': return 'border-blue-500';
      default: return 'border-slate-700';
    }
  };

  return (
    <div className="animate-fade-in space-y-8">
      <div>
        <h1 className="text-3xl sm:text-4xl font-bold text-white">Spiritual Growth Challenges</h1>
        <p className="mt-2 text-lg text-slate-400">Embrace challenges to grow. Each step forward is a victory. 💪</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {challenges.map((challenge) => {
          const isCompleted = completedChallenges.includes(challenge.id);
          const priority = priorities[challenge.id];
          const borderColor = isCompleted ? 'border-green-500' : getPriorityBorderColor(priority);

          return (
            <div key={challenge.id} className={`p-6 rounded-xl border-2 transition-all duration-300 ${isCompleted ? 'bg-green-500/10' : 'bg-slate-800/50'} ${borderColor}`}>
              <div className="flex items-start justify-between">
                  <div>
                      <div className="text-4xl mb-2">{challenge.emoji}</div>
                      <h3 className="text-lg font-bold text-white">{challenge.title}</h3>
                  </div>
                  {isCompleted && <div className="text-xs font-bold uppercase text-green-400 bg-green-900/50 px-2 py-1 rounded-full">Completed</div>}
              </div>
              <p className="text-slate-400 my-3">{challenge.description}</p>
              <div className="text-sm text-amber-400 font-semibold mb-4">Reward: {challenge.reward}</div>
              
              <div className="mb-4 mt-auto pt-4 border-t border-slate-700/50">
                <label htmlFor={`priority-${challenge.id}`} className="block text-sm font-medium text-slate-400 mb-1">Priority</label>
                <select
                  id={`priority-${challenge.id}`}
                  value={priority || 'none'}
                  onChange={(e) => handlePriorityChange(challenge.id, e.target.value)}
                  disabled={isCompleted}
                  className="w-full bg-slate-700 border border-slate-600 rounded-md p-2 text-white focus:ring-amber-400 focus:border-amber-400 disabled:opacity-50"
                >
                  <option value="none">None</option>
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                </select>
              </div>

              <button
                onClick={() => onCompleteChallenge(challenge.id)}
                disabled={isCompleted}
                className={`w-full py-2 px-4 rounded-md font-semibold transition-colors ${
                  isCompleted
                    ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                    : 'bg-amber-500 text-slate-900 hover:bg-amber-400'
                }`}
              >
                {isCompleted ? 'Done!' : 'Mark as Complete'}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Challenges;
