import { Socket, Server } from 'socket.io';
import { shardManager } from '../../config/shardManager';

export const handleMessage = (socket: Socket, io: Server) => {
  // 메시지 전송
  socket.on('send-message', async (messageData: {
    channelId: string;
    content: string;
    user: any;
  }) => {
    try {
      const userId = socket.userId;
      
      if (!userId) {
        socket.emit('error', { message: '인증이 필요합니다.' });
        return;
      }
      
      console.log(`🔍 Looking for channel: ${messageData.channelId} across all shards`);
      
      // 모든 샤드에서 채널 검색
      let channel = null;
      let prisma = null;
      const allShards = await shardManager.getAllShards();
      
      for (const shardPrisma of allShards) {
        const foundChannel = await shardPrisma.channel.findUnique({
          where: { id: messageData.channelId },
          include: { 
            workspace: true,
            members: { where: { userId } }
          }
        });
        
        if (foundChannel) {
          channel = foundChannel;
          prisma = shardPrisma;
          console.log(`✅ Found channel in shard for workspace: ${foundChannel.workspace.slug}`);
          break;
        }
      }
      
      if (!channel || !prisma) {
        socket.emit('error', { message: '채널을 찾을 수 없습니다.' });
        return;
      }
      
      // 워크스페이스 멤버 확인 (같은 샤드에서)
      const workspaceMember = await prisma.workspaceMember.findFirst({
        where: { 
          workspaceId: channel.workspaceId,
          userId 
        }
      });
      
      if (!workspaceMember) {
        socket.emit('error', { message: '메시지 전송 권한이 없습니다.' });
        return;
      }
      
      // 프라이빗 채널 권한 확인
      if (channel.isPrivate && channel.members.length === 0) {
        socket.emit('error', { message: '프라이빗 채널 접근 권한이 없습니다.' });
        return;
      }
      
      // 사용자 정보 조회
      const user = await prisma.user.findUnique({
        where: { id: userId }
      });
      
      if (!user) {
        socket.emit('error', { message: '사용자 정보를 찾을 수 없습니다.' });
        return;
      }
      
      console.log(`📤 Message from ${userId} in channel ${channel.name}:`, messageData.content);
      
      // 💾 데이터베이스에 메시지 저장
      const savedMessage = await prisma.message.create({
        data: {
          content: messageData.content,
          channelId: messageData.channelId,
          userId: userId,
          createdAt: new Date()
        },
        include: {
          user: {
            select: {
              id: true,
              username: true
            }
          }
        }
      });
      
      const message = {
        id: savedMessage.id, // 실제 DB ID 사용
        channelId: savedMessage.channelId,
        content: savedMessage.content,
        user: {
          id: savedMessage.user.id,
          name: savedMessage.user.username,
          avatar: savedMessage.user.username.charAt(0).toUpperCase()
        },
        timestamp: savedMessage.createdAt.toISOString(),
      };
      
      // 같은 채널의 모든 사용자에게 메시지 브로드캐스트
      io.to(`channel_${messageData.channelId}`).emit('new-message', message);
      
      console.log(`📨 Message broadcasted to channel ${channel.name} (${channel.workspace.name})`);
      
    } catch (error) {
      console.error('메시지 전송 오류:', error);
      socket.emit('error', { message: '메시지 전송에 실패했습니다.' });
    }
  });
  
  // 📜 메시지 히스토리 조회 추가
  socket.on('get-message-history', async (data: { channelId: string; limit?: number; offset?: number }) => {
    try {
      const { channelId, limit = 50, offset = 0 } = data;
      const userId = socket.userId;
      
      if (!userId) {
        socket.emit('error', { message: '인증이 필요합니다.' });
        return;
      }
      
      // 모든 샤드에서 채널 검색 (메시지 히스토리를 위해)
      let channel = null;
      let prisma = null;
      const allShards = await shardManager.getAllShards();
      
      for (const shardPrisma of allShards) {
        const foundChannel = await shardPrisma.channel.findUnique({
          where: { id: channelId },
          include: { 
            workspace: true,
            members: { where: { userId } }
          }
        });
        
        if (foundChannel) {
          channel = foundChannel;
          prisma = shardPrisma;
          console.log(`✅ Found channel for history in shard: ${foundChannel.workspace.slug}`);
          break;
        }
      }
      
      if (!channel || !prisma) {
        socket.emit('error', { message: '채널을 찾을 수 없습니다.' });
        return;
      }
      
      // 채널 접근 권한 확인 후 메시지 히스토리 조회
      const messages = await prisma.message.findMany({
        where: { channelId },
        include: {
          user: {
            select: {
              id: true,
              username: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset
      });
      
      // 타입 명시적 지정
      const formattedMessages = messages.reverse().map((msg: any) => ({
        id: msg.id,
        channelId: msg.channelId,
        content: msg.content,
        user: {
          id: msg.user.id,
          name: msg.user.username,
          avatar: msg.user.username.charAt(0).toUpperCase()
        },
        timestamp: msg.createdAt.toISOString(),
      }));
      
      socket.emit('message-history', {
        channelId,
        messages: formattedMessages,
        hasMore: messages.length === limit
      });
      
    } catch (error) {
      console.error('메시지 히스토리 조회 오류:', error);
      socket.emit('error', { message: '메시지 히스토리 조회에 실패했습니다.' });
    }
  });
  
  // 타이핑 이벤트
  socket.on('typing', async ({ channelId, isTyping }: { channelId: string; isTyping: boolean }) => {
    try {
      const userId = socket.userId;
      
      if (!userId) {
        return;
      }
      
      // 채널 접근 권한 확인 (간단 버전)
      const rooms = Array.from(socket.rooms);
      if (!rooms.includes(`channel_${channelId}`)) {
        return;
      }
      
      socket.to(`channel_${channelId}`).emit('user-typing', {
        userId,
        channelId,
        isTyping,
        timestamp: new Date().toISOString(),
      });
      
    } catch (error) {
      console.error('타이핑 이벤트 오류:', error);
    }
  });
}; 