import React from 'react';
import { View } from '../types';
import { DashboardIcon, SermonIcon, MeditationIcon, ChallengeIcon, StreamIcon, TrophyIcon, CalendarIcon, BookIcon, ScrollIcon, UsersIcon, SparklesIcon, LibraryIcon, BriefcaseIcon, MusicIcon, PrayerIcon } from './Icons';

interface HeaderProps {
  currentView: View;
  setView: (view: View) => void;
  completedChallengesCount: number;
  isLoggedIn: boolean;
}

interface NavItemProps {
  view: View;
  label: string;
  icon: React.ReactElement<{ className?: string }>;
  currentView: View;
  setView: (view: View) => void;
}

const NavItem: React.FC<NavItemProps> = ({ view, label, icon, currentView, setView }) => {
  const isActive = currentView === view;
  return (
    <li>
      <button
        onClick={() => setView(view)}
        className={`w-full flex items-center p-3 rounded-lg transition-all duration-200 ${
          isActive
            ? 'bg-amber-400 text-slate-900 shadow-lg'
            : 'text-slate-300 hover:bg-slate-700 hover:text-white'
        }`}
        aria-label={`Navigate to ${label}`}
        aria-current={isActive ? 'page' : undefined}
      >
        {React.cloneElement(icon, { className: 'w-6 h-6 mr-3' })}
        <span className="font-semibold">{label}</span>
      </button>
    </li>
  );
};


const Header: React.FC<HeaderProps> = ({ currentView, setView, completedChallengesCount, isLoggedIn }) => {
  const navItems = [
    { view: View.Dashboard, label: 'Dashboard', icon: <DashboardIcon /> },
    { view: View.Community, label: 'Community', icon: <UsersIcon /> },
    { view: View.Streaming, label: 'Live Stream', icon: <StreamIcon /> },
    { view: View.Events, label: 'Events', icon: <CalendarIcon /> },
    { view: View.Sermons, label: 'Sermons', icon: <SermonIcon /> },
    { view: View.Prayers, label: 'Prayers', icon: <PrayerIcon /> },
    { view: View.Meditations, label: 'Meditations', icon: <MeditationIcon /> },
    { view: View.MusicHub, label: 'Music Hub', icon: <MusicIcon /> },
    { view: View.Challenges, label: 'Challenges', icon: <ChallengeIcon /> },
    { view: View.ResourceCentre, label: 'Resource Centre', icon: <BriefcaseIcon /> },
    { view: View.Library, label: 'Library', icon: <LibraryIcon /> },
    { view: View.Bible, label: 'Bible', icon: <BookIcon /> },
    { view: View.StudyAssistant, label: 'Study Assistant', icon: <SparklesIcon /> },
    { view: View.WisdomLibrary, label: 'Wisdom Library', icon: <ScrollIcon /> },
  ];

  const isProfileActive = currentView === View.Profile;

  return (
    <header className="bg-slate-800/50 backdrop-blur-sm md:w-64 md:h-screen md:fixed md:flex md:flex-col md:border-r md:border-slate-700 p-4">
      <div className="flex items-center mb-8">
        <div className="w-12 h-12 bg-gradient-to-tr from-amber-400 to-yellow-500 rounded-full flex items-center justify-center mr-3 shadow-lg">
           <TrophyIcon className="w-7 h-7 text-white" />
        </div>
        <h1 className="text-xl font-bold text-white tracking-wide">The Guiding Light</h1>
      </div>

      <nav className="flex-1" role="navigation" aria-label="Main">
        <ul className="space-y-2">
          {navItems.map(item => (
            <NavItem
              key={item.view}
              view={item.view}
              label={item.label}
              icon={item.icon}
              currentView={currentView}
              setView={setView}
            />
          ))}
        </ul>
      </nav>

      {isLoggedIn && (
         <button
          onClick={() => setView(View.Profile)}
          className={`w-full mt-8 p-4 rounded-lg text-left transition-all duration-200 ${
            isProfileActive
              ? 'bg-slate-700 ring-2 ring-amber-400'
              : 'bg-slate-700/50 hover:bg-slate-700'
          }`}
          aria-label="Navigate to My Journey profile page"
        >
          <h3 className="font-semibold text-slate-300 mb-2">My Journey</h3>
          <div className="flex items-center text-amber-400">
            <TrophyIcon className="w-6 h-6 mr-2" />
            <span className="text-lg font-bold">{completedChallengesCount}</span>
            <span className="ml-1 text-slate-300">Achievements 🏆</span>
          </div>
        </button>
      )}
    </header>
  );
};

export default Header;