import React, { useState } from 'react';
import { generateImage } from '../services/geminiService';
import { PhotoIcon, SparklesIcon, DownloadIcon } from './Icons';
import Spinner from './Spinner';

const aspectRatios = ["1:1", "16:9", "9:16", "4:3", "3:4"];

const ImageGenerator: React.FC<{ onAddToLibrary: (name: string, content: string, mimeType: string) => Promise<void> }> = ({ onAddToLibrary }) => {
    const [prompt, setPrompt] = useState('');
    const [aspectRatio, setAspectRatio] = useState('1:1');
    const [generatedImage, setGeneratedImage] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const handleGenerate = async () => {
        if (!prompt) {
            setError('Please enter a prompt to generate an image.');
            return;
        }
        setIsLoading(true);
        setError('');
        setGeneratedImage(null);

        const result = await generateImage(prompt, aspectRatio as any);
        if (result) {
            setGeneratedImage(result);
            await onAddToLibrary(`AI Image: ${prompt.substring(0, 30)}...`, result, 'image/jpeg');
        } else {
            setError('Failed to generate image. The AI may be busy or the prompt could be unsafe.');
        }
        setIsLoading(false);
    };
    
    const handleDownload = () => {
        if (!generatedImage) return;
        const link = document.createElement('a');
        link.href = `data:image/jpeg;base64,${generatedImage}`;
        link.download = `${prompt.substring(0, 30).replace(/\s+/g, '_')}.jpeg`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="animate-fade-in space-y-8">
            <div>
                <h1 className="text-3xl sm:text-4xl font-bold text-white flex items-center gap-3">
                    <PhotoIcon className="w-10 h-10"/> AI Image Generator
                </h1>
                <p className="mt-2 text-lg text-slate-400">Bring your spiritual visions to life with the power of Imagen.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-slate-800/50 backdrop-blur-sm p-6 rounded-xl shadow-lg border border-slate-700 space-y-4">
                    <h2 className="text-xl font-semibold text-white">Image Prompt</h2>
                    <div>
                        <label htmlFor="prompt" className="block text-sm font-medium text-slate-300 mb-1">Describe the image you want to create</label>
                        <textarea
                            id="prompt"
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            rows={4}
                            placeholder="e.g., A serene, abstract painting of hope, with glowing light and soft colors"
                            className="w-full bg-slate-700 border border-slate-600 rounded-md p-2 text-white"
                        />
                    </div>
                    <div>
                        <label htmlFor="aspectRatio" className="block text-sm font-medium text-slate-300 mb-1">Aspect Ratio</label>
                        <select
                            id="aspectRatio"
                            value={aspectRatio}
                            onChange={(e) => setAspectRatio(e.target.value)}
                            className="w-full bg-slate-700 border border-slate-600 rounded-md p-2 text-white"
                        >
                            {aspectRatios.map(ratio => <option key={ratio} value={ratio}>{ratio}</option>)}
                        </select>
                    </div>
                    <button
                        onClick={handleGenerate}
                        disabled={isLoading || !prompt}
                        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-amber-500 text-slate-900 font-bold rounded-lg hover:bg-amber-400 disabled:bg-slate-600"
                    >
                        {isLoading ? <Spinner /> : <><SparklesIcon className="w-5 h-5" /> Generate Image</>}
                    </button>
                    {error && <p className="text-red-400 text-sm mt-1">{error}</p>}
                </div>
                
                <div className="bg-slate-800/50 backdrop-blur-sm p-6 rounded-xl shadow-lg border border-slate-700 flex flex-col items-center justify-center">
                    {isLoading ? (
                        <Spinner />
                    ) : generatedImage ? (
                        <div className="space-y-4 text-center">
                            <img src={`data:image/jpeg;base64,${generatedImage}`} alt={prompt} className="max-w-full max-h-96 rounded-lg" />
                            <button onClick={handleDownload} className="flex items-center gap-2 px-4 py-2 bg-slate-700 text-slate-300 rounded-lg mx-auto">
                                <DownloadIcon className="w-5 h-5"/> Download Image
                            </button>
                        </div>
                    ) : (
                        <div className="text-center text-slate-500">
                             <PhotoIcon className="w-16 h-16 mx-auto mb-4"/>
                            <p>Your generated image will appear here.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ImageGenerator;
