import React, { useState, useEffect } from 'react';
import { User, Group, ConnectionRequest, AISuggestion } from '../types';
import { SparklesIcon, UsersIcon, UserIcon, CloseIcon } from './Icons';
import Spinner from './Spinner';
import { generateGroupDescription, suggestConnections, suggestGroups } from '../services/geminiService';

type CommunityTab = 'DISCOVER' | 'CONNECTIONS' | 'GROUPS';

interface CommunityProps {
  currentUser: User;
  allUsers: User[];
  connections: User[];
  connectionRequests: ConnectionRequest[];
  groups: Group[];
  userGroups: string[];
  onRequestResponse: (requestId: string, accepted: boolean) => void;
  onJoinGroup: (groupId: string) => void;
  onCreateGroup: (name: string, description: string) => void;
}

const Community: React.FC<CommunityProps> = ({
  currentUser,
  allUsers,
  connections,
  connectionRequests,
  groups,
  userGroups,
  onRequestResponse,
  onJoinGroup,
  onCreateGroup
}) => {
  const [activeTab, setActiveTab] = useState<CommunityTab>('DISCOVER');
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
  
  const [suggestedUsers, setSuggestedUsers] = useState<AISuggestion<User>[]>([]);
  const [suggestedGroups, setSuggestedGroups] = useState<AISuggestion<Group>[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(true);

  useEffect(() => {
    const fetchSuggestions = async () => {
        setIsLoadingSuggestions(true);
        const [userSugs, groupSugs] = await Promise.all([
            suggestConnections(currentUser, allUsers.filter(u => ![currentUser.id, ...connections.map(c => c.id)].includes(u.id))),
            suggestGroups(groups, userGroups)
        ]);
        setSuggestedUsers(userSugs);
        setSuggestedGroups(groupSugs);
        setIsLoadingSuggestions(false);
    };
    fetchSuggestions();
  }, [currentUser, allUsers, connections, groups, userGroups]);

  const TabButton: React.FC<{ tab: CommunityTab, label: string, count?: number }> = ({ tab, label, count }) => (
    <button
      onClick={() => setActiveTab(tab)}
      className={`px-4 py-2 text-sm font-semibold rounded-md transition-colors ${
        activeTab === tab 
          ? 'bg-amber-400 text-slate-900' 
          : 'text-slate-300 hover:bg-slate-700'
      }`}
    >
      {label}
      {typeof count !== 'undefined' && count > 0 && (
        <span className="ml-2 bg-red-500 text-white text-xs font-bold rounded-full px-2 py-0.5">{count}</span>
      )}
    </button>
  );

  const DiscoverTab = () => (
    <div className="space-y-8">
        <div>
            <h2 className="text-2xl font-bold text-white mb-4">AI-Powered Suggestions</h2>
             {isLoadingSuggestions ? (
                <div className="flex justify-center items-center h-40"><Spinner /></div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Suggested Connections */}
                    <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700">
                        <h3 className="font-semibold text-amber-400 mb-3">Connections for You</h3>
                        <div className="space-y-3">
                            {suggestedUsers.map(sug => (
                                <div key={sug.item.id} className="bg-slate-700/50 p-3 rounded-lg">
                                    <p className="font-semibold text-white">{sug.item.name}</p>
                                    <p className="text-xs text-slate-400 italic">✨ {sug.reason}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                    {/* Suggested Groups */}
                    <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700">
                        <h3 className="font-semibold text-amber-400 mb-3">Groups to Explore</h3>
                        <div className="space-y-3">
                            {suggestedGroups.map(sug => (
                                <div key={sug.item.id} className="bg-slate-700/50 p-3 rounded-lg">
                                    <p className="font-semibold text-white">{sug.item.name}</p>
                                    <p className="text-xs text-slate-400 italic">✨ {sug.reason}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
        <div>
            <h2 className="text-2xl font-bold text-white mb-4">Discover Public Groups</h2>
            <div className="space-y-4">
            {groups.filter(g => g.isPublic && !userGroups.includes(g.id)).map(group => (
                <div key={group.id} className="bg-slate-800/50 p-4 rounded-xl border border-slate-700 flex justify-between items-center">
                    <div>
                        <h3 className="font-semibold text-white">{group.name}</h3>
                        <p className="text-sm text-slate-400">{group.description}</p>
                        <p className="text-xs text-slate-500 mt-1">{group.members.length} members</p>
                    </div>
                    <button onClick={() => onJoinGroup(group.id)} className="bg-blue-500 text-white font-semibold py-1 px-3 rounded-md hover:bg-blue-400 transition-colors">Join</button>
                </div>
            ))}
            </div>
        </div>
    </div>
  );

  const ConnectionsTab = () => (
    <div className="space-y-8">
        <div>
            <h2 className="text-2xl font-bold text-white mb-4">Connection Requests ({connectionRequests.length})</h2>
            {connectionRequests.length > 0 ? (
                <div className="space-y-3">
                    {connectionRequests.map(req => (
                        <div key={req.id} className="bg-slate-800/50 p-4 rounded-xl border border-slate-700 flex justify-between items-center">
                            <p><span className="font-semibold text-white">{req.fromUser.name}</span> wants to connect.</p>
                            <div className="flex gap-2">
                                <button onClick={() => onRequestResponse(req.id, true)} className="bg-green-500 text-white font-semibold text-sm py-1 px-3 rounded-md hover:bg-green-400">Accept</button>
                                <button onClick={() => onRequestResponse(req.id, false)} className="bg-slate-600 text-slate-200 font-semibold text-sm py-1 px-3 rounded-md hover:bg-slate-500">Decline</button>
                            </div>
                        </div>
                    ))}
                </div>
            ) : <p className="text-slate-400">No pending requests.</p>}
        </div>
         <div>
            <h2 className="text-2xl font-bold text-white mb-4">My Connections ({connections.length})</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {connections.map(conn => (
                    <div key={conn.id} className="bg-slate-800/50 p-4 rounded-xl border border-slate-700 text-center">
                        <UserIcon className="w-12 h-12 mx-auto text-slate-400 mb-2"/>
                        <p className="font-semibold text-white">{conn.name}</p>
                    </div>
                ))}
            </div>
        </div>
    </div>
  );

  const GroupsTab = () => (
     <div className="space-y-8">
        <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-white">My Groups</h2>
            <button onClick={() => setShowCreateGroupModal(true)} className="bg-amber-500 text-slate-900 font-bold py-2 px-4 rounded-md hover:bg-amber-400 transition-colors">
                Create Group
            </button>
        </div>
        <div className="space-y-4">
            {groups.filter(g => userGroups.includes(g.id)).map(group => (
                 <div key={group.id} className="bg-slate-800/50 p-4 rounded-xl border border-slate-700">
                    <h3 className="font-semibold text-white">{group.name}</h3>
                    <p className="text-sm text-slate-400">{group.description}</p>
                    <p className="text-xs text-slate-500 mt-1">{group.members.length} members</p>
                </div>
            ))}
        </div>
     </div>
  );

  const CreateGroupModal = () => {
    const [name, setName] = useState('');
    const [topic, setTopic] = useState('');
    const [description, setDescription] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);

    const handleGenerateDesc = async () => {
        if (!topic) return;
        setIsGenerating(true);
        const desc = await generateGroupDescription(topic);
        setDescription(desc);
        setIsGenerating(false);
    };

    const handleCreate = () => {
        if (name && description) {
            onCreateGroup(name, description);
            setShowCreateGroupModal(false);
        }
    };
      
    if (!showCreateGroupModal) return null;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-slate-800 border border-slate-700 rounded-xl shadow-lg w-full max-w-lg p-6 space-y-4 animate-fade-in-short relative">
                <button onClick={() => setShowCreateGroupModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-white"><CloseIcon className="w-6 h-6"/></button>
                <h2 className="text-xl font-bold text-white">Create a New Group</h2>
                
                <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Group Name</label>
                    <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="e.g., Daily Stoics" className="w-full bg-slate-700 border border-slate-600 rounded-md p-2 text-white" />
                </div>
                
                <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Central Topic (for AI)</label>
                    <div className="flex gap-2">
                        <input type="text" value={topic} onChange={e => setTopic(e.target.value)} placeholder="e.g., Stoic philosophy" className="w-full bg-slate-700 border border-slate-600 rounded-md p-2 text-white" />
                        <button onClick={handleGenerateDesc} disabled={isGenerating || !topic} className="flex items-center gap-2 px-3 bg-purple-500 text-white font-semibold rounded-md hover:bg-purple-400 disabled:bg-slate-600">
                            {isGenerating ? <Spinner/> : <SparklesIcon className="w-5 h-5"/>}
                        </button>
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Group Description</label>
                    <textarea value={description} onChange={e => setDescription(e.target.value)} rows={4} className="w-full bg-slate-700 border border-slate-600 rounded-md p-2 text-white" />
                </div>

                <button onClick={handleCreate} disabled={!name || !description} className="w-full bg-amber-500 text-slate-900 font-bold py-2 rounded-md hover:bg-amber-400 disabled:bg-slate-600">Create Group</button>
            </div>
        </div>
    );
  };

  return (
    <div className="animate-fade-in space-y-8">
      <CreateGroupModal />
      <div>
        <h1 className="text-3xl sm:text-4xl font-bold text-white flex items-center gap-3">
            <UsersIcon className="w-10 h-10"/> Community Hub
        </h1>
        <p className="mt-2 text-lg text-slate-400">Connect, share, and grow with others on the same path.</p>
      </div>

      <div className="bg-slate-800/50 backdrop-blur-sm p-2 rounded-xl shadow-lg border border-slate-700 inline-flex gap-2">
        <TabButton tab="DISCOVER" label="Discover"/>
        <TabButton tab="CONNECTIONS" label="Connections" count={connectionRequests.length}/>
        <TabButton tab="GROUPS" label="Groups"/>
      </div>
      
      <div className="mt-6">
        {activeTab === 'DISCOVER' && <DiscoverTab />}
        {activeTab === 'CONNECTIONS' && <ConnectionsTab />}
        {activeTab === 'GROUPS' && <GroupsTab />}
      </div>
    </div>
  );
};

export default Community;