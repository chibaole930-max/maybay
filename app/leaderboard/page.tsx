'use client';

import { useEffect, useState, useMemo } from 'react';
import {
  Trophy,
  Users,
  Medal,
  UserPlus,
  Share2,
  Copy,
  Check,
  Search,
  ExternalLink,
  ChevronRight,
  TrendingUp,
  Plane,
} from 'lucide-react';
import { GameShell, PageHeading } from '@/components/game-shell';
import { useGameStore } from '@/store/useGameStore';
import { aiAirlines } from '@/lib/mock-data';
import { airlineValue, formatCurrency } from '@/lib/formulas';
import { netClient, type PilotProfile } from '@/lib/net/netClient';

interface CompetitorProfile {
  name: string;
  valuation: number;
  level: number;
  planesCount: number;
  routesCount: number;
  baseHub: string;
  isPlayer?: boolean;
  friendCode: string;
  reputation?: number;
  fleet?: string[];
  topRoutes?: string[];
}

function LeaderboardContent() {
  const {
    airline,
    planes,
    airports,
    routes,
    currency,
    notify,
    update,
    friendCodes,
  } = useGameStore();

  const [activeTab, setActiveTab] = useState<'leaderboard' | 'friends'>('leaderboard');
  const [filterPeriod, setFilterPeriod] = useState<'all' | 'week' | 'month'>('all');
  const [friendCodeInput, setFriendCodeInput] = useState('');
  const [copied, setCopied] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState<CompetitorProfile | null>(null);
  /** Chi tiết thật từ server (thứ hạng, thành tích, huy chương) — `null` khi hồ sơ là dữ liệu minh họa. */
  const [profileDetail, setProfileDetail] = useState<(PilotProfile & { fleet: string[]; topRoutes: string[] }) | null>(null);
  const [ownProfile, setOwnProfile] = useState<PilotProfile | null>(null);
  const [ownProfileLoading, setOwnProfileLoading] = useState(true);

  const playerValuation = airlineValue(airline?.cash || 0, planes, airports);
  const playerFriendCode = airline?.inviteCode || 'VNA3K9';

  // Thành tích của chính mình.
  //
  // Gọi thẳng `netClient.getOwnProfile()` chứ không dùng `useOnlineSync`: hook đó
  // đã được `GameShell` gọi một lần, dùng thêm ở đây sẽ tạo thêm bộ đếm heartbeat
  // và lưu tự động — tức là gấp đôi số request lên máy chủ.
  useEffect(() => {
    let stop = false;
    netClient.getOwnProfile().then((profile) => {
      if (stop) return;
      setOwnProfile(profile);
      setOwnProfileLoading(false);
    });
    return () => { stop = true; };
  }, []);

  // Generate 20 AI competitors
  const competitorsList: CompetitorProfile[] = useMemo(() => {
    const list: CompetitorProfile[] = [
      {
        name: airline?.name || 'Hãng của bạn',
        valuation: playerValuation,
        level: airline?.level || 1,
        planesCount: planes.length,
        routesCount: routes.length,
        baseHub: airline?.baseAirport || 'SGN',
        isPlayer: true,
        reputation: airline?.reputation ?? 70,
        fleet: planes.map(p=>p.name||p.model),
        topRoutes: routes.slice(0,3).map(r=>r.from+' → '+r.to),
        friendCode: playerFriendCode,
      },
    ];

    const hubCodes = ['SGN', 'HAN', 'DAD', 'CXR', 'HPH', 'PQC'];

    aiAirlines.forEach((name, i) => {
      // Benchmark valuations
      let val = Math.round((95 - i * 3.8) * 1000000);
      if (filterPeriod === 'week') val = Math.round(val * 0.25);
      if (filterPeriod === 'month') val = Math.round(val * 0.65);

      list.push({
        name,
        valuation: val,
        level: Math.max(3, 24 - i),
        planesCount: Math.max(2, 30 - i),
        routesCount: Math.max(2, 18 - i),
        baseHub: hubCodes[i % hubCodes.length],
        isPlayer: false,
        friendCode: `VNA-${name.substring(0, 3).toUpperCase()}-${100 + i}`,
      });
    });

    // Sort by valuation descending
    return list.sort((a, b) => b.valuation - a.valuation);
  }, [
    airline,
    planes.length,
    routes.length,
    playerValuation,
    playerFriendCode,
    filterPeriod,
  ]);

  const [onlinePilots, setOnlinePilots] = useState<{ code: string; name: string; value: number; level: number; reputation: number }[]>([]);
  useEffect(() => { netClient.getLeaderboard().then((rows) => setOnlinePilots(rows.filter((r) => r.code !== playerFriendCode))).catch(() => {}); }, [playerFriendCode]);
  const onlineRows: CompetitorProfile[] = onlinePilots.map((r, i) => ({ name: r.name + ' (online)', valuation: r.value, level: r.level, planesCount: 0, routesCount: 0, baseHub: 'NET', friendCode: r.code, reputation: r.reputation }));
  const fullList = [...competitorsList, ...onlineRows].sort((a, b) => b.valuation - a.valuation);
  const playerRank = fullList.findIndex((c) => c.isPlayer) + 1;

  const handleCopyCode = () => {
    if (typeof navigator !== 'undefined') {
      navigator.clipboard.writeText(playerFriendCode);
      setCopied(true);
      notify('Đã sao chép mã hãng của bạn vào bộ nhớ tạm!', 'success');
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleSearchFriend = async () => {
    if (!friendCodeInput.trim()) return;
    const code=friendCodeInput.trim().toUpperCase();
    const found=competitorsList.find(c=>c.friendCode.toUpperCase()===code);
    if(found){setProfileDetail(null);setSelectedProfile(found);update(s=>({...s,friendCodes:[...new Set([...(s.friendCodes||[]),code])]}));notify(`Đã tìm thấy thông tin hãng "${found.name}" và lưu vào danh sách bạn bè.`, 'info');return;}
    // Hỏi server trước — hồ sơ thật có thứ hạng, thành tích giao dịch và huy chương.
    const live=await netClient.getPilotProfile(code);
    if(live){setProfileDetail(live);setSelectedProfile({name:live.pilot.name,valuation:live.pilot.value,level:live.pilot.level,planesCount:live.pilot.planes,routesCount:live.pilot.routes,baseHub:'—',friendCode:live.pilot.code,reputation:live.pilot.reputation,fleet:live.fleet,topRoutes:live.topRoutes});update(s=>({...s,friendCodes:[...new Set([...(s.friendCodes||[]),code])]}));notify(`Đã tìm thấy hồ sơ ${live.pilot.name}.`, 'success');return;}
    const profile=await netClient.getFriendProfile(code);
    if(profile){setProfileDetail(null);setSelectedProfile({name:profile.name,valuation:profile.value,level:profile.level,planesCount:profile.fleet.length,routesCount:profile.topRoutes.length,baseHub:'SGN',friendCode:profile.code,reputation:profile.reputation,fleet:profile.fleet,topRoutes:profile.topRoutes});update(s=>({...s,friendCodes:[...new Set([...(s.friendCodes||[]),code])]}));notify(`Đã tìm thấy hồ sơ minh họa của ${profile.name}.`, 'success');}
    else notify('Không tìm thấy mã hãng này trên máy chủ.', 'warn');
  };

  return (
    <>
      <PageHeading
        title="Bảng xếp hạng Hàng không"
        subtitle="So tài năng lực điều hành cùng 20 hãng hàng không hàng đầu trên bầu trời Việt Nam."
      />

      {/* Navigation tabs & filter */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 12,
          marginBottom: 20,
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button
            className={`chip ${activeTab === 'leaderboard' ? 'active' : ''}`}
            onClick={() => setActiveTab('leaderboard')}
          >
            <Trophy size={16} /> Bảng xếp hạng toàn quốc
          </button>
          <button
            className={`chip ${activeTab === 'friends' ? 'active' : ''}`}
            onClick={() => setActiveTab('friends')}
          >
            <Users size={16} /> Kết nối bạn bè & So sánh
          </button>
        </div>

        {activeTab === 'leaderboard' && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {[
              { id: 'all', label: 'Tổng giá trị' },
              { id: 'month', label: 'Theo tháng' },
              { id: 'week', label: 'Theo tuần' },
            ].map((p) => (
              <button
                key={p.id}
                onClick={() => setFilterPeriod(p.id as any)}
                className={`chip ${filterPeriod === p.id ? 'active' : ''}`}
              >
                {p.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* TAB 1: LEADERBOARD */}
      {activeTab === 'leaderboard' && (
        <>
          {/* Top 3 Podium */}
          <div className="grid-3" style={{ marginBottom: 24 }}>
            {fullList.slice(0, 3).map((comp, idx) => (
              <div
                key={comp.name}
                className={`card ${idx === 0 ? 'podium-first' : ''} ${comp.isPlayer ? 'podium-self' : ''}`}
                onClick={() => { setProfileDetail(null); setSelectedProfile(comp); }}
                style={{
                  textAlign: 'center',
                  cursor: 'pointer',
                }}
              >
                <div style={{ fontSize: 36 }}>{['🥇', '🥈', '🥉'][idx]}</div>
                <div className="eyebrow" style={{ color: 'var(--accent)', marginTop: 4 }}>
                  HẠNG #{idx + 1}
                </div>
                <b style={{ fontSize: 16, display: 'block', margin: '4px 0' }}>
                  {comp.name} {comp.isPlayer ? '(Bạn)' : ''}
                </b>
                <div className="tabular-nums" style={{ fontSize: 18, fontWeight: 800, color: 'var(--blue)', margin: '8px 0 4px' }}>
                  {formatCurrency(comp.valuation, currency)}
                </div>
                <div className="muted" style={{ fontSize: 12 }}>
                  Cấp {comp.level} · {comp.planesCount} máy bay · Hub {comp.baseHub}
                </div>
              </div>
            ))}
          </div>

          {/* Ranking Table */}
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <div>
                <h2 className="section-title" style={{ margin: 0 }}>
                  Thứ hạng Hãng hàng không (AI + online thật)
                </h2>
                <div className="muted" style={{ fontSize: 12 }}>
                  Vị trí của bạn: <b>Hạng #{playerRank}</b> trên tổng số {fullList.length} hãng
                </div>
              </div>
            </div>

            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>HẠNG</th>
                    <th>HÃNG BAY</th>
                    <th>CẤP ĐỘ</th>
                    <th>ĐỘI BAY</th>
                    <th>ĐƯỜNG BAY</th>
                    <th>HUB CHÍNH</th>
                    <th>GIÁ TRỊ HÃNG</th>
                  </tr>
                </thead>
                <tbody>
                  {fullList.map((comp, idx) => (
                    <tr
                      key={comp.name}
                      onClick={() => { setProfileDetail(null); setSelectedProfile(comp); }}
                      style={{ cursor: 'pointer' }}
                      className={comp.isPlayer ? 'row-self' : undefined}
                    >
                      <td>
                        <b style={{ color: idx < 3 ? 'var(--accent)' : 'inherit', fontSize: 14 }}>
                          {idx + 1}
                        </b>
                      </td>
                      <td>
                        <b style={{ fontSize: 14 }}>
                          {comp.isPlayer ? '✈️ ' : ''}
                          {comp.name} {comp.isPlayer ? '(Bạn)' : ''}
                        </b>
                      </td>
                      <td>
                        <span className="badge" style={{ fontSize: 11 }}>
                          Cấp {comp.level}
                        </span>
                      </td>
                      <td>{comp.planesCount} máy bay</td>
                      <td>{comp.routesCount} tuyến</td>
                      <td>
                        <b>{comp.baseHub}</b>
                      </td>
                      <td>
                        <b className="tabular-nums" style={{ color: 'var(--blue)', fontSize: 14 }}>
                          {formatCurrency(comp.valuation, currency)}
                        </b>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* TAB 2: FRIENDS & CODE */}
      {activeTab === 'friends' && (
        <div className="grid-2">
          {/* Your Friend Code */}
            <div className="card sub-card">
              <h2 className="section-title">Mã định danh Hãng của bạn</h2>
            <p className="muted" style={{ fontSize: 13, lineHeight: 1.6 }}>
              Chia sẻ mã này với bạn bè để họ có thể tìm kiếm, theo dõi và so tài chỉ số vận hành
              với hãng bay của bạn.
            </p>

            <div
              style={{
                display: 'flex',
                gap: 10,
                alignItems: 'center',
                background: 'var(--bg)',
                padding: 14,
                borderRadius: 14,
                margin: '18px 0',
              }}
            >
              <b className="tabular-nums" style={{ fontSize: 17, letterSpacing: 1, color: 'var(--blue)', flex: 1 }}>
                {playerFriendCode}
              </b>
              <button className="btn secondary compact" onClick={handleCopyCode}>
                {copied ? <Check size={14} /> : <Copy size={14} />} {copied ? 'Đã chép' : 'Sao chép'}
              </button>
            </div>

            <div className="muted" style={{ fontSize: 11 }}>
              ✓ Cập nhật tự động dựa trên tên hãng và năm hoạt động.
            </div>
          </div>

          {/* Search Friend by Code */}
          <div className="card">
            <h2 className="section-title">Tìm kiếm & So sánh đối thủ</h2>
            <label className="label">Nhập mã hãng đối thủ hoặc bạn bè</label>
            <div className="field-row" style={{ marginBottom: 16 }}>
              <input
                className="input"
                placeholder="Ví dụ: VNA3K9"
                value={friendCodeInput}
                onChange={(e) => setFriendCodeInput(e.target.value)}
              />
              <button className="btn" onClick={handleSearchFriend}>
                <Search size={16} /> Tìm
              </button>
            </div>

<div className="muted" style={{fontSize:11,marginTop:12}}>Bạn bè đã lưu: {(friendCodes||[]).join(' · ')||'Chưa có — nhập mã hãng để thêm.'}</div>
            <div className="muted" style={{ fontSize: 12 }}>
              Thử tìm kiếm các mã hãng mẫu của đối thủ:
              <br />
              <code style={{ color: 'var(--blue)' }}>VNA3K9</code> (VietSky),{' '}
              <code style={{ color: 'var(--blue)' }}>SAI8Q2</code> (Saigon Air), <code style={{color:'var(--blue)'}}>BAY5M1</code> (Cánh Én Việt)
            </div>
          </div>

          {/* Thành tích của bạn — dữ liệu thật từ máy chủ, cần đăng nhập */}
          <div className="card">
            <h2 className="section-title">Thành tích của hãng bạn</h2>
            {ownProfileLoading && (
              <p className="muted" style={{ fontSize: 13 }}>Đang tải thành tích…</p>
            )}
            {!ownProfileLoading && !ownProfile && (
              <p className="muted" style={{ fontSize: 13 }}>
                Đăng nhập để xem thứ hạng, thành tích giao dịch và huy chương trên máy chủ.
              </p>
            )}
            {ownProfile && (
              <>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', margin: '14px 0' }}>
                  <span className="badge">Hạng #{ownProfile.rank}/{ownProfile.total}</span>
                  <span className="badge">{ownProfile.tradeStats.sold} lần bán</span>
                  <span className="badge">{ownProfile.tradeStats.bought} lần mua</span>
                  <span className="badge">{formatCurrency(ownProfile.tradeStats.volume, currency)} đã giao dịch</span>
                </div>
                {ownProfile.achievements.length > 0 ? (
                  <>
                    <span className="label">Huy chương</span>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
                      {ownProfile.achievements.map((a) => (
                        <span key={a.id} className="badge" style={{ cursor: 'help' }} title={a.detail}>{a.label}</span>
                      ))}
                    </div>
                  </>
                ) : (
                  <p className="muted" style={{ fontSize: 12 }}>Chưa có huy chương nào — hãy bán chiếc máy bay đầu tiên trên chợ.</p>
                )}
                {ownProfile.trades.length > 0 && (
                  <div className="table-wrap">
                    <table>
                      <thead>
                        <tr><th>LOẠI</th><th>MÁY BAY</th><th>ĐỐI TÁC</th><th>GIÁ</th></tr>
                      </thead>
                      <tbody>
                        {ownProfile.trades.slice(0, 8).map((t) => (
                          <tr key={t.id}>
                            <td><b className={t.side === 'mua' ? 'negative' : 'positive'}>{t.side === 'mua' ? 'Mua' : 'Bán'}</b></td>
                            <td>{t.model}</td>
                            <td className="muted">{t.counterparty}</td>
                            <td>{formatCurrency(t.price, currency)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* PROFILE DETAILS MODAL */}
      {selectedProfile && (
        <div
          className="modal-backdrop"
          onClick={() => { setProfileDetail(null); setSelectedProfile(null); }}
        >
          <div
            className="card"
            style={{ width: 'min(100%, 480px)', padding: 26 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 18 }}>Hồ sơ Hãng hàng không</h3>
                <div className="muted" style={{ fontSize: 12 }}>Mã hãng: {selectedProfile.friendCode}</div>
              </div>
              <span className="badge" style={{ fontSize: 12 }}>
                Cấp {selectedProfile.level}
              </span>
            </div>

            <div style={{ textAlign: 'center', padding: '16px 0', borderBottom: '1px solid var(--line)' }}>
              <div style={{ fontSize: 36 }}>✈️</div>
              <h2 style={{ margin: '8px 0 4px', fontSize: 20 }}>{selectedProfile.name}</h2>
              <div className="muted" style={{ fontSize: 13 }}>
                Căn cứ chính (Hub): <b>{selectedProfile.baseHub}</b>
              </div>
            </div>

            <div style={{ padding: '8px 0', fontSize: 13 }}>
              <div className="kv">
                <span>Tổng giá trị hãng:</span>
                <b className="tabular-nums" style={{ color: 'var(--blue)', fontSize: 15 }}>
                  {formatCurrency(selectedProfile.valuation, currency)}
                </b>
              </div>
              <div className="kv">
                <span>Số lượng máy bay:</span>
                <b>{selectedProfile.planesCount} chiếc</b>
              </div>
              <div className="kv">
                <span>Số đường bay đang bay:</span>
                <b>{selectedProfile.routesCount} tuyến</b>
              </div>
              {selectedProfile.reputation!==undefined&&<div className="kv"><span>Danh tiếng:</span><b>{selectedProfile.reputation}/100 · {Math.max(1,Math.round(selectedProfile.reputation/20))} sao</b></div>}
              {profileDetail && (
                <>
                  <div className="kv">
                    <span>Thứ hạng:</span>
                    <b className="tabular-nums">#{profileDetail.rank}/{profileDetail.total}</b>
                  </div>
                  <div className="kv">
                    <span>Giao dịch:</span>
                    <b>{profileDetail.tradeStats.sold} bán · {profileDetail.tradeStats.bought} mua</b>
                  </div>
                  {profileDetail.tradeStats.volume > 0 && (
                    <div className="kv">
                      <span>Tổng khối lượng:</span>
                      <b>{formatCurrency(profileDetail.tradeStats.volume, currency)}</b>
                    </div>
                  )}
                </>
              )}
              {selectedProfile.fleet?.length ? <div><span className="muted">Đội bay:</span><p>{selectedProfile.fleet.join(' · ')}</p></div> : null}
              {selectedProfile.topRoutes?.length ? <div><span className="muted">Tuyến nổi bật:</span><p>{selectedProfile.topRoutes.join(' · ')}</p></div> : null}
              {profileDetail && profileDetail.achievements.length > 0 && (
                <div>
                  <span className="muted">Huy chương:</span>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
                    {profileDetail.achievements.map((a) => (
                      <span key={a.id} className="badge" title={a.detail}>
                        {a.label}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {profileDetail && profileDetail.trades.length > 0 && (
                <div>
                  <span className="muted">Giao dịch gần đây:</span>
                  <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {profileDetail.trades.slice(0, 5).map((t) => (
                      <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                        <span className="muted">
                          {t.side === 'mua' ? 'Mua' : 'Bán'} {t.model}
                          {t.counterparty !== '—' ? ` · ${t.counterparty}` : ''}
                        </span>
                        <b>{formatCurrency(t.price, currency)}</b>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <button className="btn" style={{ width: '100%', marginTop: 8 }} onClick={() => { setProfileDetail(null); setSelectedProfile(null); }}>
              Đóng
            </button>
          </div>
        </div>
      )}
    </>
  );
}

export default function Leaderboard() {
  return (
    <GameShell>
      <LeaderboardContent />
    </GameShell>
  );
}
