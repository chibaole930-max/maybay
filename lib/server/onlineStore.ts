import { randomUUID, randomBytes } from 'node:crypto';
import { kvGetJson, kvGetJsonWithTtl, kvMutateJson, kvSetJsonEx, kvSetJsonNx, kvDel, storageMode } from './kv';
import { checkDisplayName, normalizeDisplayName } from './accountNames';
import { checkPassword, checkUsername, hashPassword, normalizeUsername, verifyPassword } from './password';
// `inbox` chỉ import *kiểu* `Pilot` nên không có vòng import lúc chạy.
import { pushToMany } from './inbox';

/** Ngay theo lich dung UTC — may chu chay o vung gio khac nhau van thong nhat. */
export const dayKeyFor = (now: number): string => new Date(now).toISOString().slice(0, 10);

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

/**
 * Gioi han so mau moi giu lai. `vat:db` la MOT key duy nhat chua toan bo database,
 * nen Upstash Redis (tran ~1MB/key) se no khi danh sach phinh khong doi.
 * Thua duoc cat bo cac ban ghi da ban / het han truoc khi ghi lai.
 */
const MAX_LISTINGS = 60;
const MAX_SOLD_LISTINGS = 20;
const MAX_MEMBERS = 200;
const MAX_CHAT = 200;

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
  /** Email (chi con o tai khoan cu thoi Firebase; tai khoan moi khong can). */
  email?: string;
  /**
   * UID Firebase cu (giua lai de tuong thich du lieu). Tai khoan moi dung
   * `salt`/`hash` scrypt tu quan; mat khau khong bao gio roi khoi may chu.
   */
  firebaseUid?: string;
  salt?: string;
  hash?: string;
  createdAt?: number;
  /**
   * Token phien cap nhat moi khi doi mat khau. Session luu luu `epoch` luc tao;
   * doi mat khau tang gia tri nay nen moi phien cu bi bo — khong con phien nao
   * cua nguoi gap quyen truy cap duoc sau khi doi mat khau.
   */
  authEpoch?: number;
  /** So lan doi mat khau — dung de chan gia suy doan. */
  passwordChangedAt?: number;
  /** Cho phep client tang gia tri BXH toi da bao nhieu lan trong mot khoang thoi gian. */
  creditUsed?: number;
  creditWindowAt?: number;
  /** Số slot sân bay đã thắng qua đấu giá. */
  slots?: number;
  /**
 * Chi so cao nhat da dat trong ngay, tach theo tung loai — dung tinh tien do
 * nhiem vu hang ngay. `bestToday.value` chi la muc cua gia tri hang, khong phai
 * "chi so lon nhat trong ngay" chung chung (do loi do day se lam sai tien do).
 */
  bestToday?: { day: string; value: number; level: number; planes: number; routes: number };
  /**
   * Chi so luc 0h cua ngay — dung lam moc cho bo nhiemvu. Chi gan mot lan
   * trong ngay, xem `lib/server/missions.ts`.
   */
  baselineToday?: { day: string; value: number; level: number; planes: number; routes: number };
  /** Nhiemvu -> ngay da nhan thuong. Giu cung ban ghi nen khong nhai duoc. */
  claimedMissions?: Record<string, string>;
}

export interface Listing {
  id: string; model: string; wear: number; price: number;
  seller: string; sellerId: string; createdAt: number;
  sold?: boolean;
  /** Luu lai khi ban xong de hien thi lich su giao dich. */
  buyerId?: string;
  soldAt?: number;
}
export interface Alliance { id: string; name: string; capacity: number; contribution: number; createdAt: number; }
export interface ChatMsg {
  id: string; room: string; sender: string; message: string; at: number;
  /** Dung de rate limit theo nguoi gui — khong tien cho viec xem `sender`. */
  senderId?: string;
}
/**
 * Phien dau gia slot sân bay.
 *
 * Nguoi dang gia da bi tru `escrowed` ngay luc dat — xem `lib/server/auction.ts`
 * de biet co che ky quy va khi nao tien duoc hoan.
 */
