import React, { useState, useMemo, useEffect } from 'react';
import { User, LibraryItem, LibraryItemType } from '../types';
import { SparklesIcon, CloseIcon, ShareIcon, EditIcon, DownloadIcon, AudioIcon, VideoIcon, PhotoIcon } from './Icons';
import { generateShareableSummary, editImageWithAI } from '../services/geminiService';
import Spinner from './Spinner';

interface LibraryProps {
  user: User;
  items: LibraryItem[];
  onDelete: (id: string) => void;
}

const getFileIcon = (type: LibraryItemType) => {
    switch (type) {
        case 'image': return <PhotoIcon className="w-8 h-8 text-blue-400" />;
        case 'video': return <VideoIcon className="w-8 h-8 text-purple-400" />;
        case 'audio': return <AudioIcon className="w-8 h-8 text-green-400" />;
        default: return <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>;
    }
}

const Library: React.FC<LibraryProps> = ({ user, items, onDelete }) => {
  const [showUploadModal, setShowUploadModal] = useState(false); // Kept for future use, though upload logic moved
  const [filter, setFilter] = useState<LibraryItemType | 'all'>('all');
  
  const [selectedItem, setSelectedItem] = useState<LibraryItem | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  const handleDelete = (id: string) => {
    if(window.confirm('Are you sure you want to delete this item? This action cannot be undone.')) {
        onDelete(id);
    }
  };

  const filteredItems = useMemo(() => {
    const sortedItems = [...items].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    if (filter === 'all') return sortedItems;
    return sortedItems.filter(item => item.type === filter);
  }, [items, filter]);
  
  const ShareModal: React.FC = () => {
    const [summary, setSummary] = useState('');
    const [isGenerating, setIsGenerating] = useState(true);

    useEffect(() => {
        if(selectedItem) {
            setIsGenerating(true);
            generateShareableSummary(selectedItem.name, selectedItem.type).then(res => {
                setSummary(res);
                setIsGenerating(false);
            });
        }
    }, [selectedItem]);

    const handleShare = () => {
        if(navigator.share) {
            navigator.share({
                title: `Sharing: ${selectedItem?.name}`,
                text: summary,
            }).catch(console.error);
        } else {
            navigator.clipboard.writeText(summary).then(() => alert('Share message copied to clipboard!'));
        }
    }

    if(!showShareModal || !selectedItem) return null;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-slate-800 border border-slate-700 rounded-xl shadow-lg w-full max-w-lg p-6 space-y-4 animate-fade-in-short relative">
          <button onClick={() => setShowShareModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-white"><CloseIcon className="w-6 h-6" /></button>
          <h2 className="text-xl font-bold text-white">Share "{selectedItem.name}"</h2>
          
          <div className="bg-slate-700/50 p-4 rounded-lg min-h-[10rem]">
            {isGenerating ? <Spinner/> : <textarea readOnly value={summary} className="w-full h-32 bg-transparent text-slate-300 border-0 resize-none focus:ring-0"/>}
          </div>

          <button onClick={handleShare} className="w-full bg-amber-500 text-slate-900 font-bold py-2 rounded-md hover:bg-amber-400 flex justify-center items-center gap-2">
            <ShareIcon className="w-5 h-5"/> Share Now
          </button>
        </div>
      </div>
    )
  }
  
  const EditModal: React.FC = () => {
    const [prompt, setPrompt] = useState('');
    const [isEditing, setIsEditing] = useState(false);
    const [editedImage, setEditedImage] = useState<string | null>(null);
    const [editError, setEditError] = useState('');

    const handleEdit = async () => {
        if(!selectedItem || selectedItem.type !== 'image' || !prompt) return;
        setIsEditing(true);
        setEditError('');
        const result = await editImageWithAI(selectedItem.content, selectedItem.mimeType, prompt);
        if(result) {
            setEditedImage(result);
        } else {
            setEditError('Could not edit the image. The AI may be busy.');
        }
        setIsEditing(false);
    };

    const handleSave = () => {
        if(!editedImage || !selectedItem) return;
        // This is tricky without a direct way to edit. The user would have to re-save.
        // For this implementation, we'll just close the modal. A more robust solution
        // would involve an onEdit prop.
        alert("To save the edited image, please download it and re-upload to your library.");
        setShowEditModal(false);
    }
    
    if(!showEditModal || !selectedItem) return null;

    return (
         <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-slate-800 border border-slate-700 rounded-xl shadow-lg w-full max-w-2xl p-6 space-y-4 animate-fade-in-short relative max-h-[90vh] flex flex-col">
                <button onClick={() => setShowEditModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-white z-10"><CloseIcon className="w-6 h-6" /></button>
                <h2 className="text-xl font-bold text-white">Edit Image with AI</h2>

                <div className="flex-1 overflow-y-auto space-y-4">
                    <div className="relative w-full aspect-square bg-slate-900 rounded-lg flex items-center justify-center">
                        {isEditing && <div className="absolute inset-0 bg-black/50 flex items-center justify-center"><Spinner /></div>}
                        <img src={`data:${selectedItem.mimeType};base64,${editedImage || selectedItem.content}`} alt={selectedItem.name} className="max-w-full max-h-full object-contain rounded-lg" />
                    </div>
                    
                    <div className="flex items-center gap-2">
                        <input type="text" value={prompt} onChange={e => setPrompt(e.target.value)} placeholder="e.g., add a glowing sunbeam from the top left" className="w-full bg-slate-700 border border-slate-600 rounded-md p-2 text-white" />
                        <button onClick={handleEdit} disabled={isEditing || !prompt} className="flex-shrink-0 bg-purple-500 text-white font-bold py-2 px-4 rounded-md hover:bg-purple-400 disabled:bg-slate-600 flex items-center gap-2">
                            <SparklesIcon className="w-5 h-5"/> Apply
                        </button>
                    </div>
                    {editError && <p className="text-red-400 text-sm">{editError}</p>}
                </div>
                
                {editedImage && <a href={`data:${selectedItem.mimeType};base64,${editedImage}`} download={`edited_${selectedItem.name}`} className="mt-4 w-full block text-center bg-amber-500 text-slate-900 font-bold py-2 rounded-md hover:bg-amber-400">Download Edited Image</a>}
            </div>
        </div>
    )
  }

  return (
    <div className="animate-fade-in space-y-8">
      {showShareModal && <ShareModal />}
      {showEditModal && <EditModal />}
      <div>
        <h1 className="text-3xl sm:text-4xl font-bold text-white">Spiritual Content Library</h1>
        <p className="mt-2 text-lg text-slate-400">Your personal collection of uploaded and generated content, organized by AI. 📚</p>
      </div>

      <div className="bg-slate-800/50 backdrop-blur-sm p-6 rounded-xl shadow-lg border border-slate-700">
        <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
            <div className="bg-slate-800 p-1 rounded-lg inline-flex gap-1">
                {(['all', 'image', 'video', 'audio', 'document'] as const).map(type => (
                    <button key={type} onClick={() => setFilter(type)} className={`px-3 py-1 text-sm font-semibold rounded-md capitalize ${filter === type ? 'bg-amber-400 text-slate-900' : 'text-slate-300 hover:bg-slate-700'}`}>{type}</button>
                ))}
            </div>
            {/* Upload functionality can be re-enabled here if needed */}
        </div>

        {items.length === 0 ? (
          <div className="text-center py-16 text-slate-500">
            <p className="text-lg">Your library is empty.</p>
            <p>Content you generate across the app will be automatically saved here.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredItems.length > 0 ? filteredItems.map(item => (
                <div key={item.id} className="bg-slate-700/50 rounded-lg shadow-lg flex flex-col overflow-hidden border border-slate-700">
                    <div className="h-40 flex items-center justify-center bg-slate-800 overflow-hidden">
                        {item.type === 'image' ? <img src={`data:${item.mimeType};base64,${item.content}`} alt={item.name} className="w-full h-full object-cover"/> : getFileIcon(item.type)}
                    </div>
                    <div className="p-4 flex-grow flex flex-col">
                        <h3 className="font-semibold text-white truncate flex-grow" title={item.name}>{item.name}</h3>
                        <p className="text-xs text-slate-400 mb-2">{new Date(item.createdAt).toLocaleDateString()}</p>
                        <div className="flex flex-wrap gap-1 mb-3">
                            {item.tags.slice(0, 3).map(tag => <span key={tag} className="text-xs bg-slate-600 text-slate-300 px-2 py-0.5 rounded-full">{tag}</span>)}
                        </div>
                        <div className="mt-auto pt-3 border-t border-slate-600/50 flex justify-end items-center gap-2">
                            {item.type === 'image' && <button onClick={() => { setSelectedItem(item); setShowEditModal(true);}} className="p-2 text-slate-400 hover:text-white" title="Edit with AI"><EditIcon className="w-5 h-5"/></button>}
                            <button onClick={() => { setSelectedItem(item); setShowShareModal(true);}} className="p-2 text-slate-400 hover:text-white" title="Share"><ShareIcon className="w-5 h-5"/></button>
                            <a href={`data:${item.mimeType};base64,${item.content}`} download={item.name} className="p-2 text-slate-400 hover:text-white" title="Download"><DownloadIcon className="w-5 h-5"/></a>
                            <button onClick={() => handleDelete(item.id)} className="p-2 text-red-500 hover:text-red-400" title="Delete"><CloseIcon className="w-5 h-5"/></button>
                        </div>
                    </div>
                </div>
            )) : (
              <div className="md:col-span-2 lg:col-span-3 xl:col-span-4 text-center py-16 text-slate-500">
                <p>No items match your filter.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Library;