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
import { netClient } from '@/lib/net/netClient';

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
  isHardcore?: boolean;
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

  const playerValuation = airlineValue(airline?.cash || 0, planes, airports);
  const playerFriendCode = airline?.inviteCode || 'VNA3K9';

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
        isHardcore: !!airline?.hardcore,
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
    if(found){setSelectedProfile(found);update(s=>({...s,friendCodes:[...new Set([...(s.friendCodes||[]),code])]}));notify(`Đã tìm thấy thông tin hãng "${found.name}" và lưu vào danh sách bạn bè.`, 'info');return;}
    const profile=await netClient.getFriendProfile(code);
    if(profile){setSelectedProfile({name:profile.name,valuation:profile.value,level:profile.level,planesCount:profile.fleet.length,routesCount:profile.topRoutes.length,baseHub:'SGN',friendCode:profile.code,reputation:profile.reputation,fleet:profile.fleet,topRoutes:profile.topRoutes});update(s=>({...s,friendCodes:[...new Set([...(s.friendCodes||[]),code])]}));notify(`Đã tìm thấy hồ sơ mock của ${profile.name}.`, 'success');}
    else notify('Không tìm thấy mã hãng. Hãy thử VNA3K9, SAI8Q2 hoặc BAY5M1.', 'warn');
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
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            className={`btn ${activeTab === 'leaderboard' ? '' : 'ghost'}`}
            onClick={() => setActiveTab('leaderboard')}
            style={{ padding: '8px 16px', minHeight: 38, fontSize: 13 }}
          >
            <Trophy size={16} /> Bảng xếp hạng toàn quốc
          </button>
          <button
            className={`btn ${activeTab === 'friends' ? '' : 'ghost'}`}
            onClick={() => setActiveTab('friends')}
            style={{ padding: '8px 16px', minHeight: 38, fontSize: 13 }}
          >
            <Users size={16} /> Kết nối bạn bè & So sánh
          </button>
        </div>

        {activeTab === 'leaderboard' && (
          <div style={{ display: 'flex', gap: 6 }}>
            {[
              { id: 'all', label: 'Tổng giá trị' },
              { id: 'month', label: 'Theo tháng' },
              { id: 'week', label: 'Theo tuần' },
            ].map((p) => (
              <button
                key={p.id}
                onClick={() => setFilterPeriod(p.id as any)}
                className={`btn ${filterPeriod === p.id ? '' : 'ghost'}`}
                style={{ padding: '6px 12px', minHeight: 34, fontSize: 12 }}
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
                className={`card ${comp.isHardcore?'hardcore-frame':''}`}
                onClick={() => setSelectedProfile(comp)}
                style={{
                  textAlign: 'center',
                  cursor: 'pointer',
                  borderColor: idx === 0 ? '#ffb800' : undefined,
                  background: comp.isPlayer ? 'rgba(10, 88, 202, 0.04)' : undefined,
                }}
              >
                <div style={{ fontSize: 36 }}>{['🥇', '🥈', '🥉'][idx]}</div>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#ffb800', marginTop: 4 }}>
                  HẠNG #{idx + 1}
                </div>
                <b style={{ fontSize: 16, display: 'block', margin: '4px 0' }}>
                  {comp.name} {comp.isPlayer ? '(Bạn)' : ''} {comp.isHardcore&&<span className="hardcore-mark">⚡ Hardcore</span>}
                </b>
                <div style={{ fontSize: 18, fontWeight: 800, color: '#0a58ca', margin: '8px 0 4px' }}>
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
                      onClick={() => setSelectedProfile(comp)}
                      style={{
                        cursor: 'pointer',
                        background: comp.isPlayer ? 'rgba(10, 88, 202, 0.08)' : undefined,
                      }}
                    >
                      <td>
                        <b style={{ color: idx < 3 ? '#ffb800' : 'inherit', fontSize: 14 }}>
                          {idx + 1}
                        </b>
                      </td>
                      <td>
                        <b style={{ fontSize: 14 }}>
                          {comp.isPlayer ? '✈️ ' : ''}
                          {comp.name} {comp.isPlayer ? '(Bạn)' : ''} {comp.isHardcore&&<span className="hardcore-mark">⚡ Hardcore</span>}
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
                        <b style={{ color: '#0a58ca', fontSize: 14 }}>
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
          <div className="card">
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
              <b style={{ fontSize: 17, letterSpacing: 1, color: '#0a58ca', flex: 1 }}>
                {playerFriendCode}
              </b>
              <button className="btn secondary" onClick={handleCopyCode} style={{ padding: '8px 14px', fontSize: 12 }}>
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
            <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
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
              <code style={{ color: '#0a58ca' }}>VNA3K9</code> (VietSky),{' '}
              <code style={{ color: '#0a58ca' }}>SAI8Q2</code> (Saigon Air), <code style={{color:'#0a58ca'}}>BAY5M1</code> (Cánh Én Việt)
            </div>
          </div>
        </div>
      )}

      {/* PROFILE DETAILS MODAL */}
      {selectedProfile && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.65)',
            zIndex: 80,
            display: 'grid',
            placeItems: 'center',
            padding: 16,
          }}
          onClick={() => setSelectedProfile(null)}
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

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '16px 0', fontSize: 13 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span className="muted">Tổng giá trị hãng:</span>
                <b style={{ color: '#0a58ca', fontSize: 15 }}>
                  {formatCurrency(selectedProfile.valuation, currency)}
                </b>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span className="muted">Số lượng máy bay:</span>
                <b>{selectedProfile.planesCount} chiếc</b>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span className="muted">Số đường bay đang bay:</span>
                <b>{selectedProfile.routesCount} tuyến</b>
              </div>
              {selectedProfile.reputation!==undefined&&<div style={{display:'flex',justifyContent:'space-between'}}><span className="muted">Danh tiếng:</span><b>{selectedProfile.reputation}/100 · {Math.max(1,Math.round(selectedProfile.reputation/20))} sao</b></div>}{selectedProfile.fleet&&<div><span className="muted">Đội bay:</span><p>{selectedProfile.fleet.join(' · ')}</p></div>}{selectedProfile.topRoutes&&<div><span className="muted">Tuyến nổi bật:</span><p>{selectedProfile.topRoutes.join(' · ')}</p></div>}
            </div>

            <button className="btn" style={{ width: '100%', marginTop: 8 }} onClick={() => setSelectedProfile(null)}>
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
