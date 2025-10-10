import React, { useState, useEffect, useRef } from 'react';
import { View, User, ChatMessage } from '../types';
import { generateChatbotResponse } from '../services/geminiService';
import { ChatIcon, CloseIcon, SendIcon, SparklesIcon } from './Icons';
import Spinner from './Spinner';

interface ChatbotProps {
  context: View;
  user: User;
}

const Chatbot: React.FC<ChatbotProps> = ({ context, user }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [userInput, setUserInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const getWelcomeMessage = (view: View): string => {
    const welcome = `Hi ${user.name}, I'm Kai! ✨`;
    switch (view) {
      case View.Dashboard:
        return `${welcome} Welcome back to your spiritual dashboard. Is there anything on your mind I can help with today?`;
      case View.Sermons:
        return `${welcome} Ready to create an inspiring sermon? Just give me a topic, or we can brainstorm one together.`;
      case View.Meditations:
        return `${welcome} Time to find some peace. 🧘‍♀️ What's our meditation goal for this session?`;
      case View.Challenges:
        return `${welcome} Feeling ready for a new challenge? Let's grow together! Let me know if you want suggestions.`;
      case View.Streaming:
        return `${welcome} Welcome to the Serenity Channel. Feel free to relax and share your thoughts as we reflect on today's theme.`;
      case View.Profile:
        return `${welcome} Taking a moment to reflect on your journey? It's wonderful to see your progress. Let me know if you'd like an AI analysis!`;
      case View.Events:
        return `${welcome} Here you can find community events or even plan your own. See anything that interests you?`;
      case View.StudyAssistant:
        return `${welcome} Welcome to the Study Assistant. I'm ready to help you explore any questions you have about the scriptures.`;
      case View.Bible:
        return `${welcome} Ready to dive into the scriptures with me? Are you looking to browse, or shall we search for something specific?`;
      case View.WisdomLibrary:
        return `${welcome} Let's explore some timeless texts. Select one and we can discuss its meaning together.`;
      case View.Community:
        return `${welcome} Welcome to the Community Hub! A great place to connect with others. What would you like to do first?`;
      default:
        return `${welcome} How can I help you find what you're looking for?`;
    }
  };

  useEffect(() => {
    // When context changes, start a new conversation with a welcome message
    setMessages([{ sender: 'ai', text: getWelcomeMessage(context) }]);
  }, [context, user.name]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userInput.trim() || isLoading) return;

    const newUserMessage: ChatMessage = { sender: 'user', text: userInput.trim() };
    const currentMessages = [...messages, newUserMessage];
    setMessages(currentMessages);
    setUserInput('');
    setIsLoading(true);

    const aiResponse = await generateChatbotResponse(currentMessages.filter(m => m.sender !== 'system'), context);
    
    setMessages(prev => [...prev, { sender: 'ai', text: aiResponse }]);
    setIsLoading(false);
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-50 w-16 h-16 bg-gradient-to-tr from-amber-400 to-yellow-500 rounded-full flex items-center justify-center shadow-lg hover:scale-110 transition-transform"
        aria-label="Open AI Assistant"
      >
        <ChatIcon className="w-8 h-8 text-white" />
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 w-[90vw] max-w-sm h-[70vh] max-h-[600px] bg-slate-800/80 backdrop-blur-md rounded-2xl shadow-2xl border border-slate-700 flex flex-col animate-fade-in-short">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-700 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-tr from-purple-500 to-indigo-500 rounded-full flex items-center justify-center">
            <SparklesIcon className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="font-bold text-white">Kai</h3>
            <p className="text-sm text-slate-400">Your AI Spiritual Companion</p>
          </div>
        </div>
        <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-white" aria-label="Close chat">
          <CloseIcon className="w-6 h-6" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 p-4 space-y-4 overflow-y-auto thin-scrollbar">
        {messages.map((msg, index) => (
          <div key={index} className={`flex items-start gap-3 ${msg.sender === 'user' ? 'justify-end' : ''}`}>
            {msg.sender === 'ai' && <div className="w-8 h-8 flex-shrink-0 bg-amber-500 rounded-full flex items-center justify-center p-1"><SparklesIcon className="w-5 h-5 text-slate-900"/></div>}
            <div className={`p-3 rounded-xl max-w-xs ${msg.sender === 'user' ? 'bg-blue-600 text-white rounded-br-none' : 'bg-slate-700 text-slate-300 rounded-bl-none'}`}>
              <p className="whitespace-pre-wrap">{msg.text}</p>
            </div>
          </div>
        ))}
        {isLoading && (
            <div className="flex items-start gap-3">
                <div className="w-8 h-8 flex-shrink-0 bg-amber-500 rounded-full flex items-center justify-center p-1"><SparklesIcon className="w-5 h-5 text-slate-900"/></div>
                <div className="p-3 rounded-xl max-w-xs bg-slate-700 text-slate-300 rounded-bl-none flex items-center">
                    <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                    <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.15s] mx-1"></div>
                    <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></div>
                </div>
            </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-slate-700 flex-shrink-0">
        <form onSubmit={handleSendMessage} className="flex items-center gap-2">
          <input
            type="text"
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            placeholder="Ask Kai anything..."
            className="w-full bg-slate-700 border border-slate-600 rounded-full py-2 px-4 text-white focus:ring-amber-400 focus:border-amber-400"
            disabled={isLoading}
          />
          <button type="submit" disabled={isLoading || !userInput.trim()} className="bg-amber-500 text-slate-900 w-10 h-10 flex-shrink-0 flex items-center justify-center rounded-full hover:bg-amber-400 transition-colors disabled:bg-slate-600 disabled:cursor-not-allowed">
            <SendIcon className="w-5 h-5" />
          </button>
        </form>
      </div>
    </div>
  );
};

export default Chatbot;