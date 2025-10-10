import React from 'react';

const Spinner: React.FC = () => {
  return (
    <div className="w-6 h-6 border-4 border-t-amber-400 border-r-amber-400 border-b-slate-600 border-l-slate-600 rounded-full animate-spin"></div>
  );
};

export default Spinner;
