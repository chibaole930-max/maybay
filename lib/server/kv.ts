/**
 * Kho key-value dung chung cho server.
 *
 * - Co `KV_REST_API_URL` + `KV_REST_API_TOKEN` (Vercel KV / Upstash Redis) -> goi REST API bang fetch.
 * - Khong co -> ghi xuong `data/kv/*.json`, chay duoc o local hoac VPS khong can cau hinh.
 *
 * Dung POST kem body dang `["GET", key]` thay vi nhet key/value vao URL de
 * khoi phai encode ky tu dac biet (dau `/`, `+`, ...).
 *
 * QUAN TRONG — hang doi ghi:
 * File backend la read-modify-write nen cac phep ghi phai xep hang cho nhau chay lan luot.
 * Nhung cac ham nay KHONG duoc goi long nhau ben trong hang doi (vi du `kvMutateJson`
 * ma ben trong lai goi `kvSetJson`) — se tu deadlock vi doi chinh minh. Muon vua doc vua
 * ghi trong mot luot thi dung `writeFileNow` (ghi thang, khong xep hang).
 */

import { promises as fs } from 'node:fs';
import path from 'node:path';

const url = (process.env.KV_REST_API_URL || '').trim();
const token = (process.env.KV_REST_API_TOKEN || '').trim();

export type StorageMode = 'kv' | 'file';
export const storageMode: StorageMode = url && token ? 'kv' : 'file';

const FILE_DIR = path.join(process.cwd(), 'data', 'kv');

/** Chi giu lai ky tu an toan cho ten file, tranh path traversal. */
const safeName = (key: string): string => key.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 120);
const fileOf = (key: string): string => path.join(FILE_DIR, `${safeName(key)}.json`);

/** Hang doi tuan ty — moi phep ghi file doi cho phep truoc do xong. */
let fileQueue: Promise<unknown> = Promise.resolve();
const enqueue = <T>(job: () => Promise<T>): Promise<T> => {
  const run = fileQueue.then(job, job);
  fileQueue = run.catch(() => undefined);
  return run;
};

type KvResponse = { result?: unknown; error?: string };

/**
 * Không ghi được storage. Xảy ra khi deploy lên môi trường chỉ-đọc (Vercel serverless)
 * mà chưa cấu hình Vercel KV — lúc đó fallback ghi file sẽ bị EROFS.
 */
export class StorageUnavailableError extends Error {
  constructor() {
    super('Máy chủ chưa cấu hình nơi lưu trữ. Hãy thêm Vercel KV (biến KV_REST_API_URL và KV_REST_API_TOKEN) hoặc deploy lên hosting cho phép ghi file.');
    this.name = 'StorageUnavailableError';
  }
}

/** Nhớ kết quả kiểm tra ghi-file để khỏi lặp lại mỗi request. */
let fileWritable: boolean | null = null;

async function fileBackendWritable(): Promise<boolean> {
  if (storageMode === 'kv') return true;
  if (fileWritable !== null) return fileWritable;
  try {
    await fs.mkdir(FILE_DIR, { recursive: true });
    await fs.access(FILE_DIR, fs.constants.W_OK);
    fileWritable = true;
  } catch {
    fileWritable = false;
  }
  return fileWritable;
}

/** Ghi thang xuong file, khong xep hang. CHI goi khi dang o trong hang doi. */
async function writeFileNow(key: string, value: string): Promise<void> {
  if (!(await fileBackendWritable())) throw new StorageUnavailableError();
  await fs.mkdir(FILE_DIR, { recursive: true });
  await fs.writeFile(fileOf(key), value, 'utf8');
}

async function restCommand<T>(...args: Array<string | number>): Promise<T | null> {
  if (storageMode !== 'kv') return null;
  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(args),
  });
  if (!res.ok) throw new Error(`KV ${args[0]} that bai (HTTP ${res.status})`);
  const json = (await res.json()) as KvResponse;
  if (json.error) throw new Error(json.error);
  return (json.result ?? null) as T | null;
}

/** Doc chuoi tho. Tra `null` neu key khong ton tai. */
export async function kvGetRaw(key: string): Promise<string | null> {
  if (storageMode === 'kv') return restCommand<string>('GET', key);
  try {
    return await fs.readFile(fileOf(key), 'utf8');
  } catch {
    return null;
  }
}

