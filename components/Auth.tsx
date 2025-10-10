import React, { useState } from 'react';
import { User } from '../types';
import { SparklesIcon, GoogleIcon } from './Icons';

interface AuthProps {
  onLogin: (user: User) => void;
}

const Auth: React.FC<AuthProps> = ({ onLogin }) => {
  const [isSigningUp, setIsSigningUp] = useState(true);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<{ general?: string; confirmPassword?: string }>({});

  const validateAndSubmit = () => {
    const newErrors: { general?: string; confirmPassword?: string } = {};
    if (!email || !password || (isSigningUp && !name)) {
      newErrors.general = 'Please fill in all required fields.';
    }
    if (isSigningUp && password !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match.';
    }
    
    setErrors(newErrors);

    if (Object.keys(newErrors).length === 0) {
      // Simulate successful login/signup
      onLogin({ id: email.toLowerCase(), name: isSigningUp ? name : 'Valued Seeker', email: email.toLowerCase() });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    validateAndSubmit();
  };
  
  const handleGoogleSignIn = () => {
    // Simulate Google Sign-In with a fictional user
    const googleEmail = 'alex.harper@google.com';
    onLogin({ id: googleEmail, name: 'Alex Harper', email: googleEmail });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 p-4">
      <div className="w-full max-w-md animate-fade-in">
        <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-tr from-amber-400 to-yellow-500 rounded-full flex items-center justify-center mr-3 shadow-lg mb-4">
                <SparklesIcon className="w-9 h-9 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-white tracking-wide">Welcome to The Guiding Light</h1>
            <p className="text-slate-400 mt-2">Your journey to inner peace begins here.</p>
        </div>

        <div className="bg-slate-800/50 backdrop-blur-sm p-8 rounded-xl shadow-lg border border-slate-700">
          <form onSubmit={handleSubmit} className="space-y-6">
            <h2 className="text-2xl font-semibold text-center text-white">{isSigningUp ? 'Create Your Account' : 'Sign In'}</h2>
            
            {isSigningUp && (
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-slate-300 mb-1">Name</label>
                <input
                  type="text"
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Alex"
                  className="w-full bg-slate-700 border border-slate-600 rounded-md p-3 text-white focus:ring-amber-400 focus:border-amber-400 transition"
                />
              </div>
            )}
            
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-300 mb-1">Email</label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full bg-slate-700 border border-slate-600 rounded-md p-3 text-white focus:ring-amber-400 focus:border-amber-400 transition"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-300 mb-1">Password</label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-slate-700 border border-slate-600 rounded-md p-3 text-white focus:ring-amber-400 focus:border-amber-400 transition"
              />
            </div>

            {isSigningUp && (
                <div>
                    <label htmlFor="confirmPassword" className="block text-sm font-medium text-slate-300 mb-1">Confirm Password</label>
                    <input
                        type="password"
                        id="confirmPassword"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="••••••••"
                        className={`w-full bg-slate-700 border rounded-md p-3 text-white focus:ring-amber-400 focus:border-amber-400 transition ${errors.confirmPassword ? 'border-red-500' : 'border-slate-600'}`}
                    />
                    {errors.confirmPassword && <p className="text-red-400 text-sm mt-1">{errors.confirmPassword}</p>}
                </div>
            )}
            
            {errors.general && <p className="text-red-400 text-sm">{errors.general}</p>}

            <button type="submit" className="w-full bg-amber-500 text-slate-900 font-bold py-3 px-4 rounded-md hover:bg-amber-400 transition-colors disabled:bg-slate-600">
              {isSigningUp ? 'Sign Up' : 'Sign In'}
            </button>
          </form>

            <div className="relative flex py-5 items-center">
                <div className="flex-grow border-t border-slate-600"></div>
                <span className="flex-shrink mx-4 text-slate-400 text-sm">OR</span>
                <div className="flex-grow border-t border-slate-600"></div>
            </div>

            <button 
                type="button" 
                onClick={handleGoogleSignIn}
                className="w-full flex justify-center items-center gap-3 bg-white text-slate-700 font-semibold py-3 px-4 rounded-md hover:bg-slate-200 transition-colors"
            >
                <GoogleIcon className="w-6 h-6" />
                Sign {isSigningUp ? 'Up' : 'In'} with Google
            </button>

          <p className="text-center text-slate-400 mt-6">
            {isSigningUp ? 'Already have an account?' : "Don't have an account?"}
            <button onClick={() => { setErrors({}); setIsSigningUp(!isSigningUp); }} className="font-semibold text-amber-400 hover:text-amber-300 ml-2">
              {isSigningUp ? 'Sign In' : 'Sign Up'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Auth;