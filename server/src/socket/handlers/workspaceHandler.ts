import { Socket } from 'socket.io';
import { shardManager } from '../../config/shardManager';

export const handleWorkspace = (socket: Socket) => {
  // 워크스페이스 입장
  socket.on('join-workspace', async (data: { workspaceId: string }) => {
    try {
      const { workspaceId: workspaceIdOrSlug } = data;
      const userId = socket.userId;
      
      if (!userId) {
        socket.emit('error', { message: '인증이 필요합니다.' });
        return;
      }
      
      console.log(`🔍 Attempting to join workspace: ${workspaceIdOrSlug} for user: ${userId}`);
      
      // UUID 패턴 확인 (UUID v4 형태)
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(workspaceIdOrSlug);
      console.log(`🔍 Is UUID: ${isUUID}`);
      
      // 적절한 샤드 선택
      const prisma = isUUID 
        ? await shardManager.getShardForWorkspaceId(workspaceIdOrSlug)
        : await shardManager.getShardForWorkspace(workspaceIdOrSlug);
      
      // 워크스페이스 먼저 조회 (UUID 또는 slug로)
      const workspace = await prisma.workspace.findFirst({
        where: isUUID 
          ? { id: workspaceIdOrSlug }
          : { slug: workspaceIdOrSlug }
      });
      
      console.log(`🔍 Found workspace:`, workspace);
      
      if (!workspace) {
        socket.emit('error', { message: '워크스페이스를 찾을 수 없습니다.' });
        return;
      }
      
      console.log(`🔍 Searching for member with workspaceId: ${workspace.id}, userId: ${userId}`);
      
      // 워크스페이스 멤버 확인 (같은 샤드에서)
      const member = await prisma.workspaceMember.findFirst({
        where: { 
          workspaceId: workspace.id,
          userId: userId
        }
      });
      
      console.log(`🔍 Found workspace member:`, member);
      
      if (!member) {
        // 사용자가 이 샤드에 없을 수 있으므로 모든 샤드에서 확인
        console.log(`🔍 User not found in current shard, checking all shards...`);
        
        let userFound = false;
        const allShards = await shardManager.getAllShards();
        for (const shardPrisma of allShards) {
          const memberInShard = await shardPrisma.workspaceMember.findFirst({
            where: {
              workspaceId: workspace.id,
              userId: userId
            }
          });
          
          if (memberInShard) {
            userFound = true;
            console.log(`🔍 Found user in different shard`);
            break;
          }
        }
        
        if (!userFound) {
          socket.emit('error', { message: '워크스페이스 접근 권한이 없습니다.' });
          return;
        }
      }
      
      // 워크스페이스 입장
      socket.join(`workspace_${workspace.id}`);
      
      // 해당 워크스페이스의 채널 조회 (사용자가 접근 가능한 채널만)
      const channels = await prisma.channel.findMany({
        where: { 
          workspaceId: workspace.id,
          OR: [
            { isPrivate: false }, // 공개 채널
            { 
              members: { 
                some: { userId } // 프라이빗 채널 중 사용자가 멤버인 것
              }
            }
          ]
        },
        include: {
          members: {
            where: { userId }
          }
        }
      });
      
      console.log(`🔍 Found channels:`, channels);
      
      // 접근 가능한 채널에 자동 입장
      channels.forEach(channel => {
        socket.join(`channel_${channel.id}`);
      });
      
      console.log(`🏢 User ${userId} joined workspace ${workspace.name} with ${channels.length} channels`);
      
      // 클라이언트에 성공 응답
      socket.emit('workspace-joined', {
        workspace: {
          id: workspace.id,
          name: workspace.name,
          slug: workspace.slug,
          description: workspace.description
        },
        channels: channels.map(c => ({
          id: c.id,
          name: c.name,
          description: c.description,
          isPrivate: c.isPrivate
        }))
      });
      
    } catch (error) {
      console.error('워크스페이스 입장 오류:', error);
      socket.emit('error', { message: '워크스페이스 입장에 실패했습니다.' });
    }
  });
}; 