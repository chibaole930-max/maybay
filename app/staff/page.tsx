'use client';

import { useState } from 'react';
import {
  Users,
  Award,
  Plus,
  Trash2,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  DollarSign,
  UserCheck,
} from 'lucide-react';
import { GameShell, PageHeading } from '@/components/game-shell';
import { useGameStore } from '@/store/useGameStore';
import { formatCurrency } from '@/lib/formulas';
import { initialStaffCandidates } from '@/lib/mock-data';
import type { Staff } from '@/types';

function StaffContent() {
  const {
    airline,
    staff,
    planes,
    routes,
    hire,
    fire,
    train,
    currency,
  } = useGameStore();

  const [roleFilter, setRoleFilter] = useState<'all' | 'Phi công' | 'Tiếp viên' | 'Kỹ sư'>('all');
  const [hireModalOpen, setHireModalOpen] = useState(false);

  // Requirements calculation
  const pilots = staff.filter((s) => s.role === 'Phi công');
  const flightAttendants = staff.filter((s) => s.role === 'Tiếp viên');
  const engineers = staff.filter((s) => s.role === 'Kỹ sư');

  const requiredPilots = Math.max(1, planes.length * 2);
  const requiredAttendants = Math.max(1, planes.length * 2);
  const requiredEngineers = Math.max(1, Math.ceil(planes.length * 0.8));

  const isStaffShortage =
    pilots.length < requiredPilots ||
    flightAttendants.length < requiredAttendants ||
    engineers.length < requiredEngineers;

  const totalHourlyWages = staff.reduce((acc, s) => acc + s.salaryPerHour, 0);

  const filteredStaff = staff.filter((s) => {
    if (roleFilter === 'all') return true;
    return s.role === roleFilter;
  });

  return (
    <>
      <PageHeading
        title="Nhân sự & Vận hành"
        subtitle="Xây dựng tổ bay chuyên nghiệp và đội ngũ kỹ sư bảo dưỡng tiêu chuẩn quốc tế."
        action={
          <button className="btn" onClick={() => setHireModalOpen(true)}>
            <Plus size={16} /> Tuyển dụng nhân sự
          </button>
        }
      />

      {/* Staff Shortage Warning Banner */}
      {isStaffShortage && (
        <div
          className="card"
          style={{
            background: '#fffbeb',
            borderColor: '#fde68a',
            padding: 18,
            marginBottom: 20,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <AlertTriangle color="#d97706" size={24} />
          <div>
            <b style={{ color: '#92400e', fontSize: 14 }}>Thiếu hụt nhân lực vận hành!</b>
            <div style={{ color: '#b45309', fontSize: 12, marginTop: 2 }}>
              Đội bay của bạn cần tối thiểu {requiredPilots} Phi công, {requiredAttendants} Tiếp viên và {requiredEngineers} Kỹ sư.
              Thiếu nhân sự làm giảm hiệu suất khai thác đường bay.
            </div>
          </div>
        </div>
      )}

      {/* 3 Overview Cards for 3 Roles */}
      <div className="grid-3" style={{ marginBottom: 24 }}>
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="muted" style={{ fontSize: 13, fontWeight: 600 }}>Phi công thương mại</span>
            <span className="badge">{pilots.length >= requiredPilots ? 'Đủ biên chế' : 'Cần thêm'}</span>
          </div>
          <div className="stat-value">{pilots.length} / {requiredPilots} người</div>
          <div className="muted" style={{ fontSize: 12 }}>
            Lương TB: {formatCurrency(pilots.length ? pilots.reduce((a, b) => a + b.salaryPerHour, 0) / pilots.length : 0, currency)}/h
          </div>
        </div>

        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="muted" style={{ fontSize: 13, fontWeight: 600 }}>Tiếp viên hàng không</span>
            <span className="badge">{flightAttendants.length >= requiredAttendants ? 'Đủ biên chế' : 'Cần thêm'}</span>
          </div>
          <div className="stat-value">{flightAttendants.length} / {requiredAttendants} người</div>
          <div className="muted" style={{ fontSize: 12 }}>
            Lương TB: {formatCurrency(flightAttendants.length ? flightAttendants.reduce((a, b) => a + b.salaryPerHour, 0) / flightAttendants.length : 0, currency)}/h
          </div>
        </div>

        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="muted" style={{ fontSize: 13, fontWeight: 600 }}>Kỹ sư bảo trì máy bay</span>
            <span className="badge">{engineers.length >= requiredEngineers ? 'Đủ biên chế' : 'Cần thêm'}</span>
          </div>
          <div className="stat-value">{engineers.length} / {requiredEngineers} người</div>
          <div className="muted" style={{ fontSize: 12 }}>
            Lương TB: {formatCurrency(engineers.length ? engineers.reduce((a, b) => a + b.salaryPerHour, 0) / engineers.length : 0, currency)}/h
          </div>
        </div>
      </div>

      {/* Staff Filter Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {(['all', 'Phi công', 'Tiếp viên', 'Kỹ sư'] as const).map((r) => (
          <button
            key={r}
            onClick={() => setRoleFilter(r)}
            className={`btn ${roleFilter === r ? '' : 'ghost'}`}
            style={{ padding: '6px 14px', minHeight: 36, fontSize: 12 }}
          >
            {r === 'all' ? 'Tất cả nhân sự' : r}
          </button>
        ))}
      </div>

      {/* Staff Grid */}
      <div className="grid-3">
        {filteredStaff.map((member) => {
          const trainCost = member.skill * 15000;
          const canTrain = (airline?.cash || 0) >= trainCost && member.skill < 5;

          return (
            <div className="card" key={member.id} style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                <div>
                  <b style={{ fontSize: 16 }}>{member.name}</b>
                  <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>{member.role}</div>
                </div>
                <span className="badge" style={{ color: '#ffb800' }}>
                  {'★'.repeat(member.skill)}{'☆'.repeat(5 - member.skill)}
                </span>
              </div>

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: '10px 0',
                  margin: '12px 0',
                  borderTop: '1px solid var(--line)',
                  borderBottom: '1px solid var(--line)',
                  fontSize: 12,
                }}
              >
                <div>
                  <span className="muted">Mức lương</span>
                  <br />
                  <b>{formatCurrency(member.salaryPerHour, currency)}/giờ</b>
                </div>
                <div>
                  <span className="muted">Chỉ số hài lòng</span>
                  <br />
                  <b style={{ color: member.morale >= 80 ? '#12a678' : '#e84b3c' }}>
                    {member.morale}%
                  </b>
                </div>
              </div>

              <div style={{ marginTop: 'auto', display: 'flex', gap: 8 }}>
                <button
                  className="btn secondary"
                  style={{ flex: 1, padding: '8px 10px', fontSize: 12 }}
                  disabled={!canTrain}
                  onClick={() => train(member.id)}
                >
                  {member.skill >= 5 ? '★ Tối đa' : `Đào tạo (${formatCurrency(trainCost, currency)})`}
                </button>
                <button
                  className="btn ghost"
                  style={{ padding: '8px 10px', fontSize: 12, color: '#e84b3c' }}
                  onClick={() => fire(member.id)}
                  title="Sa thải nhân sự"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* MODAL: HIRE STAFF */}
      {hireModalOpen && (
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
          onClick={() => setHireModalOpen(false)}
        >
          <div
            className="card"
            style={{ width: 'min(100%, 540px)', padding: 26 }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: '0 0 8px', fontSize: 20 }}>Tuyển dụng Ứng viên mới</h3>
            <p className="muted" style={{ fontSize: 13, marginBottom: 18 }}>
              Chọn nhân sự đạt chuẩn để bổ sung vào tổ bay và xưởng kỹ thuật.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 380, overflowY: 'auto' }}>
              {initialStaffCandidates.map((candidate) => (
                <div
                  key={candidate.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '12px 14px',
                    borderRadius: 12,
                    border: '1px solid var(--line)',
                  }}
                >
                  <div>
                    <b>{candidate.name}</b>
                    <div className="muted" style={{ fontSize: 12 }}>
                      {candidate.role} · {'★'.repeat(candidate.skill)}{'☆'.repeat(5 - candidate.skill)}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ textAlign: 'right', fontSize: 12 }}>
                      <b>{formatCurrency(candidate.salaryPerHour, currency)}/giờ</b>
                    </div>
                    <button
                      className="btn"
                      style={{ padding: '6px 12px', minHeight: 34, fontSize: 12 }}
                      onClick={() => {
                        hire(candidate);
                        setHireModalOpen(false);
                      }}
                    >
                      Ký hợp đồng
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 18 }}>
              <button className="btn ghost" onClick={() => setHireModalOpen(false)}>
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default function StaffPage() {
  return (
    <GameShell>
      <StaffContent />
    </GameShell>
  );
}
