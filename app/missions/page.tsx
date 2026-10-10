'use client';

import { useState } from 'react';
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
  } = useGameStore();

  const [tab, setTab] = useState<'starter' | 'daily' | 'weekly' | 'achievements'>('starter');

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
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        <button
          className={`btn ${tab === 'starter' ? '' : 'ghost'}`}
          onClick={() => setTab('starter')}
          style={{ padding: '8px 16px', minHeight: 38, fontSize: 13 }}
        >
          <Target size={16} /> Nhiệm vụ tân thủ (7 bước)
        </button>
        <button
          className={`btn ${tab === 'daily' ? '' : 'ghost'}`}
          onClick={() => setTab('daily')}
          style={{ padding: '8px 16px', minHeight: 38, fontSize: 13 }}
        >
          <Clock size={16} /> Nhiệm vụ hàng ngày (reset 0h)
        </button>
        <button
          className={`btn ${tab === 'weekly' ? '' : 'ghost'}`}
          onClick={() => setTab('weekly')}
          style={{ padding: '8px 16px', minHeight: 38, fontSize: 13 }}
        >
          <Sparkles size={16} /> Mùa tuần {weeklySeason?.id || ''} ({(weeklySeason?.quests || []).filter((q) => q.done).length}/{(weeklySeason?.quests || []).length})
        </button>
        <button
          className={`btn ${tab === 'achievements' ? '' : 'ghost'}`}
          onClick={() => setTab('achievements')}
          style={{ padding: '8px 16px', minHeight: 38, fontSize: 13 }}
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
                className="card"
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: 16,
                  flexWrap: 'wrap',
                  borderColor: isCompleted && m.reward > 0 ? '#12a678' : undefined,
                  background: isCompleted && m.reward > 0 ? 'rgba(18, 166, 120, 0.04)' : undefined,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, flex: 1, minWidth: 260 }}>
                  <div
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: 14,
                      background: isCompleted ? '#12a67815' : 'var(--bg)',
                      display: 'grid',
                      placeItems: 'center',
                      fontSize: 24,
                    }}
                  >
                    {m.icon || '✈️'}
                  </div>
                  <div style={{ flex: 1 }}>
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
                      <div className="progress" style={{ flex: 1, height: 6 }}>
                        <i style={{ width: `${percent}%`, background: isCompleted ? '#12a678' : '#0a58ca' }} />
                      </div>
                      <span className="muted" style={{ fontSize: 11, minWidth: 60, textAlign: 'right' }}>
                        {Math.floor(m.progress).toLocaleString('vi-VN')} / {m.target.toLocaleString('vi-VN')}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Reward & Claim button */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{ textAlign: 'right' }}>
                    <div className="muted" style={{ fontSize: 11 }}>PHẦN THƯỞNG</div>
                    <b style={{ fontSize: 15, color: '#0a58ca' }}>
                      +{formatCurrency(m.reward, currency)}
                    </b>
                    <div style={{ fontSize: 11, color: '#ffb800', fontWeight: 700 }}>
                      +{m.rewardXp || 100} XP
                    </div>
                  </div>

                  {m.reward > 0 ? (
                    <button
                      className="btn"
                      disabled={!isCompleted}
                      onClick={() => claimMission(m.id)}
                      style={{
                        padding: '10px 18px',
                        background: isCompleted ? '#12a678' : undefined,
                      }}
                    >
                      {isCompleted ? 'Nhận thưởng 🎁' : 'Chưa đạt'}
                    </button>
                  ) : (
                    <button className="btn ghost" disabled style={{ padding: '8px 14px', fontSize: 12 }}>
                      <CheckCircle2 size={16} color="#12a678" /> Hoàn thành
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
              <div
                key={m.id}
                className="card"
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: 16,
                  flexWrap: 'wrap',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, flex: 1, minWidth: 260 }}>
                  <div
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: 14,
                      background: 'var(--bg)',
                      display: 'grid',
                      placeItems: 'center',
                      fontSize: 24,
                    }}
                  >
                    {m.icon || '🎯'}
                  </div>
                  <div style={{ flex: 1 }}>
                    <b style={{ fontSize: 15 }}>{m.title}</b>
                    <div className="muted" style={{ fontSize: 12, margin: '4px 0 8px' }}>
                      {m.description}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div className="progress" style={{ flex: 1, height: 6 }}>
                        <i style={{ width: `${percent}%` }} />
                      </div>
                      <span className="muted" style={{ fontSize: 11, minWidth: 60, textAlign: 'right' }}>
                        {Math.floor(m.progress).toLocaleString('vi-VN')} / {m.target.toLocaleString('vi-VN')}
                      </span>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{ textAlign: 'right' }}>
                    <div className="muted" style={{ fontSize: 11 }}>PHẦN THƯỞNG</div>
                    <b style={{ fontSize: 15, color: '#0a58ca' }}>
                      +{formatCurrency(m.reward, currency)}
                    </b>
                  </div>
                  <button
                    className="btn"
                    disabled={!isCompleted || m.reward <= 0}
                    onClick={() => claimMission(m.id)}
                    style={{ background: isCompleted ? '#12a678' : undefined }}
                  >
                    {m.reward <= 0 ? 'Đã nhận' : isCompleted ? 'Nhận thưởng 🎁' : 'Đang làm'}
                  </button>
                </div>
              </div>
            );
          })}
          <div className="muted" style={{ fontSize: 11 }}>Reset lúc 0h hàng ngày. Chuỗi điểm danh từ 3 ngày tăng trần offline.</div>
        </div>
      )}
      {tab === 'weekly' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="card" style={{ background: 'var(--bg)', padding: '12px 16px' }}>
            <b style={{ fontSize: 13 }}>Mùa {weeklySeason?.id} · reset Thứ 2 hàng tuần</b>
            <div className="muted" style={{ fontSize: 12 }}>Hoàn thành cả 3 quest tuần để giữ nhịp 7-30 ngày. Thưởng lớn gấp ~3x quest ngày.</div>
          </div>
          {(weeklySeason?.quests || []).map((m) => {
            const isCompleted = m.progress >= m.target;
            const percent = Math.min(100, Math.round((m.progress / m.target) * 100));
            return (
              <div key={m.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, flex: 1, minWidth: 260 }}>
                  <div style={{ width: 48, height: 48, borderRadius: 14, background: 'var(--bg)', display: 'grid', placeItems: 'center', fontSize: 24 }}>{m.icon || '🎯'}</div>
                  <div style={{ flex: 1 }}>
                    <b style={{ fontSize: 15 }}>{m.title}</b>
                    <div className="muted" style={{ fontSize: 12, margin: '4px 0 8px' }}>{m.description}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div className="progress" style={{ flex: 1, height: 6 }}><i style={{ width: percent + '%' }} /></div>
                      <span className="muted" style={{ fontSize: 11 }}>{Math.floor(m.progress).toLocaleString('vi-VN')} / {m.target.toLocaleString('vi-VN')}</span>
                    </div>
                  </div>
                </div>
                <button className="btn" disabled={!isCompleted || m.reward <= 0} onClick={() => claimMission(m.id)}>{m.reward <= 0 ? 'Đã nhận' : isCompleted ? 'Nhận thưởng' : 'Đang làm'}</button>
              </div>
            );
          })}
        </div>
      )}

      {/* TAB 3: 30 Achievements Collection */}
      {tab === 'achievements' && (
        <>
          <div
            className="card"
            style={{
              background: 'var(--bg)',
              padding: '16px 20px',
              marginBottom: 20,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <div>
              <b style={{ fontSize: 14 }}>Tiến độ chinh phục thành tựu</b>
              <div className="muted" style={{ fontSize: 12 }}>
                Đã mở khóa {completedAchievementsCount} trên tổng số 30 thành tựu hàng không
              </div>
            </div>
            <div style={{ width: 140 }}>
              <div className="progress">
                <i style={{ width: `${(completedAchievementsCount / 30) * 100}%`, background: '#ffb800' }} />
              </div>
              <div style={{ fontSize: 11, textAlign: 'right', marginTop: 4, fontWeight: 700 }}>
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
                  className="card"
                  style={{
                    padding: 18,
                    display: 'flex',
                    flexDirection: 'column',
                    opacity: isUnlocked ? 1 : 0.6,
                    background: isUnlocked ? 'var(--surface)' : 'rgba(0,0,0,0.02)',
                    borderColor: isUnlocked ? '#ffb800' : 'var(--line)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                    <span style={{ fontSize: 32 }}>{ach.icon}</span>
                    <span
                      className="badge"
                      style={{
                        background: isUnlocked ? '#ffb80022' : 'var(--bg)',
                        color: isUnlocked ? '#b45309' : 'var(--muted)',
                      }}
                    >
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
