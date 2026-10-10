/** Online-first adapter với fallback mock. Chạy được trên hosting thường (polling, không cần websocket). */

export type Versioned<T> = { data: T; updatedAt: number; version: number };
export type MockProfile = { code: string; name: string; level: number; reputation: number; fleet: string[]; topRoutes: string[]; value: number };
export type SeasonSummary = { name: string; daysLeft: number; reward: string; status: 'mock' | 'live'; ranks?: { code: string; name: string; value: number }[] };
export type AlliancePreview = { name: string; members: number; capacity: number; contribution: number };
export type UsedPlaneListing = { id: string; model: string; wear: number; price: number; seller: string };

const profiles: MockProfile[] = [
  { code: 'VNA3K9', name: 'VietSky', level: 18, reputation: 86, fleet: ['A320neo', 'ATR72', 'B787-9'], topRoutes: ['SGN → DAD', 'HAN → SIN'], value: 62500000 },
  { code: 'SAI8Q2', name: 'Saigon Air', level: 15, reputation: 78, fleet: ['A321LR', 'A320neo'], topRoutes: ['SGN → BKK', 'SGN → HAN'], value: 41200000 },
  { code: 'BAY5M1', name: 'Cánh Én Việt', level: 12, reputation: 91, fleet: ['ATR72', 'A320neo'], topRoutes: ['DAD → SGN', 'HAN → DAD'], value: 28700000 },
];

const token = () => (typeof localStorage !== 'undefined' ? localStorage.getItem('vat-online-token') || '' : '');
const authHeaders = (): Record<string, string> => (token() ? { Authorization: `Bearer ${token()}` } : {});

async function safe<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 6000);
    const result = await fn();
    clearTimeout(timer);
    return result;
  } catch { return fallback; }
}

