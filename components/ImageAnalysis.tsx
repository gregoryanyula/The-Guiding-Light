import React, { useState, useRef } from 'react';
import { analyzeImage } from '../services/geminiService';
import { ImageAnalysisIcon, SparklesIcon } from './Icons';
import Spinner from './Spinner';

const ImageAnalysis: React.FC = () => {
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [prompt, setPrompt] = useState('');
    const [response, setResponse] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file && file.type.startsWith('image/')) {
            setImageFile(file);
            setImagePreview(URL.createObjectURL(file));
            setResponse('');
            setError('');
        } else {
            setError('Please select a valid image file.');
        }
    };

    const handleAnalyze = async () => {
        if (!imageFile || !prompt) {
            setError('Please select an image and enter a prompt.');
            return;
        }
        setIsLoading(true);
        setError('');
        setResponse('');

        try {
            const reader = new FileReader();
            reader.readAsDataURL(imageFile);
            reader.onloadend = async () => {
                const base64Image = (reader.result as string).split(',')[1];
                const result = await analyzeImage(base64Image, imageFile.type, prompt);
                if (result) {
                    setResponse(result);
                } else {
                    setError('Failed to analyze the image. The AI may be busy.');
                }
                setIsLoading(false);
            };
        } catch (err) {
            console.error('Error analyzing image:', err);
            setError('An unexpected error occurred during analysis.');
            setIsLoading(false);
        }
    };
    
    const handleRemoveImage = () => {
        setImageFile(null);
        setImagePreview(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    }

    return (
        <div className="animate-fade-in space-y-8">
            <div>
                <h1 className="text-3xl sm:text-4xl font-bold text-white flex items-center gap-3">
                    <ImageAnalysisIcon className="w-10 h-10"/> AI Image Analysis
                </h1>
                <p className="mt-2 text-lg text-slate-400">Upload an image and ask Gemini anything about it.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-slate-800/50 backdrop-blur-sm p-6 rounded-xl shadow-lg border border-slate-700 space-y-4">
                    <h2 className="text-xl font-semibold text-white">1. Upload an Image</h2>
                    <div className="aspect-square bg-slate-900 rounded-lg flex items-center justify-center border-2 border-dashed border-slate-600">
                        {imagePreview ? (
                            <img src={imagePreview} alt="Upload preview" className="max-w-full max-h-full object-contain rounded-lg" />
                        ) : (
                             <p className="text-slate-500">Your image will appear here</p>
                        )}
                    </div>
                    <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileChange}
                        ref={fileInputRef}
                        className="block w-full text-sm text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-amber-500/10 file:text-amber-300 hover:file:bg-amber-500/20"
                    />
                     {imageFile && <button onClick={handleRemoveImage} className="text-sm text-red-400 hover:text-red-300">Remove Image</button>}

                    <h2 className="text-xl font-semibold text-white pt-4">2. Ask a Question</h2>
                    <textarea
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        rows={3}
                        placeholder="e.g., 'What is this image about?' or 'Describe the colors and mood.'"
                        className="w-full bg-slate-700 border border-slate-600 rounded-md p-2 text-white"
                    />

                    <button
                        onClick={handleAnalyze}
                        disabled={isLoading || !imageFile || !prompt}
                        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-amber-500 text-slate-900 font-bold rounded-lg hover:bg-amber-400 disabled:bg-slate-600"
                    >
                        {isLoading ? <Spinner /> : <><SparklesIcon className="w-5 h-5" /> Analyze Image</>}
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

export default ImageAnalysis;
