'use client';

import {
  FlaskConical,
  Fuel,
  HeartHandshake,
  Wrench,
  Lock,
  Sparkles,
  CheckCircle2,
  TrendingUp,
} from 'lucide-react';
import { GameShell, PageHeading } from '@/components/game-shell';
import { useGameStore } from '@/store/useGameStore';
import { formatCurrency } from '@/lib/formulas';

const branches = [
  {
    id: 'fuel' as const,
    title: 'Tiết kiệm Nhiên liệu',
    icon: Fuel,
    color: '#0a58ca',
    desc: 'Tối ưu hóa buồng đốt, sử dụng phụ gia sinh học và khí động học để giảm thiểu chi phí xăng Jet A-1.',
    levels: [
      'Giảm 2.5% chi phí xăng',
      'Giảm 5.0% chi phí xăng',
      'Giảm 7.5% chi phí xăng',
      'Giảm 10.0% chi phí xăng',
      'Giảm 12.5% chi phí xăng (Tối đa)',
    ],
  },
  {
    id: 'service' as const,
    title: 'Dịch vụ Khách hàng & Suất ăn',
    icon: HeartHandshake,
    color: '#12a678',
    desc: 'Nâng cấp suất ăn nóng, đào tạo tiếp viên thân thiện và wifi trên máy bay nhằm kích cầu hành khách.',
    levels: [
      'Tăng 4% hệ số lấp đầy chuyến',
      'Tăng 8% hệ số lấp đầy chuyến',
      'Tăng 12% hệ số lấp đầy chuyến',
      'Tăng 16% hệ số lấp đầy chuyến',
      'Tăng 20% hệ số lấp đầy chuyến (Tối đa)',
    ],
  },
  {
    id: 'maintenance' as const,
    title: 'Bảo trì Kỹ thuật Dự đoán',
    icon: Wrench,
    color: '#e89a20',
    desc: 'Áp dụng cảm biến AI giám sát động cơ thời gian thực, giảm chi phí sửa chữa và tăng độ bền.',
    levels: [
      'Giảm 5% chi phí bảo trì',
      'Giảm 10% chi phí bảo trì',
      'Giảm 15% chi phí bảo trì',
      'Giảm 20% chi phí bảo trì',
      'Giảm 25% chi phí bảo trì (Tối đa)',
    ],
  },
];

function ResearchContent() {
  const {
    research,
    researchPoints,
    upgradeTech,
    currency,
  } = useGameStore();

  return (
    <>
      <PageHeading
        title="Viện Nghiên cứu & Công nghệ Hàng không"
        subtitle="Đầu tư điểm nghiên cứu tích lũy từ lợi nhuận để nhận các hiệu ứng cộng dồn vĩnh viễn."
        action={
          <div className="points-pill">
            <FlaskConical size={18} />
            <span><b>{researchPoints}</b> Điểm nghiên cứu khả dụng</span>
          </div>
        }
      />

      {/* Guide Banner */}
      <div
        className="card sub-card"
        style={{
          marginBottom: 24,
          display: 'flex',
          alignItems: 'center',
          gap: 12,
        }}
      >
        <Sparkles color="var(--accent)" size={24} style={{ flexShrink: 0 }} />
        <div style={{ fontSize: 13, lineHeight: 1.6 }}>
          <b>Cách tích lũy Điểm nghiên cứu:</b> Cứ mỗi <b>1.000.000 $</b> lợi nhuận ròng thu về từ
          các đường bay, hãng sẽ được cấp <b>1 Điểm nghiên cứu</b>. Hoàn thành nhiệm vụ đặc biệt
          cũng mang lại thêm điểm thưởng công nghệ.
        </div>
      </div>

      {/* 3 Tech Branches Grid */}
      <div className="grid-3">
        {branches.map((b) => {
          const Icon = b.icon;
          const currentLevel = research[b.id] || 0;
          const nextLevel = currentLevel + 1;
          const cost = nextLevel;
          const isMax = currentLevel >= 5;
          const canUpgrade = !isMax && researchPoints >= cost;

          return (
            <div className="card plane-card" key={b.id}>
              {/* Branch Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                <div
                  className="tile-ic"
                  style={{
                    width: 46,
                    height: 46,
                    background: `color-mix(in srgb, ${b.color} 10%, transparent)`,
                    color: b.color,
                  }}
                >
                  <Icon size={24} />
                </div>
                <span className={`badge ${isMax ? '' : 'info'}`}>
                  {isMax ? 'Đạt cấp tối đa' : `Cấp ${currentLevel} / 5`}
                </span>
              </div>

              <h3 style={{ fontSize: 17, margin: '14px 0 6px', fontWeight: 700 }}>{b.title}</h3>
              <p className="muted" style={{ fontSize: 12, lineHeight: 1.6, marginBottom: 16 }}>
                {b.desc}
              </p>

              {/* Levels Checklist */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                  marginBottom: 20,
                  fontSize: 12,
                }}
              >
                {b.levels.map((lvlText, idx) => {
                  const isUnlocked = idx < currentLevel;
                  const isNext = idx === currentLevel;

                  return (
                    <div
                      key={idx}
                      className={`lvl-row ${isUnlocked ? 'done' : isNext ? 'next' : ''}`}
                    >
                      <span>{isUnlocked ? '✓' : `${idx + 1}.`}</span>
                      <span>{lvlText}</span>
                    </div>
                  );
                })}
              </div>

              {/* Upgrade Button */}
              <div style={{ marginTop: 'auto' }}>
                <button
                  className={`btn ${isMax ? 'success' : ''}`}
                  style={{ width: '100%' }}
                  disabled={isMax || !canUpgrade}
                  onClick={() => upgradeTech(b.id)}
                >
                  {isMax ? (
                    <>
                      <CheckCircle2 size={16} /> Đã tối đa (Cấp 5)
                    </>
                  ) : (
                    <>
                      Nâng cấp Cấp {nextLevel} ({cost} Điểm)
                    </>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

export default function Research() {
  return (
    <GameShell>
      <ResearchContent />
    </GameShell>
  );
}
