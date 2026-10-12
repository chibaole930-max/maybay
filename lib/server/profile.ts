import { kvGetJson } from './kv';
import { readDB, publicPilot, type Pilot, type Trade } from './onlineStore';
import type { PublicPilot } from './onlineStore';

/**
 * Ho so cong khai cua mot pilot: chi so, thanh tich giao dich, huy chuong.
 *
 * Server khong chay game engine nen **khong biet doi bay cu nguoi choi** —
 * chi lay duoc nhung gi client da bao len bang heartbeat (so may bay, so duong
 * bay, cap do, danh tieng). Nhung chi so do la du de dung bang thanh tich cong
 * khai; thong tin nhac (giao dich, huy chuong) lay tu DB online.
 */

/** Xep hang hien tai: 1 la nguoi gia tri cao nhat. */
async function rankOf(pilotId: string): Promise<{ rank: number; total: number }> {
  const db = await readDB();
  const sorted = [...db.pilots].sort((a, b) => b.value - a.value);
  const rank = sorted.findIndex((p) => p.id === pilotId) + 1;
  return { rank: rank || db.pilots.length + 1, total: db.pilots.length };
}

/** Huy chuong suy ra tu chi so hien co — khong luu rieng nen luon khop thuc te. */
export interface Achievement {
  id: string;
  label: string;
  detail: string;
}

export function achievementsFor(pilot: Pilot, trades: Trade[]): Achievement[] {
  const list: Achievement[] = [];
  const sold = trades.filter((t) => t.sellerId === pilot.id);
  const bought = trades.filter((t) => t.buyerId === pilot.id);

  if (pilot.level >= 3) list.push({ id: 'level3', label: 'Cấp 3', detail: `Đạt cấp ${pilot.level}.` });
  if (pilot.planes >= 5) list.push({ id: 'fleet5', label: 'Đội bay 5 máy', detail: `Sở hữu ${pilot.planes} máy bay.` });
  if (pilot.routes >= 5) list.push({ id: 'routes5', label: '5 đường bay', detail: `Đang khai thác ${pilot.routes} đường bay.` });
  if (pilot.value >= 50_000_000) list.push({ id: 'value50', label: 'Giá trị 50M', detail: 'Giá trị hãng đạt 50.000.000 $.' });
  if (pilot.reputation >= 90) list.push({ id: 'rep90', label: 'Danh tiếng 90', detail: `Danh tiếng ${pilot.reputation}/100.` });
  if (sold.length > 0) list.push({ id: 'sell1', label: 'Người bán', detail: `Đã bán ${sold.length} máy bay trên chợ.` });
  if (bought.length > 0) list.push({ id: 'buy1', label: 'Người mua', detail: `Đã mua ${bought.length} máy bay trên chợ.` });
  return list;
}

/**
 * Thông tin pilot trả ra ngoài. Cố tình **không** kèm `id` (khoá bản ghi) và
 * `username` — hồ sơ là trang công khai, chỉ cần mã hãng để người khác tìm.
 */
export type ProfilePilot = Omit<PublicPilot, 'id' | 'username'>;

export interface PilotProfile {
  pilot: ProfilePilot;
  rank: number;
  total: number;
  /** Giao dich gan nhat cua tai khoan nay (mua hoac ban). */
  trades: { id: string; model: string; price: number; at: number; side: 'mua' | 'ban'; counterparty: string }[];
  achievements: Achievement[];
  /** So giao dich hien tai: da ban / da mua. */
  tradeStats: { sold: number; bought: number; volume: number };
}

const MAX_PROFILE_TRADES = 20;

/** Bo khoa ban ghi va ten dang nhap — xem `ProfilePilot`. */
const profilePilotOf = (p: Pilot): ProfilePilot => {
  const { id: _id, username: _username, ...rest } = publicPilot(p);
  return rest;
};

