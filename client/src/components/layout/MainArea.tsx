import React from 'react';
import styled from 'styled-components';
import { theme } from '../../styles/GlobalStyles';
import ChatHeader from '../chat/ChatHeader';
import ChatMessages from '../chat/ChatMessages';
import MessageInput from '../chat/MessageInput';

const MainContainer = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  height: 100vh;
  overflow: hidden;
  background-color: ${theme.colors.chatBg};
  align-items: stretch; // 자식 요소들이 전체 너비를 사용하도록
`;

const MainArea: React.FC = () => {
  return (
    <MainContainer>
      <ChatHeader />
      <ChatMessages />
      <MessageInput />
    </MainContainer>
  );
};

export default MainArea; 