export async function kvSetRaw(key: string, value: string): Promise<void> {
  if (storageMode === 'kv') {
    await restCommand('SET', key, value);
    return;
  }
  await enqueue(() => writeFileNow(key, value));
}

export async function kvDel(key: string): Promise<void> {
  if (storageMode === 'kv') {
    await restCommand('DEL', key);
    return;
  }
  await enqueue(async () => {
    await fs.rm(fileOf(key), { force: true });
  });
}

/** Doc JSON. Tra `fallback` neu key chua co hoac du lieu hong. */
export async function kvGetJson<T>(key: string, fallback: T): Promise<T> {
  const raw = await kvGetRaw(key);
  if (raw === null) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export async function kvSetJson(key: string, value: unknown): Promise<void> {
  await kvSetRaw(key, JSON.stringify(value));
}

/** Ghi kem thoi han (giay). Dung cho session de tu dong het han. */
export async function kvSetJsonEx(key: string, value: unknown, seconds: number): Promise<void> {
  if (storageMode === 'kv') {
    await restCommand('SET', key, JSON.stringify(value), 'EX', Math.max(1, Math.round(seconds)));
    return;
  }
  await enqueue(() => writeFileNow(key, JSON.stringify({ value, expiresAt: Date.now() + seconds * 1000 })));
}

/**
 * Doc gia tri co thoi han. Tra `fallback` neu key khong co HOAC DA HET HAN.
 *
 * O che do file boi thoi han vao chinh ban ghi (xem `kvSetJsonEx`), nen ham nay
 * phai mo boc va kiem tra `expiresAt` — khong giong `kvGetJson`.
 * O che do KV, Redis tu xoa key het han nen doc nhu binh thuong.
 */
export async function kvGetJsonEx<T>(key: string, fallback: T): Promise<T> {
  if (storageMode === 'kv') return kvGetJson(key, fallback);
  const raw = await kvGetRaw(key);
  if (raw === null) return fallback;
  try {
    const parsed = JSON.parse(raw) as { value?: unknown; expiresAt?: number };
    if (typeof parsed?.expiresAt === 'number' && parsed.expiresAt <= Date.now()) {
      await kvDel(key);
      return fallback;
    }
    return (parsed?.value ?? fallback) as T;
  } catch {
    return fallback;
  }
}

/**
 * Ghi neu key chua ton tai. Tra `true` neu ghi duoc, `false` neu key da co.
 * Trong KV day la lenh `SET ... NX` cua Redis — nguyen tu that su, nen dung de giu
 * cho ten dang nhap bi trung: 2 nguoi dang ky cung luc van chi co 1 nguoi thanh cong.
 * O che do file tinh nguyen tu nay chi dat duoc trong 1 process.
 */
export async function kvSetJsonNx(key: string, value: unknown): Promise<boolean> {
  if (storageMode === 'kv') {
    const result = await restCommand<string | null>('SET', key, JSON.stringify(value), 'NX');
    return result === 'OK';
  }
  let written = false;
  await enqueue(async () => {
    const existing = await kvGetRaw(key);
    if (existing !== null) return;
    await writeFileNow(key, JSON.stringify(value));
    written = true;
  });
  return written;
}

/**
 * Doc -> sua -> ghi trong mot luot, khong de request khac xen vao.
 *
 * `mutate` tra ve ca ban moi de luu (`next`) va gia tri de tra ve cho nguoi goi (`result`).
 * Tach hai thu nay la vi co phep vua thay doi DB vua can tra ve mot thu khac
 * (vi du: tin rao vua mua).
 */
export async function kvMutateJson<T, R>(
  key: string,
  fallback: T,
  mutate: (current: T) => { next: T; result: R } | Promise<{ next: T; result: R }>,
): Promise<R> {
  return enqueue(async () => {
    const current = await kvGetJson(key, fallback);
    const { next, result } = await mutate(current);
    // Ghi thang, khong xep hang — minh dang o trong hang doi roi.
    if (storageMode === 'kv') await kvSetRaw(key, JSON.stringify(next));
    else await writeFileNow(key, JSON.stringify(next));
    return result;
  });
}
