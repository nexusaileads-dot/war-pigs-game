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
  initAuth: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  equipItem: (type: 'character' | 'weapon', id: string) => Promise<void>;
  logout: () => void;
}

const DEV_LOGIN_ENABLED = import.meta.env.VITE_ENABLE_DEV_LOGIN === 'true';

export const useGameStore = create<GameState>((set, get) => ({
  user: null,
  token: localStorage.getItem('token'),
  isLoading: true,

  initAuth: async () => {
    try {
      const tg = window.Telegram?.WebApp;
      const existingToken = localStorage.getItem('token');

      if (tg?.initData) {
        const { data } = await apiClient.post('/api/auth/telegram', {
          initData: tg.initData
        });

        localStorage.setItem('token', data.token);
        set({
          user: data.user,
          token: data.token,
          isLoading: false
        });
        return;
      }

      if (existingToken) {
        const { data } = await apiClient.get('/api/auth/me');
        set({
          user: data.user,
          token: existingToken,
          isLoading: false
        });
        return;
      }

      if (DEV_LOGIN_ENABLED) {
        const { data } = await apiClient.post('/api/auth/dev-login');

        localStorage.setItem('token', data.token);
        set({
          user: data.user,
          token: data.token,
          isLoading: false
        });
        return;
      }

      set({
        user: null,
        token: null,
        isLoading: false
      });
    } catch (error) {
      console.error('Auth failed:', error);
      localStorage.removeItem('token');
      set({
        user: null,
        token: null,
        isLoading: false
      });
    }
  },

  refreshProfile: async () => {
    const token = get().token;
    if (!token) return;

    try {
      const { data } = await apiClient.get('/api/auth/me');
      set({ user: data.user });
    } catch (error) {
      console.error('Failed to refresh profile:', error);
    }
  },

  equipItem: async (type, id) => {
    const token = get().token;
    if (!token) return;

    try {
      await apiClient.post('/api/inventory/equip', {
        [type === 'character' ? 'characterId' : 'weaponId']: id
      });

      await get().refreshProfile();
    } catch (error) {
      console.error('Failed to equip item:', error);
    }
  },

  logout: () => {
    localStorage.removeItem('token');
    set({
      user: null,
      token: null,
      isLoading: false
    });
  }
}));
