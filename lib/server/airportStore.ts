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
 * Viec doc-va-ghi nam trong `kvMutateJson` nen 2 request gan nhau khong ghi de nhau.
 */
export async function addAirport(draft: AirportDraft, createdBy: string): Promise<{ ok: true; airport: SharedAirport } | { ok: false; error: string }> {
  const outcome = await kvMutateJson<Payload, { ok: true; airport: SharedAirport } | { ok: false; error: string }>(AIRPORTS_KEY, emptyPayload(), (raw) => {
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
    return { next: payload, result: { ok: true as const, airport } };
  });

  if (!outcome.ok) return outcome;
  // Ghi lai ca kho mot lan nua de san bay moi duoc dua vao — `mutate` o tren chi kiem tra.
  await kvMutateJson<Payload, void>(AIRPORTS_KEY, emptyPayload(), (raw) => {
    const payload = normalize(raw);
    payload.airports.unshift(outcome.airport);
    return { next: payload, result: undefined };
  });
  return outcome;
}
