import React, { useState, useEffect } from 'react';
import { CloseIcon, CalendarPlusIcon } from './Icons';
import Spinner from './Spinner';

interface ScheduleMeditationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (dateTime: Date) => void;
  theme: string;
  isScheduling: boolean;
}

const ScheduleMeditationModal: React.FC<ScheduleMeditationModalProps> = ({ isOpen, onClose, onConfirm, theme, isScheduling }) => {
  const [dateTime, setDateTime] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      // Set default to 1 hour from now
      const defaultDate = new Date(Date.now() + 60 * 60 * 1000);
      // Format for datetime-local input: YYYY-MM-DDTHH:mm
      const year = defaultDate.getFullYear();
      const month = (defaultDate.getMonth() + 1).toString().padStart(2, '0');
      const day = defaultDate.getDate().toString().padStart(2, '0');
      const hours = defaultDate.getHours().toString().padStart(2, '0');
      const minutes = defaultDate.getMinutes().toString().padStart(2, '0');
      setDateTime(`${year}-${month}-${day}T${hours}:${minutes}`);
      setError('');
    }
  }, [isOpen]);

  const handleConfirm = () => {
    const selectedDate = new Date(dateTime);
    if (isNaN(selectedDate.getTime())) {
      setError('Please enter a valid date and time.');
      return;
    }
    if (selectedDate < new Date()) {
        setError('Cannot schedule a meditation in the past.');
        return;
    }
    setError('');
    onConfirm(selectedDate);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-800 border border-slate-700 rounded-2xl shadow-lg w-full max-w-md p-6 space-y-4 animate-fade-in-short relative">
        <button onClick={onClose} disabled={isScheduling} className="absolute top-4 right-4 text-slate-400 hover:text-white disabled:opacity-50"><CloseIcon className="w-6 h-6"/></button>
        <h2 className="text-xl font-bold text-white">Schedule Meditation</h2>
        <p className="text-slate-400">Schedule your session for <span className="font-semibold text-amber-400">"{theme}"</span>.</p>
        
        <div>
          <label htmlFor="meditation-datetime" className="block text-sm font-medium text-slate-300 mb-1">
            Date and Time
          </label>
          <input
            type="datetime-local"
            id="meditation-datetime"
            value={dateTime}
            onChange={(e) => setDateTime(e.target.value)}
            disabled={isScheduling}
            className="w-full bg-slate-700 border border-slate-600 rounded-md p-2 text-white focus:ring-amber-400 focus:border-amber-400 disabled:opacity-50"
          />
        </div>

        {error && <p className="text-red-400 text-sm">{error}</p>}

        <div className="flex justify-end gap-3 pt-4 border-t border-slate-700">
          <button onClick={onClose} disabled={isScheduling} className="bg-slate-600 text-slate-200 font-semibold py-2 px-4 rounded-md hover:bg-slate-500 transition-colors disabled:opacity-50">
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={isScheduling}
            className="flex items-center justify-center gap-2 bg-amber-500 text-slate-900 font-bold py-2 px-4 rounded-md hover:bg-amber-400 transition-colors disabled:bg-slate-600 w-48"
          >
            {isScheduling ? <Spinner/> : <><CalendarPlusIcon className="w-5 h-5"/>Confirm Schedule</>}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ScheduleMeditationModal;