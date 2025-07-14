import React from 'react';
import styled from 'styled-components';
import { useNavigate } from 'react-router-dom';
import { theme } from '../../styles/GlobalStyles';
import { useChatContext } from '../../context/ChatContext';
import UserList from './UserList';

const SidebarContainer = styled.div`
  width: 260px;
  min-width: 260px;
  height: 100vh;
  background-color: ${theme.colors.sidebarBg};
  color: ${theme.colors.sidebarText};
  display: flex;
  flex-direction: column;
  overflow: hidden;
`;

const WorkspaceHeader = styled.div`
  padding: ${theme.spacing.md};
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  background-color: rgba(255, 255, 255, 0.05);
`;

const WorkspaceName = styled.h2`
  font-size: ${theme.fonts.large};
  font-weight: 700;
  margin-bottom: ${theme.spacing.xs};
  color: ${theme.colors.sidebarText};
`;

const WorkspaceStatus = styled.div`
  font-size: ${theme.fonts.small};
  color: ${theme.colors.sidebarTextMuted};
  display: flex;
  align-items: center;
  gap: ${theme.spacing.xs};
`;

const StatusDot = styled.div`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: ${theme.colors.success};
`;

const ChannelSection = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: ${theme.spacing.md} 0;
`;

const SectionTitle = styled.div`
  padding: ${theme.spacing.sm} ${theme.spacing.md};
  font-size: ${theme.fonts.small};
  color: ${theme.colors.sidebarTextMuted};
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: pointer;
  
  &:hover {
    background-color: ${theme.colors.sidebarHover};
  }
`;

const ChannelList = styled.div`
  margin-bottom: ${theme.spacing.lg};
`;

const ChannelItem = styled.div<{ $active?: boolean }>`
  padding: ${theme.spacing.sm} ${theme.spacing.md};
  font-size: ${theme.fonts.medium};
  color: ${theme.colors.sidebarTextMuted};
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
  
  ${({ $active }) => $active && `
    background-color: ${theme.colors.sidebarActive};
    color: ${theme.colors.sidebarText};
    font-weight: 600;
  `}
  
  &:hover {
    background-color: ${theme.colors.sidebarHover};
    color: ${theme.colors.sidebarText};
  }
`;

const ChannelIcon = styled.span`
  font-size: ${theme.fonts.medium};
  opacity: 0.8;
`;

const AddButton = styled.button`
  background: none;
  border: none;
  color: ${theme.colors.sidebarTextMuted};
  cursor: pointer;
  font-size: ${theme.fonts.large};
  padding: 0;
  
  &:hover {
    color: ${theme.colors.sidebarText};
  }
`;

const UserSection = styled.div`
  padding: ${theme.spacing.md};
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  background-color: rgba(255, 255, 255, 0.05);
`;

const UserInfo = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
  cursor: pointer;
  
  &:hover {
    opacity: 0.8;
  }
`;

const UserAvatar = styled.div`
  width: 32px;
  height: 32px;
  border-radius: ${theme.borderRadius.sm};
  background-color: ${theme.colors.primary};
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: 600;
  font-size: ${theme.fonts.medium};
`;

const UserDetails = styled.div`
  flex: 1;
`;

const UserName = styled.div`
  font-size: ${theme.fonts.medium};
  font-weight: 600;
  color: ${theme.colors.sidebarText};
`;

const UserStatus = styled.div`
  font-size: ${theme.fonts.small};
  color: ${theme.colors.sidebarTextMuted};
`;

const LogoutButton = styled.button`
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: ${theme.colors.sidebarText};
  font-size: ${theme.fonts.small};
  padding: ${theme.spacing.xs} ${theme.spacing.sm};
  border-radius: 4px;
  cursor: pointer;
  margin-top: ${theme.spacing.sm};
  transition: all 0.2s;

  &:hover {
    background: rgba(255, 255, 255, 0.1);
    border-color: rgba(255, 255, 255, 0.3);
  }

  &:active {
    transform: translateY(1px);
  }
`;

const Sidebar: React.FC = () => {
  const { workspace, channels, currentChannel, user, selectChannel, logout } = useChatContext();
  const navigate = useNavigate();

  // 실제 데이터 사용 (안전하게 기본값 제공)
  const currentUser = user || {
    id: 'current_user',
    name: '현재 사용자',
    avatar: 'U',
    status: 'online' as const,
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'online': return '온라인';
      case 'away': return '자리 비움';
      case 'busy': return '다른 일 중';
      case 'offline': return '오프라인';
      default: return '오프라인';
    }
  };

  // 안전하게 status 처리
  const userStatus = currentUser.status || 'online';

  return (
    <SidebarContainer>
      <WorkspaceHeader>
        <WorkspaceName>
          {workspace?.name || 'Slack Clone'}
        </WorkspaceName>
        <WorkspaceStatus>
          <StatusDot />
          {workspace?.description || '개발팀 워크스페이스'}
        </WorkspaceStatus>
      </WorkspaceHeader>

      <ChannelSection>
        <ChannelList>
          <SectionTitle>
            채널
            <AddButton>+</AddButton>
          </SectionTitle>
          {channels.map((channel) => (
            <ChannelItem 
              key={channel.id} 
              $active={channel.id === currentChannel?.id}
              onClick={() => selectChannel(channel.id)}
            >
              <ChannelIcon>#</ChannelIcon>
              {channel.name}
            </ChannelItem>
          ))}
        </ChannelList>

        {/* 사용자 목록 추가 */}
        <UserList />

        <ChannelList>
          <SectionTitle>
            다이렉트 메시지
            <AddButton>+</AddButton>
          </SectionTitle>
          {/* TODO: 다이렉트 메시지 구현 시 추가 */}
        </ChannelList>
      </ChannelSection>

      <UserSection>
        <UserInfo>
          <UserAvatar>{currentUser.avatar}</UserAvatar>
          <UserDetails>
            <UserName>{currentUser.name}</UserName>
            <UserStatus>{getStatusText(userStatus)}</UserStatus>
          </UserDetails>
        </UserInfo>
        <LogoutButton onClick={() => {
          logout();
          navigate('/login');
        }}>
          로그아웃
        </LogoutButton>
      </UserSection>
    </SidebarContainer>
  );
};

export default Sidebar; 