export interface SlotAuction {
  id: string;
  airport: string;
  /** Gia hien tai — muc dau cao nhat tinh toi thoi diem nay. */
  price: number;
  /** So slot dang rao; thang se cong vao `pilot.slots`. */
  slots: number;
  /** Ma hang cua nguoi dang giu gia cao nhat. Rong = chua ai dau vao. */
  bidder: string;
  bidderId: string;
  bidderName: string;
  /** Ai mo phien dau gia — nguoi nay khong bi tru tien luc mo. */
  openerId: string;
  /** So tien da bi giu khoai tu nguoi dang gia. */
  escrowed: number;
  endsAt: number;
}

/**
 * Mot lan mua ban tren cho may bay cu.
 * `vat:db` la mot key duy nhat nen chi giu gan nhat mot chuc ban ghi cho moi ben.
 */
export interface Trade {
  id: string;
  listingId: string;
  model: string;
  price: number;
  buyerId: string;
  buyerName: string;
  sellerId: string;
  sellerName: string;
  at: number;
}

interface DB {
  pilots: Pilot[];
  listings: Listing[];
  alliances: Alliance[];
  members: { allianceId: string; pilotId: string }[];
  chat: ChatMsg[];
  auctions: SlotAuction[];
  trades: Trade[];
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

/**
 * Su kien toan server xoay vong theo gio thuc — client poll 60s/lan, khong can websocket.
 *
 * `worldState` la dong bo vi thoi su kien khong can doc DB; phan dem nguoi choi
 * thi tach ra `presence()` — cai do doc `vat:db`, nen endpoint phai `await`.
 */
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

/**
 * So nguoi choi dang online THAT, tinh tu heartbeat cua client.
 *
 * Client `useOnlineSync` bao cap moi 60s (`updatePilotStats` gan `updatedAt`),
 * nen mot tai khoan co `updatedAt` trong 5 phut la dang mo game. Cu so sanh do
 * chinh la nguoi dang choi, khong phai so tai khoan da tung dang ky.
 *
 * `activeToday` dung 24 gio giong muc "X/Y hang dang choi" o trang nhiem vu.
 */
const PRESENCE_WINDOW_MS = 5 * 60 * 1000;
const ACTIVE_TODAY_MS = 24 * 60 * 60 * 1000;

export async function presence(now = Date.now()) {
  const db = await readDB();
  const online = db.pilots.filter((p) => p.updatedAt > now - PRESENCE_WINDOW_MS);
  const active = db.pilots.filter((p) => p.updatedAt > now - ACTIVE_TODAY_MS);
  return {
    online: online.length,
    activeToday: active.length,
    total: db.pilots.length,
    totalPlanes: online.reduce((sum, p) => sum + p.planes, 0),
    totalRoutes: online.reduce((sum, p) => sum + p.routes, 0),
  };
}

const freshDB = (): DB => ({
  pilots: [], listings: [], alliances: [], members: [], chat: [], auctions: [], trades: [],
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
    trades: Array.isArray(db.trades) ? db.trades : [],
    seasonId: db.seasonId || seasonIdFor(Date.now()),
    seasonEndsAt: db.seasonEndsAt || seasonEndFor(Date.now()),
  };
};

/**
 * Gioi han lich su giao dich. `vat:db` la mot key duy nhat nen phai cat.
 * 200 ban ghi la du de moi tai khoan xem lai lich su gan nhat cua minh.
 */
const MAX_TRADES = 200;

export const readDB = (): Promise<DB> => kvGetJson<DB>(DB_KEY, freshDB()).then(normalize);

/**
 * Doc -> sua -> ghi `vat:db` trong mot luot.
 *
 * Ham nay boc lai `kvMutateJson` va **tu dien `freshDB()`** nen thoi gian luu
 * nham lung: truyen mot `fallback` rong se ngay lap tuc xoa sach database khi
 * key chua co. Dung ham nay thay vi goi `kvMutateJson(DB_KEY, ...)` truc tiep.
 */
export function mutateDB<R>(mutate: (db: DB) => R | Promise<R>): Promise<R> {
  return kvMutateJson<DB, R>(DB_KEY, freshDB(), (raw) => {
    const db = normalize(raw);
    const result = mutate(db);
    return Promise.resolve(result).then((value) => ({ next: db, result: value }));
  });
}

/** Ban thong tin an toan de tra ve client (khong bao gio lo uid/salt/hash). */
export const publicPilot = (p: Pilot) => ({
  id: p.id, code: p.code, name: p.name, value: p.value, level: p.level,
  planes: p.planes, routes: p.routes, reputation: p.reputation, updatedAt: p.updatedAt,
  username: p.username, createdAt: p.createdAt,
});

/** Chi tieu dang nhap: dung cho phien va hien thi tren man hinh. */
export const accountOf = (p: Pilot) => ({
  id: p.id, code: p.code, name: p.name,
  username: p.username, email: p.email, createdAt: p.createdAt,
});

export type PublicPilot = ReturnType<typeof publicPilot>;

const newSessionToken = () => randomBytes(32).toString('base64url');

/** Mo phien dang nhap: tra token, luu vao KV kem han 30 ngay. */
export async function createSession(pilotId: string, epoch = 0): Promise<string> {
  const token = newSessionToken();
  // Luu `epoch` cua tai khoan luc mo phien. Doi mat khau tang epoch nen phien cu
  // (ke ca token bi gui lai) se khong con khop o buoc `resolveSession`.
  await kvSetJsonEx(SESSION_KEY(token), { pilotId, epoch, createdAt: Date.now() }, SESSION_TTL_SECONDS);
  return token;
}

export async function destroySession(token: string): Promise<void> {
  if (token) await kvDel(SESSION_KEY(token));
}

/**
 * Token -> tai khoan. Tra `null` neu phien het han / khong ton tai / da bi thu hoi
 * (sau khi doi mat khau).
 */
export async function resolveSession(token: string): Promise<Pilot | null> {
  if (!token) return null;
  const session = await kvGetJsonWithTtl<{ pilotId?: string; epoch?: number } | null>(SESSION_KEY(token), null);
  if (!session?.pilotId) return null;
  const db = await readDB();
  const pilot = db.pilots.find((p) => p.id === session.pilotId);
  if (!pilot) return null;
  // Phien cap truoc lan doi mat khau gan nhat -> da bi thu hoi.
  if ((session.epoch ?? 0) !== (pilot.authEpoch ?? 0)) return null;
  return pilot;
}

/**
 * Dang ky tai khoan mat khau tu quan (khong vendor).
 *
 * Giu cho ten dang nhap truoc bang `SET NX` — nguyen tu that su — nen 2 nguoi
 * cung ten chi 1 nguoi vao duoc; ghi DB loi thi tra lai ten de khong chiem o.
 * Ten da co (ke ca tai khoan Firebase cu khong mat khau) deu bi tu choi — chong
 * mao danh. Luat kiem tra tap trung trong `password.ts` / `accountNames.ts`.
 */
export type RegisterResult =
  | { ok: true; pilot: Pilot; token: string }
  | { ok: false; error: string; field?: 'username' | 'password' | 'name' };

export async function registerAccount(input: { username: string; password: string; name: string }): Promise<RegisterResult> {
  const username = normalizeUsername(input.username);
  const name = normalizeDisplayName(input.name);

  const usernameError = checkUsername(username);
  if (usernameError) return { ok: false, error: usernameError, field: 'username' };
  const passwordError = checkPassword(String(input.password || ''));
  if (passwordError) return { ok: false, error: passwordError, field: 'password' };
  const nameError = checkDisplayName(name);
  if (nameError) return { ok: false, error: nameError, field: 'name' };

  const pilotId = randomUUID();
  // Ten cua tai khoan Firebase cu (khong mat khau, khong co khoa NX) van phai
  // giu — neu khong, nguoi khac dang ky trung ten se mao danh duoc. Kiem tra DB
  // truoc (duong nhanh), khoa NX (chong dua dong thoi), roi kiem lai trong
  // mutate (chong TOCTOU) truoc khi day vao.
  const existing = (await readDB()).pilots.find((p) => p.username === username);
  if (existing) return { ok: false, error: 'Ten dang nhap da co nguoi dung. Chon ten khac nhe.', field: 'username' };
  const reserved = await kvSetJsonNx(USERNAME_KEY(username), pilotId);
  if (!reserved) return { ok: false, error: 'Ten dang nhap da co nguoi dung. Chon ten khac nhe.', field: 'username' };

  const { salt, hash } = await hashPassword(String(input.password));
  const code = `VNA${randomBytes(2).toString('hex').toUpperCase().slice(0, 4)}`;
  const pilot: Pilot = {
    id: pilotId, code, name, value: 0, level: 1, planes: 0, routes: 0, reputation: 70,
    updatedAt: Date.now(), username, salt, hash, createdAt: Date.now(),
  };

  try {
    await kvMutateJson<DB, void>(DB_KEY, freshDB(), (raw) => {
      const db = normalize(raw);
      if (db.pilots.some((p) => p.username === username && p.id !== pilotId)) {
        throw new Error('USERNAME_TAKEN');
      }
      db.pilots.push(pilot);
      return { next: db, result: undefined };
    });
  } catch (err) {
    // Ghi DB loi thi tra lai ten dang nhap de khong bi chiem o uong.
    await kvDel(USERNAME_KEY(username));
    if (err instanceof Error && err.message === 'USERNAME_TAKEN') {
      return { ok: false, error: 'Ten dang nhap da co nguoi dung. Chon ten khac nhe.', field: 'username' };
    }
    throw err;
  }


  const token = await createSession(pilot.id, pilot.authEpoch ?? 0);
  return { ok: true, pilot, token };
}

export type LoginResult =
  | { ok: true; pilot: Pilot; token: string }
  | { ok: false; error: string; field?: 'username' | 'password' };

export async function loginWithPassword(input: { username: string; password: string }): Promise<LoginResult> {
  const username = normalizeUsername(input.username);
  const password = String(input.password || '');
  if (!username) return { ok: false, error: 'Nhap ten dang nhap.', field: 'username' };
  if (!password) return { ok: false, error: 'Nhap mat khau.', field: 'password' };

  const db = await readDB();
  const pilot = db.pilots.find((p) => p.username === username);
  // Cung mot thong bao cho ca "khong co tai khoan", "chua dat mat khau" (tai
  // khoan Firebase cu) va "sai mat khau" — khong lo bi do ten ton tai.
  if (!pilot || !pilot.username) return { ok: false, error: 'Ten dang nhap hoac mat khau khong dung.', field: 'password' };
  if (!pilot.salt || !pilot.hash || !(await verifyPassword(password, pilot.salt, pilot.hash))) {
    return { ok: false, error: 'Ten dang nhap hoac mat khau khong dung.', field: 'password' };
  }
  const token = await createSession(pilot.id, pilot.authEpoch ?? 0);
  return { ok: true, pilot, token };
}

export async function changePassword(pilot: Pilot, current: string, next: string): Promise<{ ok: true; sessionEpoch: number } | { ok: false; error: string }> {
  if (!pilot.salt || !pilot.hash || !(await verifyPassword(String(current || ''), pilot.salt, pilot.hash))) {
    return { ok: false, error: 'Mat khau hien tai khong dung.' };
  }
  const problem = checkPassword(String(next || ''));
  if (problem) return { ok: false, error: problem };
  if (next === current) return { ok: false, error: 'Mat khau moi phai khac mat khau hien tai.' };

  const { salt, hash } = await hashPassword(next);
  const epoch = await kvMutateJson<DB, number>(DB_KEY, freshDB(), (raw) => {
    const db = normalize(raw);
    const target = db.pilots.find((p) => p.id === pilot.id);
    if (!target) return { next: db, result: 0 };
    target.salt = salt;
    target.hash = hash;
    target.authEpoch = (target.authEpoch ?? 0) + 1;
    target.passwordChangedAt = Date.now();
    return { next: db, result: target.authEpoch };
  });
  return { ok: true, sessionEpoch: epoch };
}

/**
 * Thu hoi moi phien dang nhap cua mot tai khoan (dung sau khi doi mat khau).
 * Tang `authEpoch` nen **moi phien cu deu mat hieu luc**, ke ca tren may khac.
 */
export async function revokeSessions(pilot: Pilot): Promise<{ ok: true; sessionEpoch: number } | { ok: false; error: string }> {
  const epoch = await mutateDB((db) => {
    const target = db.pilots.find((p) => p.id === pilot.id);
    if (!target) return 0;
    target.authEpoch = (target.authEpoch ?? 0) + 1;
    target.passwordChangedAt = Date.now();
    return target.authEpoch;
  });
  return { ok: true, sessionEpoch: epoch };
}

/**
 * Chan client tu khai gia tri BXH.
 *
 * Server khong chay game engine nen khong biet nguoi choi "chay" bao lau, nen
 * dung han muc **theo ti le** tren tai san hien tai: trong 30 phut, gia tri duoc
 * cong toi da bang chinh no.
 *
 * - `TIME_SCALE = 60` nen 1 gio thuc = 60 gio game, nguoi choi thon nhat co tho
 *   nhieu hon 100% tai san moi 30 phut — muc nay khong can canh.
 * - Do la nguoi sua `value` trong DevTools hoac goi thang API se khong lo len
 *   duoc; muon tang phai cham theo muc, tuc ton thoi gian that.
 *
 * Gia tri **gia tang** moi bi chiem. Client bao nho hon cap (do mua may bay, chi
 * phi) thi giu nguyen gia tri server da cong — dung nghia "gia tri lon nhat da
 * dat duoc" va tranh viec mua may bay lam ho so diem.
 */
const CREDIT_WINDOW_MS = 30 * 60 * 1000;
const CREDIT_BASE = 2_000_000;
const CREDIT_RATIO = 1;

/** Han muc cong duoc trong khoang hien tai, tinh tren tai san hien co. */
export function creditAllowance(value: number, level: number): number {
  // Cap do chi nhan them mot phan nho — muc tang chinh den tu tai san, de tai khoan
  // cap cao khong vuot duoc tai khoan lon hon chi bang cach leo cap.
  return Math.round((CREDIT_BASE + value * CREDIT_RATIO) * (1 + Math.max(0, level - 1) * 0.02));
}

export interface PilotStatsResult {
  /** Gia tri BXH server chap nhan (da cham kien han muc cong). */
  value: number;
  /** Client bao nhieu ma bi chan — client nen biet de hien thi canh bao. */
  clamped: boolean;
}

/** Cap nhat BXH cho tai khoan dang dang nhap. */
export async function updatePilotStats(pilotId: string, input: { name?: string; value: number; level: number; planes: number; routes: number; reputation: number }): Promise<PilotStatsResult> {
  const now = Date.now();
  return kvMutateJson<DB, PilotStatsResult>(DB_KEY, freshDB(), (raw) => {
    const db = normalize(raw);
    const target = db.pilots.find((p) => p.id === pilotId);
    if (!target) return { next: db, result: { value: 0, clamped: false } };

    if (input.name) target.name = checkDisplayName(input.name) ? target.name : normalizeDisplayName(input.name);

    const claimed = Math.max(0, Math.min(1e13, input.value));
    // Reset so da khi sang khoang moi.
    if (now - (target.creditWindowAt ?? 0) > CREDIT_WINDOW_MS) {
      target.creditWindowAt = now;
      target.creditUsed = 0;
    }
    const used = target.creditUsed ?? 0;
    const allowance = creditAllowance(target.value, target.level);
    const growth = Math.max(0, claimed - target.value);
    const accepted = Math.min(growth, Math.max(0, allowance - used));
    target.value = Math.min(1e13, target.value + accepted);
    target.creditUsed = used + accepted;

    target.level = Math.max(1, Math.min(100, input.level));
    target.planes = Math.max(0, Math.min(500, input.planes));
    target.routes = Math.max(0, Math.min(200, input.routes));
    target.reputation = Math.max(0, Math.min(100, input.reputation));
    target.updatedAt = now;

    // Luu chi so cao nhat cua hom nay cho nhiem vu hang ngay. Dung `target`
    // (gia tri da qua kiem han muc cong) chu khong dung `claimed` cua client.
    const day = dayKeyFor(now);
    const freshDay = target.bestToday?.day !== day;
    const prev = freshDay ? { value: 0, level: 0, planes: 0, routes: 0 } : (target.bestToday ?? { value: 0, level: 0, planes: 0, routes: 0 });
    target.bestToday = {
      day,
      value: Math.max(prev.value, target.value),
      level: Math.max(prev.level, target.level),
      planes: Math.max(prev.planes, target.planes),
      routes: Math.max(prev.routes, target.routes),
    };

    return { next: db, result: { value: target.value, clamped: target.value < claimed } };
  });
}

export async function leaderboard(limit = 50): Promise<Pilot[]> {
  const db = await readDB();
  return [...db.pilots].sort((a, b) => b.value - a.value).slice(0, limit);
}

/**
 * Cat danh sach tin rao cho khop gioi han.
 * `vat:db` la mot key duy nhat, Upstash Redis tran ~1MB/key — tin rao giu lai vo
 * han se lam no loai cac ban ghi khac (ca danh sach pilot). Chi giu tin dang ban
 * va mot so tin da ban gan nhat.
 */
function pruneListings(listings: Listing[]): Listing[] {
  const open = listings.filter((l) => !l.sold);
  const sold = listings.filter((l) => l.sold).slice(0, MAX_SOLD_LISTINGS);
  return [...open.slice(0, MAX_LISTINGS), ...sold];
}

export async function listMarket(): Promise<Listing[]> {
  const db = await readDB();
  return db.listings.filter((l) => !l.sold).sort((a, b) => b.createdAt - a.createdAt).slice(0, 30);
}

export type SellResult = { ok: true; listing: Listing } | { ok: false; error: string };

export async function postListing(seller: Pilot, model: string, wear: number, price: number): Promise<SellResult> {
  const cleanModel = String(model || '').trim().slice(0, 40);
  if (cleanModel.length < 2) return { ok: false, error: 'Ten may bay qua ngan.' };

  return kvMutateJson<DB, SellResult>(DB_KEY, freshDB(), (raw) => {
    const db = normalize(raw);
    const open = db.listings.filter((l) => !l.sold).length;
    if (open >= MAX_LISTINGS) return { next: db, result: { ok: false as const, error: 'Cho may bay da day. Ban het so may bay cua ban truoc.' } };
    // Mot nguoi khong duoc nho gap de lam chan giao dich.
    if (db.listings.filter((l) => !l.sold && l.sellerId === seller.id).length >= 5) {
      return { next: db, result: { ok: false as const, error: 'Ban da co 5 tin dang ban. Chi mot tin moi moi duoc dang.' } };
    }
    const listing: Listing = {
      id: randomUUID(), model: cleanModel,
      wear: Math.max(0, Math.min(100, Math.round(wear))), price: Math.max(100000, Math.round(price)),
      seller: seller.name.slice(0, 32), sellerId: seller.id, createdAt: Date.now(),
    };
    db.listings.unshift(listing);
    db.listings = pruneListings(db.listings);
    return { next: db, result: { ok: true as const, listing } };
  });
}

/**
 * Mua tin rao. **Chuyen tien that** trong cung mot luot ghi: tru gia tien cua
 * nguoi mua va cong vao tai khoan nguoi ban. Truoc day chi gan co `sold` nen
 * may bay den tay nguoi mua mien phi.
 */
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
    const buyerRow = db.pilots.find((p) => p.id === buyer.id);
    if (!buyerRow) return { next: db, result: { ok: false as const, error: 'Tai khoan khong con ton tai.' } };
    if (buyerRow.value < listing.price) {
      return { next: db, result: { ok: false as const, error: 'Khong du tien mua may bay nay.' } };
    }
    buyerRow.value -= listing.price;
    const sellerRow = db.pilots.find((p) => p.id === listing.sellerId);
    if (sellerRow) sellerRow.value += listing.price;

