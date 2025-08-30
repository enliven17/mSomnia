import styled from "styled-components";
import { Market } from "@/types/market";
// Link kaldırıldı; kart detay sayfasına yönlendirme yok
import { useState } from "react";
import { FaClock, FaCheckCircle, FaTimesCircle, FaCoins, FaUsers, FaCalendarAlt, FaExternalLinkAlt } from 'react-icons/fa';
import { useWalletConnection } from '@/hooks/useWalletConnection';
import { useDispatch } from 'react-redux';
import { addBet } from '@/store/marketsSlice';
import { buyShares } from '@/api/solidityClient';

interface Props {
  market: Market;
  onClick?: () => void;
}



export function MarketCard({ market }: Props) {
  const { isConnected } = useWalletConnection();
  const [qty, setQty] = useState<number>(1);
  const [loading, setLoading] = useState<false | 'yes' | 'no'>(false);
  const dispatch = useDispatch();

  // Kart tıklamasında yönlendirme kaldırıldı
  const handleCardClick = (_e: React.MouseEvent) => {};

  const getStatusIcon = () => {
    if (market.status === "resolved") {
      return market.result === "yes" ? <FaCheckCircle /> : <FaTimesCircle />;
    }
    return <FaClock />;
  };

  const getStatusColor = () => {
    if (market.status === "resolved") {
      return market.result === "yes" ? "green" : "red";
    }
    return "blue";
  };

  const totalPool = market.initialPool + market.bets.reduce((sum, b) => sum + b.amount, 0);
  const totalBets = market.bets.length;
  const timeLeft = market.closesAt - Date.now();
  const daysLeft = Math.ceil(timeLeft / (1000 * 60 * 60 * 24));
  const yesSum = market.bets.filter(b => b.side === 'yes').reduce((s, b) => s + b.amount, 0);
  const noSum = market.bets.filter(b => b.side === 'no').reduce((s, b) => s + b.amount, 0);
  const volume = yesSum + noSum;
  const yesProb = volume > 0 ? Math.round((yesSum / volume) * 100) : 50;

  const explorerTxUrl = market.txHash
    ? `https://shannon-explorer.somnia.network/tx/${market.txHash}`
    : `https://shannon-explorer.somnia.network/address/${process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || '0xc0b33Cc720025dD0AcF56e249C8b76A6A34170B6'}`;
  const shortTx = market.txHash ? `${market.txHash.slice(0, 6)}...${market.txHash.slice(-4)}` : 'Contract';

  return (
    <Card onClick={handleCardClick}>
      {/* Always show transaction badge - if no txHash, show contract link */}
      <TxBadge onClick={(e) => e.stopPropagation()}>
        <a href={explorerTxUrl} target="_blank" rel="noopener noreferrer">
          <FaExternalLinkAlt style={{ marginRight: '4px', fontSize: '10px' }} />
          {market.txHash ? `TX: ${shortTx}` : 'View Contract'}
        </a>
      </TxBadge>
      <CardHeader>
        <StatusBadge $status={getStatusColor()}>
          {getStatusIcon()}
          {market.status === "open" ? "Open" : market.status === "resolved" ? (market.result === "yes" ? "Yes Won" : "No Won") : "Closed"}
        </StatusBadge>
        <TimeLeft>
          {market.status === "open" ? (
            <>
              <FaCalendarAlt />
              {daysLeft > 0 ? `${daysLeft} days left` : "Closing soon"}
            </>
          ) : (
            <>
              <FaCheckCircle />
              Resolved
            </>
          )}
        </TimeLeft>
      </CardHeader>
      <CardContent>
        <div style={{ cursor: "default" }}>
          <Title>{market.title}</Title>
          <Description>{market.description}</Description>
        </div>
        <StatsRow>
          <Stat>
            <StatIcon>
              <FaCoins />
            </StatIcon>
            <StatContent>
              <StatValue>{totalPool.toFixed(2)} STT</StatValue>
              <StatLabel>Total Pool</StatLabel>
            </StatContent>
          </Stat>
          <Stat>
            <StatIcon>
              <FaUsers />
            </StatIcon>
            <StatContent>
              <StatValue>{totalBets}</StatValue>
              <StatLabel>Bets</StatLabel>
            </StatContent>
          </Stat>
        </StatsRow>
        <InfoRow>
          <Info>
            <InfoLabel>YES Price</InfoLabel>
            <InfoValue>0.5 STT</InfoValue>
          </Info>
          <Info>
            <InfoLabel>NO Price</InfoLabel>
            <InfoValue>0.5 STT</InfoValue>
          </Info>
        </InfoRow>

        <BuyRow>
          <QtyInput type="number" min={1} value={qty} onChange={(e) => setQty(Math.max(1, Number(e.target.value)))} />
          <BuyButton disabled={!isConnected || loading !== false || ((window as any).ethereum?.selectedAddress?.toLowerCase() === (market as any).creatorId?.toLowerCase())} onClick={async (e) => { e.stopPropagation(); try { setLoading('yes'); const receipt = await buyShares(Number(market.id), true, qty); dispatch(addBet({ id: `${market.id}-yes-${Date.now()}`, userId: (window as any).ethereum?.selectedAddress || 'me', marketId: String(market.id), amount: qty * 0.5, side: 'yes', timestamp: Date.now() })); } finally { setLoading(false); } }}>Buy YES</BuyButton>
          <BuyButton disabled={!isConnected || loading !== false || ((window as any).ethereum?.selectedAddress?.toLowerCase() === (market as any).creatorId?.toLowerCase())} onClick={async (e) => { e.stopPropagation(); try { setLoading('no'); const receipt = await buyShares(Number(market.id), false, qty); dispatch(addBet({ id: `${market.id}-no-${Date.now()}`, userId: (window as any).ethereum?.selectedAddress || 'me', marketId: String(market.id), amount: qty * 0.5, side: 'no', timestamp: Date.now() })); } finally { setLoading(false); } }}>Buy NO</BuyButton>
        </BuyRow>
        <QuickRow>
          {[1,5,10,20].map(v => (
            <QuickBtn key={v} onClick={(e)=>{ e.stopPropagation(); setQty(v); }}>{v}</QuickBtn>
          ))}
        </QuickRow>
      </CardContent>
      <CardFooter>
        <ProbRow>
          <ProbLabel>Estimated YES probability</ProbLabel>
          <ProbValue>{yesProb}%</ProbValue>
        </ProbRow>
      </CardFooter>
    </Card>
  );
}

