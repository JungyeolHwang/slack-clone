import styled, { createGlobalStyle } from 'styled-components';

export const GlobalStyles = createGlobalStyle`
  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }

  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
      'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
      sans-serif;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    background-color: #f8f9fa;
    color: #1d1c1d;
    height: 100vh;
    overflow: hidden;
  }

  #root {
    height: 100vh;
    display: flex;
    flex-direction: column;
  }

  code {
    font-family: source-code-pro, Menlo, Monaco, Consolas, 'Courier New',
      monospace;
  }

  /* 스크롤바 스타일링 */
  ::-webkit-scrollbar {
    width: 8px;
  }

  ::-webkit-scrollbar-track {
    background: transparent;
  }

  ::-webkit-scrollbar-thumb {
    background: #888;
    border-radius: 4px;
  }

  ::-webkit-scrollbar-thumb:hover {
    background: #555;
  }
`;

// 테마 색상 정의
export const theme = {
  colors: {
    // Primary colors (Slack 스타일)
    primary: '#611f69',
    primaryHover: '#4a154b',
    primaryLight: '#f8f4ff',
    
    // Sidebar colors
    sidebarBg: '#3f0e40',
    sidebarText: '#ffffff',
    sidebarTextMuted: '#bcabbc',
    sidebarHover: '#350d36',
    sidebarActive: '#1164a3',
    
    // Main area colors
    headerBg: '#ffffff',
    headerBorder: '#e8e8e8',
    chatBg: '#ffffff',
    inputBg: '#ffffff',
    inputBorder: '#e8e8e8',
    
    // Text colors
    textPrimary: '#1d1c1d',
    textSecondary: '#616061',
    textMuted: '#868686',
    
    // Status colors
    success: '#007a5a',
    warning: '#ffb02e',
    error: '#e01e5a',
    info: '#1264a3',
    
    // Neutral colors
    white: '#ffffff',
    gray50: '#f8fafc',
    gray100: '#f1f5f9',
    gray200: '#e2e8f0',
    gray300: '#cbd5e1',
    gray500: '#64748b',
    gray700: '#334155',
    gray900: '#0f172a',
  },
  
  fonts: {
    small: '12px',
    medium: '14px',
    large: '16px',
    xlarge: '18px',
    xxlarge: '24px',
  },
  
  spacing: {
    xs: '4px',
    sm: '8px',
    md: '16px',
    lg: '24px',
    xl: '32px',
    xxl: '48px',
  },
  
  borderRadius: {
    sm: '4px',
    md: '8px',
    lg: '12px',
    xl: '16px',
  },
  
  shadows: {
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
  },
  
  zIndex: {
    dropdown: 1000,
    sticky: 1020,
    fixed: 1030,
    modal: 1040,
    popover: 1050,
    tooltip: 1060,
  }
};

export type Theme = typeof theme; 