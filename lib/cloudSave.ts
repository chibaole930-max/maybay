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
  'weeklyStarterRewardClaimed', 'activeConsequences',
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

/* ------------------------------------------------------------------ *
 * Moc dong bo: may nay da tung thay ban luu cloud nao cua tai khoan nao
 * ------------------------------------------------------------------ */

const MARKER_PREFIX = 'vat-cloud-sync:';

interface SyncMarker {
  updatedAt: number;
  version: number;
}

const markerKey = (accountId: string) => `${MARKER_PREFIX}${accountId}`;

/**
 * Moc dong bo giup quyet dinh "ban luu tren may chu co moi hon ban tren may nay
 * khong?" khi dang nhap.
 *
 * Server khong cho client so sanh truc tiep theo tung dong (chi doc duoc ban
 * luu cua chinh minh), nen client tu ghi moc sau moi lan dong bo thanh cong.
 * Moc nay rieng theo tai khoan: doi tai khoan tren cung mot may thi khong
 * dung nham muc cua tai khoan truoc.
 */
export function readSyncMarker(accountId: string): SyncMarker | null {
  if (typeof localStorage === 'undefined') return null;
  try {
    const raw = localStorage.getItem(markerKey(accountId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<SyncMarker>;
    if (typeof parsed.updatedAt !== 'number') return null;
    return { updatedAt: parsed.updatedAt, version: typeof parsed.version === 'number' ? parsed.version : 0 };
  } catch {
    return null;
  }
}

export function writeSyncMarker(accountId: string | undefined, updatedAt: number, version = 0): void {
  if (!accountId || typeof localStorage === 'undefined' || !Number.isFinite(updatedAt) || updatedAt <= 0) return;
  try {
    localStorage.setItem(markerKey(accountId), JSON.stringify({ updatedAt, version }));
  } catch {
    /* localStorage đầy hoặc bị chặn: bỏ qua, lần sau so sánh lại từ đầu */
  }
}

export function clearSyncMarker(accountId: string): void {
  if (typeof localStorage === 'undefined') return;
  try { localStorage.removeItem(markerKey(accountId)); } catch { /* ignore */ }
}

/**
 * Quyết định lúc đăng nhập: lấy bản cloud hay giữ bản local.
 *
 * Cloud chỉ thắ khi vượt HAI ngưỡng:
 * 1. `cloudUpdatedAt > markerUpdatedAt` — cloud có mới hơn bản mà máy này từng
 *    đồng bộ, tức là có ai đó (máy khác, phiên khác) đã chơi tiếp.
 * 2. `cloudUpdatedAt > localUpdatedAt` — và mới hơn chính tiến trình trên máy
 *    này, tức là không phải bản cũ đang bị đẩy lên đè.
 *
 * Thiếu một trong hai ngưỡng là giữ local rồi đẩy local lên cloud.
 */
export function shouldPullCloud(input: {
  cloudUpdatedAt: number;
  markerUpdatedAt: number;
  localUpdatedAt: number;
}): boolean {
  return input.cloudUpdatedAt > input.markerUpdatedAt && input.cloudUpdatedAt > input.localUpdatedAt;
}