const Card = styled.div`
  background: ${({ theme }) => theme.colors.card};
  border-radius: 20px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.08);
  border: 1px solid ${({ theme }) => theme.colors.border};
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  flex-direction: column;
  overflow: visible;
  position: relative;
  z-index: 1;
  will-change: transform;
  transform: translateZ(0);
  
  &:hover {
    transform: translateY(-4px) translateZ(0);
    box-shadow: 0 12px 32px rgba(0,0,0,0.15);
  }
  
  @media (max-width: 600px) {
    border-radius: 16px;
  }
`;

const TxBadge = styled.div`
  position: absolute;
  top: 14px;
  left: 50%;
  transform: translateX(-50%);
  background: ${({ theme }) => theme.colors.primary};
  color: #fff;
  border-radius: 10px;
  padding: 6px 12px;
  font-size: 11px;
  font-weight: 800;
  line-height: 1;
  z-index: 10;
  box-shadow: 0 4px 12px rgba(0,0,0,0.3);
  border: 2px solid #fff;
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover {
    transform: translateX(-50%) translateY(-2px);
    box-shadow: 0 6px 16px rgba(0,0,0,0.4);
    background: ${({ theme }) => theme.colors.accentGreen || theme.colors.primary};
  }
  
  a { 
    color: #fff; 
    text-decoration: none;
    display: flex;
    align-items: center;
    white-space: nowrap;
  }
`;

const CardHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px 16px 24px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  @media (max-width: 600px) {
    padding: 16px 20px 12px 20px;
  }
`;

const StatusBadge = styled.div<{ $status: string }>`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  
  background: ${({ $status, theme }) => {
    if ($status === "green") return `${theme.colors.accentGreen}20`;
    if ($status === "red") return `${theme.colors.accentRed}20`;
    return `${theme.colors.primary}20`;
  }};
  
  color: ${({ $status, theme }) => {
    if ($status === "green") return theme.colors.accentGreen;
    if ($status === "red") return theme.colors.accentRed;
    return theme.colors.primary;
  }};
  
  svg {
    font-size: 12px;
  }
`;

const TimeLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  color: ${({ theme }) => theme.colors.textSecondary};
  font-size: 12px;
  font-weight: 500;
  
  svg {
    font-size: 12px;
  }
`;

const CardContent = styled.div`
  padding: 20px 24px;
  flex: 1;
  @media (max-width: 600px) {
    padding: 16px 20px;
  }
`;

