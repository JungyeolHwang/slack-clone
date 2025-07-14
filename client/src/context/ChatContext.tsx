import React, { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { useSocket, cleanupSocket } from '../hooks/useSocket';
import { 
  User, 
  Channel, 
  Message, 
  Workspace, 
  WorkspaceJoinedData, 
  ChannelJoinedData 
} from '../types/chat';

interface ChatContextValue {
  // 인증
  user: User | null;
  isAuthenticated: boolean;
  login: (username: string) => Promise<void>;
  logout: () => void;
  
  // 소켓 연결
  isConnected: boolean;
  
  // 워크스페이스 및 채널
  workspace: Workspace | null;
  channels: Channel[];
  currentChannel: Channel | null;
  
  // 메시지
  messages: Message[];
  
  // 상태
  loading: boolean;
  error: string | null;
  
  // 액션
  selectChannel: (channelId: string) => void;
  sendMessage: (content: string) => void;
}

const ChatContext = createContext<ChatContextValue | undefined>(undefined);

export const useChatContext = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChatContext must be used within a ChatProvider');
  }
  return context;
};

interface ChatProviderProps {
  children: ReactNode;
}

export const ChatProvider: React.FC<ChatProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [currentChannel, setCurrentChannel] = useState<Channel | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);

  // 초기 로딩 상태 관리를 위한 상태 추가
  const [hasCheckedSavedUser, setHasCheckedSavedUser] = useState(false);
  const [hasSavedUser, setHasSavedUser] = useState(false);

  // 소켓 훅 사용 - userId와 username을 포함한 객체 전달
  const socketUser = user ? { userId: user.id, username: user.name } : null;
  const { socket, isConnected, authenticateUser } = useSocket(socketUser);

  // authenticateUser를 useCallback으로 감싸서 메모이제이션
  const stableAuthenticateUser = useCallback(authenticateUser, [authenticateUser]);

  // 초기 저장된 사용자 정보 확인
  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      try {
        JSON.parse(savedUser); // 파싱이 가능한지 확인
        setHasSavedUser(true);
        console.log('🔍 Found saved user, waiting for socket connection...');
      } catch (error) {
        console.error('Failed to parse saved user:', error);
        localStorage.removeItem('user');
        setHasSavedUser(false);
      }
    } else {
      setHasSavedUser(false);
    }
    setHasCheckedSavedUser(true);
  }, []);

  // 로그인 함수
  const login = async (username: string) => {
    try {
      setLoading(true);
      setError(null);
      
      // 소켓 연결 및 인증
      stableAuthenticateUser(username);
      
      // 사용자 정보 localStorage에 저장
      const userInfo = { username };
      localStorage.setItem('user', JSON.stringify(userInfo));
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  // 로그아웃 함수
  const logout = useCallback(() => {
    console.log('🔓 Logging out user');
    
    // 소켓 정리
    if (socket) {
      socket.disconnect();
    }
    
    // 상태 초기화
    localStorage.removeItem('user');
    setUser(null);
    setIsAuthenticated(false);
    setWorkspace(null);
    setChannels([]);
    setCurrentChannel(null);
    setMessages([]);
    setLoading(false);
    setError(null);
    setHasSavedUser(false);
    setHasCheckedSavedUser(true);
    
    // 다른 탭에게 로그아웃 상태 알림
    window.dispatchEvent(new StorageEvent('storage', {
      key: 'user',
      newValue: null,
      oldValue: localStorage.getItem('user')
    }));
    
    // 소켓 강제 정리
    cleanupSocket();
  }, [socket]);

  // 채널 선택
  const selectChannel = (channelId: string) => {
    const channel = channels.find(c => c.id === channelId);
    if (channel && socket && isConnected) {
      setCurrentChannel(channel);
      console.log('📺 Selecting channel:', channelId);
      socket.emit('join-channel', { channelId });
    }
  };

  // 메시지 전송
  const sendMessage = (content: string) => {
    if (currentChannel && content.trim() && socket && isConnected) {
      console.log('💬 Sending message to channel:', currentChannel.id);
      socket.emit('send-message', { channelId: currentChannel.id, content });
    }
  };

  // 자동 인증 처리 개선
  useEffect(() => {
    // 초기 체크가 완료되지 않았거나 이미 인증된 경우 리턴
    if (!hasCheckedSavedUser || isAuthenticated) return;
    
    // 저장된 사용자가 없으면 로딩 해제
    if (!hasSavedUser) {
      setLoading(false);
      return;
    }
    
    // 저장된 사용자가 있지만 소켓이 연결되지 않은 경우 대기
    if (!isConnected) {
      console.log('🔍 Saved user found, waiting for socket connection...');
      return;
    }
    
    // 소켓 연결이 완료되면 자동 인증 시도
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      try {
        const userInfo = JSON.parse(savedUser);
        console.log('🔄 Auto-authenticating saved user:', userInfo.username);
        stableAuthenticateUser(userInfo.username);
      } catch (error) {
        console.error('Failed to parse saved user:', error);
        localStorage.removeItem('user');
        setHasSavedUser(false);
        setLoading(false);
      }
    } else {
      setHasSavedUser(false);
      setLoading(false);
    }
  }, [hasCheckedSavedUser, hasSavedUser, isConnected, isAuthenticated, stableAuthenticateUser]);

  // 워크스페이스 참여 결과 처리에서 중복 실행 방지
  const handleWorkspaceJoined = useCallback((data: WorkspaceJoinedData) => {
    console.log('🏢 Workspace joined:', data);
    setWorkspace(data.workspace);
    setChannels(data.channels);
    
    // 기본 채널 선택 (general) - 이미 선택된 채널이 아닌 경우만
    const generalChannel = data.channels.find(c => c.name === 'general');
    if (generalChannel && socket && isConnected && (!currentChannel || currentChannel.id !== generalChannel.id)) {
      setCurrentChannel(generalChannel);
      console.log('📺 Joining channel:', generalChannel.id);
      socket.emit('join-channel', { channelId: generalChannel.id });
    }
  }, [socket, isConnected, currentChannel]);

  // 소켓 이벤트 리스너 등록
  useEffect(() => {
    if (!socket || !isConnected) {
      console.log('🔄 Waiting for socket connection before registering listeners...');
      return;
    }

    console.log('🎧 Registering socket event listeners');

    // 인증 결과 처리
    const handleAuthResult = (result: { success: boolean; userId: string; username: string } | { success: false; error: string }) => {
      console.log('🔐 Authentication result:', result);
      
      if (result.success && 'userId' in result) {
        const newUser: User = {
          id: result.userId,
          name: result.username,
          avatar: result.username.charAt(0).toUpperCase(),
          status: 'online'
        };
        setUser(newUser);
        setIsAuthenticated(true);
        setError(null); // 에러 상태 초기화
        
        // 워크스페이스 참여
        if (socket && isConnected && !workspace) {
          console.log('🏢 Joining workspace: default-workspace');
          socket.emit('join-workspace', { workspaceId: 'default-workspace' });
        }
      } else {
        console.error('🔥 Authentication failed:', result);
        setError(!result.success && 'error' in result ? result.error : 'Authentication failed');
        setIsAuthenticated(false);
        setUser(null);
      }
      
      setLoading(false);
    };

    // 채널 참여 결과 처리
    const handleChannelJoined = (data: ChannelJoinedData & { messages?: Message[] }) => {
      console.log('📺 Channel joined:', data);
      
      // 메시지 히스토리가 있으면 설정
      if (data.messages) {
        setMessages(data.messages);
      } else {
        setMessages([]);
      }
    };

    // 새 메시지 수신
    const handleNewMessage = (message: Message) => {
      console.log('📩 New message received:', message);
      setMessages(prev => [...prev, message]);
    };

    // 이벤트 리스너 등록
    socket.on('authenticate-result', handleAuthResult);
    socket.on('workspace-joined', handleWorkspaceJoined);
    socket.on('channel-joined', handleChannelJoined);
    socket.on('new-message', handleNewMessage);

    // 정리 함수
    return () => {
      socket.off('authenticate-result', handleAuthResult);
      socket.off('workspace-joined', handleWorkspaceJoined);
      socket.off('channel-joined', handleChannelJoined);
      socket.off('new-message', handleNewMessage);
    };
  }, [socket, isConnected, handleWorkspaceJoined, workspace]);

  // 크로스 탭 동기화 수정
  useEffect(() => {
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === 'user') {
        if (event.newValue && !isAuthenticated) {
          // 다른 탭에서 로그인하면 현재 탭도 로그인 (이미 인증된 경우 제외)
          const userInfo = JSON.parse(event.newValue);
          setHasSavedUser(true);
          if (isConnected) {
            stableAuthenticateUser(userInfo.username);
          }
        } else if (event.newValue === null) {
          // 다른 탭에서 로그아웃하면 현재 탭도 로그아웃
          logout();
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [stableAuthenticateUser, isAuthenticated, isConnected, logout]);

  const value: ChatContextValue = {
    user,
    isAuthenticated,
    login,
    logout,
    isConnected,
    workspace,
    channels,
    currentChannel,
    messages,
    loading,
    error,
    selectChannel,
    sendMessage,
  };

  return (
    <ChatContext.Provider value={value}>
      {children}
    </ChatContext.Provider>
  );
}; 