import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { Market, Bet, MarketStatus, BetSide } from "@/types/market";
import { AppDispatch, RootState } from './index';

import { createAsyncThunk } from '@reduxjs/toolkit';
import solidityClient from '@/api/solidityClient';

// Demo verileri kaldırıldı, başlangıç boş
const initialMarkets: Market[] = [];

interface ClaimableReward {
  userId: string;
  marketId: string;
  amount: number;
  claimed: boolean;
}

interface MarketsState {
  markets: Market[];
  claimableRewards: ClaimableReward[];
  userDefiQ: Record<string, number>; // address -> DEFiq puanı
}

// localStorage'dan markets yükle
function loadMarketsFromStorage() {
  if (typeof window === 'undefined') return null;
  try {
    const stored = localStorage.getItem('umiq_markets');
    return stored ? JSON.parse(stored) : null;
  } catch (e) {
    return null;
  }
}

// localStorage'a markets kaydet
function saveMarketsToStorage(markets: Market[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem('umiq_markets', JSON.stringify(markets));
  } catch (e) {}
}

// Artık localStorage temizlenmiyor; kullanıcı bahisleri kalıcı

const initialState: MarketsState = {
  markets: [],
  claimableRewards: [],
  userDefiQ: {
    // Demo kullanıcılar için temsili DEFiq puanları
    "user1": 85,
    "user2": 120,
    "user3": 65,
    "user4": 95,
    "user5": 150,
    "user6": 75,
    "user7": 110,
    "user8": 45,
  },
};

const marketsSlice = createSlice({
  name: "markets",
  initialState,
  reducers: {
    addMarket(state, action: PayloadAction<Market>) {
      state.markets = [action.payload, ...state.markets];
      saveMarketsToStorage(state.markets);
    },
    setMarkets(state, action: PayloadAction<Market[]>) {
      state.markets = action.payload;
      saveMarketsToStorage(state.markets);
    },
    addBet(state, action: PayloadAction<Bet>) {
      const market = state.markets.find(m => m.id === action.payload.marketId);
      if (market) {
        market.bets = [...market.bets, action.payload];
        saveMarketsToStorage(state.markets);
      }
    },
    closeMarket(state, action: PayloadAction<{ marketId: string; result: BetSide }>) {
      const market = state.markets.find(m => m.id === action.payload.marketId);
      if (market) {
        market.status = "resolved";
        market.result = action.payload.result;
        saveMarketsToStorage(state.markets);
        // Payout hesapla
        const totalPool = market.initialPool + market.bets.reduce((sum, b) => sum + b.amount, 0);
        const winners = market.bets.filter(b => b.side === action.payload.result);
        const totalWinnerBet = winners.reduce((sum, b) => sum + b.amount, 0);
        if (totalWinnerBet > 0) {
          winners.forEach(bet => {
            const pay = (bet.amount / totalWinnerBet) * totalPool;
            state.claimableRewards.push({
              userId: bet.userId,
              marketId: market.id,
              amount: pay,
              claimed: false
            });
            // DEFiq puanını güncelle (ör: +10 her kazanç için)
            if (!state.userDefiQ[bet.userId]) state.userDefiQ[bet.userId] = 0;
            state.userDefiQ[bet.userId] += 10;
          });
        }
      }
    },
    claimReward(state, action: PayloadAction<{ userId: string; marketId: string }>) {
      const reward = state.claimableRewards.find(r => r.userId === action.payload.userId && r.marketId === action.payload.marketId && !r.claimed);
      if (reward) {
        reward.claimed = true;
      }
    },
    setUserDefiQ(state, action: PayloadAction<{ address: string; score: number }>) {
      state.userDefiQ[action.payload.address] = action.payload.score;
    }
  }
});

export const { addMarket, addBet, closeMarket, claimReward, setUserDefiQ } = marketsSlice.actions;

// On-chain marketleri çekip listeye yaz (txHash dahil)
export const syncOnChainMarkets = createAsyncThunk(
  'markets/syncOnChainMarkets',
  async (_, { dispatch, getState }) => {
    const onchain = await solidityClient.fetchOnChainMarkets();
    // DEMO verisini tamamen zincir verisiyle değiştir
    const mapped: Market[] = onchain.map(m => ({
      id: String(m.id),
      title: m.title,
      description: m.description,
      creatorId: m.creator || 'onchain',
      createdAt: m.createdAt * 1000,
      closesAt: m.closesAt * 1000,
      initialPool: 0,
      minBet: 0,
      maxBet: 0,
      status: 'open',
      bets: [],
      txHash: m.txHash,
    }));
    // localStorage'daki bahisleri geri yükle
    try {
      const stored = loadMarketsFromStorage();
      if (stored && Array.isArray(stored)) {
        const betMap: Record<string, any[]> = {};
        stored.forEach((sm: any) => {
          if (Array.isArray(sm.bets) && sm.bets.length) betMap[sm.id] = sm.bets;
        });
        mapped.forEach(m => {
          if (betMap[m.id]) m.bets = betMap[m.id];
        });
      }
    } catch {}
    dispatch(marketsSlice.actions.setMarkets(mapped));
  }
);

// Marketi kapatıp ödülleri otomatik dağıtan thunk
export const closeMarketAndDistributeRewards = createAsyncThunk(
  'markets/closeMarketAndDistributeRewards',
  async ({ marketId, result }: { marketId: string; result: BetSide }, { dispatch, getState }) => {
    // 1. Marketi kapat
    dispatch(closeMarket({ marketId, result }));
    // 2. Kazananlara ödül miktarını ekle
    const state = getState() as RootState;
    const market = state.markets.markets.find(m => m.id === marketId);
    if (!market) return;
    const totalPool = market.initialPool + market.bets.reduce((sum, b) => sum + b.amount, 0);
    const winners = market.bets.filter(b => b.side === result);
    const totalWinnerBet = winners.reduce((sum, b) => sum + b.amount, 0);
    if (totalWinnerBet > 0) {
              winners.forEach(bet => {
          const pay = (bet.amount / totalWinnerBet) * totalPool;
          // Note: Rewards are now handled by smart contract
          console.log(`Reward calculated for ${bet.userId}: ${pay} ETH`);
        });
    }
  }
);

export default marketsSlice.reducer;
export type { ClaimableReward }; 