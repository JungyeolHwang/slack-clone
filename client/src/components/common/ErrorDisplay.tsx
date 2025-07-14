import React from 'react';
import styled from 'styled-components';
import { theme } from '../../styles/GlobalStyles';

const ErrorContainer = styled.div`
  background-color: ${theme.colors.error};
  color: white;
  padding: ${theme.spacing.md};
  border-radius: ${theme.borderRadius.md};
  margin: ${theme.spacing.md} 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const ErrorMessage = styled.span`
  font-size: ${theme.fonts.medium};
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  color: white;
  cursor: pointer;
  font-size: ${theme.fonts.large};
  padding: ${theme.spacing.xs};
  border-radius: ${theme.borderRadius.sm};
  
  &:hover {
    background-color: rgba(255, 255, 255, 0.1);
  }
`;

interface ErrorDisplayProps {
  error: string;
  onClose: () => void;
}

const ErrorDisplay: React.FC<ErrorDisplayProps> = ({ error, onClose }) => {
  return (
    <ErrorContainer>
      <ErrorMessage>🚨 {error}</ErrorMessage>
      <CloseButton onClick={onClose}>×</CloseButton>
    </ErrorContainer>
  );
};

export default ErrorDisplay; 