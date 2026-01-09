
export enum Role {
  USER = 'user',
  CHARACTER = 'character',
  NARRATOR = 'narrator',
  SYSTEM = 'system',
}

export interface Message {
  id: string;
  role: Role;
  content: string;
  characterId?: string;
  characterName?: string;
  prompt?: string; // The user input that triggered this message
  imageUrl?: string;
  videoUrl?: string; // Can be a final URL or "generating:operation-name"
  feedback?: 'positive' | 'negative' | null; // User feedback on AI responses
}

export interface RpgResource {
  id: string;
  label: string;
  value: string;
}

export interface RpgState {
  playerName: string;
  title?: string;
  level: number;
  xp: number;
  hp: number;
  maxHp: number;
  stamina?: number;
  maxStamina?: number;
  resources: RpgResource[];
  notes: string;
  narratorUnlocked: boolean;
}

export type PresenceStatus = 'present' | 'away' | 'inactive';

// Character emotions
export type EmotionType = 
  | 'neutral' | 'happy' | 'sad' | 'angry' | 'scared' 
  | 'surprised' | 'disgusted' | 'loving' | 'anxious' 
  | 'confident' | 'confused' | 'curious' | 'playful'
  | 'embarrassed' | 'hopeful' | 'jealous' | 'guilty';

export interface CharacterEmotion {
  primary: EmotionType;
  intensity: number; // 0-100
  secondary?: EmotionType;
  reason?: string; // Why they feel this way
}

// Relationship between characters - expanded types
export type RelationshipType = 
  | 'stranger' | 'acquaintance' | 'friend' | 'close_friend' | 'best_friend'
  | 'rival' | 'enemy' | 'nemesis'
  | 'crush' | 'dating' | 'boyfriend' | 'girlfriend' | 'fiance' | 'fiancee'
  | 'husband' | 'wife' | 'spouse' | 'lover' | 'ex' | 'ex_lover'
  | 'friends_with_benefits' | 'situationship' | 'complicated'
  | 'family' | 'sibling' | 'parent' | 'child' | 'cousin' | 'in_law'
  | 'mentor' | 'student' | 'colleague' | 'boss' | 'subordinate'
  | 'admirer' | 'stalker' | 'protector' | 'servant' | 'master';

export interface Relationship {
  targetId: string; // Character ID or 'player' for the user
  targetName: string;
  type: RelationshipType;
  trust: number; // -100 to 100
  affection: number; // -100 to 100
  respect: number; // -100 to 100
  familiarity: number; // 0 to 100 (how well they know each other)
  history: string[]; // Key moments in their relationship
  lastInteraction?: number; // Timestamp
}

// Character development/growth
export interface CharacterDevelopment {
  traits: string[]; // Personality traits that have emerged
  beliefs: string[]; // Things they believe in
  fears: string[]; // Things they're afraid of
  desires: string[]; // What they want
  flaws: string[]; // Character flaws
  growthMoments: string[]; // Key moments of character growth
  arc?: string; // Current character arc summary
}

export interface Character {
  id: string;
  name: string;
  description: string;
  instructions: string;
  portraitUrl?: string;
  lore?: string;
  presence?: PresenceStatus;
  location?: string;
  // New fields
  currentEmotion?: CharacterEmotion;
  relationships?: Relationship[];
  development?: CharacterDevelopment;
  inStory?: boolean;
}

export interface UserProfile {
  name: string;
  details: string;
}

export interface Settings {
  modelName: string;
  llmProvider?: 'gemini' | 'groq' | 'lmstudio';
  autoNarration: boolean;
  enableSmarterMemory: boolean;
  userProfile?: UserProfile;
  userPortraitUrl?: string;
  enableGroupChatter?: boolean;
  characterSentenceLimit?: number;
  enableWebSearch?: boolean;
  braveApiKey?: string;
  geminiApiKey?: string;
  groqApiKey?: string;
  lmStudioBaseUrl?: string;
  localSdUrl?: string;
  imageRelayUrl?: string;
  stabilityApiKey?: string;
  tokenSaverMode?: boolean;
  imageModelName?: string;
  // RAG settings
  enableRag?: boolean;
  ragTopK?: number; // Number of chunks to retrieve (default: 8)
}

export interface WorldInfo {
  scenario: string;
  storyTracker: string;
  currentLocation?: string;
  currentTime?: string;
  locationAuto?: boolean;
  timeAuto?: boolean;
}

export type SidebarTab = 'chars' | 'world' | 'setup';

export type MessagePart = 'content' | 'prompt' | 'characterName';

// Hidden story memory that tracks the narrative
export interface StoryMemory {
  summary: string;           // Running summary of the story so far
  keyEvents: string[];       // Important plot points
  characterStates: Record<string, string>; // What each character is doing/feeling/where they are
  unresolvedThreads?: string[]; // Open questions, conflicts, unfinished business
  relationshipNotes?: Record<string, string>; // Changes in how characters feel about each other
  lastUpdatedAt: number;     // When the memory was last updated
  lastMessageIndex: number;  // Index of last message when memory was updated
}

export interface ChatSession {
  id: string;
  title: string;
  history: Message[];
  createdAt: number;
  updatedAt: number;
  rpgState?: RpgState | null;
  worldInfo?: WorldInfo;
  storyMemory?: StoryMemory; // Hidden memory that tracks the story
  // Per-session character relationships (resets when starting a new chat)
  characterRelationships?: Record<string, Relationship[]>;
  // Per-session character state (resets when starting a new chat)
  // Keeps growth/arc/emotion from bleeding across chats.
  characterState?: Record<string, { currentEmotion?: CharacterEmotion; development?: CharacterDevelopment; sessionLore?: string[] }>;
  // Character IDs included in this chat (if omitted, legacy sessions include all)
  characterIds?: string[];
}

export interface VideoGenerationOperation {
  done: boolean;
  error?: { message: string };
  response?: {
    generatedVideos: Array<{ video: { uri: string } }>;
  };
}

declare global {
  interface Window {
    aistudio?: {
      hasSelectedApiKey: () => Promise<boolean>;
      openSelectKey: () => Promise<void>;
      startVideoGeneration?: (params: { model: string; prompt: string }) => Promise<{ name: string }>;
      getVideoOperation?: (name: string) => Promise<VideoGenerationOperation>;
    };
  }
}

export {};