import { NextResponse } from 'next/server';
import { z } from 'zod';
import { buyListing, listMarket, postListing } from '@/lib/server/onlineStore';
import { accountFromRequest } from '@/lib/server/session';
import { hit, rules } from '@/lib/server/rateLimit';

export const dynamic = 'force-dynamic';

const Sell = z.object({ model: z.string().min(2).max(40), wear: z.number().min(0).max(100), price: z.number().min(100000).max(1e9) });

export async function GET() {
  const listings = await listMarket();
  // Gop 2 tin mau de cho khong trong khi server moi.
  const seed = [
    { id: 'seed-1', model: 'Airbus A320neo', wear: 22, price: 9800000, seller: 'VietSky', sellerId: 'seed', createdAt: Date.now() },
    { id: 'seed-2', model: 'ATR 72-600', wear: 11, price: 2650000, seller: 'Saigon Air', sellerId: 'seed', createdAt: Date.now() },
  ];
  return NextResponse.json({ listings: [...listings, ...seed].slice(0, 30) });
}

export async function POST(request: Request) {
  const session = await accountFromRequest(request);
  if (!session) return NextResponse.json({ error: 'Can dang nhap de giao dich.' }, { status: 401 });
  const { pilot } = session;

  const rate = await hit('market', pilot.id, rules.write);
  if (!rate.ok) {
    return NextResponse.json({ error: `Qua nhieu lan giao dich. Thu lai sau ${rate.retryAfter} giay.` }, { status: 429 });
  }

  let json: unknown;
  try { json = await request.json(); } catch { return NextResponse.json({ error: 'Du lieu khong hop le.' }, { status: 400 }); }

  // Mua: { buyId } — Ban: { model, wear, price }
  if (typeof (json as Record<string, unknown>).buyId === 'string') {
    const id = String((json as Record<string, unknown>).buyId);
    if (id.startsWith('seed-')) return NextResponse.json({ error: 'Tin mau chi de xem — hay mua tin cua nguoi choi that.' }, { status: 400 });
    const result = await buyListing(pilot, id);
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 409 });
    return NextResponse.json({ ok: true, listing: result.listing });
  }

  const parsed = Sell.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: 'Tin rao ban khong hop le.' }, { status: 400 });
  const result = await postListing(pilot, parsed.data.model, parsed.data.wear, parsed.data.price);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 409 });
  return NextResponse.json({ listing: result.listing }, { status: 201 });
}
