import type { GameState } from '@/types';

/**
 * Chup anh tien do game de dong bo len may chu.
 *
 * Chi chup cac field du lieu. Bo qua field tạm (thong bao, su kien dang mo, modal
 * dang cho, ...) va cac ham cua store — nhung thu do khong nen (va khong the)
 * dong bo giua cac thiet bi.
 */

const SYNC_KEYS = [
  'airline', 'planes', 'routes', 'airports', 'transactions', 'staff',
  'research', 'researchPoints', 'missions', 'eventHistory', 'loan',
  'theme', 'currency', 'soundEnabled', 'tutorialDone', 'simpleMode',
  'weeklyStarterRewardClaimed', 'activeConsequences', 'hardcore',
  'redPriceSince', 'greenPriceSince', 'routeTitles', 'friendCodes',
  'competitorPriceAt', 'marketingPenaltyUntil', 'timeSpeed', 'gameTimeMs',
  'flights', 'nextFlightNumber', 'streak', 'goldenHour', 'goldenHourNextAt',
  'activityLog', 'milestones', 'cashHistory', 'ipoCount',
  'xpProfitRemainder', 'researchProfitRemainder', 'lastCostTransactionAt',
  'pendingOperatingCost', 'lastDailyReset', 'lastLoginDate', 'loginClaimedDate',
  'loginStreak', 'weeklySeason', 'streakShield', 'streakBest',
] as const satisfies readonly (keyof GameState)[];

export type SaveSnapshot = Partial<Pick<GameState, (typeof SYNC_KEYS)[number]>>;

export function snapshot(state: GameState): SaveSnapshot {
  const out: Record<string, unknown> = {};
  for (const key of SYNC_KEYS) out[key] = state[key];
  return out as SaveSnapshot;
}

/** Kiem tra ban luu tu may chu co dung hinh dang de nap vao store khong. */
export function isUsableSave(value: unknown): value is SaveSnapshot {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Record<string, unknown>;
  if (!candidate.airline || typeof candidate.airline !== 'object') return false;
  return typeof (candidate.airline as { cash?: unknown }).cash === 'number';
}
