import styled, { keyframes } from "styled-components";
import { FaCheckCircle, FaTimesCircle, FaInfoCircle, FaExclamationTriangle } from 'react-icons/fa';
import { useEffect } from 'react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

interface ToastProps {
  message: string;
  type: ToastType;
  isVisible: boolean;
  onClose: () => void;
  duration?: number;
}

export function Toast({ message, type, isVisible, onClose, duration }: ToastProps) {
  // Error mesajları için daha kısa süre, success için daha uzun
  const actualDuration = duration || (type === 'error' ? 3000 : 4000);
  
  useEffect(() => {
    if (isVisible && actualDuration > 0) {
      const timer = setTimeout(() => {
        onClose();
      }, actualDuration);
      
      return () => clearTimeout(timer);
    }
  }, [isVisible, actualDuration, onClose]);

  if (!isVisible) return null;

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <FaCheckCircle />;
      case 'error':
        return <FaTimesCircle />;
      case 'warning':
        return <FaExclamationTriangle />;
      case 'info':
        return <FaInfoCircle />;
      default:
        return <FaInfoCircle />;
    }
  };

  const getBackgroundColor = () => {
    switch (type) {
      case 'success':
        return '#10b981';
      case 'error':
        return '#ef4444';
      case 'warning':
        return '#f59e0b';
      case 'info':
        return '#3b82f6';
      default:
        return '#3b82f6';
    }
  };

  return (
    <ToastContainer $type={type} $backgroundColor={getBackgroundColor()}>
      <ToastIcon>{getIcon()}</ToastIcon>
      <ToastMessage>{message}</ToastMessage>
      <CloseButton onClick={onClose}>
        <FaTimesCircle />
      </CloseButton>
    </ToastContainer>
  );
}

const slideIn = keyframes`
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
`;

const slideOut = keyframes`
  from {
    transform: translateX(0);
    opacity: 1;
  }
  to {
    transform: translateX(100%);
    opacity: 0;
  }
`;

const ToastContainer = styled.div<{ $type: ToastType; $backgroundColor: string }>`
  position: fixed;
  top: 20px;
  right: 20px;
  background: ${({ $backgroundColor }) => $backgroundColor};
  color: white;
  padding: 16px 20px;
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  display: flex;
  align-items: center;
  gap: 12px;
  z-index: 1001;
  min-width: 300px;
  max-width: 400px;
  animation: ${slideIn} 0.3s ease-out;
  
  &.closing {
    animation: ${slideOut} 0.3s ease-in;
  }
  
  @media (max-width: 600px) {
    right: 16px;
    left: 16px;
    min-width: auto;
    max-width: none;
  }
`;

const ToastIcon = styled.div`
  font-size: 20px;
  flex-shrink: 0;
`;

const ToastMessage = styled.div`
  flex: 1;
  font-weight: 500;
  line-height: 1.4;
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  color: white;
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  flex-shrink: 0;
  
  &:hover {
    background: rgba(255, 255, 255, 0.2);
  }
  
  svg {
    font-size: 16px;
  }
`;