    listing.sold = true;
    listing.buyerId = buyer.id;
    listing.soldAt = Date.now();

    // Ghi lai giao dich de lanh buoc "thanh tich giao dich" trong ho so pilot.
    db.trades.push({
      id: randomUUID(), listingId: listing.id, model: listing.model, price: listing.price,
      buyerId: buyer.id, buyerName: buyer.name.slice(0, 32),
      sellerId: listing.sellerId, sellerName: listing.seller,
      at: listing.soldAt,
    });
    db.trades = db.trades.slice(-MAX_TRADES);

    db.listings = pruneListings(db.listings);
    return { next: db, result: { ok: true as const, listing } };
  });
}

/**
 * Thong bao cho hai ben cua mot giao dich vua xong.
 * Goi sau `buyListing` — khong chay trong cung luot ghi vi ghi hop thu la mot
 * khoa rieng, khong nen lam cham luot ghi `vat:db`.
 */
export async function notifyTrade(buyer: Pilot, listing: Listing): Promise<void> {
  const seller = await findPilotById(listing.sellerId);
  await pushToMany([buyer, ...(seller ? [seller] : [])], (pilot) => {
    if (pilot.id === buyer.id) {
      return {
        kind: 'market',
        title: 'Mua may bay thanh cong',
        body: `Ban da mua ${listing.model} cua ${listing.seller} voi gia ${listing.price.toLocaleString('vi-VN')} $.`,
      };
    }
    return {
      kind: 'market',
      title: 'May bay da duoc ban',
      body: `${listing.model} da duoc ${buyer.name} mua voi gia ${listing.price.toLocaleString('vi-VN')} $.`,
    };
  });
}

