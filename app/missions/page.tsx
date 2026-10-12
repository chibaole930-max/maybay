'use client';

import { useEffect, useState } from 'react';
import {
  Trophy,
  Target,
  Gift,
  CheckCircle2,
  Award,
  Sparkles,
  Clock,
  Coins,
  ChevronRight,
} from 'lucide-react';
import { GameShell, PageHeading } from '@/components/game-shell';
import { useGameStore } from '@/store/useGameStore';
import { achievementsList } from '@/lib/mock-data';
import { airlineValue, formatCurrency } from '@/lib/formulas';
import { netClient, type DailyMissions } from '@/lib/net/netClient';
import type { Mission } from '@/types';

function MissionsContent() {
  const {
    airline,
    planes,
    routes,
    airports,
    missions,
    claimMission,
    transactions,
    research,
    currency,
    weeklySeason,
    notify,
    update,
  } = useGameStore();

  const [tab, setTab] = useState<'starter' | 'daily' | 'weekly' | 'achievements'>('starter');

  // Nhiem vu hang ngay TOAN SERVER. `null` = chua dang nhap (hoac server khong
  // tra duoc) — khi do tab van hien phan nhiem vu cuc bo ben duoi.
  const [serverMissions, setServerMissions] = useState<DailyMissions | null>(null);
  const [serverBusy, setServerBusy] = useState(false);

  const loadServerMissions = async () => {
    setServerBusy(true);
    const result = await netClient.getDailyMissions();
    setServerBusy(false);
    if (result) setServerMissions(result);
  };

  useEffect(() => {
    // Poll vua thoi: nhiem vu doi muc khi len cap / tang gia tri, va reset 0h UTC.
    void loadServerMissions();
    const timer = setInterval(() => void loadServerMissions(), 60_000);
    return () => clearInterval(timer);
  }, []);

  const claimServerMission = async (id: string) => {
    setServerBusy(true);
    const result = await netClient.claimDailyMission(id);
    setServerBusy(false);
    if (result.error) notify(result.error, 'warn');
    // Server tra ve bo nhiemvu da cap nhat — dung luon de khong phai do lai.
    if (result.missions) setServerMissions(result.missions);
    // Gia tri vua cong thuong can vao tien mat cua nguoi choi ngay.
    if (result.reward) update((s) => ({ ...s, airline: s.airline ? { ...s.airline, cash: s.airline.cash + result.reward! } : s.airline }));
  };

  const currentCash = airline?.cash || 0;
  const currentValuation = airlineValue(currentCash, planes, airports);
  const currentLevel = airline?.level || 1;

  // Filter missions by tab
  const starterMissionsList = missions.filter((m) => m.category === 'starter');
  const dailyMissionsList = missions.filter((m) => m.category === 'daily');

  // Calculate unlock status for all 30 achievements
  const checkAchievementDone = (metric: string, target: number): boolean => {
    switch (metric) {
      case 'cash':
        return currentCash >= target;
      case 'valuation':
        return currentValuation >= target;
      case 'planes':
        return planes.length >= target;
      case 'routes':
        return routes.length >= target;
      case 'route_sgn_han':
        return routes.some(
          (r) => (r.from === 'SGN' && r.to === 'HAN') || (r.from === 'HAN' && r.to === 'SGN')
        );
      case 'intl_routes':
        return (
          routes.filter((r) => ['BKK', 'SIN', 'NRT', 'ICN', 'TPE'].includes(r.to) ||
            ['BKK', 'SIN', 'NRT', 'ICN', 'TPE'].includes(r.from)).length >= target
        );
      case 'maintenance_count':
        return (
          transactions.filter((t) => t.type === 'Bảo trì').length >= target
        );
      case 'business_upgrades':
        return planes.filter((p) => p.businessClass).length >= target;
      case 'winglet_upgrades':
        return planes.filter((p) => p.winglets).length >= target;
      case 'max_research_branch':
        return (
          (research.fuel || 0) >= 5 ||
          (research.service || 0) >= 5 ||
          (research.maintenance || 0) >= 5
        );
      case 'total_research':
        return (
          (research.fuel || 0) +
            (research.service || 0) +
            (research.maintenance || 0) >= target
        );
      case 'second_base':
        return !!airline?.secondBaseAirport;
      case 'total_slots':
        return airports.reduce((acc, a) => acc + (a.slots || 0), 0) >= target;
      case 'level':
        return currentLevel >= target;
      case 'has_a380':
        return planes.some((p) => p.model.includes('A380'));
      case 'loan_repaid':
        return transactions.some((t) => t.type === 'Trả nợ');
      case 'rank_first':
        return currentValuation >= 85000000;
      case 'auto_manage':
        return currentLevel >= 15;
      case 'total_transactions':
        return transactions.length >= target;
      default:
        return false;
    }
  };

  const completedAchievementsCount = achievementsList.filter((a) =>
    checkAchievementDone(a.metric, a.target)
  ).length;

  return (
    <>
      <PageHeading
        title="Nhiệm vụ & Bảng Thành tựu"
        subtitle="Hoàn thành các mốc chỉ tiêu để nhận khoản tiền thưởng lớn và tích lũy XP thăng cấp."
      />

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        <button
          className={`chip ${tab === 'starter' ? 'active' : ''}`}
          onClick={() => setTab('starter')}
        >
          <Target size={16} /> Nhiệm vụ tân thủ (7 bước)
        </button>
        <button
          className={`chip ${tab === 'daily' ? 'active' : ''}`}
          onClick={() => setTab('daily')}
        >
          <Clock size={16} /> Nhiệm vụ hàng ngày (reset 0h)
        </button>
        <button
          className={`chip ${tab === 'weekly' ? 'active' : ''}`}
          onClick={() => setTab('weekly')}
        >
          <Sparkles size={16} /> Mùa tuần {weeklySeason?.id || ''} ({(weeklySeason?.quests || []).filter((q) => q.done).length}/{(weeklySeason?.quests || []).length})
        </button>
        <button
          className={`chip ${tab === 'achievements' ? 'active' : ''}`}
          onClick={() => setTab('achievements')}
        >
          <Trophy size={16} /> Bộ sưu tập thành tựu ({completedAchievementsCount}/30)
        </button>
      </div>

      {/* TAB 1: Starter Missions */}
      {tab === 'starter' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {starterMissionsList.map((m) => {
            const isCompleted = m.progress >= m.target;
            const percent = Math.min(100, Math.round((m.progress / m.target) * 100));

            return (
              <div
                key={m.id}
                className={`card mission-row ${isCompleted && m.reward > 0 ? 'mission-done' : ''}`}
              >
                <div className="mission-main">
                  <div className={`mission-ic ${isCompleted ? 'done' : ''}`}>
                    {m.icon || '✈️'}
                  </div>
                  <div className="grow">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <b style={{ fontSize: 15 }}>{m.title}</b>
                      {isCompleted && m.reward === 0 && (
                        <span className="badge" style={{ fontSize: 10 }}>
                          ✓ Đã nhận thưởng
                        </span>
                      )}
                    </div>
                    <div className="muted" style={{ fontSize: 12, margin: '4px 0 8px' }}>
                      {m.description}
                    </div>

                    {/* Progress bar */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div className={`progress grow ${isCompleted ? 'success' : ''}`} style={{ height: 6 }}>
                        <i style={{ width: `${percent}%` }} />
                      </div>
                      <span className="muted tabular-nums" style={{ fontSize: 11, minWidth: 60, textAlign: 'right' }}>
                        {Math.floor(m.progress).toLocaleString('vi-VN')} / {m.target.toLocaleString('vi-VN')}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Reward & Claim button */}
                <div className="mission-side">
                  <div className="mission-reward">
                    <div className="muted">PHẦN THƯỞNG</div>
                    <b>
                      +{formatCurrency(m.reward, currency)}
                    </b>
                    <div className="mission-xp">
                      +{m.rewardXp || 100} XP
                    </div>
                  </div>

                  {m.reward > 0 ? (
                    <button
                      className={`btn ${isCompleted ? 'success' : ''}`}
                      disabled={!isCompleted}
                      onClick={() => claimMission(m.id)}
                    >
                      {isCompleted ? 'Nhận thưởng 🎁' : 'Chưa đạt'}
                    </button>
                  ) : (
                    <button className="btn ghost compact" disabled>
                      <CheckCircle2 size={16} color="var(--success)" /> Hoàn thành
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* TAB 2: Daily Missions */}
      {tab === 'daily' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {dailyMissionsList.map((m) => {
            const isCompleted = m.progress >= m.target;
            const percent = Math.min(100, Math.round((m.progress / m.target) * 100));

            return (
              <div key={m.id} className="card mission-row">
                <div className="mission-main">
                  <div className="mission-ic">
                    {m.icon || '🎯'}
                  </div>
                  <div className="grow">
                    <b style={{ fontSize: 15 }}>{m.title}</b>
                    <div className="muted" style={{ fontSize: 12, margin: '4px 0 8px' }}>
                      {m.description}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div className={`progress grow ${isCompleted ? 'success' : ''}`} style={{ height: 6 }}>
                        <i style={{ width: `${percent}%` }} />
                      </div>
                      <span className="muted tabular-nums" style={{ fontSize: 11, minWidth: 60, textAlign: 'right' }}>
                        {Math.floor(m.progress).toLocaleString('vi-VN')} / {m.target.toLocaleString('vi-VN')}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mission-side">
                  <div className="mission-reward">
                    <div className="muted">PHẦN THƯỞNG</div>
                    <b>
                      +{formatCurrency(m.reward, currency)}
                    </b>
                  </div>
                  <button
                    className={`btn ${isCompleted && m.reward > 0 ? 'success' : ''}`}
                    disabled={!isCompleted || m.reward <= 0}
                    onClick={() => claimMission(m.id)}
                  >
                    {m.reward <= 0 ? 'Đã nhận' : isCompleted ? 'Nhận thưởng 🎁' : 'Đang làm'}
                  </button>
                </div>
              </div>
            );
          })}
          <div className="muted" style={{ fontSize: 11 }}>Reset lúc 0h hàng ngày. Chuỗi điểm danh từ 3 ngày tăng trần offline.</div>

          {/* Nhiem vu hang ngay TOAN SERVER — chi so tinh tren may chu, khac
              hoan toan voi bo nhiemvu cuc bo o tren. */}
          {serverMissions && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 8 }}>
              <div className="card sub-card">
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <Sparkles size={18} color="var(--blue)" />
                  <b style={{ fontSize: 15 }}>Nhiệm vụ toàn server</b>
                  {serverMissions.server && (
                    <span className="muted tabular-nums" style={{ fontSize: 12 }}>
                      {serverMissions.server.participating}/{serverMissions.server.total} hãng đang chơi ·{' '}
                      {serverMissions.server.totalPlanes.toLocaleString('vi-VN')} máy bay ·{' '}
                      {serverMissions.server.totalRoutes.toLocaleString('vi-VN')} đường bay
                    </span>
                  )}
                  <button className="btn ghost compact" onClick={() => void loadServerMissions()} style={{ marginLeft: 'auto' }}>
                    {serverBusy ? 'Đang tải…' : 'Làm mới'}
                  </button>
                </div>
                <div className="muted" style={{ fontSize: 11, marginTop: 6 }}>
                  Reset 0h giờ Việt Nam · hoàn thành 4 nhiệm vụ để tối đa hoá thưởng hôm nay
                </div>
              </div>

              {serverMissions.missions.map((m) => {
                const percent = Math.min(100, Math.round((m.progress / m.target) * 100));
                const claimable = m.done && !m.claimed;
                return (
                  <div key={m.id} className="card mission-row">
                    <div className="grow" style={{ minWidth: 260 }}>
                      <b style={{ fontSize: 15 }}>{m.title}</b>
                      <div className="muted" style={{ fontSize: 12, margin: '4px 0 8px' }}>{m.description}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div className={`progress grow ${m.done ? 'success' : ''}`} style={{ height: 6 }}>
                          <i style={{ width: `${percent}%` }} />
                        </div>
                        <span className="muted tabular-nums" style={{ fontSize: 11, minWidth: 96, textAlign: 'right' }}>
                          {Math.floor(m.progress).toLocaleString('vi-VN')} / {m.target.toLocaleString('vi-VN')}
                        </span>
                      </div>
                    </div>
                    <div className="mission-side">
                      <div className="mission-reward">
                        <div className="muted">THƯỞNG</div>
                        <b>+{formatCurrency(m.reward, currency)}</b>
                      </div>
                      <button
                        className={`btn ${claimable ? 'success' : ''}`}
                        disabled={!claimable || serverBusy}
                        onClick={() => void claimServerMission(m.id)}
                      >
                        {m.claimed ? '✓ Đã nhận' : m.done ? 'Nhận thưởng 🎁' : 'Đang làm'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
      {tab === 'weekly' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="card sub-card">
            <b style={{ fontSize: 13 }}>Mùa {weeklySeason?.id} · reset Thứ 2 hàng tuần</b>
            <div className="muted" style={{ fontSize: 12 }}>Hoàn thành cả 3 quest tuần để giữ nhịp 7-30 ngày. Thưởng lớn gấp ~3x quest ngày.</div>
          </div>
          {(weeklySeason?.quests || []).map((m) => {
            const isCompleted = m.progress >= m.target;
            const percent = Math.min(100, Math.round((m.progress / m.target) * 100));
            return (
              <div key={m.id} className="card mission-row">
                <div className="mission-main">
                  <div className="mission-ic">{m.icon || '🎯'}</div>
                  <div className="grow">
                    <b style={{ fontSize: 15 }}>{m.title}</b>
                    <div className="muted" style={{ fontSize: 12, margin: '4px 0 8px' }}>{m.description}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div className={`progress grow ${isCompleted ? 'success' : ''}`} style={{ height: 6 }}><i style={{ width: percent + '%' }} /></div>
                      <span className="muted tabular-nums" style={{ fontSize: 11 }}>{Math.floor(m.progress).toLocaleString('vi-VN')} / {m.target.toLocaleString('vi-VN')}</span>
                    </div>
                  </div>
                </div>
                <button className={`btn ${isCompleted && m.reward > 0 ? 'success' : ''}`} disabled={!isCompleted || m.reward <= 0} onClick={() => claimMission(m.id)}>{m.reward <= 0 ? 'Đã nhận' : isCompleted ? 'Nhận thưởng' : 'Đang làm'}</button>
              </div>
            );
          })}
        </div>
      )}

      {/* TAB 3: 30 Achievements Collection */}
      {tab === 'achievements' && (
        <>
          <div
            className="card sub-card"
            style={{ marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}
          >
            <div>
              <b style={{ fontSize: 14 }}>Tiến độ chinh phục thành tựu</b>
              <div className="muted" style={{ fontSize: 12 }}>
                Đã mở khóa {completedAchievementsCount} trên tổng số 30 thành tựu hàng không
              </div>
            </div>
            <div style={{ minWidth: 140, flex: 1 }}>
              <div className="progress">
                <i style={{ width: `${(completedAchievementsCount / 30) * 100}%` }} />
              </div>
              <div className="tabular-nums" style={{ fontSize: 11, textAlign: 'right', marginTop: 4, fontWeight: 700 }}>
                {Math.round((completedAchievementsCount / 30) * 100)}%
              </div>
            </div>
          </div>

          <div className="grid-3">
            {achievementsList.map((ach) => {
              const isUnlocked = checkAchievementDone(ach.metric, ach.target);

              return (
                <div
                  key={ach.id}
                  className={`card ach-card ${isUnlocked ? 'unlocked' : 'locked'}`}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                    <span style={{ fontSize: 32 }}>{ach.icon}</span>
                    <span className={`badge ${isUnlocked ? 'warn' : ''}`}>
                      {isUnlocked ? '✨ Đã mở khóa' : 'Chưa đạt'}
                    </span>
                  </div>

                  <b style={{ fontSize: 14, margin: '12px 0 4px' }}>{ach.title}</b>
                  <p className="muted" style={{ fontSize: 12, lineHeight: 1.5, margin: 0 }}>
                    {ach.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </>
      )}
    </>
  );
}

export default function Missions() {
  return (
    <GameShell>
      <MissionsContent />
    </GameShell>
  );
}
