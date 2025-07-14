import React, { useEffect, useRef } from 'react';
import styled from 'styled-components';
import { theme } from '../../styles/GlobalStyles';
import { useChatContext } from '../../context/ChatContext';

const MessagesContainer = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: ${theme.spacing.lg};
  text-align: left; // 명시적으로 왼쪽 정렬 추가
`;

const ScrollContent = styled.div`
  /* 단순한 래퍼 */
`;

const MessageGroup = styled.div`
  /* 메시지들을 바로 표시 */
`;

const MessageItem = styled.div`
  display: flex;
  gap: ${theme.spacing.sm};
  padding: ${theme.spacing.xs} 0;
  margin-bottom: ${theme.spacing.xs};
  align-items: flex-start;
  text-align: left; // 명시적으로 왼쪽 정렬 추가
  
  &:hover {
    background-color: ${theme.colors.gray50};
    margin: 0 -${theme.spacing.lg} ${theme.spacing.xs} -${theme.spacing.lg};
    padding: ${theme.spacing.xs} ${theme.spacing.lg};
    border-radius: ${theme.borderRadius.sm};
  }
`;

const Avatar = styled.div`
  width: 36px;
  height: 36px;
  border-radius: ${theme.borderRadius.sm};
  background-color: ${theme.colors.primary};
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: 600;
  font-size: ${theme.fonts.medium};
  flex-shrink: 0;
`;

const MessageContent = styled.div`
  flex: 1;
  min-width: 0;
`;

const MessageHeader = styled.div`
  display: flex;
  align-items: baseline;
  gap: ${theme.spacing.sm};
  margin-bottom: ${theme.spacing.xs};
`;

const UserName = styled.span`
  font-weight: 700;
  color: ${theme.colors.textPrimary};
  font-size: ${theme.fonts.medium};
`;

const Timestamp = styled.span`
  font-size: ${theme.fonts.small};
  color: ${theme.colors.textMuted};
`;

const MessageText = styled.div`
  color: ${theme.colors.textPrimary};
  font-size: ${theme.fonts.medium};
  line-height: 1.4;
  word-wrap: break-word;
`;

const WelcomeMessage = styled.div`
  text-align: center;
  padding: ${theme.spacing.xxl};
  color: ${theme.colors.textSecondary};
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 600px;
  z-index: 1;
`;

const WelcomeTitle = styled.h2`
  font-size: ${theme.fonts.xxlarge};
  color: ${theme.colors.textPrimary};
  margin-bottom: ${theme.spacing.md};
`;

const WelcomeDescription = styled.p`
  font-size: ${theme.fonts.medium};
  line-height: 1.5;
  max-width: 500px;
  margin: 0 auto;
`;

const ChatMessages: React.FC = () => {
  const { currentChannel, messages } = useChatContext();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 메시지가 업데이트될 때마다 스크롤을 맨 아래로
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // 시간 포맷팅 함수
  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('ko-KR', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  return (
    <MessagesContainer>
      {/* 웰컴 메시지 */}
      {messages.length === 0 && (
        <WelcomeMessage>
          <WelcomeTitle># {currentChannel?.name || 'general'} 채널에 오신 것을 환영합니다!</WelcomeTitle>
          <WelcomeDescription>
            {currentChannel?.description || '이곳은 팀의 일반적인 대화를 나누는 공간입니다. 프로젝트 관련 소식이나 일상적인 이야기를 자유롭게 나눠보세요.'}
          </WelcomeDescription>
        </WelcomeMessage>
      )}
      
      {/* 메시지 목록 */}
      {messages.map((message) => (
        <MessageItem key={message.id}>
          <Avatar>{message.user.avatar}</Avatar>
          <MessageContent>
            <MessageHeader>
              <UserName>{message.user.name}</UserName>
              <Timestamp>{formatTime(message.timestamp)}</Timestamp>
            </MessageHeader>
            <MessageText>{message.content}</MessageText>
          </MessageContent>
        </MessageItem>
      ))}
      
      {/* 자동 스크롤을 위한 참조 */}
      <div ref={messagesEndRef} />
    </MessagesContainer>
  );
};

export default ChatMessages; 