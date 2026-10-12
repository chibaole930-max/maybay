import { kvGetJson, kvMutateJson } from './kv';
import type { AirportDraft } from '@/lib/geo-naming';

/**
 * Kho san bay dung chung cho moi nguoi choi.
 * Luu trong KV (Vercel KV hoac file `data/kv/`) nen chay duoc ca tren serverless.
 */

const AIRPORTS_KEY = 'vat:airports';
const MAX_AIRPORTS = 200;

export type SharedAirport = AirportDraft & {
  createdAt: number;
  createdBy: string;
  slots: number;
};

type Payload = { airports: SharedAirport[] };

const emptyPayload = (): Payload => ({ airports: [] });

const normalize = (raw: Payload | null): Payload => ({
  airports: Array.isArray(raw?.airports) ? raw!.airports : [],
});

export async function listAirports(): Promise<SharedAirport[]> {
  const { airports } = await kvGetJson<Payload>(AIRPORTS_KEY, emptyPayload()).then(normalize);
  return [...airports].sort((a, b) => b.createdAt - a.createdAt);
}

/**
 * Them san bay moi. Tra ve san bay da tao, hoac ly do bi tu choi.
 *
 * Kiem tra trung ma va chen san bay nam trong **cung mot** `kvMutateJson`. Neu
 * tach ra hai luot (kiem tra xong moi ghi) thi hai request gui cung luc deu qua
 * duoc kiem tra va tao ra hai san bay trung ma.
 */
export async function addAirport(draft: AirportDraft, createdBy: string): Promise<{ ok: true; airport: SharedAirport } | { ok: false; error: string }> {
  return kvMutateJson<Payload, { ok: true; airport: SharedAirport } | { ok: false; error: string }>(AIRPORTS_KEY, emptyPayload(), (raw) => {
    const payload = normalize(raw);
    if (payload.airports.some((item) => item.code === draft.code)) {
      return { next: payload, result: { ok: false as const, error: `Ma san bay ${draft.code} da ton tai.` } };
    }
    if (payload.airports.length >= MAX_AIRPORTS) {
      return { next: payload, result: { ok: false as const, error: 'Kho san bay chung da day.' } };
    }
    const airport: SharedAirport = {
      ...draft,
      slots: draft.demand >= 8 ? 6 : 5,
      createdAt: Date.now(),
      createdBy: createdBy.slice(0, 32),
    };
    payload.airports.unshift(airport);
    return { next: payload, result: { ok: true as const, airport } };
  });
}
