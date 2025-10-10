import React, { useState, useEffect, useMemo, useRef } from 'react';
import { generateTimedMeditationGuide } from '../services/geminiService';
import { TimedMeditationSegment } from '../types';
import Spinner from './Spinner';
import { CloseIcon, PlayIcon, PauseIcon, StopIcon } from './Icons';

interface AITimerProps {
  script: string;
  duration: string; // e.g., "5-minute"
  onClose: () => void;
  audioUrl: string | null;
}

const AITimer: React.FC<AITimerProps> = ({ script, duration, onClose, audioUrl }) => {
  const [guide, setGuide] = useState<TimedMeditationSegment[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const durationMinutes = useMemo(() => parseInt(duration.split('-')[0], 10), [duration]);
  const totalSeconds = useMemo(() => durationMinutes * 60, [durationMinutes]);

  const [secondsRemaining, setSecondsRemaining] = useState(totalSeconds);
  const [isActive, setIsActive] = useState(false);
  const [currentInstruction, setCurrentInstruction] = useState('Preparing your session...');
  
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    const fetchGuide = async () => {
      setIsLoading(true);
      setError('');
      const result = await generateTimedMeditationGuide(script, durationMinutes);
      if (result) {
        setGuide(result);
        setCurrentInstruction(result[0]?.instruction || 'Press play to begin your meditation.');
      } else {
        setError('Could not generate the timed guide. You can still follow the script manually.');
        setCurrentInstruction('Press play to begin your meditation.');
      }
      setIsLoading(false);
    };
    fetchGuide();
  }, [script, durationMinutes]);
  
  useEffect(() => {
    if (audioRef.current) {
      if (isActive) {
        audioRef.current.play().catch(e => console.error("Audio play failed", e));
      } else {
        audioRef.current.pause();
      }
    }
  }, [isActive]);

  useEffect(() => {
    if (!guide || guide.length === 0) return;

    const currentElapsedTime = totalSeconds - secondsRemaining;
    const activeSegment = guide.find(
      (segment, index) => {
        const nextSegment = guide[index + 1];
        if (!nextSegment) return true; // Last segment
        return currentElapsedTime >= segment.startTime && currentElapsedTime < nextSegment.startTime;
      }
    );

    if (activeSegment && activeSegment.instruction !== currentInstruction) {
      setCurrentInstruction(activeSegment.instruction);
    }
  }, [secondsRemaining, guide, totalSeconds, currentInstruction]);


  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;
    if (isActive && secondsRemaining > 0) {
      interval = setInterval(() => {
        setSecondsRemaining(seconds => seconds - 1);
      }, 1000);
    } else if (!isActive && secondsRemaining !== 0) {
      if(interval) clearInterval(interval);
    } else if (secondsRemaining === 0) {
        setIsActive(false);
        setCurrentInstruction("Session complete. Take a moment to rest in this feeling of peace. 🙏");
        if(interval) clearInterval(interval);
    }
    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [isActive, secondsRemaining]);

  const handleToggle = () => {
    if (secondsRemaining > 0) {
        setIsActive(!isActive);
    }
  };

  const handleReset = () => {
    setIsActive(false);
    setSecondsRemaining(totalSeconds);
    setCurrentInstruction(guide?.[0]?.instruction || 'Press play to begin your meditation.');
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };
  
  const progress = ((totalSeconds - secondsRemaining) / totalSeconds) * 100;
  const circumference = 2 * Math.PI * 90; // 2 * pi * radius
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <div 
        className="fixed inset-0 z-50 flex items-center justify-center p-4 immersive-background"
        role="dialog"
        aria-modal="true"
        aria-labelledby="meditation-timer-title"
    >
      {audioUrl && <audio ref={audioRef} src={audioUrl} onEnded={() => setIsActive(false)} />}
      <div className="w-full h-full flex flex-col items-center justify-center p-6 space-y-6 animate-fade-in relative">
        <button onClick={onClose} className="absolute top-6 right-6 text-slate-300 hover:text-white z-10 p-2 bg-black/20 rounded-full transition-colors"><CloseIcon className="w-8 h-8"/></button>
        <h2 id="meditation-timer-title" className="text-2xl sm:text-3xl font-bold text-white text-center drop-shadow-lg">Guided Meditation Session</h2>
        
        <div className="flex-grow flex flex-col items-center justify-center space-y-8 w-full max-w-lg">
            <div 
                className="relative w-60 h-60 sm:w-72 sm:h-72 flex items-center justify-center"
                role="progressbar"
                aria-valuenow={Math.round(progress)}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label="Meditation progress"
            >
                 <svg className="absolute w-full h-full" viewBox="0 0 200 200">
                    <circle cx="100" cy="100" r="90" strokeWidth="8" className="text-white/10" stroke="currentColor" fill="transparent" />
                    <circle
                        cx="100"
                        cy="100"
                        r="90"
                        strokeWidth="8"
                        className="text-amber-400 drop-shadow-md"
                        stroke="currentColor"
                        fill="transparent"
                        strokeLinecap="round"
                        transform="rotate(-90 100 100)"
                        style={{
                            strokeDasharray: circumference,
                            strokeDashoffset,
                            transition: 'stroke-dashoffset 1s linear'
                        }}
                    />
                </svg>
                <div className="text-center">
                    <p className="text-6xl sm:text-7xl font-mono font-bold text-white tracking-widest drop-shadow-lg">{formatTime(secondsRemaining)}</p>
                </div>
            </div>

            <div className="text-center bg-black/20 p-4 rounded-lg min-h-[120px] flex items-center justify-center w-full">
                {isLoading ? (
                    <div className="flex items-center gap-3">
                        <Spinner/>
                        <p className="text-slate-300 italic">AI is structuring your session...</p>
                    </div>
                ) : error ? (
                    <p className="text-red-400">{error}</p>
                ) : (
                    <p className="text-slate-200 text-xl sm:text-2xl transition-opacity duration-500 leading-relaxed">{currentInstruction}</p>
                )}
            </div>
        </div>
        
        <div className="flex items-center justify-center gap-8 py-4">
          <button 
            onClick={handleReset} 
            className="text-slate-300 hover:text-white transition-colors p-2 rounded-full"
            aria-label="Reset Timer"
          >
            <StopIcon className="w-10 h-10" />
          </button>
          <button 
            onClick={handleToggle}
            className="text-white bg-amber-500 hover:bg-amber-400 rounded-full p-4 transition-all hover:scale-105 shadow-lg"
            aria-label={isActive ? 'Pause Timer' : 'Play Timer'}
            disabled={secondsRemaining === 0}
          >
            {isActive ? <PauseIcon className="w-14 h-14" /> : <PlayIcon className="w-14 h-14" />}
          </button>
          {/* A placeholder for symmetry, or add another control later */}
          <div className="w-14 h-14"></div>
        </div>
      </div>
    </div>
  );
};

export default AITimer;