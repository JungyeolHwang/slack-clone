import React from 'react';
import styled from 'styled-components';
import { theme } from '../../styles/GlobalStyles';
import { useChatContext } from '../../context/ChatContext';

const HeaderContainer = styled.div`
  height: 60px;
  background-color: ${theme.colors.headerBg};
  border-bottom: 1px solid ${theme.colors.headerBorder};
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 ${theme.spacing.lg};
  box-shadow: ${theme.shadows.sm};
  z-index: ${theme.zIndex.sticky};
`;

const ChannelInfo = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
`;

const ChannelIcon = styled.span`
  font-size: ${theme.fonts.large};
  color: ${theme.colors.textSecondary};
`;

const ChannelDetails = styled.div`
  display: flex;
  flex-direction: column;
`;

const ChannelName = styled.h3`
  font-size: ${theme.fonts.large};
  font-weight: 700;
  color: ${theme.colors.textPrimary};
  margin: 0;
`;

const ChannelDescription = styled.p`
  font-size: ${theme.fonts.small};
  color: ${theme.colors.textSecondary};
  margin: 0;
`;

const HeaderActions = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
`;

const ActionButton = styled.button`
  background: none;
  border: none;
  padding: ${theme.spacing.sm};
  border-radius: ${theme.borderRadius.sm};
  color: ${theme.colors.textSecondary};
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  
  &:hover {
    background-color: ${theme.colors.gray100};
    color: ${theme.colors.textPrimary};
  }
`;

const MemberCount = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.xs};
  padding: ${theme.spacing.xs} ${theme.spacing.sm};
  background-color: ${theme.colors.gray100};
  border-radius: ${theme.borderRadius.sm};
  font-size: ${theme.fonts.small};
  color: ${theme.colors.textSecondary};
`;

const OnlineIndicator = styled.div`
  width: 8px;
  height: 8px;
  background-color: ${theme.colors.success};
  border-radius: 50%;
`;

const ChatHeader: React.FC = () => {
  const { currentChannel } = useChatContext();
  
  // 온라인 사용자 수는 임시로 1로 설정
  const onlineCount = 1;

  return (
    <HeaderContainer>
      <ChannelInfo>
        <ChannelIcon>{currentChannel?.isPrivate ? '🔒' : '#'}</ChannelIcon>
        <ChannelDetails>
          <ChannelName>{currentChannel?.name || 'general'}</ChannelName>
          <ChannelDescription>
            {currentChannel?.description || '일반적인 대화를 위한 채널입니다'}
          </ChannelDescription>
        </ChannelDetails>
      </ChannelInfo>
      
      <HeaderActions>
        <MemberCount>
          <OnlineIndicator />
          {onlineCount}명 온라인
        </MemberCount>
        
        <ActionButton title="채널 멤버 보기">
          👥
        </ActionButton>
        
        <ActionButton title="검색">
          🔍
        </ActionButton>
        
        <ActionButton title="채널 설정">
          ⚙️
        </ActionButton>
      </HeaderActions>
    </HeaderContainer>
  );
};

export default ChatHeader; 