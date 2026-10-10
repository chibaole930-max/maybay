import { promises as fs } from 'node:fs';
import path from 'node:path';
import type { AirportDraft } from '@/lib/geo-naming';

/**
 * Kho sân bay dùng chung cho mọi người chơi.
 * Ghi xuống một file JSON trong thư mục dự án; nếu deploy lên môi trường
 * chỉ-đọc (serverless/Vercel) thì cần thay bằng database hoặc KV.
 */
const DATA_DIR = path.join(process.cwd(), 'data');
const DATA_FILE = path.join(DATA_DIR, 'airports.json');

export type SharedAirport = AirportDraft & {
  createdAt: number;
  createdBy: string;
  slots: number;
};

type Payload = { airports: SharedAirport[] };

const EMPTY: Payload = { airports: [] };

async function readAll(): Promise<SharedAirport[]> {
  try {
    const raw = await fs.readFile(DATA_FILE, 'utf8');
    const parsed = JSON.parse(raw) as Payload;
    return Array.isArray(parsed.airports) ? parsed.airports : [];
  } catch {
    return [];
  }
}

async function writeAll(airports: SharedAirport[]): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(DATA_FILE, JSON.stringify({ airports }, null, 2), 'utf8');
}

export async function listAirports(): Promise<SharedAirport[]> {
  const all = await readAll();
  return all.sort((a, b) => b.createdAt - a.createdAt);
}

/**
 * Thêm sân bay mới. Trả về sân bay đã tạo, hoặc lý do bị từ chối.
 * Hai request gần nhau có thể đọc cùng một file rồi ghi đè nhau;
 * xử lý bằng cách ghi lại toàn bộ kho sau khi đọc ở chính request đó.
 */
export async function addAirport(draft: AirportDraft, createdBy: string): Promise<{ ok: true; airport: SharedAirport } | { ok: false; error: string }> {
  const all = await readAll();
  if (all.some((item) => item.code === draft.code)) return { ok: false, error: `Mã sân bay ${draft.code} đã tồn tại.` };
  if (all.length >= 200) return { ok: false, error: 'Kho sân bay chung đã đầy.' };

  const airport: SharedAirport = {
    ...draft,
    slots: draft.demand >= 8 ? 6 : 5,
    createdAt: Date.now(),
    createdBy: createdBy.slice(0, 32),
  };
  await writeAll([airport, ...all]);
  return { ok: true, airport };
}
