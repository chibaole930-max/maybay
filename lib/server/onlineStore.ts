import { promises as fs } from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

/** DB file chung cho mọi tính năng online. Chạy tốt trên hosting 1 instance (VPS / Node hosting).
 *  Dùng hàng đợi ghi tuần tự để tránh race khi 2 request ghi cùng lúc.
 *  Muốn scale nhiều instance thì thay file này bằng Postgres/Supabase, giữ nguyên API. */

const DATA_DIR = path.join(process.cwd(), 'data');
const DATA_FILE = path.join(DATA_DIR, 'online.json');

export interface Pilot { id: string; code: string; name: string; token: string; value: number; level: number; planes: number; routes: number; reputation: number; updatedAt: number; }
export interface Listing { id: string; model: string; wear: number; price: number; seller: string; sellerId: string; createdAt: number; sold?: boolean; }
export interface Alliance { id: string; name: string; capacity: number; contribution: number; createdAt: number; }
export interface ChatMsg { id: string; room: string; sender: string; message: string; at: number; }
export interface SlotAuction { id: string; airport: string; price: number; bidder: string; endsAt: number; }

interface DB { pilots: Pilot[]; listings: Listing[]; alliances: Alliance[]; members: { allianceId: string; pilotId: string }[]; chat: ChatMsg[]; auctions: SlotAuction[]; seasonId: string; seasonEndsAt: number; }

const freshDB = (): DB => ({ pilots: [], listings: [], alliances: [], members: [], chat: [], auctions: [], seasonId: seasonIdFor(Date.now()), seasonEndsAt: seasonEndFor(Date.now()) });

export const seasonIdFor = (now: number): string => {
  const d = new Date(now);
  const start = new Date(d.getFullYear(), d.getMonth(), 1).getTime();
  const idx = Math.floor((d.getTime() - start) / (30 * 86400000));
  return `${d.getFullYear()}-${d.getMonth() + 1}-S${idx + 1}`;
};
const seasonEndFor = (now: number): number => {
  const d = new Date(now);
  const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59).getTime();
  return end;
};

/** Sự kiện toàn server xoay vòng theo giờ thực — client poll 60s/lần, không cần websocket. */
export function worldState(now = Date.now()) {
  const hour = new Date(now).getHours();
  // Tuần lễ vàng: 19h-21h mỗi ngày nhu cầu +20%.
  const golden = hour >= 19 && hour < 21;
  return {
    demandMultiplier: golden ? 1.2 : 1,
    title: golden ? 'Tuần lễ vàng toàn server: nhu cầu +20%' : 'Ngày thường',
    golden,
    serverTime: now,
  };
}

let cache: DB | null = null;
let writeQueue: Promise<void> = Promise.resolve();

async function readDB(): Promise<DB> {
  if (cache) return cache;
  try {
    const raw = await fs.readFile(DATA_FILE, 'utf8');
    const parsed = JSON.parse(raw) as DB;
    cache = { ...freshDB(), ...parsed };
  } catch { cache = freshDB(); }
  // Roll mùa mới khi sang tháng/kỳ mới.
  const cur = seasonIdFor(Date.now());
  if (cache.seasonId !== cur) { cache.seasonId = cur; cache.seasonEndsAt = seasonEndFor(Date.now()); persist(); }
  return cache;
}

function persist(): Promise<void> {
  const snapshot = JSON.stringify(cache ?? freshDB());
  writeQueue = writeQueue.then(() => fs.mkdir(DATA_DIR, { recursive: true }).then(() => fs.writeFile(DATA_FILE, snapshot, 'utf8'))).catch(() => {});
  return writeQueue;
}

export async function upsertPilot(input: { code: string; name: string; value: number; level: number; planes: number; routes: number; reputation: number }): Promise<Pilot> {
  const db = await readDB();
  const code = input.code.toUpperCase().slice(0, 12);
  let pilot = db.pilots.find((p) => p.code === code);
  if (!pilot) {
    pilot = { id: randomUUID(), code, name: input.name.slice(0, 32), token: randomUUID().replace(/-/g, ''), value: input.value, level: input.level, planes: input.planes, routes: input.routes, reputation: input.reputation, updatedAt: Date.now() };
    db.pilots.push(pilot);
  } else {
    Object.assign(pilot, { name: input.name.slice(0, 32), value: input.value, level: input.level, planes: input.planes, routes: input.routes, reputation: input.reputation, updatedAt: Date.now() });
  }
  await persist();
  return pilot;
}

