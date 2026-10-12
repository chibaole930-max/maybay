import { NextResponse } from 'next/server';
import { z } from 'zod';
import { cancelAuction, listAuctions, openAuction, placeBid } from '@/lib/server/auction';
import { accountFromRequest } from '@/lib/server/session';
import { hit, rules } from '@/lib/server/rateLimit';

export const dynamic = 'force-dynamic';

/**
 * Đấu giá slot sân bay.
 *
 * GET                      -> các phiên đang mở (chốt phiên hết hạn trước khi trả)
 * POST { airport, slots }  -> mở phiên mới
 * POST { auctionId, bid }  -> đặt giá
 * POST { auctionId, cancel: true } -> hủy phiên mình mở (khi chưa ai đấu)
 *
 * Cơ chế ký quỹ và hoàn tiền: xem `lib/server/auction.ts`.
 */

const Open = z.object({ airport: z.string().min(3).max(4), slots: z.number().int().min(1).max(10) });
const Bid = z.object({ auctionId: z.string().min(8).max(40), bid: z.number().int().min(0).max(1e9) });
const Cancel = z.object({ auctionId: z.string().min(8).max(40), cancel: z.literal(true) });

/** Phiên trả về client không kèm khoá nội bộ (`bidderId`, `openerId`, `escrowed`). */
const publicAuction = (a: Awaited<ReturnType<typeof listAuctions>>[number]) => ({
  id: a.id, airport: a.airport, price: a.price, slots: a.slots,
  bidder: a.bidder, bidderName: a.bidderName, endsAt: a.endsAt,
});

export async function GET() {
  return NextResponse.json({ auctions: (await listAuctions()).map(publicAuction) });
}

export async function POST(request: Request) {
  const session = await accountFromRequest(request);
  if (!session) return NextResponse.json({ error: 'Can dang nhap de dau gia.' }, { status: 401 });
  const { pilot } = session;

  // Đặt giá là hành vi lặp lại liên tục nên tách rate limit riêng, không dùng
  // chung hạn mức `write` với chat/đăng tin rào.
  const rate = await hit('auction', pilot.id, { limit: 30, windowSeconds: 60 });
  if (!rate.ok) return NextResponse.json({ error: `Qua nhieu lan dat gia. Thu lai sau ${rate.retryAfter} giay.` }, { status: 429 });

  let json: unknown;
  try { json = await request.json(); } catch { return NextResponse.json({ error: 'Du lieu khong hop le.' }, { status: 400 }); }
  const body = json as Record<string, unknown>;

  if (body.cancel === true) {
    const parsed = Cancel.safeParse(json);
    if (!parsed.success) return NextResponse.json({ error: 'Du lieu khong hop le.' }, { status: 400 });
    const result = await cancelAuction(pilot, parsed.data.auctionId);
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 409 });
    return NextResponse.json({ ok: true, auctions: (await listAuctions()).map(publicAuction) });
  }

  if (typeof body.bid === 'number' || typeof body.bid === 'string') {
    const parsed = Bid.safeParse(json);
    if (!parsed.success) return NextResponse.json({ error: 'Muc dat gia khong hop le.' }, { status: 400 });
    const result = await placeBid(pilot, parsed.data.auctionId, parsed.data.bid);
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 409 });
    return NextResponse.json({ ok: true, auction: publicAuction(result.auction), auctions: (await listAuctions()).map(publicAuction) });
  }

  const opened = Open.safeParse(json);
  if (!opened.success) return NextResponse.json({ error: 'Du lieu mo phien khong hop le.' }, { status: 400 });
  const result = await openAuction(pilot, opened.data.airport, opened.data.slots);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 409 });
  return NextResponse.json({ ok: true, auction: publicAuction(result.auction), auctions: (await listAuctions()).map(publicAuction) }, { status: 201 });
}