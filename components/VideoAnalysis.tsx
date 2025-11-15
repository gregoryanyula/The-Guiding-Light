import React, { useState, useRef } from 'react';
import { analyzeVideo } from '../services/geminiService';
import { VideoAnalysisIcon, SparklesIcon } from './Icons';
import Spinner from './Spinner';

const VideoAnalysis: React.FC = () => {
    const [videoFile, setVideoFile] = useState<File | null>(null);
    const [videoPreview, setVideoPreview] = useState<string | null>(null);
    const [prompt, setPrompt] = useState('');
    const [response, setResponse] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file && file.type.startsWith('video/')) {
            setVideoFile(file);
            setVideoPreview(URL.createObjectURL(file));
            setResponse('');
            setError('');
        } else {
            setError('Please select a valid video file.');
        }
    };

    const handleAnalyze = async () => {
        if (!videoFile || !prompt) {
            setError('Please select a video and enter a prompt.');
            return;
        }
        setIsLoading(true);
        setError('');
        setResponse('');

        try {
            const reader = new FileReader();
            reader.readAsDataURL(videoFile);
            reader.onloadend = async () => {
                const base64Video = (reader.result as string).split(',')[1];
                const result = await analyzeVideo(base64Video, videoFile.type, prompt);
                if (result) {
                    setResponse(result);
                } else {
                    setError('Failed to analyze the video. The file might be too large or the format is unsupported.');
                }
                setIsLoading(false);
            };
        } catch (err) {
            console.error('Error analyzing video:', err);
            setError('An unexpected error occurred during analysis.');
            setIsLoading(false);
        }
    };
    
    const handleRemoveVideo = () => {
        setVideoFile(null);
        setVideoPreview(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    }

    return (
        <div className="animate-fade-in space-y-8">
            <div>
                <h1 className="text-3xl sm:text-4xl font-bold text-white flex items-center gap-3">
                    <VideoAnalysisIcon className="w-10 h-10"/> AI Video Analysis
                </h1>
                <p className="mt-2 text-lg text-slate-400">Unlock insights from your videos with Gemini.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-slate-800/50 backdrop-blur-sm p-6 rounded-xl shadow-lg border border-slate-700 space-y-4">
                    <h2 className="text-xl font-semibold text-white">1. Upload a Video</h2>
                    <div className="aspect-video bg-slate-900 rounded-lg flex items-center justify-center border-2 border-dashed border-slate-600">
                        {videoPreview ? (
                            <video src={videoPreview} controls className="w-full h-full object-contain rounded-lg" />
                        ) : (
                             <p className="text-slate-500">Your video will appear here</p>
                        )}
                    </div>
                    <input
                        type="file"
                        accept="video/*"
                        onChange={handleFileChange}
                        ref={fileInputRef}
                        className="block w-full text-sm text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-amber-500/10 file:text-amber-300 hover:file:bg-amber-500/20"
                    />
                    {videoFile && <button onClick={handleRemoveVideo} className="text-sm text-red-400 hover:text-red-300">Remove Video</button>}

                    <h2 className="text-xl font-semibold text-white pt-4">2. Ask a Question</h2>
                    <textarea
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        rows={3}
                        placeholder="e.g., 'What is happening in this video?' or 'Summarize the key events.'"
                        className="w-full bg-slate-700 border border-slate-600 rounded-md p-2 text-white"
                    />

                    <button
                        onClick={handleAnalyze}
                        disabled={isLoading || !videoFile || !prompt}
                        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-amber-500 text-slate-900 font-bold rounded-lg hover:bg-amber-400 disabled:bg-slate-600"
                    >
                        {isLoading ? <Spinner /> : <><SparklesIcon className="w-5 h-5" /> Analyze Video</>}
                    </button>
                    {error && <p className="text-red-400 text-sm mt-1">{error}</p>}
                </div>
                
                <div className="bg-slate-800/50 backdrop-blur-sm p-6 rounded-xl shadow-lg border border-slate-700">
                     <h2 className="text-xl font-semibold text-amber-400 mb-4">Analysis Result</h2>
                     <div className="bg-slate-900/50 p-4 rounded-lg min-h-[400px]">
                        {isLoading ? (
                            <div className="flex justify-center items-center h-full"><Spinner /></div>
                        ) : response ? (
                            <p className="text-slate-300 whitespace-pre-wrap">{response}</p>
                        ) : (
                            <p className="text-slate-500">The AI's analysis will appear here.</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default VideoAnalysis;
