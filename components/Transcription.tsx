import React, { useState, useRef } from 'react';
import { transcribeAudio } from '../services/geminiService';
import { MicIcon, SparklesIcon } from './Icons';
import Spinner from './Spinner';

const Transcription: React.FC = () => {
    const [isRecording, setIsRecording] = useState(false);
    const [transcription, setTranscription] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);

    const handleStartRecording = async () => {
        setError('');
        setTranscription('');
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;
            audioChunksRef.current = [];

            mediaRecorder.ondataavailable = (event) => {
                audioChunksRef.current.push(event.data);
            };

            mediaRecorder.onstop = async () => {
                setIsLoading(true);
                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                const reader = new FileReader();
                reader.readAsDataURL(audioBlob);
                reader.onloadend = async () => {
                    const base64Audio = (reader.result as string).split(',')[1];
                    const result = await transcribeAudio(base64Audio, 'audio/webm');
                    if (result) {
                        setTranscription(result);
                    } else {
                        setError('Failed to transcribe audio. Please try again.');
                    }
                    setIsLoading(false);
                };
                stream.getTracks().forEach(track => track.stop());
            };

            mediaRecorder.start();
            setIsRecording(true);
        } catch (err) {
            console.error('Error accessing microphone:', err);
            setError('Could not access the microphone. Please grant permission and try again.');
        }
    };

    const handleStopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
        }
    };

    return (
        <div className="animate-fade-in space-y-8">
            <div>
                <h1 className="text-3xl sm:text-4xl font-bold text-white flex items-center gap-3">
                    <MicIcon className="w-10 h-10"/> AI Audio Transcription
                </h1>
                <p className="mt-2 text-lg text-slate-400">Speak your mind, and let the AI write it down for you.</p>
            </div>

            <div className="bg-slate-800/50 backdrop-blur-sm p-6 rounded-xl shadow-lg border border-slate-700 text-center">
                <button
                    onClick={isRecording ? handleStopRecording : handleStartRecording}
                    className={`relative w-24 h-24 rounded-full transition-all duration-300 flex items-center justify-center mx-auto mb-6 focus:outline-none focus:ring-4 focus:ring-amber-400/50
                        ${isRecording ? 'bg-red-500 hover:bg-red-600 animate-pulse' : 'bg-amber-500 hover:bg-amber-400'}`}
                    aria-label={isRecording ? 'Stop Recording' : 'Start Recording'}
                >
                    <MicIcon className="w-12 h-12 text-white" />
                </button>
                <h2 className="text-xl font-semibold text-white">
                    {isLoading ? 'Transcribing...' : isRecording ? 'Recording...' : 'Ready to Transcribe'}
                </h2>
                <p className="text-slate-400 mt-1">
                    {isRecording ? 'Click the button above to stop.' : 'Click the button to start recording.'}
                </p>
                {error && <p className="text-red-400 mt-4">{error}</p>}
            </div>

            {(isLoading || transcription) && (
                 <div className="bg-slate-800/50 backdrop-blur-sm p-6 rounded-xl shadow-lg border border-slate-700">
                    <h3 className="text-xl font-semibold text-amber-400 mb-4 flex items-center gap-2">
                        <SparklesIcon className="w-6 h-6"/> Transcription Result
                    </h3>
                    {isLoading ? (
                        <div className="flex justify-center items-center h-24">
                            <Spinner />
                        </div>
                    ) : (
                        <div className="bg-slate-900/50 p-4 rounded-lg">
                            <p className="text-slate-300 whitespace-pre-wrap">{transcription}</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default Transcription;
