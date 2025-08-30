import { ethers } from 'ethers';
import { txFallbackMap } from '@/constants/txFallback';

// Environment
const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || '0x5FbDB2315678afecb367f032d93F642f64180aa3';
const RPC_URL = process.env.NEXT_PUBLIC_SOMNIA_RPC || 'https://dream-rpc.somnia.network/';
const EXPLORER_TX = 'https://shannon-explorer.somnia.network/tx/';

console.log('🔧 SolidityClient config:', {
  CONTRACT_ADDRESS,
  RPC_URL,
  EXPLORER_TX
});

// Minimal ABI for SimpleSomniaMarket (deployed)
const ABI = [
  // events
  'event MarketCreated(uint256 indexed marketId, address indexed creator, string title)',
  // writes
  'function placeBet(uint256 marketId, bool prediction) payable',
  // reads
  'function getMarket(uint256 marketId) view returns (tuple(uint256 id,address creator,string title,string description,uint256 closingTime,uint256 totalYesBets,uint256 totalNoBets,bool isResolved,bool outcome,bool isClosed))',
  'function getMarketCount() view returns (uint256)',
];

export interface OnChainMarket {
  id: number;
  title: string;
  description: string;
  closesAt: number;
  createdAt: number;
  creator: string;
  txHash?: string;
}

class SolidityClient {
  private provider: ethers.JsonRpcProvider;
  private contract: ethers.Contract;

  constructor() {
    this.provider = new ethers.JsonRpcProvider(RPC_URL);
    this.contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, this.provider);
  }

  getProvider(): ethers.JsonRpcProvider {
    return this.provider;
  }

  getContract(): ethers.Contract {
    return this.contract;
  }

  async fetchMarketCreatedTxMap(): Promise<Record<number, string>> {
    console.log('🗺️ Fetching MarketCreated event logs...');
    const map: Record<number, string> = {};
    try {
      const filter = {
        address: CONTRACT_ADDRESS,
        topics: [ethers.id('MarketCreated(uint256,address,string)')]
      };
      console.log('🔍 Filter:', filter);
      
      // Ethers v6: query via contract.queryFilter for better decoding
      const iface = new ethers.Interface(ABI);
      const logs = await this.provider.getLogs({ ...filter, fromBlock: 0n, toBlock: 'latest' });
      console.log('📜 Raw logs found:', logs.length);
      
      for (const log of logs) {
        try {
          const parsed = iface.parseLog({ topics: log.topics, data: log.data }) as any;
          const marketId: bigint | undefined = parsed?.args?.[0];
          console.log(`🔍 Parsed log:`, { marketId: marketId?.toString(), txHash: log.transactionHash });
          
          if (marketId !== undefined) {
            map[Number(marketId)] = log.transactionHash;
            console.log(`✅ Added to map: Market ${Number(marketId)} -> ${log.transactionHash}`);
          }
        } catch (parseError) {
          console.error('❌ Error parsing log:', parseError);
        }
      }
      
      console.log('🗺️ Final transaction map:', map);
    } catch (e) {
      console.error('❌ Error fetching MarketCreated logs:', e);
      // fallback: empty map
    }
    return map;
  }

  private async fetchTxForMarket(marketId: number): Promise<string | undefined> {
    try {
      const topic0 = ethers.id('MarketCreated(uint256,address,string)');
      const topic1 = ethers.zeroPadValue(ethers.toBeHex(BigInt(marketId)), 32);
      const logs = await this.provider.getLogs({
        address: CONTRACT_ADDRESS,
        topics: [topic0, topic1],
        fromBlock: 0n,
        toBlock: 'latest'
      });
      if (logs.length > 0) return logs[0].transactionHash;
    } catch {}
    return undefined;
  }

  async fetchOnChainMarkets(): Promise<OnChainMarket[]> {
    console.log('🔍 Fetching on-chain markets...');
    console.log('📋 Contract address:', CONTRACT_ADDRESS);
    console.log('🌐 RPC URL:', RPC_URL);
    
    const markets: OnChainMarket[] = [];
    
    try {
      // First, let's check if the contract exists and is accessible
      const code = await this.provider.getCode(CONTRACT_ADDRESS);
      console.log('📄 Contract code exists:', code !== '0x');
      
      if (code === '0x') {
        console.error('❌ No contract found at address:', CONTRACT_ADDRESS);
        return [];
      }
      
      const txMap = await this.fetchMarketCreatedTxMap();
      console.log('📋 Transaction hash map:', txMap);
      
      const count: bigint = await this.contract.getMarketCount();
      console.log('📊 Total market count:', Number(count));
      
      if (Number(count) === 0) {
        console.log('ℹ️ No markets found on contract');
        return [];
      }
      
      // Sadece son 16 market'i al
      const startIndex = Math.max(1, Number(count) - 15); // Son 16 market (16-15=1'den başla)
      const endIndex = Number(count);
      
      console.log(`🎯 Fetching markets ${startIndex} to ${endIndex} (last 16 markets)`);
      
      const now = Math.floor(Date.now() / 1000);
      for (let i = startIndex; i <= endIndex; i++) {
        try {
          const m = await this.contract.getMarket(i);
          console.log(`🏪 Raw market ${i}:`, m);
          
          let txHash: string | undefined = txMap[Number(m.id)] || txFallbackMap[Number(m.id)];
          console.log(`🔗 Market ${i} txHash from map:`, txHash);
          
          if (!txHash) {
            console.log(`🔍 Fetching tx for market ${i} individually...`);
            txHash = await this.fetchTxForMarket(Number(m.id));
            console.log(`🔗 Market ${i} individual txHash:`, txHash);
          }
          
          const market: OnChainMarket = {
            id: Number(m.id),
            title: m.title as string,
            description: m.description as string,
            closesAt: Number(m.closingTime),
            createdAt: now,
            creator: (m.creator as string),
            txHash,
          };
          
          console.log(`✅ Final market ${i}:`, market);
          markets.push(market);
        } catch (e) {
          console.error(`❌ Error fetching market ${i}:`, e);
          // skip missing
        }
      }
      
      console.log('🎯 Final markets array (last 16):', markets);
      return markets;
    } catch (error) {
      console.error('❌ Error in fetchOnChainMarkets:', error);
      return [];
    }
  }
}

export const solidityClient = new SolidityClient();

// Buy helper: qty shares at 0.5 STT per share (native token)
export async function buyShares(marketId: number, isYes: boolean, quantity: number) {
  if (typeof window === 'undefined' || !(window as any).ethereum) throw new Error('Wallet not available');
  const provider = new ethers.BrowserProvider((window as any).ethereum);
  const signer = await provider.getSigner();
  const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, signer);
  const pricePerShare = ethers.parseEther('0.5');
  const total = pricePerShare * BigInt(Math.max(0, Math.floor(quantity)));
  const tx = await contract.placeBet(marketId, isYes, { value: total });
  return await tx.wait();
}

export default solidityClient; 