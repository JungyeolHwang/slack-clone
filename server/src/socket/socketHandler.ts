import { Server, Socket } from 'socket.io';
import { handleAuthentication } from './handlers/authHandler';
import { handleWorkspace } from './handlers/workspaceHandler';
import { handleChannel } from './handlers/channelHandler';
import { handleMessage } from './handlers/messageHandler';
import { clearAuthentication } from './middleware/socketAuth';

export const setupSocketHandlers = (io: Server) => {
  io.on('connection', (socket: Socket) => {
    console.log(`🔗 User connected: ${socket.id}`);
    
    // 각 핸들러 등록
    handleAuthentication(socket);
    handleWorkspace(socket);
    handleChannel(socket);
    handleMessage(socket, io);
    
    // 연결 해제 처리
    socket.on('disconnect', async (reason) => {
      try {
        const userId = socket.userId;
        
        console.log(`❌ User disconnected: ${userId || socket.id}, reason: ${reason}`);
        
        // 세션 정리
        clearAuthentication(socket);
        
        // 모든 채널에 사용자 오프라인 알림
        if (userId) {
          socket.broadcast.emit('user-offline', {
            userId,
            timestamp: new Date().toISOString(),
          });
        }
        
      } catch (error) {
        console.error('연결 해제 처리 오류:', error);
      }
    });
    
    // 에러 처리
    socket.on('error', (error) => {
      console.error(`🚨 Socket error from ${socket.id}:`, error);
      socket.emit('error', { message: '서버 오류가 발생했습니다.' });
    });
  });
}; 