export async function authPilot(code: string, name: string): Promise<Pilot> {
  return upsertPilot({ code: code || `VNA${Math.random().toString(36).slice(2, 6).toUpperCase()}`, name: name || 'Hãng mới', value: 0, level: 1, planes: 0, routes: 0, reputation: 70 });
}

export async function verifyToken(token: string): Promise<Pilot | null> {
  if (!token) return null;
  const db = await readDB();
  return db.pilots.find((p) => p.token === token) ?? null;
}

export async function leaderboard(limit = 50): Promise<Pilot[]> {
  const db = await readDB();
  return [...db.pilots].sort((a, b) => b.value - a.value).slice(0, limit);
}

export async function listMarket(): Promise<Listing[]> {
  const db = await readDB();
  return db.listings.filter((l) => !l.sold).sort((a, b) => b.createdAt - a.createdAt).slice(0, 30);
}

export async function postListing(seller: Pilot, model: string, wear: number, price: number): Promise<Listing> {
  const db = await readDB();
  const listing: Listing = { id: randomUUID(), model: model.slice(0, 40), wear: Math.max(0, Math.min(100, Math.round(wear))), price: Math.max(100000, Math.round(price)), seller: seller.name.slice(0, 32), sellerId: seller.id, createdAt: Date.now() };
  db.listings.unshift(listing);
  await persist();
  return listing;
}

export async function buyListing(buyer: Pilot, id: string): Promise<{ ok: true; listing: Listing } | { ok: false; error: string }> {
  const db = await readDB();
  const listing = db.listings.find((l) => l.id === id && !l.sold);
  if (!listing) return { ok: false, error: 'Tin rao đã bán hoặc không tồn tại.' };
  if (listing.sellerId === buyer.id) return { ok: false, error: 'Không thể mua chính máy bay của mình.' };
  listing.sold = true;
  await persist();
  return { ok: true, listing };
}

export async function getAlliance(): Promise<{ alliance: Alliance | null; members: number }> {
  const db = await readDB();
  let alliance = db.alliances[0] ?? null;
  if (!alliance) {
    alliance = { id: randomUUID(), name: 'Liên minh Mây Trắng', capacity: 50, contribution: 0, createdAt: Date.now() };
    db.alliances.push(alliance);
    await persist();
  }
  const members = db.members.filter((m) => m.allianceId === alliance!.id).length;
  return { alliance, members };
}

export async function joinAlliance(pilot: Pilot): Promise<number> {
  const db = await readDB();
  const { alliance } = await getAlliance();
  if (!db.members.some((m) => m.allianceId === alliance!.id && m.pilotId === pilot.id)) {
    db.members.push({ allianceId: alliance!.id, pilotId: pilot.id });
    alliance!.contribution += 10;
    await persist();
  }
  return db.members.filter((m) => m.allianceId === alliance!.id).length;
}

export async function postChat(sender: string, message: string, room = 'lien-minh'): Promise<ChatMsg> {
  const db = await readDB();
  const msg: ChatMsg = { id: randomUUID(), room, sender: sender.slice(0, 32), message: message.slice(0, 200), at: Date.now() };
  db.chat.push(msg);
  db.chat = db.chat.slice(-200);
  await persist();
  return msg;
}

export async function getChat(since = 0, room = 'lien-minh'): Promise<ChatMsg[]> {
  const db = await readDB();
  return db.chat.filter((m) => m.room === room && m.at > since).slice(-50);
}

export async function getSeason(): Promise<{ id: string; endsAt: number; ranks: { code: string; name: string; value: number }[] }> {
  const db = await readDB();
  const ranks = [...db.pilots].sort((a, b) => b.value - a.value).slice(0, 10).map((p) => ({ code: p.code, name: p.name, value: p.value }));
  return { id: db.seasonId, endsAt: db.seasonEndsAt, ranks };
}
