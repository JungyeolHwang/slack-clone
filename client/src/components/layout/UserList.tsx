import React from 'react';
import styled from 'styled-components';
import { theme } from '../../styles/GlobalStyles';
import { useChatContext } from '../../context/ChatContext';
import { User } from '../../types/chat';

const UserListContainer = styled.div`
  margin-bottom: ${theme.spacing.lg};
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

const UserItem = styled.div`
  padding: ${theme.spacing.sm} ${theme.spacing.md};
  font-size: ${theme.fonts.medium};
  color: ${theme.colors.sidebarTextMuted};
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
  
  &:hover {
    background-color: ${theme.colors.sidebarHover};
    color: ${theme.colors.sidebarText};
  }
`;

const UserStatusIcon = styled.span`
  font-size: 12px;
  width: 16px;
  text-align: center;
`;

const UserAvatar = styled.div<{ $isOffline: boolean }>`
  width: 20px;
  height: 20px;
  border-radius: ${theme.borderRadius.sm};
  background-color: ${theme.colors.primary};
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: 600;
  font-size: ${theme.fonts.small};
  opacity: ${props => props.$isOffline ? 0.5 : 1};
`;

const UserName = styled.span<{ $isOffline: boolean }>`
  flex: 1;
  opacity: ${props => props.$isOffline ? 0.6 : 1};
`;

const OnlineCount = styled.span`
  font-size: ${theme.fonts.small};
  color: ${theme.colors.sidebarTextMuted};
  font-weight: normal;
`;

// 사용자 타입을 안전하게 처리하는 유틸리티 타입
type SafeUser = User & {
  status: 'online' | 'away' | 'busy' | 'offline';
};

const UserList: React.FC = () => {
  const { user } = useChatContext();

  const getStatusIcon = (status: 'online' | 'away' | 'busy' | 'offline'): string => {
    switch (status) {
      case 'online': return '🟢';
      case 'away': return '🟡';
      case 'busy': return '🔴';
      case 'offline': return '⚫';
      default: return '⚫';
    }
  };

  // 현재 사용자만 표시 (임시로 사용자 목록 기능 비활성화)
  const users: SafeUser[] = user ? [{
    ...user,
    status: user.status || 'online'
  }] : [];

  const onlineUsers = users.filter(user => user.status === 'online');
  const offlineUsers = users.filter(user => user.status === 'offline');
  const awayUsers = users.filter(user => user.status === 'away' || user.status === 'busy');

  // 온라인 -> 자리비움/바쁨 -> 오프라인 순으로 정렬
  const sortedUsers = [...onlineUsers, ...awayUsers, ...offlineUsers];

  return (
    <UserListContainer>
      <SectionTitle>
        팀원
        <OnlineCount>({onlineUsers.length}명 온라인)</OnlineCount>
      </SectionTitle>
      {sortedUsers.map((user) => {
        const isOffline = user.status === 'offline';
        return (
          <UserItem key={user.id}>
            <UserStatusIcon>
              {getStatusIcon(user.status)}
            </UserStatusIcon>
            <UserAvatar $isOffline={isOffline}>
              {user.avatar}
            </UserAvatar>
            <UserName $isOffline={isOffline}>
              {user.name}
            </UserName>
          </UserItem>
        );
      })}
    </UserListContainer>
  );
};

export default UserList; 