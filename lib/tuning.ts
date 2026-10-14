/**
 * Bảng cân chỉnh meta-game — MỘT nguồn duy nhất cho mọi con số "độ khó".
 *
 * Trước đây các hằng số nằm rải trong `game-engine.ts`, nên không ai dám chỉnh:
 * đổi một chỗ là lệch hai chỗ khác, và copy trên onboarding nói "nhu cầu giảm 10%"
 * trong khi engine chưa hề có hiệu ứng đó. Giờ mọi thứ dùng chung hằng ở đây.
 *
 * Nguyên tắc sau khi nới (phiên bản "dễ chơi nhưng vẫn có thách thức"):
 * - Tiền khởi đầu đủ mua 2 máy bay + dự phòng → không bị kẹt ở phút đầu.
 * - Một cấp độ phải lên được trong ~10–20 phút chơi thật, không phải ~1 giờ.
 * - Chi phí mở rộng (slot, căn cứ thứ 2, xây sân bay) không được nuốt hết lợi nhuận.
 * - Độ khó khác nhau PHẢI khác nhau thật, không chỉ khác ở số tiền ban đầu.
 */

import type { GameState } from '@/types';

export type DifficultyId = 'de' | 'thuong' | 'kho';

export interface DifficultyConfig {
  id: DifficultyId;
  label: string;
  /** Mô tả đúng với hiệu ứng thật trong engine — dùng nguyên văn ở onboarding. */
  tagline: string;
  /** Vốn khởi đầu. */
  startingCash: number;
  /** Nhân vào nhu cầu mọi tuyến. >1 = dễ kiếm tiền, <1 = chật. */
  demandMultiplier: number;
  /** Nhân vào mọi chi phí mở rộng (slot, căn cứ, xây sân bay, đào tạo, marketing). */
  costMultiplier: number;
  /** Nhân vào XP kiếm được từ lợi nhuận. */
  xpMultiplier: number;
}

export const DIFFICULTIES: Record<DifficultyId, DifficultyConfig> = {
  de: {
    id: 'de',
    label: 'Dễ',
    tagline: 'Nhu cầu +20%, mọi chi phí mở rộng giảm 30%. Dành cho lần đầu chơi.',
    startingCash: 25000000,
    demandMultiplier: 1.2,
    costMultiplier: 0.7,
    xpMultiplier: 1.25,
  },
  thuong: {
    id: 'thuong',
    label: 'Thường',
    tagline: 'Cân bằng — nhu cầu và chi phí giữ nguyên. Đây là trải nghiệm chuẩn của game.',
    startingCash: 15000000,
    demandMultiplier: 1,
    costMultiplier: 1,
    xpMultiplier: 1,
  },
  kho: {
    id: 'kho',
    label: 'Khó',
    tagline: 'Nhu cầu −15%, chi phí mở rộng +25%, XP chậm hơn 20%. Chơi sau khi quen luồng cơ bản.',
    startingCash: 8000000,
    demandMultiplier: 0.85,
    costMultiplier: 1.25,
    xpMultiplier: 0.8,
  },
};

const FALLBACK: DifficultyConfig = DIFFICULTIES.thuong;

/** Cấu hình độ khó của một bản lưu; bản lưu cũ hoặc rác thì coi như chuẩn. */
export const difficultyOf = (state?: Pick<GameState, 'airline'> | null): DifficultyConfig => {
  const id = state?.airline?.difficulty;
  return (id && DIFFICULTIES[id]) || FALLBACK;
};

/** Nhân chi phí theo độ khó rồi làm tròn về nghìn gần nhất. */
export const scaleCost = (base: number, config: DifficultyConfig): number =>
  Math.round((base * config.costMultiplier) / 1000) * 1000;

/* ------------------------------------------------------------------ *
 * Tiến trình: XP và điểm nghiên cứu
 * ------------------------------------------------------------------ */

/** Mỗi 1 XP cần bao nhiêu $ lợi nhuận ròng. */
export const PROFIT_PER_XP = 3000;

/** Mỗi 1 điểm nghiên cứu cần bao nhiêu $ lợi nhuận ròng. */
export const PROFIT_PER_RESEARCH = 250000;

/**
 * XP cần để lên từ `level` lên `level + 1`.
 * Trước: `level * 1000` → lên cấp 5 phải có ~$100M lợi nhuận.
 * Giờ: 400 ở cấp 1, cộng dần 350 mỗi cấp → lên cấp 2 chỉ cần $1,2M lợi nhuận.
 */
export const xpRequiredFor = (level: number): number =>
  Math.round(400 + Math.max(0, level - 1) * 350);

/** Thưởng tiền mặt khi lên cấp. */
export const levelUpReward = (newLevel: number): number => newLevel * 500000;

/* ------------------------------------------------------------------ *
 * Chi phí mở rộng (giá gốc, trước khi nhân theo độ khó)
 * ------------------------------------------------------------------ */

export const BASE_COSTS = {
  airportSlot: 30000,
  secondBase: 3000000,
  staffTrainingPerSkill: 10000,
  marketingCampaign: 30000,
  offlineDouble: 50000,
} as const;

/** Phí xây sân bay theo khu vực. */
export const airportBuildCost = (region: string): number => {
  if (region === 'Việt Nam') return 300000;
  if (region === 'Đông Nam Á') return 600000;
  if (region === 'Đông Á') return 1200000;
  return 1800000;
};

/** Lãi vay mỗi ngày game. */
export const LOAN_DAILY_RATE = 0.04;

/** Số ngày game âm tiền liên tục trước khi bị phá sản hoá. */
export const insolvencyDays = (hardcore: boolean): number => (hardcore ? 3 : 10);

/** Cấp mở khóa căn cứ thứ 2. */
export const SECOND_BASE_LEVEL = 8;

/** Cấp mở khóa vay vốn. */
export const LOAN_LEVEL = 8;

/**
 * Khu vực sân bay → cấp mở khóa. Dùng chung cho cả mở đường bay lẫn mua slot
 * (trước đây nhân bản ở hai chỗ, dễ lệch).
 */
export const AIRPORT_UNLOCK_LEVELS: Record<string, number> = {
  SEA: 4,
  EAST_ASIA: 8,
  FAR: 12,
};

/** Cấp mở khóa theo mã sân bay. */
export const airportUnlockLevel = (code: string): number => {
  if (['BKK', 'SIN', 'KUL', 'MNL', 'CGK', 'DPS', 'HKT', 'PNH', 'VTE', 'RGN', 'BWN', 'REP'].includes(code)) return AIRPORT_UNLOCK_LEVELS.SEA;
  if (['NRT', 'ICN', 'TPE', 'HKG', 'PVG', 'PEK', 'KIX', 'FUK', 'GMP', 'CAN'].includes(code)) return AIRPORT_UNLOCK_LEVELS.EAST_ASIA;
  if (['LHR', 'CDG', 'FRA', 'DXB', 'SYD', 'LAX', 'AMS', 'MAD', 'YYZ', 'GRU'].includes(code)) return AIRPORT_UNLOCK_LEVELS.FAR;
  return 1;
};