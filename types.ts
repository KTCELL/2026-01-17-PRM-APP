export interface Contact {
  id: string;
  firstName: string;
  lastName: string;
  role?: string;
  company?: string;
  email?: string;
  phone?: string;
  interests: string[];
  lastInteraction?: string;
  notes: string;
  avatarUrl?: string;
  createdAt: string;
}

export interface ProcessingStatus {
  isProcessing: boolean;
  message?: string;
  type: 'success' | 'error' | 'info' | null;
}

export type ViewMode = 'list' | 'chat';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}
