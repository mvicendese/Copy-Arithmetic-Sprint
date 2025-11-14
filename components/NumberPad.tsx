
import React from 'react';

interface NumberPadProps {
  onKeyPress: (key: string) => void;
}

const NumberPad: React.FC<NumberPadProps> = ({ onKeyPress }) => {
  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '-', '0', 'Backspace'];

  const KeyButton: React.FC<{ value: string }> = ({ value }) => (
    <button
      onClick={() => onKeyPress(value)}
      className="bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 rounded-lg text-2xl font-bold transition-colors duration-150 aspect-square flex items-center justify-center shadow-md"
      aria-label={value === 'Backspace' ? 'Backspace' : `Number ${value}`}
    >
      {value === 'Backspace' ? (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 17l-5-5 5-5m-4 5h12" />
        </svg>
      ) : (
        value
      )}
    </button>
  );

  return (
    <div className="grid grid-cols-3 gap-2 p-2 bg-slate-100 dark:bg-slate-800 rounded-xl shadow-inner w-full max-w-xs mx-auto">
      {keys.map((key) => (
        <KeyButton key={key} value={key} />
      ))}
    </div>
  );
};

export default NumberPad;