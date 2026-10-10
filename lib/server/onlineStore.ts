import { randomUUID, randomBytes } from 'node:crypto';
import { kvGetJson, kvGetJsonEx, kvMutateJson, kvSetJson, kvSetJsonEx, kvSetJsonNx, kvDel, storageMode } from './kv';
import { hashPassword, verifyPassword } from './password';

/**
 * DB online cho moi tinh nang nhieu nguoi choi: BXH, cho may bay cu, lien minh, chat, dau gia.
 *
 * Backend la Vercel KV (REST) khi co env `KV_REST_API_URL` / `KV_REST_API_TOKEN`,
 * con lai ghi xuong file trong `data/kv/` de chay local / tren VPS.
 *
 * Luu y tinh toan ven: moi lan doc la doc lai tu KV (khong cache trong process, vi
 * serverless co the dung nhieu instance). Cac thao tac ghi di qua `kvMutateJson`
 * nen trong 1 instance van duoc xep hang cho ghi lan luot; ten dang nhap va session
 * dung `SET NX` cua Redis nen la nguyen tu that su.
 */

const DB_KEY = 'vat:db';
const SAVE_KEY = (pilotId: string) => `vat:save:${pilotId}`;
const SESSION_KEY = (token: string) => `vat:sess:${token}`;
const USERNAME_KEY = (username: string) => `vat:uname:${username}`;

const SESSION_TTL_SECONDS = 30 * 86400; // 30 ngay

export interface Pilot {
  id: string;
  /** Ma hang bay hien thi cong khai (dung trong BXH, chat, cho). */
  code: string;
  name: string;
  value: number;
  level: number;
  planes: number;
  routes: number;
  reputation: number;
  updatedAt: number;
  /** Ten dang nhap — chi co o tai khoan that. */
  username?: string;
  salt?: string;
  hash?: string;
  createdAt?: number;
}

export interface Listing { id: string; model: string; wear: number; price: number; seller: string; sellerId: string; createdAt: number; sold?: boolean; }
export interface Alliance { id: string; name: string; capacity: number; contribution: number; createdAt: number; }
export interface ChatMsg { id: string; room: string; sender: string; message: string; at: number; }
export interface SlotAuction { id: string; airport: string; price: number; bidder: string; endsAt: number; }

interface DB {
  pilots: Pilot[];
  listings: Listing[];
  alliances: Alliance[];
  members: { allianceId: string; pilotId: string }[];
  chat: ChatMsg[];
  auctions: SlotAuction[];
  seasonId: string;
  seasonEndsAt: number;
}

export const seasonIdFor = (now: number): string => {
  const d = new Date(now);
  const start = new Date(d.getFullYear(), d.getMonth(), 1).getTime();
  const idx = Math.floor((d.getTime() - start) / (30 * 86400000));
  return `${d.getFullYear()}-${d.getMonth() + 1}-S${idx + 1}`;
};

const seasonEndFor = (now: number): number => new Date(new Date(now).getFullYear(), new Date(now).getMonth() + 1, 0, 23, 59, 59).getTime();

/** Su kien toan server xoay vong theo gio thuc — client poll 60s/lan, khong can websocket. */
export function worldState(now = Date.now()) {
  const hour = new Date(now).getHours();
  const golden = hour >= 19 && hour < 21;
  return {
    demandMultiplier: golden ? 1.2 : 1,
    title: golden ? 'Tuan le vang toan server: nhu cau +20%' : 'Ngay thuong',
    golden,
    serverTime: now,
  };
}

const freshDB = (): DB => ({
  pilots: [], listings: [], alliances: [], members: [], chat: [], auctions: [],
  seasonId: seasonIdFor(Date.now()), seasonEndsAt: seasonEndFor(Date.now()),
});

