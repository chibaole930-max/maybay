'use client';

import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { GameState, Staff } from '@/types';
import type { AirportDraft } from '@/lib/geo-naming';
import {
  borrowLoan,
  buyAirportSlot,
  buyPlane,
  claimLoginReward,
  claimMissionReward,
  claimOfflineDouble as claimOfflineDoubleEngine,
  closeRoute,
  createAirline,
  createAirportFromDraft,
  dismissEvent,
  dismissLevelUp,
  dismissOfflineSummary,
  dismissMilestone,
  dismissIpo,
  fireStaff,
  hireStaff,
  initialState,
  goPublic,
  openRoute,
  renamePlane,
  repayLoan,
  restructureAirline,
  sellPlane,
  servicePlane,
  tickGame,
  trainStaff,
  unlockSecondBase,
  updateRoute,
  upgradePlane,
  upgradeResearch,
  resolveFunnySituation,
  setHardcoreMode,
  runMarketingCampaign,
} from '@/lib/game-engine';
import { airports, planes } from '@/lib/mock-data';
import { soundManager } from '@/lib/sound';

interface Store extends GameState {
  hydrate: boolean;
  start: (v: {
    name: string;
    color: string;
    icon: string;
    base: string;
    difficulty: 'de' | 'thuong' | 'kho';
  }) => void;
  buy: (catalogPlaneId: string) => void;
  sell: (planeId: string) => void;
  rename: (planeId: string, name: string) => void;
  upgrade: (planeId: string, type: 'businessClass' | 'winglets') => void;
  maintain: (planeId: string) => void;
  createRoute: (v: {
    from: string;
    to: string;
    planeId: string;
    ticketPrice: number;
    frequencyPerWeek: number;
  }) => void;
  editRoute: (
    routeId: string,
    updates: { ticketPrice?: number; frequencyPerWeek?: number; planeId?: string }
  ) => void;
  toggleRoute: (routeId: string) => void;
  removeRoute: (routeId: string) => void;
  buySlot: (airportCode: string) => void;
  setupSecondBase: (airportCode: string) => void;
  createAirport: (draft: AirportDraft) => void;
  mergeSharedAirports: (shared: AirportDraft[]) => void;
  hire: (candidate: Staff) => void;
  fire: (staffId: string) => void;
  train: (staffId: string) => void;
  borrow: (amount: number) => void;
  repay: (amount: number) => void;
  upgradeTech: (branchId: 'fuel' | 'service' | 'maintenance') => void;
  claimMission: (missionId: string) => void;
  dismissCurrentEvent: () => void;
  dismissLevelUpModal: () => void;
  dismissOfflineModal: () => void;
  dismissMilestoneModal: () => void;
  dismissIpoModal: () => void;
  goPublic: () => void;
  claimLogin: () => void;
  claimOfflineDouble: () => void;
  restructure: () => void;
  toggleAutoManage: () => void;
  resolveSituation: (choiceId: string) => void;
  toggleHardcore: () => void;
  marketingCampaign: () => void;
  toggleSound: () => void;
  setTheme: (t: 'light' | 'dark') => void;
  setCurrency: (c: 'USD' | 'VND') => void;
  tick: () => void;
  notify: (text: string, type?: 'info' | 'warn' | 'success') => void;
  markNoticesAsRead: () => void;
  clearNotices: () => void;
  reset: () => void;
  update: (fn: (s: GameState) => GameState) => void;
}

