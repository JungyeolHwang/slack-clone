import React, { useState } from 'react';
import styled from 'styled-components';
import { theme } from '../../styles/GlobalStyles';
import { useChatContext } from '../../context/ChatContext';

const InputContainer = styled.div`
  padding: ${theme.spacing.lg};
  background-color: ${theme.colors.inputBg};
  border-top: 1px solid ${theme.colors.inputBorder};
`;

const InputWrapper = styled.div`
  position: relative;
  border: 1px solid ${theme.colors.inputBorder};
  border-radius: ${theme.borderRadius.md};
  background-color: ${theme.colors.white};
  overflow: hidden;
  
  &:focus-within {
    border-color: ${theme.colors.primary};
    box-shadow: 0 0 0 1px ${theme.colors.primary};
  }
`;

const TextInput = styled.textarea`
  width: 100%;
  min-height: 44px;
  max-height: 200px;
  padding: ${theme.spacing.sm} ${theme.spacing.md};
  border: none;
  outline: none;
  resize: none;
  font-family: inherit;
  font-size: ${theme.fonts.medium};
  line-height: 1.4;
  background-color: transparent;
  
  &::placeholder {
    color: ${theme.colors.textMuted};
  }
`;

const InputActions = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: ${theme.spacing.xs} ${theme.spacing.md};
  background-color: ${theme.colors.gray50};
  border-top: 1px solid ${theme.colors.gray200};
`;

const ActionButtons = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.xs};
`;

const ActionButton = styled.button`
  background: none;
  border: none;
  padding: ${theme.spacing.xs};
  border-radius: ${theme.borderRadius.sm};
  color: ${theme.colors.textMuted};
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  
  &:hover {
    background-color: ${theme.colors.gray200};
    color: ${theme.colors.textPrimary};
  }
`;

const SendButton = styled.button<{ disabled?: boolean }>`
  background-color: ${theme.colors.primary};
  color: white;
  border: none;
  padding: ${theme.spacing.xs} ${theme.spacing.md};
  border-radius: ${theme.borderRadius.sm};
  font-size: ${theme.fonts.medium};
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  
  ${({ disabled }) => disabled && `
    background-color: ${theme.colors.gray300};
    cursor: not-allowed;
  `}
  
  &:hover:not(:disabled) {
    background-color: ${theme.colors.primaryHover};
  }
`;

const ShortcutHint = styled.span`
  font-size: ${theme.fonts.small};
  color: ${theme.colors.textMuted};
`;

const MessageInput: React.FC = () => {
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const { sendMessage, currentChannel } = useChatContext();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('🎯 handleSubmit called with message:', message, 'isSending:', isSending);
    
    // 이미 전송 중이거나 빈 메시지면 무시
    if (isSending || !message.trim()) {
      console.log('🚫 Blocked: isSending=', isSending, 'message empty=', !message.trim());
      return;
    }
    
    setIsSending(true);
    console.log('📝 Sending message via form submit:', message.trim());
    
    // 실제 메시지 전송
    sendMessage(message);
    setMessage('');
    
    // 전송 완료 후 잠시 대기 후 플래그 해제
    setTimeout(() => {
      setIsSending(false);
      console.log('✅ Form submit - message sent, input cleared, sending unlocked');
    }, 100);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      // IME 입력 중일 때는 Enter 키를 무시 (한글 입력 시 문제 방지)
      if (e.nativeEvent.isComposing) {
        console.log('🚫 Enter blocked: IME is composing');
        return;
      }
      
      e.preventDefault();
      
      console.log('⌨️ Enter key pressed, message:', message, 'isSending:', isSending);
      
      // 이미 전송 중이거나 빈 메시지면 무시
      if (isSending || !message.trim()) {
        console.log('🚫 Enter blocked: isSending=', isSending, 'message empty=', !message.trim());
        return;
      }
      
      setIsSending(true);
      console.log('⌨️ Enter key - sending message:', message.trim());
      
      sendMessage(message);
      setMessage('');
      
      // 전송 완료 후 잠시 대기 후 플래그 해제  
      setTimeout(() => {
        setIsSending(false);
        console.log('✅ Enter key - message sent, input cleared, sending unlocked');
      }, 100);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);
    
    // 자동 높이 조절
    e.target.style.height = 'auto';
    e.target.style.height = `${e.target.scrollHeight}px`;
  };

  return (
    <InputContainer>
      <form onSubmit={handleSubmit}>
        <InputWrapper>
          <TextInput
            value={message}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder={`# ${currentChannel?.name || 'general'}에 메시지 보내기`}
            rows={1}
          />
          
          <InputActions>
            <ActionButtons>
              <ActionButton type="button" title="파일 첨부">
                📎
              </ActionButton>
              <ActionButton type="button" title="이모지">
                😀
              </ActionButton>
              <ActionButton type="button" title="멘션">
                @
              </ActionButton>
              <ActionButton type="button" title="코드 블록">
                💻
              </ActionButton>
            </ActionButtons>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing.md }}>
              <ShortcutHint>Enter로 전송, Shift+Enter로 줄바꿈</ShortcutHint>
              <SendButton type="submit" disabled={!message.trim() || isSending}>
                {isSending ? '전송 중...' : '전송'}
              </SendButton>
            </div>
          </InputActions>
        </InputWrapper>
      </form>
    </InputContainer>
  );
};

export default MessageInput; 