const normalize = (raw: DB | null): DB => {
  const db = { ...freshDB(), ...(raw || {}) };
  return {
    pilots: Array.isArray(db.pilots) ? db.pilots : [],
    listings: Array.isArray(db.listings) ? db.listings : [],
    alliances: Array.isArray(db.alliances) ? db.alliances : [],
    members: Array.isArray(db.members) ? db.members : [],
    chat: Array.isArray(db.chat) ? db.chat : [],
    auctions: Array.isArray(db.auctions) ? db.auctions : [],
    seasonId: db.seasonId || seasonIdFor(Date.now()),
    seasonEndsAt: db.seasonEndsAt || seasonEndFor(Date.now()),
  };
};

const readDB = (): Promise<DB> => kvGetJson<DB>(DB_KEY, freshDB()).then(normalize);

/** Ban thong tin an toan de tra ve client (khong bao gio lo salt/hash). */
export const publicPilot = (p: Pilot) => ({
  id: p.id, code: p.code, name: p.name, value: p.value, level: p.level,
  planes: p.planes, routes: p.routes, reputation: p.reputation, updatedAt: p.updatedAt,
  username: p.username, createdAt: p.createdAt,
});

export type PublicPilot = ReturnType<typeof publicPilot>;

const newSessionToken = () => randomBytes(32).toString('base64url');

/** Mo phien dang nhap: tra token, luu vao KV kem han 30 ngay. */
export async function createSession(pilotId: string): Promise<string> {
  const token = newSessionToken();
  await kvSetJsonEx(SESSION_KEY(token), { pilotId, createdAt: Date.now() }, SESSION_TTL_SECONDS);
  return token;
}

export async function destroySession(token: string): Promise<void> {
  if (token) await kvDel(SESSION_KEY(token));
}

/** Token -> tai khoan. Tra `null` neu phien het han / khong ton tai. */
export async function resolveSession(token: string): Promise<Pilot | null> {
  if (!token) return null;
  const session = await kvGetJsonEx<{ pilotId?: string } | null>(SESSION_KEY(token), null);
  if (!session?.pilotId) return null;
  const db = await readDB();
  return db.pilots.find((p) => p.id === session.pilotId) ?? null;
}

export type RegisterResult =
  | { ok: true; pilot: Pilot; token: string }
  | { ok: false; error: string; field?: 'username' | 'password' | 'name' };

/** Dang ky tai khoan that: ten dang nhap + mat khau + ten hang bay. */
export async function registerAccount(input: { username: string; password: string; name: string }): Promise<RegisterResult> {
  const username = String(input.username || '').trim().toLowerCase();
  const name = String(input.name || '').trim().replace(/\s+/g, ' ');

  if (!/^[a-z0-9._-]{3,20}$/.test(username)) {
    return { ok: false, error: 'Ten dang nhap chi gom chu thuong, so, dau . _ - (3-20 ky tu).', field: 'username' };
  }
  if (String(input.password || '').length < 6) {
    return { ok: false, error: 'Mat khau can toi thieu 6 ky tu.', field: 'password' };
  }
  if (String(input.password || '').length > 72) {
    return { ok: false, error: 'Mat khau toi da 72 ky tu.', field: 'password' };
  }
  if (name.length < 3 || name.length > 32) {
    return { ok: false, error: 'Ten hang bay can tu 3 den 32 ky tu.', field: 'name' };
  }

  // Giu cho ten dang nhap truoc — atomic, 2 nguoi cung ten chi 1 nguoi vao duoc.
  const pilotId = randomUUID();
  const reserved = await kvSetJsonNx(USERNAME_KEY(username), pilotId);
  if (!reserved) return { ok: false, error: 'Ten dang nhap da co nguoi dung. Chon ten khac nhe.', field: 'username' };

  const { salt, hash } = hashPassword(String(input.password));
  const code = `VNA${randomBytes(2).toString('hex').toUpperCase().slice(0, 4)}`;
  const pilot: Pilot = {
    id: pilotId, code, name, value: 0, level: 1, planes: 0, routes: 0, reputation: 70,
    updatedAt: Date.now(), username, salt, hash, createdAt: Date.now(),
  };

  try {
    await kvMutateJson<DB, void>(DB_KEY, freshDB(), (raw) => {
      const db = normalize(raw);
      db.pilots.push(pilot);
      return { next: db, result: undefined };
    });
  } catch (err) {
    // Ghi DB loi thi tra lai ten dang nhap de khong bi chiem o uong.
    await kvDel(USERNAME_KEY(username));
    throw err;
  }

  const token = await createSession(pilot.id);
  return { ok: true, pilot, token };
}

