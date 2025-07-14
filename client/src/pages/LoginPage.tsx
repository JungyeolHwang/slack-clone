import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import styled from 'styled-components';
import { useChatContext } from '../context/ChatContext';

const Container = styled.div`
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 20px;
`;

const LoginCard = styled.div`
  background: white;
  padding: 40px;
  border-radius: 12px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
  width: 100%;
  max-width: 400px;
  text-align: center;
`;

const Title = styled.h1`
  color: #1a1a1a;
  font-size: 28px;
  font-weight: 700;
  margin-bottom: 8px;
`;

const Subtitle = styled.p`
  color: #666;
  font-size: 16px;
  margin-bottom: 32px;
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 20px;
`;

const InputGroup = styled.div`
  text-align: left;
`;

const Label = styled.label`
  display: block;
  font-weight: 600;
  margin-bottom: 6px;
  color: #1a1a1a;
`;

const Input = styled.input<{ $hasError?: boolean }>`
  width: 100%;
  padding: 12px 16px;
  border: 2px solid ${props => props.$hasError ? '#e74c3c' : '#e1e5e9'};
  border-radius: 8px;
  font-size: 16px;
  transition: border-color 0.2s;
  
  &:focus {
    outline: none;
    border-color: #667eea;
  }
  
  &::placeholder {
    color: #999;
  }
`;

const ErrorMessage = styled.span`
  color: #e74c3c;
  font-size: 14px;
  margin-top: 4px;
  display: block;
`;

const Button = styled.button`
  background: #667eea;
  color: white;
  border: none;
  padding: 14px 24px;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  margin-top: 8px;
  
  &:hover:not(:disabled) {
    background: #5a6fd8;
    transform: translateY(-1px);
  }
  
  &:disabled {
    background: #ccc;
    cursor: not-allowed;
    transform: none;
  }
`;

const DemoAccounts = styled.div`
  margin-top: 24px;
  padding-top: 24px;
  border-top: 1px solid #e1e5e9;
`;

const DemoTitle = styled.h3`
  color: #666;
  font-size: 14px;
  margin-bottom: 12px;
`;

const DemoButton = styled.button`
  background: #f8f9fa;
  color: #666;
  border: 1px solid #e1e5e9;
  padding: 8px 16px;
  border-radius: 6px;
  font-size: 14px;
  cursor: pointer;
  margin: 0 4px 8px 0;
  transition: all 0.2s;
  
  &:hover {
    background: #e9ecef;
    color: #333;
  }
`;

const LoadingSpinner = styled.div`
  display: inline-block;
  width: 20px;
  height: 20px;
  border: 3px solid #ffffff;
  border-radius: 50%;
  border-top-color: transparent;
  animation: spin 1s ease-in-out infinite;
  
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
`;

interface LoginForm {
  username: string;
}

const LoginPage: React.FC = () => {
  const { login, loading, error } = useChatContext();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { register, handleSubmit, formState: { errors }, setValue } = useForm<LoginForm>();

  const onSubmit = async (data: LoginForm) => {
    setIsSubmitting(true);
    try {
      await login(data.username);
    } catch (err) {
      console.error('Login failed:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDemoLogin = (username: string) => {
    setValue('username', username);
    login(username);
  };

  return (
    <Container>
      <LoginCard>
        <Title>Slack Clone</Title>
        <Subtitle>팀과 함께 소통하고 협업하세요</Subtitle>
        
        <Form onSubmit={handleSubmit(onSubmit)}>
          <InputGroup>
            <Label htmlFor="username">사용자명</Label>
            <Input
              id="username"
              type="text"
              placeholder="사용자명을 입력하세요"
              $hasError={!!errors.username}
              {...register('username', { 
                required: '사용자명은 필수입니다',
                minLength: { value: 2, message: '사용자명은 2자 이상이어야 합니다' }
              })}
            />
            {errors.username && (
              <ErrorMessage>{errors.username.message}</ErrorMessage>
            )}
          </InputGroup>

          {error && (
            <ErrorMessage style={{ textAlign: 'center' }}>{error}</ErrorMessage>
          )}

          <Button type="submit" disabled={isSubmitting || loading}>
            {isSubmitting || loading ? (
              <>
                <LoadingSpinner />
                <span style={{ marginLeft: '8px' }}>로그인 중...</span>
              </>
            ) : (
              '로그인'
            )}
          </Button>
        </Form>

        <DemoAccounts>
          <DemoTitle>데모 계정으로 빠른 로그인</DemoTitle>
          <DemoButton onClick={() => handleDemoLogin('admin')}>
            관리자 (admin)
          </DemoButton>
          <DemoButton onClick={() => handleDemoLogin('john_doe')}>
            John Doe
          </DemoButton>
          <DemoButton onClick={() => handleDemoLogin('jane_smith')}>
            Jane Smith
          </DemoButton>
        </DemoAccounts>
      </LoginCard>
    </Container>
  );
};

export default LoginPage; 