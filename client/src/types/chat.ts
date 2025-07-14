export interface User {
  id: string;
  name: string;
  avatar: string;
  status?: 'online' | 'away' | 'busy' | 'offline';
}

export interface Message {
  id: string;
  channelId: string;
  user: User;
  content: string;
  timestamp: string;
  type?: 'text' | 'file' | 'image' | 'system';
  editedAt?: string;
  threadId?: string;
}

export interface Channel {
  id: string;
  name: string;
  description?: string;
  isPrivate: boolean;
  memberCount?: number;
  workspaceId?: string;  // 추가
}

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  description?: string;
}

export interface ChatState {
  currentWorkspace: Workspace | null;  // 추가
  currentChannel: Channel | null;
  availableChannels: Channel[];        // 추가
  messages: Message[];
  users: User[];
  isLoading: boolean;
  error: string | null;
  isAuthenticated: boolean;            // 추가
}

export interface SocketMessage {
  channelId: string;
  content: string;
  user: User;
  timestamp: string;
}

// 새로운 타입들 추가
export interface SocketError {
  message: string;
}

export interface WorkspaceJoinedData {
  workspace: Workspace;
  channels: Channel[];
}

export interface ChannelJoinedData {
  channel: Channel;
}

export interface UserActivity {
  userId: string;
  channelId?: string;
  timestamp: string;
} 