import { NextResponse } from 'next/server';
import { addAirport, listAirports } from '@/lib/server/airportStore';
import { draftAirport } from '@/lib/geo-naming';
import { accountFromRequest } from '@/lib/server/session';
import { clientIp, hit, rules } from '@/lib/server/rateLimit';

export const dynamic = 'force-dynamic';

const clamp = (value: unknown, min: number, max: number, fallback: number) => {
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
};

const clean = (value: unknown, fallback: string, max: number) => {
  const text = typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : '';
  return text ? text.slice(0, max) : fallback;
};

/** Danh sách sân bay chung mà mọi người chơi đều thấy. */
export async function GET() {
  return NextResponse.json({ airports: await listAirports() });
}

/** Tạo sân bay mới từ toạ độ người chơi bấm trên bản đồ. */
export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'Dữ liệu gửi lên không hợp lệ.' }, { status: 400 });
  }

  const lat = clamp(body.lat, -85, 85, Number.NaN);
  const lng = clamp(body.lng, -180, 180, Number.NaN);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return NextResponse.json({ error: 'Toạ độ không hợp lệ.' }, { status: 400 });
  }

  const existingCodes = Array.isArray(body.existingCodes)
    ? (body.existingCodes as unknown[]).filter((c): c is string => typeof c === 'string')
    : [];
  const draft = draftAirport(lat, lng, existingCodes);

  // Người chơi được sửa tên, phí hạ cánh và nhu cầu trước khi gửi.
  draft.name = clean(body.name, draft.name, 60);
  draft.city = clean(body.city, draft.city, 40);
  draft.landingFee = Math.round(clamp(body.landingFee, 10, 2000, draft.landingFee));
  draft.demand = Math.round(clamp(body.demand, 1, 10, draft.demand));

  const session = await accountFromRequest(request);
  // Rate limit theo tai khoan neu da dang nhap, theo IP neu chua — nguoi chua
  // dang nhap van tao duoc san bay (client goi o ca truong hop khong moi truoc).
  const rate = await hit('airports', session?.pilot.id ?? clientIp(request), rules.write);
  if (!rate.ok) {
    return NextResponse.json({ error: `Bạn tạo sân bay hơi nhanh. Thử lại sau ${rate.retryAfter} giây.` }, { status: 429 });
  }

  // `createdBy` tu client la tuy chon — uu tien ten tai khoan da dang nhap de khong
  // ai cung dat ten bat ky. Chi khi khach vang thi moi dung ten client gui.
  const createdBy = session ? session.account.name : clean(body.createdBy, 'Khách vô danh', 32);
  const result = await addAirport(draft, createdBy);

  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 409 });
  return NextResponse.json({ airport: result.airport }, { status: 201 });
}