export const useGameStore = create<Store>()(
  persist(
    (set, get) => ({
      ...initialState(),
      hydrate: false,

      start: (v) => {
        set((s) => ({
          ...createAirline(s, v, airports),
          hydrate: true,
        }));
        if (get().soundEnabled) soundManager.play('takeoff');
      },

      buy: (catalogPlaneId) => {
        const catalogItem = planes.find((p) => p.id === catalogPlaneId);
        if (!catalogItem) return;
        set((s) => buyPlane(s, catalogItem));
        if (get().soundEnabled) soundManager.play('cash');
      },

      sell: (planeId) => {
        set((s) => sellPlane(s, planeId));
        if (get().soundEnabled) soundManager.play('cash');
      },

      rename: (planeId, name) => {
        set((s) => renamePlane(s, planeId, name));
      },

      upgrade: (planeId, type) => {
        set((s) => upgradePlane(s, planeId, type));
        if (get().soundEnabled) soundManager.play('cash');
      },

      maintain: (planeId) => {
        set((s) => servicePlane(s, planeId));
        if (get().soundEnabled) soundManager.play('click');
      },

      createRoute: (v) => {
        set((s) => openRoute(s, v));
        if (get().soundEnabled) soundManager.play('takeoff');
      },

      editRoute: (routeId, updates) => {
        set((s) => updateRoute(s, routeId, updates));
      },

      toggleRoute: (routeId) => {
        set((s) => {
          const route = s.routes.find((r) => r.id === routeId);
          if (!route) return s;
          return updateRoute(s, routeId, { active: !route.active });
        });
      },

      removeRoute: (routeId) => {
        set((s) => closeRoute(s, routeId));
      },

      buySlot: (airportCode) => {
        set((s) => buyAirportSlot(s, airportCode));
        if (get().soundEnabled) soundManager.play('cash');
      },

      setupSecondBase: (airportCode) => {
        set((s) => unlockSecondBase(s, airportCode));
        if (get().soundEnabled) soundManager.play('levelup');
      },

      createAirport: (draft) => {
        set((s) => createAirportFromDraft(s, draft));
        if (get().soundEnabled) soundManager.play('cash');
      },

      // Ghép sân bay từ kho chung vào lượt chơi hiện tại, giữ nguyên tiến độ slot đã mua.
      mergeSharedAirports: (shared) => {
        set((s) => {
          const known = new Set(s.airports.map((a) => a.code));
          const fresh = shared
            .filter((item) => !known.has(item.code))
            .map((item) => ({
              code: item.code,
              name: item.name,
              city: item.city,
              country: item.country,
              landingFee: item.landingFee,
              demand: item.demand,
              slots: item.demand >= 8 ? 6 : 5,
              slotsUsed: 0,
              lat: item.lat,
              lon: item.lng,
              updatedAt: Date.now(),
              version: 1,
            }));
          return fresh.length ? { ...s, airports: [...s.airports, ...fresh] } : s;
        });
      },

      hire: (candidate) => {
        set((s) => hireStaff(s, candidate));
        if (get().soundEnabled) soundManager.play('click');
      },

      fire: (staffId) => {
        set((s) => fireStaff(s, staffId));
      },

      train: (staffId) => {
        set((s) => trainStaff(s, staffId));
        if (get().soundEnabled) soundManager.play('cash');
      },

      borrow: (amount) => {
        set((s) => borrowLoan(s, amount));
        if (get().soundEnabled) soundManager.play('cash');
      },

      repay: (amount) => {
        set((s) => repayLoan(s, amount));
        if (get().soundEnabled) soundManager.play('cash');
      },

      upgradeTech: (branchId) => {
        set((s) => upgradeResearch(s, branchId));
        if (get().soundEnabled) soundManager.play('levelup');
      },

      claimMission: (missionId) => {
        set((s) => claimMissionReward(s, missionId));
        if (get().soundEnabled) soundManager.play('cash');
      },

      dismissCurrentEvent: () => {
        set((s) => dismissEvent(s));
      },

      dismissLevelUpModal: () => {
        set((s) => dismissLevelUp(s));
        if (get().soundEnabled) soundManager.play('cash');
      },

      dismissOfflineModal: () => {
        set((s) => dismissOfflineSummary(s));
      },

      dismissMilestoneModal: () => set((s) => dismissMilestone(s)),
      dismissIpoModal: () => set((s) => dismissIpo(s)),
      goPublic: () => set((s) => goPublic(s)),
      claimLogin: () => {
        const catalogAtr = planes.find((p) => p.model === 'ATR 72-600');
        set((s) => claimLoginReward(s, Date.now(), catalogAtr as any));
        if (get().soundEnabled) soundManager.play('cash');
      },
      claimOfflineDouble: () => {
        set((s) => claimOfflineDoubleEngine(s));
        if (get().soundEnabled) soundManager.play('cash');
      },

      restructure: () => {
        set((s) => restructureAirline(s));
      },

      toggleAutoManage: () => {
        set((s) => {
          if (!s.airline) return s;
          return {
            ...s,
            airline: {
              ...s.airline,
              autoManage: !s.airline.autoManage,
            },
          };
        });
      },

      resolveSituation: (choiceId) => set((s) => resolveFunnySituation(s, choiceId, Math.random, s.gameTimeMs || 0)),
      toggleHardcore: () => set((s) => {
        if (s.loan > 0) return { ...s, notices: [{ id: `hardcore-${Date.now()}`, text: 'Hãy trả hết khoản vay trước khi đổi chế độ Hardcore.', time: Date.now(), unread: true, type: 'warn' }, ...s.notices] };
        return setHardcoreMode(s, !(s.hardcore ?? s.airline?.hardcore ?? false));
      }),
      marketingCampaign: () => set((s) => runMarketingCampaign(s)),

      toggleSound: () => {
        set((s) => ({ soundEnabled: !s.soundEnabled }));
      },

      setTheme: (theme) => set({ theme }),
      setCurrency: (currency) => set({ currency }),

      tick: () => {
        set((s) => {
          const next = tickGame(s);
          if (next.pendingLevelUp && !s.pendingLevelUp && next.soundEnabled) {
            soundManager.play('levelup');
          }
          return next;
        });
      },

      notify: (text, type = 'info') => {
        set((s) => ({
          notices: [
            {
              id: `nt-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
              text,
              time: Date.now(),
              unread: true,
              type,
            },
            ...s.notices,
          ].slice(0, 50),
        }));
      },

      markNoticesAsRead: () => {
        set((s) => ({
          notices: s.notices.map((n) => ({ ...n, unread: false })),
        }));
      },

      clearNotices: () => {
        set({ notices: [] });
      },

      reset: () => {
        set({ ...initialState(), hydrate: true });
      },

      update: (fn) => set((s) => ({ ...fn(s) })),
    }),
    {
      name: 'vietnam-airline-tycoon-save',
      version: 5,
      storage: createJSONStorage(() => localStorage),
      migrate: (persisted, version) => {
        const saved = (persisted as Store) || ({ ...initialState(), hydrate: true } as Store);
        const { dayId: dayIdFn, weekId: weekIdFn } = { dayId: (d = new Date()) => `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`, weekId: (d = new Date()) => { const c = new Date(d); const day = (c.getDay() + 6) % 7; c.setDate(c.getDate() - day); return `${c.getFullYear()}-W${c.getMonth() + 1}-${c.getDate()}`; } };
        if (version < 5) {
          const fresh = initialState();
          // Giữ missions cũ, bổ sung daily còn thiếu; khởi tạo retention defaults.
          const hasDaily = (saved.missions || []).some((m: any) => m.category === 'daily');
          const renameAirport = (code: string) => code === 'HUI' ? 'HUE' : code === 'VII' ? 'VIN' : code;
          return {
            ...saved,
            missions: hasDaily ? saved.missions : [...(saved.missions || []), ...fresh.missions.filter((m) => m.category === 'daily')],
            lastDailyReset: (saved as any).lastDailyReset || dayIdFn(),
            lastLoginDate: (saved as any).lastLoginDate || dayIdFn(),
            loginClaimedDate: (saved as any).loginClaimedDate || '',
            loginStreak: (saved as any).loginStreak ?? 1,
            weeklySeason: (saved as any).weeklySeason || fresh.weeklySeason,
            streakShield: (saved as any).streakShield ?? true,
            streakBest: (saved as any).streakBest || 0,
            airports: (saved.airports || airports).map((a: any) => ({ ...a, code: renameAirport(a.code) })),
          };
        }
        return saved;
      },
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.hydrate = true;
          // Fairness: one real-time rate for every airline — old saves that
          // hold a 2×/4× choice are pinned back to 1× on load (no migration
          // bump needed; the setter no longer exists).
          state.timeSpeed = 1;
          // Single-theme redesign: old saves holding dark fall back to light.
          state.theme = 'light';
        }
      },
    }
  )
);
