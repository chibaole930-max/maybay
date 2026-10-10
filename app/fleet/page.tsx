'use client';

import { useEffect, useState } from 'react';
import {
  Plane as PlaneIcon,
  Wrench,
  Search,
  Plus,
  PlaneTakeoff,
  DollarSign,
  Edit2,
  Trash2,
  Sparkles,
  Zap,
  Info,
  CheckCircle2,
  AlertTriangle,
  X,
  Gauge,
  Fuel,
  Users,
} from 'lucide-react';
import { GameShell, PageHeading } from '@/components/game-shell';
import { useGameStore } from '@/store/useGameStore';
import { planes as catalogPlanes } from '@/lib/mock-data';
import {
  formatCurrency,
  getMaintenanceCost,
  getPlaneResaleValue,
} from '@/lib/formulas';
import type { Plane } from '@/types';

function FleetContent() {
  const {
    airline,
    planes: ownedPlanes,
    buy,
    sell,
    rename,
    upgrade,
    maintain,
    notify,
    currency,
    research,
  } = useGameStore();

  const [tab, setTab] = useState<'hangar' | 'catalog'>('hangar');
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'regional' | 'narrow' | 'wide'>('all');
  useEffect(() => { if (window.location.search.includes('open=catalog')) setTab('catalog'); }, []);

  // Modals state
  const [selectedPlaneForDetails, setSelectedPlaneForDetails] = useState<Plane | null>(null);
  const [selectedPlaneForUpgrade, setSelectedPlaneForUpgrade] = useState<Plane | null>(null);
  const [selectedPlaneForRename, setSelectedPlaneForRename] = useState<Plane | null>(null);
  const [renameInput, setRenameInput] = useState('');
  const [selectedPlaneForSell, setSelectedPlaneForSell] = useState<Plane | null>(null);

  // Filter logic
  const sourcePlanes = tab === 'hangar' ? ownedPlanes : catalogPlanes;

  const filteredPlanes = sourcePlanes.filter((p) => {
    const matchesSearch =
      `${p.model} ${p.manufacturer} ${p.name || ''}`
        .toLowerCase()
        .includes(search.toLowerCase());

    if (!matchesSearch) return false;

    if (categoryFilter === 'regional') return p.capacity <= 120;
    if (categoryFilter === 'narrow') return p.capacity > 120 && p.capacity <= 230;
    if (categoryFilter === 'wide') return p.capacity > 230;
    return true;
  });

  const handleOpenRename = (plane: Plane) => {
    setSelectedPlaneForRename(plane);
    setRenameInput(plane.name || plane.model);
  };

  const handleConfirmRename = () => {
    if (selectedPlaneForRename && renameInput.trim()) {
      rename(selectedPlaneForRename.id, renameInput.trim());
      notify(`Đã đổi tên máy bay thành "${renameInput.trim()}".`, 'info');
      setSelectedPlaneForRename(null);
    }
  };

  const handleConfirmSell = () => {
    if (selectedPlaneForSell) {
      const resaleValue = getPlaneResaleValue(selectedPlaneForSell);
      sell(selectedPlaneForSell.id);
      notify(`Đã bán ${selectedPlaneForSell.name || selectedPlaneForSell.model}, thu hồi ${formatCurrency(resaleValue, currency)}.`, 'info');
      setSelectedPlaneForSell(null);
    }
  };

  return (
    <>
      <PageHeading
        title="Quản lý Đội bay"
        subtitle="Sở hữu, nâng cấp và bảo trì kỹ thuật cho dàn chuyên cơ hiện đại."
        action={
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              className={`btn ${tab === 'hangar' ? '' : 'secondary'}`}
              onClick={() => setTab('hangar')}
            >
              <PlaneIcon size={16} /> Nhà chứa ({ownedPlanes.length})
            </button>
            <button
              className={`btn ${tab === 'catalog' ? '' : 'secondary'}`}
              onClick={() => setTab('catalog')}
            >
              <Plus size={16} /> Thị trường máy bay ({catalogPlanes.length})
            </button>
          </div>
        }
      />

      {/* Filter and Search Bar */}
      <div
        style={{
          display: 'flex',
          gap: 12,
          marginBottom: 20,
          flexWrap: 'wrap',
          alignItems: 'center',
        }}
      >
        <div style={{ position: 'relative', flex: 1, minWidth: 260 }}>
          <Search
            size={18}
            style={{
              position: 'absolute',
              left: 14,
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--muted)',
            }}
          />
          <input
            className="input"
            style={{ paddingLeft: 42 }}
            placeholder="Tìm theo mẫu (ATR, A320, B787...) hoặc hãng sản xuất"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Category Pills */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {[
            { id: 'all', label: 'Tất cả' },
            { id: 'regional', label: 'Chặng ngắn (<120 ghế)' },
            { id: 'narrow', label: 'Thân hẹp (120-230 ghế)' },
            { id: 'wide', label: 'Thân rộng (>230 ghế)' },
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setCategoryFilter(cat.id as any)}
              className={`btn ${categoryFilter === cat.id ? '' : 'ghost'}`}
              style={{ padding: '8px 14px', minHeight: 38, fontSize: 12 }}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Empty State */}
      {filteredPlanes.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '60px 20px' }}>
          <PlaneTakeoff size={48} color="#0a58ca" style={{ margin: '0 auto 16px' }} />
          <h3 style={{ fontSize: 18, marginBottom: 8 }}>
            {tab === 'hangar' ? 'Nhà chứa hiện tại đang trống' : 'Không tìm thấy dòng máy bay phù hợp'}
          </h3>
          <p className="muted" style={{ fontSize: 13, maxWidth: 440, margin: '0 auto 20px' }}>
            {tab === 'hangar'
              ? 'Hãy mở danh mục Thị trường để sắm chiếc ATR 72 hoặc Airbus A320 đầu tiên cho hãng.'
              : 'Hãy thử xóa từ khóa tìm kiếm hoặc chọn danh mục khác.'}
          </p>
          {tab === 'hangar' && (
            <button className="btn" onClick={() => setTab('catalog')}>
              Đến Thị trường máy bay <Plus size={16} />
            </button>
          )}
        </div>
      ) : (
        /* Planes Grid */
        <div className="grid-3">
          {filteredPlanes.map((plane) => {
            const isOwned = tab === 'hangar';
            const maintCost = getMaintenanceCost(plane, research.maintenance);
            const resaleVal = getPlaneResaleValue(plane);
            const canAfford = (airline?.cash || 0) >= plane.price;

            return (
              <div className="card" key={plane.id} style={{ display: 'flex', flexDirection: 'column' }}>
                {/* Header card */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 14,
                      display: 'grid',
                      placeItems: 'center',
                      background: '#0a58ca14',
                      color: '#0a58ca',
                    }}
                  >
                    <PlaneIcon size={24} />
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <span className="badge">{plane.manufacturer}</span>
                    {plane.businessClass && (
                      <span className="badge" style={{ background: '#ffb80022', color: '#b45309' }}>
                        Thương gia +15%
                      </span>
                    )}
                    {plane.winglets && (
                      <span className="badge" style={{ background: '#12a67822', color: '#12a678' }}>
                        Winglets -8% xăng
                      </span>
                    )}
                  </div>
                </div>

                {/* Title & Name */}
                <div style={{ margin: '14px 0 6px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <h3 style={{ fontSize: 17, margin: 0, fontWeight: 700 }}>
                      {plane.name || plane.model}
                    </h3>
                    {isOwned && (
                      <button
                        onClick={() => handleOpenRename(plane)}
                        style={{ border: 0, background: 'none', color: 'var(--muted)', cursor: 'pointer', padding: 4 }}
                        title="Đổi tên máy bay"
                      >
                        <Edit2 size={14} />
                      </button>
                    )}
                  </div>
                  <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>
                    Dòng {plane.model} · Đời {plane.year} · {plane.capacity} chỗ ngồi
                  </div>
                </div>

                {/* Specifications Grid */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: 10,
                    padding: '12px 0',
                    margin: '10px 0',
                    borderTop: '1px solid var(--line)',
                    borderBottom: '1px solid var(--line)',
                    fontSize: 12,
                  }}
                >
                  <div>
                    <span className="muted">Tầm bay</span>
                    <br />
                    <b>{plane.rangeKm.toLocaleString('vi-VN')} km</b>
                  </div>
                  <div>
                    <span className="muted">Tốc độ bay</span>
                    <br />
                    <b>{plane.speedKmh} km/h</b>
                  </div>
                  <div>
                    <span className="muted">Nhiên liệu / giờ</span>
                    <br />
                    <b>{formatCurrency(plane.fuelCostPerHour, currency)}</b>
                  </div>
                  <div>
                    <span className="muted">Bảo trì cơ bản / giờ</span>
                    <br />
                    <b>{formatCurrency(plane.maintenancePerHour, currency)}</b>
                  </div>
                </div>

                {/* Specific actions depending on Hangar vs Catalog */}
                {isOwned ? (
                  <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {/* Wear progress */}
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 5 }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Gauge size={14} /> Độ hao mòn <span title="Mức sử dụng tích lũy của máy bay. Ví dụ 80% nghĩa là nên đưa máy bay đi bảo trì sớm." className="term-help">?</span>
                        </span>
                        <b style={{ color: plane.wear >= 80 ? '#e84b3c' : plane.wear >= 50 ? '#ffb800' : 'inherit' }}>
                          {plane.wear.toFixed(1)}% {plane.wear >= 80 ? '(Nguy cấp!)' : ''}
                        </b>
                      </div>
                      <div className="progress">
                        <i
                          style={{
                            width: `${Math.min(100, plane.wear)}%`,
                            background: plane.wear >= 80 ? '#e84b3c' : plane.wear >= 50 ? '#ffb800' : '#0a58ca',
                          }}
                        />
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 8 }}>
                      <button
                        className="btn secondary"
                        disabled={plane.wear < 0.5}
                        onClick={() => maintain(plane.id)}
                        style={{ padding: '8px 10px', fontSize: 12 }}
                      >
                        <Wrench size={14} /> Bảo trì ({formatCurrency(maintCost, currency)})
                      </button>
                      <button
                        className="btn ghost"
                        onClick={() => setSelectedPlaneForUpgrade(plane)}
                        style={{ padding: '8px 10px', fontSize: 12 }}
                      >
                        <Zap size={14} /> Nâng cấp
                      </button>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 4 }}>
                      <button
                        onClick={() => setSelectedPlaneForDetails(plane)}
                        style={{
                          border: 0,
                          background: 'none',
                          color: '#0a58ca',
                          fontSize: 12,
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        Chi tiết thông số ↗
                      </button>

                      <button
                        onClick={() => setSelectedPlaneForSell(plane)}
                        style={{
                          border: 0,
                          background: 'none',
                          color: '#e84b3c',
                          fontSize: 12,
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        Bán ({formatCurrency(resaleVal, currency)})
                      </button>
                    </div>
                  </div>
                ) : (
                  <div style={{ marginTop: 'auto', paddingTop: 8 }}>
                    {plane.model === 'ATR 72-600' && <div className="recommend-chip"><b>✦ Được đề xuất cho người mới</b><small>Giá thấp, ít tốn nhiên liệu và phù hợp với đường bay ngắn.</small></div>}
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'baseline',
                        marginBottom: 12,
                      }}
                    >
                      <span className="muted" style={{ fontSize: 12 }}>Giá niêm yết:</span>
                      <b style={{ fontSize: 20, color: '#0a58ca' }}>
                        {formatCurrency(plane.price, currency)}
                      </b>
                    </div>
                    <button
                      className="btn"
                      data-coach="buy-plane"
                      style={{ width: '100%' }}
                      disabled={!canAfford}
                      onClick={() => buy(plane.id)}
                    >
                      {canAfford ? (
                        <>
                          <Plus size={16} /> Mua tàu bay
                        </>
                      ) : (
                        'Không đủ tiền mặt'
                      )}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL: Plane Details */}
      {selectedPlaneForDetails && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.6)',
            zIndex: 80,
            display: 'grid',
            placeItems: 'center',
            padding: 16,
          }}
          onClick={() => setSelectedPlaneForDetails(null)}
        >
          <div
            className="card"
            style={{ width: 'min(100%, 500px)', padding: 26 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 18 }}>{selectedPlaneForDetails.name || selectedPlaneForDetails.model}</h3>
                <div className="muted" style={{ fontSize: 12 }}>{selectedPlaneForDetails.manufacturer} · Năm {selectedPlaneForDetails.year}</div>
              </div>
              <button className="btn ghost" onClick={() => setSelectedPlaneForDetails(null)} style={{ padding: 6, minHeight: 32 }}>
                <X size={16} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 13 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--line)' }}>
                <span className="muted">Sức chứa hành khách</span>
                <b>{selectedPlaneForDetails.capacity} ghế</b>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--line)' }}>
                <span className="muted">Tầm bay tối đa</span>
                <b>{selectedPlaneForDetails.rangeKm.toLocaleString('vi-VN')} km</b>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--line)' }}>
                <span className="muted">Vận tốc hành trình</span>
                <b>{selectedPlaneForDetails.speedKmh} km/h</b>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--line)' }}>
                <span className="muted">Chi phí nhiên liệu</span>
                <b>{formatCurrency(selectedPlaneForDetails.fuelCostPerHour, currency)}/giờ</b>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--line)' }}>
                <span className="muted">Tổng giờ bay tích lũy</span>
                <b>{(selectedPlaneForDetails.totalFlightHours || 0).toFixed(1)} giờ</b>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--line)' }}>
                <span className="muted">Ghế Hạng Thương Gia</span>
                <b>{selectedPlaneForDetails.businessClass ? '✅ Đã lắp (+15% doanh thu)' : 'Chưa nâng cấp'}</b>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0' }}>
                <span className="muted">Cánh phụ Winglets</span>
                <b>{selectedPlaneForDetails.winglets ? '✅ Đã gắn (-8% chi phí xăng)' : 'Chưa nâng cấp'}</b>
              </div>
            </div>

            <button className="btn" style={{ width: '100%', marginTop: 20 }} onClick={() => setSelectedPlaneForDetails(null)}>
              Đóng
            </button>
          </div>
        </div>
      )}

      {/* MODAL: Upgrades */}
      {selectedPlaneForUpgrade && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.6)',
            zIndex: 80,
            display: 'grid',
            placeItems: 'center',
            padding: 16,
          }}
          onClick={() => setSelectedPlaneForUpgrade(null)}
        >
          <div
            className="card"
            style={{ width: 'min(100%, 520px)', padding: 26 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 18 }}>Nâng cấp khí động & tiện nghi</h3>
                <div className="muted" style={{ fontSize: 12 }}>Tối ưu hóa lợi nhuận cho {selectedPlaneForUpgrade.name}</div>
              </div>
              <button className="btn ghost" onClick={() => setSelectedPlaneForUpgrade(null)} style={{ padding: 6, minHeight: 32 }}>
                <X size={16} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {/* Business class upgrade card */}
              <div className="card" style={{ background: 'var(--bg)', padding: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                  <div>
                    <b>🛋️ Cải tạo Khoang Thương gia</b>
                    <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>
                      Lắp đặt ghế thương gia cao cấp, tăng <b>15%</b> doanh thu vé trên mỗi chuyến bay.
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 800, color: '#0a58ca' }}>
                      {formatCurrency(Math.round(selectedPlaneForUpgrade.price * 0.05), currency)}
                    </div>
                  </div>
                </div>
                <div style={{ marginTop: 12 }}>
                  {selectedPlaneForUpgrade.businessClass ? (
                    <span className="badge">Đã hoàn thành</span>
                  ) : (
                    <button
                      className="btn"
                      style={{ fontSize: 12, padding: '7px 14px', minHeight: 36 }}
                      disabled={(airline?.cash || 0) < selectedPlaneForUpgrade.price * 0.05}
                      onClick={() => {
                        upgrade(selectedPlaneForUpgrade.id, 'businessClass');
                        setSelectedPlaneForUpgrade(null);
                      }}
                    >
                      Lắp đặt ngay
                    </button>
                  )}
                </div>
              </div>

              {/* Winglets upgrade card */}
              <div className="card" style={{ background: 'var(--bg)', padding: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                  <div>
                    <b>🪽 Cánh phụ Sharklets / Winglets</b>
                    <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>
                      Giảm lực cản khí động học, tiết kiệm vĩnh viễn <b>8%</b> chi phí tiêu hao nhiên liệu.
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 800, color: '#0a58ca' }}>
                      {formatCurrency(Math.round(selectedPlaneForUpgrade.price * 0.035), currency)}
                    </div>
                  </div>
                </div>
                <div style={{ marginTop: 12 }}>
                  {selectedPlaneForUpgrade.winglets ? (
                    <span className="badge">Đã hoàn thành</span>
                  ) : (
                    <button
                      className="btn"
                      style={{ fontSize: 12, padding: '7px 14px', minHeight: 36 }}
                      disabled={(airline?.cash || 0) < selectedPlaneForUpgrade.price * 0.035}
                      onClick={() => {
                        upgrade(selectedPlaneForUpgrade.id, 'winglets');
                        setSelectedPlaneForUpgrade(null);
                      }}
                    >
                      Lắp đặt ngay
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Rename */}
      {selectedPlaneForRename && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.6)',
            zIndex: 80,
            display: 'grid',
            placeItems: 'center',
            padding: 16,
          }}
          onClick={() => setSelectedPlaneForRename(null)}
        >
          <div
            className="card"
            style={{ width: 'min(100%, 420px)', padding: 24 }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: '0 0 12px', fontSize: 17 }}>Đổi tên định danh máy bay</h3>
            <label className="label">Tên hiển thị hoặc số hiệu đuôi tàu</label>
            <input
              className="input"
              maxLength={30}
              value={renameInput}
              onChange={(e) => setRenameInput(e.target.value)}
              autoFocus
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 18 }}>
              <button className="btn ghost" onClick={() => setSelectedPlaneForRename(null)}>
                Hủy
              </button>
              <button className="btn" disabled={!renameInput.trim()} onClick={handleConfirmRename}>
                Lưu tên mới
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Confirm Sell */}
      {selectedPlaneForSell && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.6)',
            zIndex: 80,
            display: 'grid',
            placeItems: 'center',
            padding: 16,
          }}
          onClick={() => setSelectedPlaneForSell(null)}
        >
          <div
            className="card"
            style={{ width: 'min(100%, 440px)', padding: 24 }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: '0 0 10px', fontSize: 18, color: '#e84b3c' }}>
              Xác nhận thanh lý máy bay
            </h3>
            <p className="muted" style={{ fontSize: 13, lineHeight: 1.6 }}>
              Bạn có chắc chắn muốn bán <b>{selectedPlaneForSell.name || selectedPlaneForSell.model}</b>?
              Giá trị thu hồi sau khấu hao ({selectedPlaneForSell.wear.toFixed(1)}% hao mòn):
            </p>
            <div
              style={{
                background: 'var(--bg)',
                padding: 14,
                borderRadius: 12,
                fontSize: 20,
                fontWeight: 800,
                color: '#12a678',
                textAlign: 'center',
                margin: '14px 0',
              }}
            >
              +{formatCurrency(getPlaneResaleValue(selectedPlaneForSell), currency)}
            </div>
            <div className="muted" style={{ fontSize: 11, marginBottom: 18 }}>
              * Lưu ý: Mọi đường bay đang gán máy bay này sẽ được đóng và slot sân bay sẽ được giải phóng.
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button className="btn ghost" onClick={() => setSelectedPlaneForSell(null)}>
                Hủy bỏ
              </button>
              <button className="btn danger" onClick={handleConfirmSell}>
                Xác nhận bán
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default function Fleet() {
  return (
    <GameShell>
      <FleetContent />
    </GameShell>
  );
}