/** Ho so cua chinh tai khoan dang dang nhap. */
export async function ownProfile(pilot: Pilot): Promise<PilotProfile> {
  const db = await readDB();
  const trades = db.trades.filter((t) => t.buyerId === pilot.id || t.sellerId === pilot.id).slice(-MAX_PROFILE_TRADES).reverse();
  const mine = db.trades.filter((t) => t.buyerId === pilot.id || t.sellerId === pilot.id);
  const { rank, total } = await rankOf(pilot.id);
  return {
    pilot: profilePilotOf(pilot),
    rank,
    total,
    trades: trades.map((t) => ({
      id: t.id, model: t.model, price: t.price, at: t.at,
      side: t.buyerId === pilot.id ? 'mua' : 'ban',
      counterparty: t.buyerId === pilot.id ? t.sellerName : t.buyerName,
    })),
    achievements: achievementsFor(pilot, mine),
    tradeStats: {
      sold: mine.filter((t) => t.sellerId === pilot.id).length,
      bought: mine.filter((t) => t.buyerId === pilot.id).length,
      volume: mine.reduce((sum, t) => sum + (t.buyerId === pilot.id || t.sellerId === pilot.id ? t.price : 0), 0),
    },
  };
}

/**
 * Ho so cua mot pilot khac, tim theo ma hang bay (`VNAxxxx`) — dung cho
 * tinh nang "xem ho so ban than". Tra `null` khi khong tim thay.
 */
export async function profileByCode(code: string): Promise<PilotProfile | null> {
  const wanted = String(code || '').trim().toUpperCase();
  const db = await readDB();
  const pilot = db.pilots.find((p) => p.code.toUpperCase() === wanted);
  if (!pilot) return null;
  const trades = db.trades.filter((t) => t.buyerId === pilot.id || t.sellerId === pilot.id).slice(-MAX_PROFILE_TRADES).reverse();
  const mine = db.trades.filter((t) => t.buyerId === pilot.id || t.sellerId === pilot.id);
  const { rank, total } = await rankOf(pilot.id);
  return {
    pilot: profilePilotOf(pilot),
    rank,
    total,
    // Ho so nguoi khac chi loai bo mat: khong lo ten doi tac cua giao dich.
    trades: trades.map((t) => ({
      id: t.id, model: t.model, price: t.price, at: t.at,
      side: t.buyerId === pilot.id ? 'mua' : 'ban',
      counterparty: '—',
    })),
    achievements: achievementsFor(pilot, mine),
    tradeStats: {
      sold: mine.filter((t) => t.sellerId === pilot.id).length,
      bought: mine.filter((t) => t.buyerId === pilot.id).length,
      volume: mine.reduce((sum, t) => sum + t.price, 0),
    },
  };
}

/**
 * Chi so rut gon cho mot pilot — dung khi client chi can vai con so
 * (khong tai ca lich su giao dich). Doc thang tu save cloud nen rong.
 *
 * Nhan `code` chu khong nhan `id` vi ho so cong khai khong lo `id` ra ngoai.
 */
export async function pilotStatsFromSave(code: string): Promise<{
  planes: { model: string; count: number }[];
  topRoutes: string[];
} | null> {
  const wanted = String(code || '').trim().toUpperCase();
  const db = await readDB();
  const pilot = db.pilots.find((p) => p.code.toUpperCase() === wanted);
  if (!pilot) return null;

  const save = await kvGetJson<{ state?: unknown } | null>(`vat:save:${pilot.id}`, null);
  const state = save?.state as { planes?: { model?: string }[]; routes?: { from: string; to: string }[] } | undefined;
  if (!state) return null;

  const byModel = new Map<string, number>();
  for (const plane of state.planes ?? []) {
    const model = String(plane?.model || '').slice(0, 40);
    if (!model) continue;
    byModel.set(model, (byModel.get(model) ?? 0) + 1);
  }
  return {
    planes: [...byModel].map(([model, count]) => ({ model, count })).slice(0, 10),
    topRoutes: (state.routes ?? [])
      .slice(0, 5)
      .map((r) => `${r.from} → ${r.to}`),
  };
}