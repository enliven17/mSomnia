import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { connectWallet, disconnectWallet } from '@/store/walletSlice';
import type { RootState } from '@/store';

export function useWalletConnection() {
  const dispatch = useDispatch();
  const address = useSelector((state: RootState) => state.wallet.address);
  const isConnected = useSelector((state: RootState) => state.wallet.isConnected);

  useEffect(() => {
    const ensureSomniaChain = async () => {
      if (!window.ethereum) return;
      const somniaChainId = '0xc488'; // 50312
      const current = await window.ethereum.request({ method: 'eth_chainId' });
      if (current !== somniaChainId) {
        try {
          await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: somniaChainId }]
          });
        } catch (switchError: any) {
          if (switchError?.code === 4902) {
            await window.ethereum.request({
              method: 'wallet_addEthereumChain',
              params: [{
                chainId: somniaChainId,
                chainName: 'Somnia Testnet',
                nativeCurrency: { name: 'Somnia Test Token', symbol: 'STT', decimals: 18 },
                rpcUrls: [process.env.NEXT_PUBLIC_SOMNIA_RPC || 'https://dream-rpc.somnia.network/'],
                blockExplorerUrls: ['https://shannon-explorer.somnia.network/']
              }]
            });
          }
        }
      }
    };

    const checkWalletConnection = async () => {
      if (window.ethereum && window.ethereum.selectedAddress) {
        await ensureSomniaChain();
        const currentAddress = window.ethereum.selectedAddress;
        dispatch(connectWallet(currentAddress));
      } else {
        dispatch(disconnectWallet());
      }
    };

    checkWalletConnection();

    if (window.ethereum) {
      window.ethereum.on('accountsChanged', checkWalletConnection);
      window.ethereum.on('connect', checkWalletConnection);
      window.ethereum.on('disconnect', () => dispatch(disconnectWallet()));
    }

    return () => {
      if (window.ethereum) {
        window.ethereum.removeListener('accountsChanged', checkWalletConnection);
        window.ethereum.removeListener('connect', checkWalletConnection);
        window.ethereum.removeListener('disconnect', () => dispatch(disconnectWallet()));
      }
    };
  }, [dispatch]);

  return {
    address,
    isConnected,
  };
} 