export async function findPilotById(pilotId: string): Promise<Pilot | null> {
  const db = await readDB();
  return db.pilots.find((p) => p.id === pilotId) ?? null;
}

export async function getAlliance(): Promise<{ alliance: Alliance | null; members: number }> {
  const db = await readDB();
  const alliance = db.alliances[0] ?? null;
  const members = alliance ? db.members.filter((m) => m.allianceId === alliance.id).length : 0;
  return { alliance, members };
}

export async function joinAlliance(pilot: Pilot): Promise<{ ok: true; members: number } | { ok: false; error: string }> {
  return kvMutateJson<DB, { ok: true; members: number } | { ok: false; error: string }>(DB_KEY, freshDB(), (raw) => {
    const db = normalize(raw);
    let alliance = db.alliances[0];
    if (!alliance) {
      alliance = { id: randomUUID(), name: 'Lien minh May Trang', capacity: 50, contribution: 0, createdAt: Date.now() };
      db.alliances.push(alliance);
    }
    const count = db.members.filter((m) => m.allianceId === alliance!.id).length;
    if (count >= alliance.capacity) {
      return { next: db, result: { ok: false as const, error: 'Lien minh da day.' } };
    }
    if (!db.members.some((m) => m.allianceId === alliance!.id && m.pilotId === pilot.id)) {
      db.members.push({ allianceId: alliance.id, pilotId: pilot.id });
      alliance.contribution += 10;
    }
    if (db.members.length > MAX_MEMBERS) db.members = db.members.slice(-MAX_MEMBERS);
    return { next: db, result: { ok: true as const, members: db.members.filter((m) => m.allianceId === alliance!.id).length } };
  });
}

