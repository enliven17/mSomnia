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
  isLoading: boolean;
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
  isLoading: false,
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
  },
  extraReducers: (builder) => {
    builder
      .addCase(syncOnChainMarkets.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(syncOnChainMarkets.fulfilled, (state, action: PayloadAction<Market[]>) => {
        state.isLoading = false;
        state.markets = action.payload;
        saveMarketsToStorage(state.markets);
      })
      .addCase(syncOnChainMarkets.rejected, (state) => {
        state.isLoading = false;
      });
  }
});

export const { addMarket, addBet, closeMarket, claimReward, setUserDefiQ } = marketsSlice.actions;

// On-chain marketleri çekip listeye yaz (txHash dahil)
export const syncOnChainMarkets = createAsyncThunk(
  'markets/syncOnChainMarkets',
  async (_, { dispatch, getState }) => {
    console.log('🔄 Starting on-chain market sync...');
    
    try {
      const onchain = await solidityClient.fetchOnChainMarkets();
      console.log('📡 Fetched on-chain markets:', onchain);
      
      if (onchain && onchain.length > 0) {
        // DEMO verisini tamamen zincir verisiyle değiştir
        const mapped: Market[] = onchain.map(m => {
          console.log(`🏪 Mapping market ${m.id}:`, { 
            title: m.title, 
            txHash: m.txHash,
            hasTxHash: !!m.txHash 
          });
          
          return {
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
          };
        });
        
        console.log('✅ Mapped markets with txHashes:', mapped.map(m => ({ id: m.id, txHash: m.txHash })));
        
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
        
        console.log('🎯 Final markets to be stored:', mapped.length);
        return mapped;
      } else {
        console.log('⚠️ No on-chain markets found, using fallback demo markets with txHashes');
        // Fallback demo markets with transaction hashes for testing - sadece 16 market
        const fallbackMarkets: Market[] = [
          {
            id: 'demo-1',
            title: 'Will Bitcoin reach $100k by end of 2024?',
            description: 'Bitcoin price prediction market for crypto enthusiasts',
            creatorId: '0x1234567890123456789012345678901234567890',
            createdAt: Date.now() - 86400000, // 1 day ago
            closesAt: Date.now() + 86400000 * 30, // 30 days from now
            initialPool: 100,
            minBet: 0.1,
            maxBet: 10,
            status: 'open',
            bets: [],
            txHash: '0x578faaf1f6e06db0ce634b67a71afc567f23a7f6913cbb5d16d09b777fa55ef6',
          },
          {
            id: 'demo-2',
            title: 'Will Ethereum 2.0 launch successfully?',
            description: 'Prediction on successful Ethereum upgrade completion',
            creatorId: '0x2345678901234567890123456789012345678901',
            createdAt: Date.now() - 172800000, // 2 days ago
            closesAt: Date.now() + 86400000 * 60, // 60 days from now
            initialPool: 200,
            minBet: 0.5,
            maxBet: 20,
            status: 'open',
            bets: [],
            txHash: '0x08e456bf38295ab13f2c0c24ddacf0e12c383384f39953c70a50a4060faf4401',
          },
          {
            id: 'demo-3',
            title: 'Will AI replace 50% of jobs by 2030?',
            description: 'Controversial prediction about AI impact on employment',
            creatorId: '0x3456789012345678901234567890123456789012',
            createdAt: Date.now() - 259200000, // 3 days ago
            closesAt: Date.now() + 86400000 * 365, // 1 year from now
            initialPool: 150,
            minBet: 0.1,
            maxBet: 15,
            status: 'open',
            bets: [],
            txHash: '0x978bf9cafe42b2b99c22fca654aa9084522a358c3a6b7cf808c2e68da0862f7c',
          },
          {
            id: 'demo-4',
            title: 'Will Tesla deliver 2M vehicles in 2024?',
            description: 'Tesla vehicle delivery prediction for 2024',
            creatorId: '0x4567890123456789012345678901234567890123',
            createdAt: Date.now() - 345600000, // 4 days ago
            closesAt: Date.now() + 86400000 * 180, // 6 months from now
            initialPool: 250,
            minBet: 0.2,
            maxBet: 25,
            status: 'open',
            bets: [],
            txHash: '0x9b23e9ad9ab4fb6f2ac5d2fe22b4fe085483046505e2fb1903060cac56339ba9',
          },
          {
            id: 'demo-5',
            title: 'Will Apple release AR glasses in 2024?',
            description: 'Apple AR product launch prediction',
            creatorId: '0x5678901234567890123456789012345678901234',
            createdAt: Date.now() - 432000000, // 5 days ago
            closesAt: Date.now() + 86400000 * 90, // 3 months from now
            initialPool: 180,
            minBet: 0.1,
            maxBet: 18,
            status: 'open',
            bets: [],
            txHash: '0x31862ef548e35faf206b8847940c958d2f17d6f509ec0530f1800c3e13cc0e69',
          },
          {
            id: 'demo-6',
            title: 'Will Netflix reach 250M subscribers?',
            description: 'Netflix subscriber growth prediction',
            creatorId: '0x6789012345678901234567890123456789012345',
            createdAt: Date.now() - 518400000, // 6 days ago
            closesAt: Date.now() + 86400000 * 120, // 4 months from now
            initialPool: 120,
            minBet: 0.05,
            maxBet: 12,
            status: 'open',
            bets: [],
            txHash: '0x1f2b10a921c5fb250ef4f4a491270ca0ca9f7da79df0c6714a26877683185f52',
          },
          {
            id: 'demo-7',
            title: 'Will Meta launch new VR headset?',
            description: 'Meta VR product launch prediction',
            creatorId: '0x7890123456789012345678901234567890123456',
            createdAt: Date.now() - 604800000, // 7 days ago
            closesAt: Date.now() + 86400000 * 150, // 5 months from now
            initialPool: 160,
            minBet: 0.1,
            maxBet: 16,
            status: 'open',
            bets: [],
            txHash: '0x2e3c0f662c94fa692922d261a559d9720c7c92707a41ff55debf206ded65ae29',
          },
          {
            id: 'demo-8',
            title: 'Will Google release new AI model?',
            description: 'Google AI model release prediction',
            creatorId: '0x8901234567890123456789012345678901234567',
            createdAt: Date.now() - 691200000, // 8 days ago
            closesAt: Date.now() + 86400000 * 200, // 7 months from now
            initialPool: 220,
            minBet: 0.2,
            maxBet: 22,
            status: 'open',
            bets: [],
            txHash: '0x3bc7f20c8e2a0d13034b297ec8bb38433c5ff6c353bdb951ea8804c3e250d8e2',
          },
          {
            id: 'demo-9',
            title: 'Will Microsoft acquire new gaming studio?',
            description: 'Microsoft gaming acquisition prediction',
            creatorId: '0x9012345678901234567890123456789012345678',
            createdAt: Date.now() - 777600000, // 9 days ago
            closesAt: Date.now() + 86400000 * 240, // 8 months from now
            initialPool: 140,
            minBet: 0.1,
            maxBet: 14,
            status: 'open',
            bets: [],
            txHash: '0x90c8e3999c041fdd720cda32c8addeac2870e039acc1ed40739cd4284af945e6',
          },
          {
            id: 'demo-10',
            title: 'Will Amazon launch new drone delivery?',
            description: 'Amazon drone delivery service prediction',
            creatorId: '0xa012345678901234567890123456789012345678',
            createdAt: Date.now() - 864000000, // 10 days ago
            closesAt: Date.now() + 86400000 * 300, // 10 months from now
            initialPool: 190,
            minBet: 0.15,
            maxBet: 19,
            status: 'open',
            bets: [],
            txHash: '0x76d48435cecac86d81170b19eaec3d3b0aeeeb71b8d3523c97e6d97b693d942d',
          },
          {
            id: 'demo-11',
            title: 'Will Twitter/X reach 600M users?',
            description: 'Twitter/X user growth prediction',
            creatorId: '0xb012345678901234567890123456789012345678',
            createdAt: Date.now() - 950400000, // 11 days ago
            closesAt: Date.now() + 86400000 * 180, // 6 months from now
            initialPool: 110,
            minBet: 0.05,
            maxBet: 11,
            status: 'open',
            bets: [],
            txHash: '0x9142d0173171fd13132eb1f7c3896ef9045c137faaf0d9e68733ffe01de097b5',
          },
          {
            id: 'demo-12',
            title: 'Will Spotify launch new podcast feature?',
            description: 'Spotify podcast feature prediction',
            creatorId: '0xc012345678901234567890123456789012345678',
            createdAt: Date.now() - 1036800000, // 12 days ago
            closesAt: Date.now() + 86400000 * 120, // 4 months from now
            initialPool: 130,
            minBet: 0.1,
            maxBet: 13,
            status: 'open',
            bets: [],
            txHash: '0x670d7236f455e69154921697294e36cdfe790402f2e7e74034cd9f2894d214af',
          },
          {
            id: 'demo-13',
            title: 'Will Disney+ reach 200M subscribers?',
            description: 'Disney+ subscriber growth prediction',
            creatorId: '0xd012345678901234567890123456789012345678',
            createdAt: Date.now() - 1123200000, // 13 days ago
            closesAt: Date.now() + 86400000 * 240, // 8 months from now
            initialPool: 170,
            minBet: 0.15,
            maxBet: 17,
            status: 'open',
            bets: [],
            txHash: '0xc78ff267847b2c6e487463579433f8f0e16ece4fb3d3fe8f039122acd6ebe1b5',
          },
          {
            id: 'demo-14',
            title: 'Will Uber launch flying taxi service?',
            description: 'Uber flying taxi service prediction',
            creatorId: '0xe012345678901234567890123456789012345678',
            createdAt: Date.now() - 1209600000, // 14 days ago
            closesAt: Date.now() + 86400000 * 365, // 1 year from now
            initialPool: 300,
            minBet: 0.25,
            maxBet: 30,
            status: 'open',
            bets: [],
            txHash: '0xdd83fd802fedf2237470a1c28193da96a19f39159727249d5a077cf5b7268335',
          },
          {
            id: 'demo-15',
            title: 'Will Airbnb launch long-term rental service?',
            description: 'Airbnb long-term rental prediction',
            creatorId: '0xf012345678901234567890123456789012345678',
            createdAt: Date.now() - 1296000000, // 15 days ago
            closesAt: Date.now() + 86400000 * 180, // 6 months from now
            initialPool: 150,
            minBet: 0.1,
            maxBet: 15,
            status: 'open',
            bets: [],
            txHash: '0xa13c51c2b22466b45ad45daf1e177a58bdec3a966e660917e04e29311acfbf0f',
          },
          {
            id: 'demo-16',
            title: 'Will Zoom launch new collaboration tools?',
            description: 'Zoom collaboration tools prediction',
            creatorId: '0x0012345678901234567890123456789012345678',
            createdAt: Date.now() - 1382400000, // 16 days ago
            closesAt: Date.now() + 86400000 * 150, // 5 months from now
            initialPool: 120,
            minBet: 0.08,
            maxBet: 12,
            status: 'open',
            bets: [],
            txHash: '0x2a6d1629b62a3c4888de496ce2531d65eecb83b1614a94364f7101961da613a7',
          }
        ];
        
        console.log('🎭 Using fallback demo markets (16 markets):', fallbackMarkets);
        return fallbackMarkets;
      }
    } catch (error) {
      console.error('❌ Error in syncOnChainMarkets:', error);
      console.log('🎭 Using fallback demo markets due to error');
      
      // Fallback demo markets with transaction hashes - sadece 16 market
      const fallbackMarkets: Market[] = [
        {
          id: 'fallback-1',
          title: 'Will SpaceX land on Mars in 2025?',
          description: 'Space exploration prediction market',
          creatorId: '0x4567890123456789012345678901234567890123',
          createdAt: Date.now() - 86400000,
          closesAt: Date.now() + 86400000 * 365,
          initialPool: 300,
          minBet: 1,
          maxBet: 50,
          status: 'open',
          bets: [],
          txHash: '0x9b23e9ad9ab4fb6f2ac5d2fe22b4fe085483046505e2fb1903060cac56339ba9',
        },
        {
          id: 'fallback-2',
          title: 'Will Neuralink launch human trials?',
          description: 'Neuralink human trial prediction',
          creatorId: '0x5678901234567890123456789012345678901234',
          createdAt: Date.now() - 172800000,
          closesAt: Date.now() + 86400000 * 730,
          initialPool: 400,
          minBet: 2,
          maxBet: 100,
          status: 'open',
          bets: [],
          txHash: '0x31862ef548e35faf206b8847940c958d2f17d6f509ec0530f1800c3e13cc0e69',
        },
        {
          id: 'fallback-3',
          title: 'Will OpenAI release GPT-5?',
          description: 'OpenAI GPT-5 release prediction',
          creatorId: '0x6789012345678901234567890123456789012345',
          createdAt: Date.now() - 259200000,
          closesAt: Date.now() + 86400000 * 180,
          initialPool: 250,
          minBet: 0.5,
          maxBet: 25,
          status: 'open',
          bets: [],
          txHash: '0x1f2b10a921c5fb250ef4f4a491270ca0ca9f7da79df0c6714a26877683185f52',
        },
        {
          id: 'fallback-4',
          title: 'Will Palantir reach $50B market cap?',
          description: 'Palantir market cap prediction',
          creatorId: '0x7890123456789012345678901234567890123456',
          createdAt: Date.now() - 345600000,
          closesAt: Date.now() + 86400000 * 365,
          initialPool: 180,
          minBet: 0.1,
          maxBet: 18,
          status: 'open',
          bets: [],
          txHash: '0x2e3c0f662c94fa692922d261a559d9720c7c92707a41ff55debf206ded65ae29',
        },
        {
          id: 'fallback-5',
          title: 'Will Coinbase list new major token?',
          description: 'Coinbase new token listing prediction',
          creatorId: '0x8901234567890123456789012345678901234567',
          createdAt: Date.now() - 432000000,
          closesAt: Date.now() + 86400000 * 90,
          initialPool: 120,
          minBet: 0.05,
          maxBet: 12,
          status: 'open',
          bets: [],
          txHash: '0x3bc7f20c8e2a0d13034b297ec8bb38433c5ff6c353bdb951ea8804c3e250d8e2',
        },
        {
          id: 'fallback-6',
          title: 'Will Binance launch new DeFi product?',
          description: 'Binance DeFi product launch prediction',
          creatorId: '0x9012345678901234567890123456789012345678',
          createdAt: Date.now() - 518400000,
          closesAt: Date.now() + 86400000 * 120,
          initialPool: 160,
          minBet: 0.1,
          maxBet: 16,
          status: 'open',
          bets: [],
          txHash: '0x90c8e3999c041fdd720cda32c8addeac2870e039acc1ed40739cd4284af945e6',
        },
        {
          id: 'fallback-7',
          title: 'Will Kraken add new trading pairs?',
          description: 'Kraken new trading pairs prediction',
          creatorId: '0xa012345678901234567890123456789012345678',
          createdAt: Date.now() - 604800000,
          closesAt: Date.now() + 86400000 * 60,
          initialPool: 90,
          minBet: 0.05,
          maxBet: 9,
          status: 'open',
          bets: [],
          txHash: '0x76d48435cecac86d81170b19eaec3d3b0aeeeb71b8d3523c97e6d97b693d942d',
        },
        {
          id: 'fallback-8',
          title: 'Will FTX recover and relaunch?',
          description: 'FTX recovery and relaunch prediction',
          creatorId: '0xb012345678901234567890123456789012345678',
          createdAt: Date.now() - 691200000,
          closesAt: Date.now() + 86400000 * 730,
          initialPool: 500,
          minBet: 1,
          maxBet: 100,
          status: 'open',
          bets: [],
          txHash: '0x9142d0173171fd13132eb1f7c3896ef9045c137faaf0d9e68733ffe01de097b5',
        },
        {
          id: 'fallback-9',
          title: 'Will Celsius Network resume operations?',
          description: 'Celsius Network operations resumption prediction',
          creatorId: '0xc012345678901234567890123456789012345678',
          createdAt: Date.now() - 777600000,
          closesAt: Date.now() + 86400000 * 365,
          initialPool: 200,
          minBet: 0.2,
          maxBet: 20,
          status: 'open',
          bets: [],
          txHash: '0x670d7236f455e69154921697294e36cdfe790402f2e7e74034cd9f2894d214af',
        },
        {
          id: 'fallback-10',
          title: 'Will Voyager Digital return user funds?',
          description: 'Voyager Digital user fund return prediction',
          creatorId: '0xd012345678901234567890123456789012345678',
          createdAt: Date.now() - 864000000,
          closesAt: Date.now() + 86400000 * 180,
          initialPool: 150,
          minBet: 0.1,
          maxBet: 15,
          status: 'open',
          bets: [],
          txHash: '0xc78ff267847b2c6e487463579433f8f0e16ece4fb3d3fe8f039122acd6ebe1b5',
        },
        {
          id: 'fallback-11',
          title: 'Will BlockFi resume withdrawals?',
          description: 'BlockFi withdrawal resumption prediction',
          creatorId: '0xe012345678901234567890123456789012345678',
          createdAt: Date.now() - 950400000,
          closesAt: Date.now() + 86400000 * 120,
          initialPool: 110,
          minBet: 0.05,
          maxBet: 11,
          status: 'open',
          bets: [],
          txHash: '0xdd83fd802fedf2237470a1c28193da96a19f39159727249d5a077cf5b7268335',
        },
        {
          id: 'fallback-12',
          title: 'Will Genesis Trading resume operations?',
          description: 'Genesis Trading operations resumption prediction',
          creatorId: '0xf012345678901234567890123456789012345678',
          createdAt: Date.now() - 1036800000,
          closesAt: Date.now() + 86400000 * 240,
          initialPool: 180,
          minBet: 0.15,
          maxBet: 18,
          status: 'open',
          bets: [],
          txHash: '0xa13c51c2b22466b45ad45daf1e177a58bdec3a966e660917e04e29311acfbf0f',
        },
        {
          id: 'fallback-13',
          title: 'Will Three Arrows Capital return?',
          description: 'Three Arrows Capital return prediction',
          creatorId: '0x0012345678901234567890123456789012345678',
          createdAt: Date.now() - 1123200000,
          closesAt: Date.now() + 86400000 * 365,
          initialPool: 250,
          minBet: 0.2,
          maxBet: 25,
          status: 'open',
          bets: [],
          txHash: '0x2a6d1629b62a3c4888de496ce2531d65eecb83b1614a94364f7101961da613a7',
        },
        {
          id: 'fallback-14',
          title: 'Will Terra Luna Classic reach $1?',
          description: 'Terra Luna Classic price prediction',
          creatorId: '0x1012345678901234567890123456789012345678',
          createdAt: Date.now() - 1209600000,
          closesAt: Date.now() + 86400000 * 180,
          initialPool: 100,
          minBet: 0.01,
          maxBet: 10,
          status: 'open',
          bets: [],
          txHash: '0x578faaf1f6e06db0ce634b67a71afc567f23a7f6913cbb5d16d09b777fa55ef6',
        },
        {
          id: 'fallback-15',
          title: 'Will Solana reach $200 again?',
          description: 'Solana price recovery prediction',
          creatorId: '0x2012345678901234567890123456789012345678',
          createdAt: Date.now() - 1296000000,
          closesAt: Date.now() + 86400000 * 120,
          initialPool: 140,
          minBet: 0.1,
          maxBet: 14,
          status: 'open',
          bets: [],
          txHash: '0x08e456bf38295ab13f2c0c24ddacf0e12c383384f39953c70a50a4060faf4401',
        },
        {
          id: 'fallback-16',
          title: 'Will Cardano launch smart contracts?',
          description: 'Cardano smart contract launch prediction',
          creatorId: '0x3012345678901234567890123456789012345678',
          createdAt: Date.now() - 1382400000,
          closesAt: Date.now() + 86400000 * 90,
          initialPool: 80,
          minBet: 0.05,
          maxBet: 8,
          status: 'open',
          bets: [],
          txHash: '0x978bf9cafe42b2b99c22fca654aa9084522a358c3a6b7cf808c2e68da0862f7c',
        }
      ];
      
      return fallbackMarkets;
    }
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