export type LoginResult =
  | { ok: true; pilot: Pilot; token: string }
  | { ok: false; error: string; field?: 'username' | 'password' };

export async function loginWithPassword(input: { username: string; password: string }): Promise<LoginResult> {
  const username = String(input.username || '').trim().toLowerCase();
  const password = String(input.password || '');
  if (!username) return { ok: false, error: 'Nhap ten dang nhap.', field: 'username' };
  if (!password) return { ok: false, error: 'Nhap mat khau.', field: 'password' };

  const db = await readDB();
  const pilot = db.pilots.find((p) => p.username === username);
  // Cung mot thong bao cho ca "khong co tai khoan" va "sai mat khau" de khong lo
  // bi nguoi khac do xem ten dang nhap nao ton tai.
  if (!pilot || !pilot.username) return { ok: false, error: 'Ten dang nhap hoac mat khau khong dung.', field: 'password' };
  if (!pilot.salt || !pilot.hash || !verifyPassword(password, pilot.salt, pilot.hash)) {
    return { ok: false, error: 'Ten dang nhap hoac mat khau khong dung.', field: 'password' };
  }
  const token = await createSession(pilot.id);
  return { ok: true, pilot, token };
}

export async function changePassword(pilot: Pilot, current: string, next: string): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!pilot.salt || !pilot.hash || !verifyPassword(current, pilot.salt, pilot.hash)) {
    return { ok: false, error: 'Mat khau hien tai khong dung.' };
  }
  if (next.length < 6) return { ok: false, error: 'Mat khau moi can toi thieu 6 ky tu.' };
  const { salt, hash } = hashPassword(next);
  await kvMutateJson<DB, void>(DB_KEY, freshDB(), (raw) => {
    const db = normalize(raw);
    const target = db.pilots.find((p) => p.id === pilot.id);
    if (target) { target.salt = salt; target.hash = hash; }
    return { next: db, result: undefined };
  });
  return { ok: true };
}

/** Cap nhat BXH cho tai khoan dang dang nhap. */
export async function updatePilotStats(pilotId: string, input: { name?: string; value: number; level: number; planes: number; routes: number; reputation: number }): Promise<void> {
  await kvMutateJson<DB, void>(DB_KEY, freshDB(), (raw) => {
    const db = normalize(raw);
    const target = db.pilots.find((p) => p.id === pilotId);
    if (!target) return { next: db, result: undefined };
    if (input.name) target.name = input.name.slice(0, 32);
    target.value = Math.max(0, Math.min(1e13, input.value));
    target.level = Math.max(1, Math.min(100, input.level));
    target.planes = Math.max(0, Math.min(500, input.planes));
    target.routes = Math.max(0, Math.min(200, input.routes));
    target.reputation = Math.max(0, Math.min(100, input.reputation));
    target.updatedAt = Date.now();
    return { next: db, result: undefined };
  });
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
  const listing: Listing = {
    id: randomUUID(), model: model.slice(0, 40),
    wear: Math.max(0, Math.min(100, Math.round(wear))), price: Math.max(100000, Math.round(price)),
    seller: seller.name.slice(0, 32), sellerId: seller.id, createdAt: Date.now(),
  };
  await kvMutateJson<DB, void>(DB_KEY, freshDB(), (raw) => {
    const db = normalize(raw);
    db.listings.unshift(listing);
    return { next: db, result: undefined };
  });
  return listing;
}

