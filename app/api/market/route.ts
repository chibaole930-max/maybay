import { NextResponse } from 'next/server';
import { z } from 'zod';
import { buyListing, listMarket, postListing, verifyToken } from '@/lib/server/onlineStore';

export const dynamic = 'force-dynamic';

const Sell = z.object({ model: z.string().min(2).max(40), wear: z.number().min(0).max(100), price: z.number().min(100000).max(1e9) });

export async function GET() {
  const listings = await listMarket();
  // Gộp 2 tin mẫu để chợ không trống khi server mới.
  const seed = [
    { id: 'seed-1', model: 'Airbus A320neo', wear: 22, price: 9800000, seller: 'VietSky', sellerId: 'seed', createdAt: Date.now() },
    { id: 'seed-2', model: 'ATR 72-600', wear: 11, price: 2650000, seller: 'Saigon Air', sellerId: 'seed', createdAt: Date.now() },
  ];
  return NextResponse.json({ listings: [...listings, ...seed].slice(0, 30) });
}

export async function POST(request: Request) {
  const token = (request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
  const pilot = await verifyToken(token);
  if (!pilot) return NextResponse.json({ error: 'Chưa đăng nhập online.' }, { status: 401 });
  let json: unknown;
  try { json = await request.json(); } catch { return NextResponse.json({ error: 'Dữ liệu không hợp lệ.' }, { status: 400 }); }
  // Mua: { buyId } — Bán: { model, wear, price }
  if (typeof (json as Record<string, unknown>).buyId === 'string') {
    const id = String((json as Record<string, unknown>).buyId);
    if (id.startsWith('seed-')) return NextResponse.json({ error: 'Tin mẫu chỉ để xem — hãy mua tin của người chơi thật.' }, { status: 400 });
    const result = await buyListing(pilot, id);
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 409 });
    return NextResponse.json({ ok: true, listing: result.listing });
  }
  const parsed = Sell.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: 'Dữ liệu rao bán không hợp lệ.' }, { status: 400 });
  const listing = await postListing(pilot, parsed.data.model, parsed.data.wear, parsed.data.price);
  return NextResponse.json({ listing }, { status: 201 });
}
