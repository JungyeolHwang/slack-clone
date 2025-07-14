import { Socket } from 'socket.io';
import { shardManager } from '../../config/shardManager';

export const handleChannel = (socket: Socket) => {
  // 채널 입장
  socket.on('join-channel', async (data: { channelId: string }) => {
    try {
      const { channelId } = data;
      const userId = socket.userId;
      
      if (!userId) {
        socket.emit('error', { message: '인증이 필요합니다.' });
        return;
      }
      
      console.log(`🔍 Looking for channel: ${channelId} across all shards`);
      
      // 모든 샤드에서 채널 검색
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
        socket.emit('error', { message: '워크스페이스 멤버가 아닙니다.' });
        return;
      }
      
      // 프라이빗 채널인 경우 멤버 확인
      if (channel.isPrivate && channel.members.length === 0) {
        socket.emit('error', { message: '프라이빗 채널 접근 권한이 없습니다.' });
        return;
      }
      
      // 워크스페이스와 채널에 입장
      socket.join(`workspace_${channel.workspaceId}`);
      socket.join(`channel_${channelId}`);
      
      console.log(`🏠 User ${userId} joined channel ${channel.name} in workspace ${channel.workspace.name}`);
      
      // 채널에 입장 알림
      socket.to(`channel_${channelId}`).emit('user-joined', {
        userId,
        channelId,
        timestamp: new Date().toISOString(),
      });
      
      // 채널 참여 성공 후 메시지 히스토리 전송
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
        take: 50 // 최근 50개 메시지
      });
      
      const formattedMessages = messages.reverse().map(msg => ({
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
      
      // 클라이언트에 성공 응답 (메시지 히스토리 포함)
      socket.emit('channel-joined', {
        channel: {
          id: channel.id,
          name: channel.name,
          description: channel.description,
          isPrivate: channel.isPrivate,
          workspaceId: channel.workspaceId
        },
        messages: formattedMessages // 메시지 히스토리 추가
      });
      
    } catch (error) {
      console.error('채널 입장 오류:', error);
      socket.emit('error', { message: '채널 입장에 실패했습니다.' });
    }
  });
  
  // 채널 나가기
  socket.on('leave-channel', async (data: { channelId: string }) => {
    try {
      const { channelId } = data;
      const userId = socket.userId;
      
      if (!userId) {
        socket.emit('error', { message: '인증이 필요합니다.' });
        return;
      }
      
      socket.leave(`channel_${channelId}`);
      console.log(`🚪 User ${userId} left channel ${channelId}`);
      
      // 채널에 나가기 알림
      socket.to(`channel_${channelId}`).emit('user-left', {
        userId,
        channelId,
        timestamp: new Date().toISOString(),
      });
      
      socket.emit('channel-left', { channelId });
      
    } catch (error) {
      console.error('채널 나가기 오류:', error);
      socket.emit('error', { message: '채널 나가기에 실패했습니다.' });
    }
  });
}; 