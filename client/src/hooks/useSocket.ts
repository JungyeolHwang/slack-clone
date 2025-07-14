import { useEffect, useState, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { WorkspaceJoinedData, ChannelJoinedData, SocketError, UserActivity } from '../types/chat';

// 전역 상태 관리
let globalSocket: Socket | null = null;
let tabCount = 0;
let isConnecting = false;

// 탭 ID 생성 (React 개발 모드에서 중복 실행 방지)
const generateTabId = () => Math.random().toString(36).substring(2, 15);

// 개발 모드에서 중복 실행 방지를 위한 전역 플래그
let isInitializing = false;

export const useSocket = (user: { userId: string; username: string } | null) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const tabIdRef = useRef<string | null>(null);
  const isInitializedRef = useRef(false);

  // 탭 연결 관리
  useEffect(() => {
    // 이미 초기화된 경우 중복 실행 방지
    if (isInitializedRef.current) {
      return;
    }
    
    // 전역 초기화 중이면 대기
    if (isInitializing) {
      const waitForInitialization = () => {
        if (!isInitializing && globalSocket) {
          setSocket(globalSocket);
          setIsConnected(globalSocket.connected);
        } else {
          setTimeout(waitForInitialization, 50);
        }
      };
      waitForInitialization();
      return;
    }
    
    // 탭 ID 생성
    if (!tabIdRef.current) {
      tabIdRef.current = generateTabId();
    }
    
    // 탭 카운트 증가
    tabCount++;
    console.log('🔗 Tab connected. Total tabs:', tabCount);
    
    // 첫 번째 탭이거나 기존 소켓이 없으면 새로 생성
    if (tabCount === 1 || !globalSocket || !globalSocket.connected) {
      if (isConnecting) {
        // 이미 연결 중이면 대기
        const checkConnection = () => {
          if (globalSocket && globalSocket.connected) {
            setSocket(globalSocket);
            setIsConnected(true);
          } else {
            setTimeout(checkConnection, 100);
          }
        };
        checkConnection();
      } else {
        createSocket();
      }
    } else {
      // 기존 소켓 재사용
      console.log('🔗 Reusing existing socket connection');
      setSocket(globalSocket);
      setIsConnected(globalSocket.connected);
    }
    
    isInitializedRef.current = true;
    
    // 정리 함수
    return () => {
      if (tabIdRef.current) {
        tabCount--;
        console.log('🔌 Tab disconnected. Remaining tabs:', tabCount);
        
        // 마지막 탭이면 소켓 해제
        if (tabCount === 0 && globalSocket) {
          console.log('🔌 Closing socket connection (last tab)');
          globalSocket.disconnect();
          globalSocket = null;
          setSocket(null);
          setIsConnected(false);
        }
        
        // 탭 ID 제거
        tabIdRef.current = null;
      }
    };
  }, []);

  // 소켓 생성 함수
  const createSocket = () => {
    if (isConnecting) return;
    
    isConnecting = true;
    isInitializing = true;
    console.log('🔗 Creating new socket connection...');
    
    const newSocket = io('ws://localhost:5000', {
      transports: ['websocket'],
      upgrade: false,
      rememberUpgrade: false,
    });

    newSocket.on('connect', () => {
      console.log('🔗 Socket connected:', newSocket.id);
      globalSocket = newSocket;
      setSocket(newSocket);
      setIsConnected(true);
      isConnecting = false;
      isInitializing = false;
    });

    newSocket.on('disconnect', () => {
      console.log('🔌 Socket disconnected');
      setIsConnected(false);
    });

    newSocket.on('connect_error', (error) => {
      console.error('🔥 Socket connection error:', error);
      isConnecting = false;
      isInitializing = false;
    });
  };

  // 크로스 탭 동기화
  useEffect(() => {
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === 'user' && event.newValue === null) {
        // 다른 탭에서 로그아웃하면 현재 탭도 로그아웃
        console.log('🔌 Logging out - cleaning up socket');
        
        // 소켓 완전 정리
        cleanupSocket();
        
        setSocket(null);
        setIsConnected(false);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // 유저 인증 함수 개선
  const authenticateUser = (username: string) => {
    console.log('🔐 Authenticating user:', username);
    
    if (!socket || !isConnected) {
      console.log('⚠️ Socket not connected, creating new connection...');
      
      // 소켓이 연결되지 않은 경우 새로 생성
      if (!globalSocket || !globalSocket.connected) {
        createSocket();
      }
      
      // 연결 대기 후 인증
      const waitForConnection = () => {
        if (globalSocket && globalSocket.connected) {
          console.log('🔐 Authenticating user after connection:', username);
          globalSocket.emit('authenticate', { username });
        } else {
          setTimeout(waitForConnection, 100);
        }
      };
      
      setTimeout(waitForConnection, 500); // 약간의 지연 추가
      return;
    }

    socket.emit('authenticate', { username });
  };

  // 워크스페이스 참여
  const joinWorkspace = (workspaceId: string) => {
    if (!socket || !isConnected) {
      console.log('⚠️ Socket not connected, cannot join workspace');
      return;
    }

    console.log('🏢 Joining workspace:', workspaceId);
    socket.emit('join-workspace', { workspaceId });
  };

  // 채널 참여
  const joinChannel = (channelId: string) => {
    if (!socket || !isConnected) {
      console.log('⚠️ Socket not connected, cannot join channel');
      return;
    }

    console.log('📺 Joining channel:', channelId);
    socket.emit('join-channel', { channelId });
  };

  // 메시지 전송
  const sendMessage = (channelId: string, content: string) => {
    if (!socket || !isConnected) {
      console.log('⚠️ Socket not connected, cannot send message');
      return;
    }

    console.log('💬 Sending message to channel:', channelId);
    socket.emit('send-message', { channelId, content });
  };

  return {
    socket,
    isConnected,
    authenticateUser,
    joinWorkspace,
    joinChannel,
    sendMessage,
  };
};

// 강제 소켓 정리 함수 개선
export const cleanupSocket = () => {
  if (globalSocket) {
    console.log('🧹 Force cleaning up socket connection');
    globalSocket.disconnect();
    globalSocket = null;
    tabCount = 0;
    isConnecting = false;
    isInitializing = false;
  }
}; 