const CHAT_MAX_LENGTH = 200;

/**
 * So tin moi duoc gui trong MOT KHOANG (10 giay).
 * Chat chi giu 200 tin nen mot nguoi spam se xoa sach tin cua ca server —
 * rate limit la thu gian nhat de chan.
 */
const CHAT_WINDOW_MS = 10_000;
const CHAT_PER_WINDOW = 4;

export async function postChat(sender: Pilot, message: string, room = 'lien-minh'): Promise<{ ok: true; message: ChatMsg } | { ok: false; error: string }> {
  const text = String(message || '').trim();
  if (!text) return { ok: false, error: 'Tin nhan rong.' };
  if (text.length > CHAT_MAX_LENGTH) return { ok: false, error: `Tin nhan toi da ${CHAT_MAX_LENGTH} ky tu.` };

  return kvMutateJson<DB, { ok: true; message: ChatMsg } | { ok: false; error: string }>(DB_KEY, freshDB(), (raw) => {
    const db = normalize(raw);
    const now = Date.now();
    const recent = db.chat.filter((m) => m.senderId === sender.id && now - m.at < CHAT_WINDOW_MS);
    if (recent.length >= CHAT_PER_WINDOW) {
      return { next: db, result: { ok: false as const, error: 'Ban gui qua nhieu tin. Cho vai giay roi thu lai.' } };
    }
    const msg: ChatMsg = {
      id: randomUUID(), room, sender: sender.name.slice(0, 32), senderId: sender.id,
      message: text.slice(0, CHAT_MAX_LENGTH), at: now,
    };
    db.chat.push(msg);
    db.chat = db.chat.slice(-MAX_CHAT);
    return { next: db, result: { ok: true as const, message: msg } };
  });
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

/**
 * Luu tien do. Doc va tang `version` trong cung mot luot ghi (`kvMutateJson`) —
 * truoc day doc roi moi ghi, nen hai tab luu cung luc se lam `version` bi
 * trung/giam va client khong con biet ban nao moi hon.
 */
export async function putCloudSave(pilotId: string, state: unknown): Promise<CloudSave> {
  return kvMutateJson<CloudSave | null, CloudSave>(SAVE_KEY(pilotId), null, (previous) => {
    const save: CloudSave = { state, updatedAt: Date.now(), version: (previous?.version ?? 0) + 1 };
    return { next: save, result: save };
  });
}

export async function getCloudSave(pilotId: string): Promise<CloudSave | null> {
  return kvGetJson<CloudSave | null>(SAVE_KEY(pilotId), null);
}

export const storageInfo = () => storageMode;
