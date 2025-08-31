import styled from "styled-components";
import { FaCheckCircle, FaExternalLinkAlt, FaTimes } from 'react-icons/fa';

interface BetSuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  betDetails: {
    side: 'yes' | 'no';
    amount: number;
    marketTitle: string;
    txHash: string;
  } | null;
}

export function BetSuccessModal({ isOpen, onClose, betDetails }: BetSuccessModalProps) {
  if (!isOpen || !betDetails) return null;

  const explorerUrl = betDetails.txHash 
    ? `https://shannon-explorer.somnia.network/tx/${betDetails.txHash}`
    : '#';
  const shortTx = betDetails.txHash 
    ? `${betDetails.txHash.slice(0, 6)}...${betDetails.txHash.slice(-4)}`
    : 'Pending...';

  return (
    <ModalOverlay onClick={onClose}>
      <ModalContent onClick={(e) => e.stopPropagation()}>
        <CloseButton onClick={onClose}>
          <FaTimes />
        </CloseButton>
        
        <SuccessIcon>
          <FaCheckCircle />
        </SuccessIcon>
        
        <Title>Bet Placed Successfully! 🎉</Title>
        
        <SuccessMessage>
          You've successfully placed a bet on "{betDetails.marketTitle}"
        </SuccessMessage>
        
        <BetDetails>
          <DetailRow>
            <DetailLabel>Market:</DetailLabel>
            <DetailValue>{betDetails.marketTitle}</DetailValue>
          </DetailRow>
          
          <DetailRow>
            <DetailLabel>Side:</DetailLabel>
            <DetailValue>
              <SideBadge $side={betDetails.side}>
                {betDetails.side.toUpperCase()}
              </SideBadge>
            </DetailValue>
          </DetailRow>
          
          <DetailRow>
            <DetailLabel>Amount:</DetailLabel>
            <DetailValue>
              <AmountValue>{betDetails.amount} STT</AmountValue>
            </DetailValue>
          </DetailRow>
        </BetDetails>
        
        {betDetails.txHash && (
          <TransactionSection>
            <TxLabel>Transaction Hash:</TxLabel>
            <TxHash>
              <TxText>{shortTx}</TxText>
              <TxLink href={explorerUrl} target="_blank" rel="noopener noreferrer">
                <FaExternalLinkAlt />
              </TxLink>
            </TxHash>
          </TransactionSection>
        )}
        
        <ActionButtons>
          {betDetails.txHash ? (
            <ViewTxButton href={explorerUrl} target="_blank" rel="noopener noreferrer">
              View on Explorer
            </ViewTxButton>
          ) : (
            <ViewTxButton as="button" disabled>
              Transaction Pending...
            </ViewTxButton>
          )}
          <CloseModalButton onClick={onClose}>
            Close
          </CloseModalButton>
        </ActionButtons>
      </ModalContent>
    </ModalOverlay>
  );
}

const ModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  backdrop-filter: blur(4px);
`;

const ModalContent = styled.div`
  background: ${({ theme }) => theme.colors.card};
  border-radius: 24px;
  padding: 32px;
  max-width: 480px;
  width: 90%;
  position: relative;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  border: 1px solid ${({ theme }) => theme.colors.border};
  
  @media (max-width: 600px) {
    padding: 24px;
    margin: 20px;
  }
`;

const CloseButton = styled.button`
  position: absolute;
  top: 16px;
  right: 16px;
  background: none;
  border: none;
  color: ${({ theme }) => theme.colors.textSecondary};
  cursor: pointer;
  padding: 8px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  
  &:hover {
    background: ${({ theme }) => theme.colors.border};
    color: ${({ theme }) => theme.colors.text};
  }
`;

const SuccessIcon = styled.div`
  text-align: center;
  margin-bottom: 24px;
  
  svg {
    font-size: 64px;
    color: ${({ theme }) => theme.colors.accentGreen || '#10b981'};
  }
`;

const Title = styled.h2`
  text-align: center;
  margin: 0 0 24px 0;
  color: ${({ theme }) => theme.colors.text};
  font-size: 24px;
  font-weight: 700;
`;

const SuccessMessage = styled.p`
  text-align: center;
  margin: 0 0 24px 0;
  color: ${({ theme }) => theme.colors.textSecondary};
  font-size: 16px;
`;

const BetDetails = styled.div`
  background: ${({ theme }) => theme.colors.background};
  border-radius: 16px;
  padding: 20px;
  margin-bottom: 24px;
  border: 1px solid ${({ theme }) => theme.colors.border};
`;

const DetailRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  
  &:last-child {
    margin-bottom: 0;
  }
`;

const DetailLabel = styled.span`
  color: ${({ theme }) => theme.colors.textSecondary};
  font-weight: 500;
`;

const DetailValue = styled.span`
  color: ${({ theme }) => theme.colors.text};
  font-weight: 600;
`;

const AmountValue = styled.span`
  color: ${({ theme }) => theme.colors.accentGreen || '#10b981'};
  font-weight: 700;
  font-size: 18px;
`;

const SideBadge = styled.span<{ $side: 'yes' | 'no' }>`
  background: ${({ $side, theme }) => 
    $side === 'yes' 
      ? (theme.colors.accentGreen || '#10b981')
      : (theme.colors.accentRed || '#ef4444')
  };
  color: white;
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
`;

const TransactionSection = styled.div`
  background: ${({ theme }) => theme.colors.background};
  border-radius: 16px;
  padding: 20px;
  margin-bottom: 24px;
  border: 1px solid ${({ theme }) => theme.colors.border};
`;

const TxLabel = styled.div`
  color: ${({ theme }) => theme.colors.textSecondary};
  font-weight: 500;
  margin-bottom: 12px;
`;

const TxHash = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: ${({ theme }) => theme.colors.card};
  border-radius: 12px;
  padding: 12px 16px;
  border: 1px solid ${({ theme }) => theme.colors.border};
`;

const TxText = styled.span`
  font-family: 'Monaco', 'Menlo', monospace;
  color: ${({ theme }) => theme.colors.text};
  font-size: 14px;
`;

const TxLink = styled.a`
  color: ${({ theme }) => theme.colors.primary};
  text-decoration: none;
  padding: 4px;
  border-radius: 4px;
  transition: all 0.2s ease;
  
  &:hover {
    background: ${({ theme }) => theme.colors.primary};
    color: white;
  }
`;

const ActionButtons = styled.div`
  display: flex;
  gap: 12px;
  
  @media (max-width: 600px) {
    flex-direction: column;
  }
`;

const ViewTxButton = styled.a`
  flex: 1;
  background: ${({ theme }) => theme.colors.primary};
  color: white;
  text-decoration: none;
  padding: 14px 24px;
  border-radius: 12px;
  text-align: center;
  font-weight: 600;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  
  &:hover {
    background: ${({ theme }) => theme.colors.accentGreen || theme.colors.primary};
    transform: translateY(-2px);
  }
  
  &:disabled {
    background: ${({ theme }) => theme.colors.border};
    color: ${({ theme }) => theme.colors.textSecondary};
    cursor: not-allowed;
    transform: none;
  }
`;

const CloseModalButton = styled.button`
  flex: 1;
  background: ${({ theme }) => theme.colors.border};
  color: ${({ theme }) => theme.colors.text};
  border: none;
  padding: 14px 24px;
  border-radius: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover {
    background: ${({ theme }) => theme.colors.textSecondary};
    color: white;
  }
`;
