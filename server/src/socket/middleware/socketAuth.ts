import { Socket } from 'socket.io';

// 사용자 세션 관리
export const userSessions = new Map<string, string>(); // socketId -> userId

// Socket에 userId 추가하기 위한 타입 확장
declare module 'socket.io' {
  interface Socket {
    userId?: string;
  }
}

// 인증 확인 미들웨어
export const requireAuth = (socket: Socket, next: (err?: Error) => void) => {
  const userId = userSessions.get(socket.id);
  
  if (!userId) {
    return next(new Error('Authentication required'));
  }
  
  socket.userId = userId;
  next();
};

// 인증 설정
export const setAuthentication = (socket: Socket, userId: string) => {
  userSessions.set(socket.id, userId);
  socket.userId = userId;
};

// 인증 해제
export const clearAuthentication = (socket: Socket) => {
  userSessions.delete(socket.id);
  delete socket.userId;
}; 