export async function buyListing(buyer: Pilot, id: string): Promise<{ ok: true; listing: Listing } | { ok: false; error: string }> {
  return kvMutateJson<DB, { ok: true; listing: Listing } | { ok: false; error: string }>(DB_KEY, freshDB(), (raw) => {
    const db = normalize(raw);
    const listing = db.listings.find((l) => l.id === id && !l.sold);
    if (!listing) {
      return { next: db, result: { ok: false as const, error: 'Tin rao da ban hoac khong ton tai.' } };
    }
    if (listing.sellerId === buyer.id) {
      return { next: db, result: { ok: false as const, error: 'Khong the mua chinh may bay cua minh.' } };
    }
    listing.sold = true;
    return { next: db, result: { ok: true as const, listing } };
  });
}

export async function getAlliance(): Promise<{ alliance: Alliance | null; members: number }> {
  const db = await readDB();
  const alliance = db.alliances[0] ?? null;
  const members = alliance ? db.members.filter((m) => m.allianceId === alliance.id).length : 0;
  return { alliance, members };
}

export async function joinAlliance(pilot: Pilot): Promise<number> {
  return kvMutateJson<DB, number>(DB_KEY, freshDB(), (raw) => {
    const db = normalize(raw);
    let alliance = db.alliances[0];
    if (!alliance) {
      alliance = { id: randomUUID(), name: 'Lien minh May Trang', capacity: 50, contribution: 0, createdAt: Date.now() };
      db.alliances.push(alliance);
    }
    if (!db.members.some((m) => m.allianceId === alliance!.id && m.pilotId === pilot.id)) {
      db.members.push({ allianceId: alliance.id, pilotId: pilot.id });
      alliance.contribution += 10;
    }
    return { next: db, result: db.members.filter((m) => m.allianceId === alliance!.id).length };
  });
}

export async function postChat(sender: string, message: string, room = 'lien-minh'): Promise<ChatMsg> {
  const msg: ChatMsg = { id: randomUUID(), room, sender: sender.slice(0, 32), message: message.slice(0, 200), at: Date.now() };
  await kvMutateJson<DB, void>(DB_KEY, freshDB(), (raw) => {
    const db = normalize(raw);
    db.chat.push(msg);
    db.chat = db.chat.slice(-200);
    return { next: db, result: undefined };
  });
  return msg;
}

export async function getChat(since = 0, room = 'lien-minh'): Promise<ChatMsg[]> {
  const db = await readDB();
  return db.chat.filter((m) => m.room === room && m.at > since).slice(-50);
}

export async function getSeason(): Promise<{ id: string; endsAt: number; ranks: { code: string; name: string; value: number }[] }> {
  const db = await readDB();
  const ranks = [...db.pilots].sort((a, b) => b.value - a.value).slice(0, 10)
    .map((p) => ({ code: p.code, name: p.name, value: p.value }));
  return { id: db.seasonId, endsAt: db.seasonEndsAt, ranks };
}

/** Luu / doc tien do game dang nhap, de chuyen tiep giua cac thiet bi. */
export interface CloudSave { state: unknown; updatedAt: number; version: number }

export async function putCloudSave(pilotId: string, state: unknown): Promise<CloudSave> {
  const previous = await kvGetJson<CloudSave | null>(SAVE_KEY(pilotId), null);
  const save: CloudSave = { state, updatedAt: Date.now(), version: (previous?.version ?? 0) + 1 };
  await kvSetJson(SAVE_KEY(pilotId), save);
  return save;
}

export async function getCloudSave(pilotId: string): Promise<CloudSave | null> {
  return kvGetJson<CloudSave | null>(SAVE_KEY(pilotId), null);
}

export const storageInfo = () => storageMode;
