'use client';

import { useCallback, useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import {
  Building2,
  PlaneTakeoff,
  Plus,
  Compass,
  Sparkles,
  MapPin,
  CheckCircle2,
  Lock,
  Layers,
  Globe2,
  Loader2,
} from 'lucide-react';
import { GameShell, PageHeading } from '@/components/game-shell';
import { useGameStore } from '@/store/useGameStore';
import { formatCurrency } from '@/lib/formulas';
import type { Airport } from '@/types';
import type { AirportDraft } from '@/lib/geo-naming';
import { BASE_COSTS, SECOND_BASE_LEVEL, difficultyOf, scaleCost } from '@/lib/tuning';

// Leaflet cần window nên chỉ nạp ở phía trình duyệt.
const AirportPickerMap = dynamic(
  () => import('@/components/map/AirportPickerMap').then((m) => m.AirportPickerMap),
  { ssr: false, loading: () => <div className="airport-picker-loading"><Loader2 size={18} className="spin" /> Đang tải bản đồ…</div> }
);

const BUILD_COST: Record<string, number> = {
  'Việt Nam': 400000,
  'Đông Nam Á': 900000,
  'Đông Á': 1800000,
  'Bay xa': 2800000,
};

function AirportsContent() {
  const {
    airline,
    airports,
    buySlot,
    setupSecondBase,
    routes,
    currency,
    theme,
    createAirport,
    mergeSharedAirports,
    notify,
  } = useGameStore();

  const [filter, setFilter] = useState<'all' | 'vn' | 'intl'>('all');
  const [selectedForBase, setSelectedForBase] = useState<Airport | null>(null);
  const [showPicker, setShowPicker] = useState(false);
  const [draft, setDraft] = useState<AirportDraft | null>(null);
  const [sharedCount, setSharedCount] = useState<number | null>(null);
  // Phí căn cứ thứ 2 nhân theo độ khó đang chơi — cùng con số với engine tính.
  const secondBaseCost = scaleCost(BASE_COSTS.secondBase, difficultyOf({ airline }));

  // Kéo sân bay từ kho chung về; lỗi mạng không chặn game.
  const syncShared = useCallback(async () => {
    try {
      const response = await fetch('/api/airports', { cache: 'no-store' });
      if (!response.ok) return;
      const data = (await response.json()) as { airports: AirportDraft[] };
      if (Array.isArray(data.airports)) {
        mergeSharedAirports(data.airports);
        setSharedCount(data.airports.length);
      }
    } catch {
      setSharedCount(null);
    }
  }, [mergeSharedAirports]);

  useEffect(() => {
    void syncShared();
  }, [syncShared]);

  const buildCost = draft ? BUILD_COST[draft.region] ?? 2800000 : 0;
  const canAffordBuild = (airline?.cash || 0) >= buildCost;

  // Tạo sân bay: đẩy lên kho chung trước, nếu lỗi mạng thì vẫn dùng trong lượt chơi này.
  const handleCreateAirport = async (payload: AirportDraft) => {
    createAirport(payload);
    setDraft(null);
    try {
      const response = await fetch('/api/airports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lat: payload.lat,
          lng: payload.lng,
          name: payload.name,
          city: payload.city,
          landingFee: payload.landingFee,
          demand: payload.demand,
          createdBy: airline?.name || 'Khách vô danh',
          existingCodes: airports.map((a) => a.code),
        }),
      });
      if (response.ok) {
        const data = (await response.json()) as { airport: AirportDraft };
        mergeSharedAirports([data.airport]);
        await syncShared();
      } else {
        const data = (await response.json().catch(() => ({}))) as { error?: string };
        notify(data.error || 'Sân bay chưa lưu được lên kho chung.', 'warn');
      }
    } catch {
      notify('Không có mạng: sân bay chỉ tồn tại trong lượt chơi này.', 'warn');
    }
  };


  const baseAirport = airline?.baseAirport;
  const secondBaseAirport = airline?.secondBaseAirport;
  const airlineLevel = airline?.level || 1;
  const regionUnlock = (code:string) => ['BKK','SIN','KUL','MNL','CGK','DPS','HKT','PNH','VTE','RGN','BWN','REP'].includes(code)?5:['NRT','ICN','TPE','HKG','PVG','PEK','KIX','FUK','GMP','CAN'].includes(code)?10:['LHR','CDG','FRA','DXB','SYD','LAX','AMS','MAD','YYZ','GRU'].includes(code)?15:1;

  const filteredAirports = airports.filter((a) => {
    if (filter === 'vn') return a.country === 'Việt Nam';
    if (filter === 'intl') return a.country !== 'Việt Nam';
    return true;
  });

  const handleConfirmSecondBase = () => {
    if (selectedForBase) {
      setupSecondBase(selectedForBase.code);
      setSelectedForBase(null);
    }
  };

  return (
    <>
      <PageHeading
        title="Mạng lưới Sân bay & Hub"
        subtitle="Quản lý slot đỗ, nhu cầu thị trường và mở rộng căn cứ trung tâm."
      />

      {/* Filter Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {[
          { id: 'all', label: `Tất cả ${airports.length} sân bay` },
          { id: 'vn', label: `Nội địa Việt Nam (${airports.filter(a=>a.country==='Việt Nam').length})` },
          { id: 'intl', label: `Quốc tế & liên lục địa (${airports.filter(a=>a.country!=='Việt Nam').length})` },
        ].map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id as any)}
            className={`chip ${filter === f.id ? 'active' : ''}`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Second Base Hub Banner */}
      <div className="card hub-banner">
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div className="hub-ic">
            🏢
          </div>
          <div>
            <b style={{ fontSize: 16 }}>
              {secondBaseAirport
                ? `Căn cứ thứ 2: ${secondBaseAirport} (Đã kích hoạt)`
                : 'Mở khóa Sân bay Căn cứ thứ 2 (Hub phụ)'}
            </b>
            <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>
              {secondBaseAirport
                ? `Hãng đã có 2 căn cứ chiến lược: ${baseAirport} và ${secondBaseAirport}. Giảm 20% phí hạ cánh tại cả hai sân bay!`
                : `Yêu cầu: Hãng bay cấp ${SECOND_BASE_LEVEL} + Phí đầu tư ${formatCurrency(secondBaseCost, 'USD')}. Giảm 20% vĩnh viễn phí hạ cánh cho căn cứ phụ.`}
            </div>
          </div>
        </div>

        <div>
          {secondBaseAirport ? (
            <span className="badge">
              <CheckCircle2 size={14} /> Hoạt động tối ưu
            </span>
          ) : airlineLevel >= 10 ? (
            <span className="badge">
              ✨ Đủ điều kiện thành lập căn cứ
            </span>
          ) : (
            <span className="badge warn">
              <Lock size={12} /> Mở khóa khi đạt Cấp 10 (Hiện tại: Cấp {airlineLevel})
            </span>
          )}
        </div>
      </div>

      {/* ONLINE: sân bay chung + tạo sân bay trên bản đồ */}
      <div
        className="card"
        style={{
          marginBottom: 24,
          padding: '18px 22px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 16,
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div className="tile-ic">
            <Globe2 size={20} />
          </div>
          <div>
            <b style={{ fontSize: 15 }}>Sân bay cộng đồng</b>
            <div className="muted" style={{ fontSize: 12, marginTop: 3 }}>
              {sharedCount === null
                ? 'Đang kết nối kho sân bay chung…'
                : `${sharedCount} sân bay đã có người chơi khác đăng. Ai cũng thấy và dùng được.`}
            </div>
          </div>
        </div>
        <button className="btn" onClick={() => setShowPicker((value) => !value)}>
          <MapPin size={15} /> {showPicker ? 'Đóng bản đồ' : 'Đặt sân bay trên bản đồ'}
        </button>
      </div>

      {showPicker && (
        <div className="card" style={{ marginBottom: 24, padding: 18, overflow: 'hidden' }}>
          <AirportPickerMap
            theme={theme}
            existingAirports={airports}
            draft={draft}
            onDraftChange={setDraft}
            onConfirm={handleCreateAirport}
          />
          {draft && (
            <div className="muted" style={{ marginTop: 12, fontSize: 12 }}>
              Chi phí khảo sát và xây dựng: <b>{formatCurrency(buildCost, currency)}</b>
              {canAffordBuild ? '' : ' — hãng chưa đủ tiền, cần tích góp thêm.'}
            </div>
          )}
        </div>
      )}

      {/* Airports Grid */}
      <div className="grid-3">
        {filteredAirports.map((airport) => {
          const isBase = airport.code === baseAirport;
          const isSecondBase = airport.code === secondBaseAirport;
          const activeRoutesCount = routes.filter(
            (r) => r.active && (r.from === airport.code || r.to === airport.code)
          ).length;

          const slotsRemaining = airport.slots - airport.slotsUsed;
          const isSlotsFull = slotsRemaining <= 0;
          const slotCost = 50000;
          const canBuySlot = (airline?.cash || 0) >= slotCost;
          const unlockLevel = regionUnlock(airport.code);
          const isUnlocked = airlineLevel >= unlockLevel;

          return (
            <div className={`card plane-card ${!isUnlocked?'airport-locked':''}`} key={airport.code}>
              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <b className="airport-code">{airport.code}</b>
                    {isBase && (
                      <span className="badge warn">
                        ⭐ Hub chính
                      </span>
                    )}
                    {isSecondBase && (
                      <span className="badge">
                        Hub phụ
                      </span>
                    )}
                  </div>
                  <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>
                    {airport.city}, {airport.country} {!isUnlocked&&<span className="badge">🔒 Mở cấp {unlockLevel}</span>}
                  </div>
                </div>

                <div className="tile-ic" style={{ width: 38, height: 38 }}>
                  <Building2 size={20} />
                </div>
              </div>

              <h4 style={{ fontSize: 14, margin: '14px 0 10px', fontWeight: 600 }}>
                {airport.name}
              </h4>

              {/* Demand bar */}
              <div style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 5 }}>
                  <span className="muted">Nhu cầu hành khách</span>
                  <b className="tabular-nums">{airport.demand} / 10</b>
                </div>
                <div className="progress">
                  <i
                    style={{
                      width: `${airport.demand * 10}%`,
                      background: airport.demand >= 8 ? 'var(--success)' : 'var(--blue)',
                    }}
                  />
                </div>
              </div>

              {/* Specs */}
              <div style={{ fontSize: 12, padding: '4px 0 2px', margin: '6px 0 14px' }}>
                <div className="kv">
                  <span>Phí hạ cánh niêm yết</span>
                  <b>
                    {formatCurrency(airport.landingFee, currency)}
                    {(isBase || isSecondBase) && <span className="positive"> (-20%)</span>}
                  </b>
                </div>
                <div className="kv">
                  <span>Tình trạng Slot cất/hạ cánh</span>
                  <b style={{ color: isSlotsFull ? 'var(--danger)' : 'inherit' }}>
                    {airport.slotsUsed} / {airport.slots} ({slotsRemaining} slot trống)
                  </b>
                </div>
                <div className="kv">
                  <span>Đường bay đang nối</span>
                  <b>{activeRoutesCount} tuyến</b>
                </div>
              </div>

              {/* Actions Footer */}
              <div style={{ marginTop: 'auto', display: 'flex', gap: 8 }}>
                <button
                  className="btn secondary compact"
                  style={{ flex: 1 }}
                  disabled={!canBuySlot || !isUnlocked}
                  onClick={() => buySlot(airport.code)}
                >
                  <Plus size={14} /> Mua slot ({formatCurrency(slotCost, currency)})
                </button>

                {!isBase && !isSecondBase && !secondBaseAirport && airlineLevel >= 10 && (
                  <button
                    className="btn ghost compact"
                    onClick={() => setSelectedForBase(airport)}
                  >
                    Chọn làm Hub phụ
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* CONFIRM SECOND BASE MODAL */}
      {selectedForBase && (
        <div
          className="modal-backdrop"
          onClick={() => setSelectedForBase(null)}
        >
          <div
            className="card"
            style={{ width: 'min(100%, 460px)', padding: 26 }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: '0 0 10px', fontSize: 18 }}>
              Thiết lập {selectedForBase.city} ({selectedForBase.code}) làm Căn cứ thứ 2?
            </h3>
            <p className="muted" style={{ fontSize: 13, lineHeight: 1.6 }}>
              Việc thiết lập căn cứ phụ sẽ tiêu tốn <b>{formatCurrency(secondBaseCost, 'USD')}</b> chi phí đầu tư hạ tầng ban đầu.
              Sau khi thành lập, tất cả các chuyến bay cất hoặc hạ cánh tại {selectedForBase.code} sẽ được
              giảm vĩnh viễn <b>20%</b> phí sân bay.
            </p>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
              <button className="btn ghost" onClick={() => setSelectedForBase(null)}>
                Hủy
              </button>
              <button
                className="btn"
                disabled={(airline?.cash || 0) < secondBaseCost}
                onClick={handleConfirmSecondBase}
              >
                Xác nhận đầu tư ({formatCurrency(secondBaseCost, 'USD')})
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default function Airports() {
  return (
    <GameShell>
      <AirportsContent />
    </GameShell>
  );
}
