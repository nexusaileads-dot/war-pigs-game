import { create } from 'zustand';
import { apiClient } from '../api/client';

interface User {
  id: string;
  telegramId: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  photoUrl?: string;
  profile: {
    level: number;
    xp: number;
    currentPigs: number;
    totalPigsEarned: number;
    equippedCharacterId: string | null;
    equippedWeaponId: string | null;
  };
  wallet?: {
    solanaAddress?: string | null;
    pendingRewards: number;
    claimedRewards: number;
    lastClaimAt?: string | null;
  } | null;
  stats?: {
    totalKills: number;
    totalRuns: number;
    totalBossKills: number;
  } | null;
}

interface GameState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isEquipPending: boolean;

  connectedWalletAddress: string | null;
  walletProviderName: string | null;

  initAuth: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  equipItem: (type: 'character' | 'weapon', id: string) => Promise<{ success: boolean; error?: string }>;
  setConnectedWallet: (address: string | null, providerName?: string | null) => void;
  clearConnectedWallet: () => void;
  logout: () => void;
}

const DEV_LOGIN_ENABLED = import.meta.env.VITE_ENABLE_DEV_LOGIN === 'true';

export const useGameStore = create<GameState>((set, get) => ({
  user: null,
  token: localStorage.getItem('token'),
  isLoading: true,
  isEquipPending: false,

  connectedWalletAddress: localStorage.getItem('solanaWalletAddress'),
  walletProviderName: localStorage.getItem('solanaWalletProvider'),

  initAuth: async () => {
    try {
      const tg = window.Telegram?.WebApp;
      const existingToken = localStorage.getItem('token');

      if (tg?.initData) {
        const { data } = await apiClient.post('/api/auth/telegram', { initData: tg.initData });
        localStorage.setItem('token', data.token);
        set({ user: data.user, token: data.token, isLoading: false });
        return;
      }

      if (existingToken) {
        try {
          const { data } = await apiClient.get('/api/auth/me');
          set({ user: data.user, token: existingToken, isLoading: false });
          return;
        } catch (meError: any) {
          // Handle expired/invalid token explicitly
          if (meError.response?.status === 401 || meError.response?.status === 403) {
            localStorage.removeItem('token');
            set({ token: null });
            // Fall through to dev login or null state
          } else {
            throw meError;
          }
        }
      }

      if (DEV_LOGIN_ENABLED) {
        const { data } = await apiClient.post('/api/auth/dev-login');
        localStorage.setItem('token', data.token);
        set({ user: data.user, token: data.token, isLoading: false });
        return;
      }

      localStorage.removeItem('token');
      set({ user: null, token: null, isLoading: false });
    } catch (error) {
      console.error('[GameStore] Auth failed:', error);
      localStorage.removeItem('token');
      sessionStorage.removeItem('hasActiveRun'); // Fixed key mismatch
      set({ user: null, token: null, isLoading: false });
    }
  },

  refreshProfile: async () => {
    const token = get().token;
    if (!token) return;

    try {
      const { data } = await apiClient.get('/api/auth/me');
      set({ user: data.user });
    } catch (error) {
      console.error('[GameStore] Failed to refresh profile:', error);
      if ((error as any).response?.status === 401) {
        localStorage.removeItem('token');
        sessionStorage.removeItem('hasActiveRun');
        set({ user: null, token: null });
      }
    }
  },

  equipItem: async (type, id) => {
    const token = get().token;
    if (!token) return { success: false, error: 'Not authenticated' };
    if (get().isEquipPending) return { success: false, error: 'Request in progress' };

    set({ isEquipPending: true });
    try {
      await apiClient.post('/api/inventory/equip', {
        [type === 'character' ? 'characterId' : 'weaponId']: id
      });
      await get().refreshProfile();
      return { success: true };
    } catch (error) {
      console.error('[GameStore] Failed to equip item:', error);
      return { success: false, error: (error as any).response?.data?.error || 'Equip failed' };
    } finally {
      set({ isEquipPending: false });
    }
  },

  setConnectedWallet: (address, providerName = null) => {
    if (address) localStorage.setItem('solanaWalletAddress', address);
    else localStorage.removeItem('solanaWalletAddress');

    if (providerName) localStorage.setItem('solanaWalletProvider', providerName);
    else localStorage.removeItem('solanaWalletProvider');

    set({ connectedWalletAddress: address, walletProviderName: providerName });
  },

  clearConnectedWallet: () => {
    localStorage.removeItem('solanaWalletAddress');
    localStorage.removeItem('solanaWalletProvider');
    set({ connectedWalletAddress: null, walletProviderName: null });
  },

  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('solanaWalletAddress');
    localStorage.removeItem('solanaWalletProvider');
    sessionStorage.removeItem('hasActiveRun'); // Fixed key mismatch
    set({
      user: null,
      token: null,
      isLoading: false,
      connectedWalletAddress: null,
      walletProviderName: null
    });
  }
}));