export const netClient = {
  async ensureAuth(code: string, name: string): Promise<string> {
    const existing = token();
    if (existing) return existing;
    const res = await safe(async () => {
      const r = await fetch('/api/auth', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code, name }) });
      if (!r.ok) throw new Error('auth failed');
      return (await r.json()) as { token: string };
    }, null as unknown as { token: string });
    if (res?.token && typeof localStorage !== 'undefined') localStorage.setItem('vat-online-token', res.token);
    return res?.token || '';
  },
  async heartbeat(input: { code: string; name: string; value: number; level: number; planes: number; routes: number; reputation: number }) {
    return safe(async () => {
      const r = await fetch('/api/leaderboard', { method: 'POST', headers: { 'Content-Type': 'application/json', ...authHeaders() }, body: JSON.stringify(input) });
      const json = (await r.json()) as { token?: string };
      if (json?.token && typeof localStorage !== 'undefined') localStorage.setItem('vat-online-token', json.token);
      return true;
    }, false);
  },
  async getLeaderboard() {
    const live = await safe(async () => {
      const r = await fetch('/api/leaderboard', { cache: 'no-store' });
      if (!r.ok) throw new Error('lb failed');
      return (await r.json()) as { pilots: { code: string; name: string; level: number; reputation: number; value: number }[] };
    }, null as unknown as { pilots: { code: string; name: string; level: number; reputation: number; value: number }[] });
    if (live?.pilots?.length) return live.pilots;
    return profiles.map(({ code, name, level, reputation, value }) => ({ code, name, level, reputation, value }));
  },
  async getFriendProfile(code: string) {
    const all = await this.getLeaderboard();
    const found = all.find((p) => p.code.toUpperCase() === code.trim().toUpperCase());
    if (found) return { code: found.code, name: found.name, level: found.level, reputation: found.reputation, fleet: ['—'], topRoutes: ['—'], value: found.value };
    return profiles.find((p) => p.code.toUpperCase() === code.trim().toUpperCase()) ?? null;
  },
  async getWorld() {
    return safe(async () => {
      const r = await fetch('/api/world-state', { cache: 'no-store' });
      if (!r.ok) throw new Error('world failed');
      return (await r.json()) as { demandMultiplier: number; title: string; golden: boolean };
    }, { demandMultiplier: 1, title: 'Ngày thường', golden: false });
  },
  async sendChat(_room: string, message: string) {
    const live = await safe(async () => {
      const r = await fetch('/api/community?kind=chat', { method: 'POST', headers: { 'Content-Type': 'application/json', ...authHeaders() }, body: JSON.stringify({ message }) });
      if (!r.ok) throw new Error('chat failed');
      return (await r.json()) as { message: { id: string; sender: string; message: string; at: number } };
    }, null as unknown as { message: { id: string; sender: string; message: string; at: number } });
    if (live?.message) return { id: live.message.id, message: live.message.message, at: live.message.at, sender: live.message.sender };
    return { id: 'mock-' + Date.now(), message, at: Date.now(), sender: 'Hãng của bạn' };
  },
  async getChat(since = 0) {
    return safe(async () => {
      const r = await fetch(`/api/community?kind=chat&since=${since}`, { cache: 'no-store' });
      if (!r.ok) throw new Error('chat failed');
      const json = (await r.json()) as { messages: { id: string; sender: string; message: string; at: number }[] };
      return json.messages;
    }, [] as { id: string; sender: string; message: string; at: number }[]);
  },
  async getSeason(): Promise<SeasonSummary> {
    const live = await safe(async () => {
      const r = await fetch('/api/community?kind=season', { cache: 'no-store' });
      if (!r.ok) throw new Error('season failed');
      return (await r.json()) as { id: string; endsAt: number; ranks: { code: string; name: string; value: number }[] };
    }, null as unknown as { id: string; endsAt: number; ranks: { code: string; name: string; value: number }[] });
    if (live?.id) {
      const daysLeft = Math.max(0, Math.ceil((live.endsAt - Date.now()) / 86400000));
      return { name: `Mùa ${live.id}`, daysLeft, reward: 'Top BXH mùa nhận 5M $ + 1000 XP', status: 'live', ranks: live.ranks };
    }
    return { name: 'Mùa Cất Cánh', daysLeft: 18, reward: 'Khung vàng + danh hiệu Phi công xuất sắc', status: 'mock' };
  },
  async getAlliance(): Promise<AlliancePreview> {
    const live = await safe(async () => {
      const r = await fetch('/api/community?kind=alliance', { cache: 'no-store' });
      if (!r.ok) throw new Error('alliance failed');
      return (await r.json()) as { alliance: { name: string; members: number; capacity: number; contribution: number } };
    }, null as unknown as { alliance: AlliancePreview });
    if (live?.alliance) return live.alliance;
    return { name: 'Liên minh Mây Trắng', members: 7, capacity: 10, contribution: 1240 };
  },
  async joinAlliance(): Promise<boolean> {
    return safe(async () => {
      const r = await fetch('/api/community?kind=alliance', { method: 'POST', headers: { 'Content-Type': 'application/json', ...authHeaders() }, body: JSON.stringify({ join: true }) });
      return r.ok;
    }, false);
  },
  async getUsedMarket(): Promise<UsedPlaneListing[]> {
    const live = await safe(async () => {
      const r = await fetch('/api/market', { cache: 'no-store' });
      if (!r.ok) throw new Error('market failed');
      return (await r.json()) as { listings: UsedPlaneListing[] };
    }, null as unknown as { listings: UsedPlaneListing[] });
    if (live?.listings?.length) return live.listings;
    return [{ id: 'used-1', model: 'Airbus A320neo', wear: 22, price: 9800000, seller: 'VietSky' }, { id: 'used-2', model: 'ATR 72-600', wear: 11, price: 2650000, seller: 'Saigon Air' }];
  },
  async sellPlane(model: string, wear: number, price: number) {
    return safe(async () => {
      const r = await fetch('/api/market', { method: 'POST', headers: { 'Content-Type': 'application/json', ...authHeaders() }, body: JSON.stringify({ model, wear, price }) });
      return r.ok;
    }, false);
  },
  async buyListing(id: string) {
    return safe(async () => {
      const r = await fetch('/api/market', { method: 'POST', headers: { 'Content-Type': 'application/json', ...authHeaders() }, body: JSON.stringify({ buyId: id }) });
      if (!r.ok) { const j = (await r.json().catch(() => ({}))) as { error?: string }; throw new Error(j.error || 'Mua thất bại'); }
      return { ok: true };
    }, { ok: false });
  },
};

/** Bao mọi entity bằng version + thời điểm cập nhật để sẵn sàng xử lý xung đột phía máy chủ. */
export function versionEntity<T extends object>(data: T, previousVersion = 0): Versioned<T> { return { data, updatedAt: Date.now(), version: previousVersion + 1 }; }
