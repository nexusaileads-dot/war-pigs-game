import { create } from 'zustand';
import { apiClient } from '../api/client';

interface User {
  id: string;
  telegramId?: string;
  email?: string;
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
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (email: string, password: string, username: string) => Promise<{ success: boolean; error?: string }>;
  refreshProfile: () => Promise<void>;
  equipItem: (type: 'character' | 'weapon', id: string) => Promise<{ success: boolean; error?: string }>;
  setConnectedWallet: (address: string | null, providerName?: string | null) => void;
  clearConnectedWallet: () => void;
  logout: () => void;
}

export const useGameStore = create<GameState>((set, get) => ({
  user: null,
  token: localStorage.getItem('token'),
  isLoading: true,
  isEquipPending: false,
  connectedWalletAddress: localStorage.getItem('solanaWalletAddress'),
  walletProviderName: localStorage.getItem('solanaWalletProvider'),

  initAuth: async () => {
    const existingToken = localStorage.getItem('token');
    
    if (existingToken) {
      try {
        const { data } = await apiClient.get('/api/auth/me');
        set({ user: data.user, token: existingToken, isLoading: false });
        return;
      } catch (error: any) {
        console.error('[GameStore] Auth check failed:', error);
        
        // Only logout if status is 401 (Unauthorized) or 403 (Forbidden).
        // Do NOT logout if status is 500 (Server Error), 502, 504, etc.
        // This prevents login loops if Supabase/DB is temporarily down.
        const status = error?.response?.status;
        if (status === 401 || status === 403) {
          localStorage.removeItem('token');
          sessionStorage.removeItem('currentRun');
          set({ user: null, token: null });
        } else {
          // Server error? Keep the token, let the user stay logged in (or show error screen)
          console.warn('[GameStore] Server error during auth check, keeping token.');
        }
      }
    }
    
    set({ isLoading: false });
  },

  login: async (email, password) => {
    try {
      set({ isLoading: true });
      const { data } = await apiClient.post('/api/auth/login', { email, password });
      localStorage.setItem('token', data.token);
      set({ user: data.user, token: data.token, isLoading: false });
      return { success: true };
    } catch (error: any) {
      const msg = error.response?.data?.error || 'Login failed';
      set({ isLoading: false });
      return { success: false, error: msg };
    }
  },

  register: async (email, password, username) => {
    try {
      set({ isLoading: true });
      const { data } = await apiClient.post('/api/auth/register', { email, password, username });
      localStorage.setItem('token', data.token);
      set({ user: data.user, token: data.token, isLoading: false });
      return { success: true };
    } catch (error: any) {
      const msg = error.response?.data?.error || 'Registration failed';
      set({ isLoading: false });
      return { success: false, error: msg };
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
    // FIX: Clean up active game sessions to prevent ghost data on next login
    sessionStorage.removeItem('currentRun');
    set({
      user: null,
      token: null,
      isLoading: false,
      connectedWalletAddress: null,
      walletProviderName: null
    });
  }
}));
