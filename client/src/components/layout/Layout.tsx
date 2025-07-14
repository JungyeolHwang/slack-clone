import React from 'react';
import styled from 'styled-components';
import { theme } from '../../styles/GlobalStyles';
import { useChatContext } from '../../context/ChatContext';
import Sidebar from './Sidebar';
import MainArea from './MainArea';
import ErrorDisplay from '../common/ErrorDisplay';

const LayoutContainer = styled.div`
  display: flex;
  height: 100vh;
  width: 100vw;
  overflow: hidden;
`;

const ErrorWrapper = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: ${theme.zIndex.modal};
  padding: ${theme.spacing.md};
`;

const Layout: React.FC = () => {
  const { error } = useChatContext();

  return (
    <>
      {error && (
        <ErrorWrapper>
          <ErrorDisplay error={error} onClose={() => {}} />
        </ErrorWrapper>
      )}
      <LayoutContainer>
        <Sidebar />
        <MainArea />
      </LayoutContainer>
    </>
  );
};

export default Layout; 