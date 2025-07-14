import { Socket } from 'socket.io';
import { setAuthentication } from '../middleware/socketAuth';
import prisma from '../../config/database';

export const handleAuthentication = (socket: Socket) => {
  // 사용자 인증
  socket.on('authenticate', async (data: { username: string }) => {
    try {
      const { username } = data;
      console.log(`🔍 Authenticating user: ${username}`);
      
      // 데이터베이스에서 사용자 조회
      const user = await prisma.user.findUnique({
        where: { username }
      });

      if (!user) {
        console.log(`❌ User not found: ${username}`);
        socket.emit('authenticate-result', { success: false, error: 'User not found' });
        return;
      }

      // 실제 사용자 UUID로 인증 설정
      setAuthentication(socket, user.id);
      console.log(`🔐 User authenticated: ${username} -> ${user.id} (${socket.id})`);
      
      // 인증 성공 응답
      socket.emit('authenticate-result', { success: true, userId: user.id, username: user.username });
      
      // 다른 모든 사용자에게 온라인 상태 알림
      socket.broadcast.emit('user-online', {
        userId: user.id,
        username: user.username,
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      console.error('❌ Authentication error:', error);
      socket.emit('authenticate-result', { success: false, error: 'Authentication failed' });
    }
  });
};
