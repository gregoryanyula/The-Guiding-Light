import React, { useState, useEffect } from 'react';
import { suggestNarrationStyles, generateNarration } from '../services/geminiService';
import Spinner from './Spinner';
import { AudioIcon, SparklesIcon, CheckCircleIcon } from './Icons';

interface StyleSuggestion {
  title: string;
  description: string;
}

interface NarrationAgentProps {
  textToNarrate: string;
}

const NarrationAgent: React.FC<NarrationAgentProps> = ({ textToNarrate }) => {
  const [styles, setStyles] = useState<StyleSuggestion[] | null>(null);
  const [selectedStyle, setSelectedStyle] = useState<string>('');
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [suggestError, setSuggestError] = useState('');
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [generateError, setGenerateError] = useState('');

  useEffect(() => {
    const fetchStyles = async () => {
      setIsSuggesting(true);
      setSuggestError('');
      setStyles(null);
      setSelectedStyle('');
      setAudioUrl(null);
      setGenerateError('');

      const result = await suggestNarrationStyles(textToNarrate);
      if (result) {
        setStyles(result);
      } else {
        setSuggestError('Could not suggest narration styles.');
      }
      setIsSuggesting(false);
    };
    if (textToNarrate) {
      fetchStyles();
    }
  }, [textToNarrate]);

  const handleGenerate = async () => {
    if (!selectedStyle) return;
    setIsGenerating(true);
    setGenerateError('');
    setAudioUrl(null);

    const result = await generateNarration(textToNarrate, selectedStyle);
    if (result) {
      setAudioUrl(result);
    } else {
      setGenerateError('Failed to generate narration.');
    }
    setIsGenerating(false);
  };

  return (
    <div className="pt-6 border-t border-slate-700 mt-6">
      <div className="bg-slate-700/30 p-4 rounded-lg">
        <h3 className="font-semibold text-lg flex items-center mb-2">
          <AudioIcon className="w-6 h-6 mr-2 text-green-400" /> AI Narrator Agent
        </h3>
        <p className="text-slate-400 text-sm mb-4">
          Listen to this content with an AI-generated voice. This is helpful for auditory learners and users with visual impairments.
        </p>

        {isGenerating ? (
          <div className="flex justify-center items-center h-24"><Spinner /></div>
        ) : generateError ? (
          <p className="text-red-400">{generateError}</p>
        ) : audioUrl ? (
          <audio controls src={audioUrl} className="w-full">Your browser does not support the audio element.</audio>
        ) : isSuggesting ? (
          <div className="flex justify-center items-center h-24"><Spinner /></div>
        ) : suggestError ? (
          <p className="text-red-400">{suggestError}</p>
        ) : styles && (
          <div className="space-y-3">
            <p className="text-sm font-medium text-slate-300">Choose a voice style:</p>
            <div className="thin-scrollbar flex gap-2 overflow-x-auto pb-2">
              {styles.map((style, index) => {
                const isSelected = selectedStyle === style.description;
                return (
                  <button
                    key={index}
                    onClick={() => setSelectedStyle(style.description)}
                    className={`relative flex-shrink-0 w-44 text-left p-3 rounded-xl border-2 transition-all duration-200 group ${isSelected ? 'bg-green-500/20 border-green-400 scale-105' : 'bg-slate-900/60 border-slate-700 hover:border-slate-500'}`}
                    aria-pressed={isSelected}
                  >
                    {isSelected && (
                      <div className="absolute top-1 right-1 w-5 h-5 bg-slate-800 rounded-full flex items-center justify-center">
                        <CheckCircleIcon className="w-5 h-5 text-green-400" />
                      </div>
                    )}
                    <h5 className="font-bold text-sm text-white mb-1 transition-colors group-hover:text-amber-300 pr-4">{style.title}</h5>
                  </button>
                );
              })}
            </div>
            <button
              onClick={handleGenerate}
              disabled={!selectedStyle}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-green-500/20 text-green-300 hover:bg-green-500/30 font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-2"
              aria-label="Generate narration with selected voice style"
            >
              <SparklesIcon className="w-5 h-5" /> Generate Narration
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default NarrationAgent;