const Title = styled.h3`
  color: ${({ theme }) => theme.colors.primary};
  margin: 0 0 8px 0;
  font-size: 1.2rem;
  font-weight: 600;
  line-height: 1.4;
  @media (max-width: 600px) {
    font-size: 1.1rem;
    margin-bottom: 6px;
  }
`;

const Description = styled.p`
  color: ${({ theme }) => theme.colors.textSecondary};
  margin: 0 0 20px 0;
  font-size: 14px;
  line-height: 1.5;
  @media (max-width: 600px) {
    font-size: 13px;
    margin-bottom: 16px;
  }
`;

const StatsRow = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin-bottom: 20px;
  @media (max-width: 600px) {
    gap: 12px;
    margin-bottom: 16px;
  }
`;

const Stat = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: ${({ theme }) => theme.colors.background};
  border-radius: 12px;
  @media (max-width: 600px) {
    padding: 10px;
    gap: 8px;
  }
`;

const StatIcon = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  background: ${({ theme }) => `${theme.colors.primary}20`};
  color: ${({ theme }) => theme.colors.primary};
  border-radius: 8px;
  font-size: 14px;
  flex-shrink: 0;
  @media (max-width: 600px) {
    width: 28px;
    height: 28px;
    font-size: 12px;
  }
`;

const StatContent = styled.div`
  flex: 1;
`;

const StatValue = styled.div`
  color: ${({ theme }) => theme.colors.primary};
  font-size: 16px;
  font-weight: 700;
  margin-bottom: 2px;
  @media (max-width: 600px) {
    font-size: 14px;
  }
`;

const StatLabel = styled.div`
  color: ${({ theme }) => theme.colors.textSecondary};
  font-size: 11px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  @media (max-width: 600px) {
    font-size: 10px;
  }
`;

const InfoRow = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  @media (max-width: 600px) {
    gap: 12px;
  }
`;

const Info = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const InfoLabel = styled.span`
  color: ${({ theme }) => theme.colors.textSecondary};
  font-size: 11px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const InfoValue = styled.span`
  color: ${({ theme }) => theme.colors.text};
  font-size: 14px;
  font-weight: 600;
  @media (max-width: 600px) {
    font-size: 13px;
  }
`;

const CardFooter = styled.div`
  padding: 20px 24px;
  border-top: 1px solid ${({ theme }) => theme.colors.border};
  @media (max-width: 600px) {
    padding: 16px 20px;
  }
`;

const BuyRow = styled.div`
  display: grid;
  grid-template-columns: 120px 1fr 1fr;
  gap: 12px;
  margin-top: 16px;
`;

const QtyInput = styled.input`
  padding: 12px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 10px;
  background: ${({ theme }) => theme.colors.background};
  color: ${({ theme }) => theme.colors.text};
`;

const BuyButton = styled.button`
  background: ${({ theme }) => theme.colors.primary};
  color: white;
  border: none;
  border-radius: 12px;
  padding: 12px 16px;
  font-weight: 700;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s ease;
  &:disabled { opacity: 0.5; cursor: not-allowed; }
`;

const QuickRow = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
  margin-top: 10px;
`;

const QuickBtn = styled.button`
  background: ${({ theme }) => theme.colors.card};
  color: ${({ theme }) => theme.colors.primary};
  border: 1px solid ${({ theme }) => theme.colors.primary}33;
  border-radius: 12px;
  padding: 10px 0;
  font-size: 14px;
  font-weight: 800;
  cursor: pointer;
  width: 100%;
  &:hover { background: ${({ theme }) => `${theme.colors.primary}15`}; border-color: ${({ theme }) => theme.colors.primary}; }
`;

const ProbRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const ProbLabel = styled.span`
  color: ${({ theme }) => theme.colors.textSecondary};
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
`;

const ProbValue = styled.span`
  color: ${({ theme }) => theme.colors.primary};
  font-size: 14px;
  font-weight: 800;
`;

const DisabledButton = styled.button`
  flex: 1;
  background: ${({ theme }) => theme.colors.border};
  color: ${({ theme }) => theme.colors.textSecondary};
  border: none;
  border-radius: 12px;
  padding: 14px 0;
  font-weight: 600;
  font-size: 14px;
  cursor: not-allowed;
  opacity: 0.6;
  
  @media (max-width: 600px) {
    padding: 12px 0;
    font-size: 13px;
  }
`;

 