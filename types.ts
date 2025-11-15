export enum View {
  Dashboard = 'DASHBOARD',
  Sermons = 'SERMONS',
  Prayers = 'PRAYERS',
  Meditations = 'MEDITATIONS',
  Challenges = 'CHALLENGES',
  Streaming = 'STREAMING',
  Profile = 'PROFILE',
  Events = 'EVENTS',
  StudyAssistant = 'STUDY_ASSISTANT',
  WisdomLibrary = 'WISDOM_LIBRARY',
  Community = 'COMMUNITY',
  Bible = 'BIBLE',
  Library = 'LIBRARY',
  ResourceCentre = 'RESOURCE_CENTRE',
  MusicHub = 'MUSIC_HUB',
  ImageGeneration = 'IMAGE_GENERATION',
  ImageAnalysis = 'IMAGE_ANALYSIS',
  VideoAnalysis = 'VIDEO_ANALYSIS',
  Transcription = 'TRANSCRIPTION',
}

export interface User {
  id: string; // email is used as id
  name: string;
  email: string;
  avatar?: string;
}

export interface Challenge {
  id: number;
  title: string;
  description: string;
  reward: string;
  emoji: string;
}

export interface SermonContent {
    topic: string;
    speaker?: string;
    date: string;
    sermonText: string;
    videoPrompt: string;
    audioPrompt: string;
}

export interface PrayerContent {
    prayerText: string;
    videoPrompt: string;
    audioPrompt: string;
}

export interface MeditationContent {
    meditationScript: string;
    videoPrompt: string;
    audioPrompt: string;
}

export interface TimedMeditationSegment {
  startTime: number; // in seconds
  instruction: string;
  duration: number; // in seconds
}

export interface DailyInspiration {
  text: string;
  posterImage: string; // base64 encoded image string
}

export interface Event {
  id: number;
  title: string;
  description: string;
  startTime: Date;
  durationMinutes: number;
}

export interface ScheduledMeditation {
  id: string; // Unique ID, maybe a timestamp
  theme: string;
  script: string;
  scheduledTime: string; // ISO string for the date and time
  duration: string; // e.g., "5-minute"
}

export interface BibleVerse {
  reference: string;
  verse: string;
  verseNumber?: number;
}

export interface BibleStudyResponse {
  directAnswer: string;
  relevantVerses: BibleVerse[];
  agentInsights: string;
  sources?: { uri: string; title: string }[];
}

export interface WisdomContent {
  source: string;
  excerpt: string;
  historicalContext: string;
  relatedQuote: string;
  modernApplication: string;
  imageUrl: string; // base64
  audioPrompt: string;
  relevanceReason?: string;
}

export interface BiblicalParable {
  title: string;
  scriptureReference: string;
  summary: string;
  coreTeaching: string;
  modernRelevance: string;
  imageUrl: string; // base64
  audioPrompt: string;
}

export interface FurtherReading {
  title: string;
  author: string;
  summary: string; // AI generated
  type: 'Book' | 'Article';
}

export interface ProfileAnalysis {
  journeySummary: string;
  encouragingObservation: string;
  nextStepSuggestion: string;
  suggestedTitle: string;
}

export interface BibleChapter {
    book: string;
    chapter: number;
    verses: {
        verse: number;
        text: string;
    }[];
}

export interface BibleSearchResult {
    summary: string;
    results: BibleVerse[];
}

export interface RewardPoster {
  text: string;
  image: string; // base64
}

// Community Types
export enum ConnectionStatus { PENDING = 'PENDING', ACCEPTED = 'ACCEPTED', REJECTED = 'REJECTED' }
export interface ConnectionRequest { id: string; fromUser: User; toUser: User; }
export interface Group {
  id: string;
  name: string;
  description: string;
  members: User[];
  admins: User[];
  isPublic: boolean;
  banner?: string;
}
export interface AISuggestion<T> {
    item: T;
    reason: string;
}

// Chatbot types
export interface ChatMessage {
  sender: 'user' | 'ai' | 'system';
  text?: string;
  imageUrl?: string;
  imageName?: string;
}

export interface TrendingTopic {
  topic: string;
  reason: string;
}

export interface StreamContent {
  theme: string;
  videoPrompt: string;
  audioPrompt: string;
  overlayQuote: string;
  trendingTopics: TrendingTopic[];
  affirmations: string[];
}

// Bible Insights Types
export interface BibleVerseWithReflection extends BibleVerse {
  reflection: string;
}

export interface PersonalizedSuggestion {
  suggestion: string;
  reason: string;
}

export interface BibleInsight {
  verseOfTheDay: BibleVerseWithReflection;
  trendingTopics: string[];
  personalizedSuggestion: PersonalizedSuggestion;
}

export interface DailyReading {
    day: number;
    reading: string;
    focusPoint: string;
}

export interface BibleStudyPlan {
    title: string;
    duration: string;
    dailyReadings: DailyReading[];
}

// Library Types
export type LibraryItemType = 'image' | 'video' | 'audio' | 'document' | 'other';
export interface LibraryItem {
  id: string;
  name: string;
  type: LibraryItemType;
  mimeType: string;
  content: string; // base64 encoded content
  tags: string[];
  createdAt: string; // ISO string
}

// Resource Centre Types
export interface SermonOutline {
  title: string;
  keyVerse: string;
  introduction: string;
  points: { title: string; scripture: string; details: string; }[];
  conclusion: string;
}

export interface LeadershipArticle {
  title: string;
  summary: string;
  sections: { heading: string; content: string; }[];
}

export interface SpiritualCommunity {
  id: string;
  name:string;
  address: string;
  denomination: string;
  summary: string; // AI-generated
}

export interface RecommendedReading {
  title: string;
  author: string;
  summary: string;
}

export interface StudyCurriculum {
    title: string;
    topic: string;
    duration: string;
    weeklyBreakdown: {
        week: number;
        theme: string;
        reading: string;
        discussionQuestions: string[];
        activity: string;
    }[];
}

export interface CounselingPrompt {
    category: string;
    prompts: {
        prompt: string;
        purpose: string;
    }[];
}

export interface InterfaithDialogue {
    topic: string;
    faiths: string[];
    introduction: string;
    starters: {
        question: string;
        context: string;
    }[];
}

export interface MeditationTheme {
  title: string;
  quote: string;
  image: string; // base64
}

// Music Hub Types
export interface Comment {
  id: string;
  userName: string; // Simplified for mock
  text: string;
  createdAt: string; // ISO String
}

export interface AIMusicTrack {
  id: string;
  title: string;
  artist: string;
  audioUrl: string;
  imageUrl: string; // base64
  visualizerVideoUrl?: string; // local object URL
  
  // New properties for social features and context
  prompt: string;
  genre: string;
  mood: string;
  instrumentation: string;
  tempo: string;
  vocals: string;
  likes: number;
  shares: number;
  comments: Comment[];
  createdBy: string; // User name
  createdAt: string; // ISO String
  lyrics?: string;
}

export interface LibraryMusicTrack {
  title: string;
  artist: string;
  source: string;
  audioUrl: string;
}

export interface Playlist {
  title: string;
  description: string;
  imageUrl: string; // base64
  searchTerms: string;
}

export interface Soundscape {
  title: string;
  videoUrl: string; // local object URL
  audioUrl: string;
  category: string;
}