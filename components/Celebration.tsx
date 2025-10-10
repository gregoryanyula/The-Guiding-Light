import React, { useEffect } from 'react';

interface CelebrationProps {
  show: boolean;
  onClose: () => void;
}

const emojis = ['🎉', '✨', '🏆', '💖', '🙏', '🌟'];

const Celebration: React.FC<CelebrationProps> = ({ show, onClose }) => {
  useEffect(() => {
    if (show) {
      const timer = setTimeout(onClose, 5000);
      return () => clearTimeout(timer);
    }
  }, [show, onClose]);

  if (!show) return null;

  return (
    <div className="fixed inset-0 w-full h-full z-50 pointer-events-none overflow-hidden">
      {Array.from({ length: 50 }).map((_, i) => {
        const style = {
          left: `${Math.random() * 100}vw`,
          animationDelay: `${Math.random() * 2}s`,
          fontSize: `${1.5 + Math.random() * 1.5}rem`,
        };
        return (
          <div key={i} className="celebration-emoji" style={style}>
            {emojis[i % emojis.length]}
          </div>
        );
      })}
       <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-slate-800/80 backdrop-blur-md p-8 rounded-2xl shadow-2xl border border-amber-400 animate-fade-in">
        <h2 className="text-3xl font-bold text-white text-center">Challenge Complete!</h2>
        <p className="text-amber-300 text-center mt-2">Your spirit grows stronger. Well done! ✨</p>
      </div>
    </div>
  );
};

export default Celebration;