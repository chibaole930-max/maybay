'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Download,
  Upload,
  Trash2,
  Save,
  ShieldCheck,
  Volume2,
  VolumeX,
  Coins,
  Sparkles,
  Bot,
  AlertTriangle,
  RotateCcw,
} from 'lucide-react';
import { GameShell, PageHeading } from '@/components/game-shell';
import { AccountSection } from '@/components/account-section';
import { useGameStore } from '@/store/useGameStore';

const colors = [
  '#0A58CA',
  '#12A678',
  '#E84B3C',
  '#7B4FE0',
  '#E89A20',
  '#0B1F3A',
  '#E45D9A',
  '#1597B8',
];

const icons = ['✈️', '🦅', '🌟', '🌺', '🪽', '☁️', '🧭', '🌏'];

function SettingsContent() {
  const router = useRouter();
  const {
    airline,
    simpleMode,
    hardcore,
    loan,
    toggleHardcore,
    currency,
    setCurrency,
    soundEnabled,
    toggleSound,
    toggleAutoManage,
    reset,
    update,
    notify,
  } = useGameStore();

  const [name, setName] = useState(airline?.name || '');
  const [selectedColor, setSelectedColor] = useState(airline?.logoColor || colors[0]);
  const [selectedIcon, setSelectedIcon] = useState(airline?.logoIcon || icons[0]);

  // Reset confirmation state
  const [resetConfirmStep, setResetConfirmStep] = useState<0 | 1 | 2>(0);
  const [newDifficulty, setNewDifficulty] = useState<'de' | 'thuong' | 'kho'>('thuong');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSaveIdentity = () => {
    if (name.trim().length < 3 || name.trim().length > 24) {
      notify('Tên hãng phải từ 3 đến 24 ký tự.', 'warn');
      return;
    }
    update((s) => ({
      ...s,
      airline: s.airline
        ? {
            ...s.airline,
            name: name.trim(),
            logoColor: selectedColor,
            logoIcon: selectedIcon,
          }
        : null,
    }));
    notify('Đã cập nhật nhận diện thương hiệu thành công!', 'success');
  };

  const handleExportSave = () => {
    const currentState = useGameStore.getState();
    const saveObj = { ...currentState, hydrate: undefined };
    const blob = new Blob([JSON.stringify(saveObj, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vietnam-airline-tycoon-save-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    notify('Đã xuất tệp lưu trữ JSON thành công!', 'success');
  };

  const handleImportSave = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(String(reader.result));
        if (!data.airline || !Array.isArray(data.planes) || !Array.isArray(data.routes)) {
          throw new Error('Định dạng không khớp');
        }
        update((s) => ({
          ...s,
          ...data,
          hydrate: true,
        }));
        notify('Nhập dữ liệu thành công! Tiến trình đã được khôi phục.', 'success');
      } catch {
        notify('Tệp lưu không hợp lệ! Vui lòng chọn tệp JSON đúng định dạng.', 'warn');
      }
    };
    reader.readAsText(file);
  };

  const handleExecuteReset = () => {
    reset();
    setResetConfirmStep(0);
    notify('Dữ liệu đã được đặt lại hoàn toàn.', 'info');
    router.replace('/onboarding');
  };

  return (
    <>
      <PageHeading
        title="Cài đặt Hệ thống"
        subtitle="Tùy chỉnh nhận diện thương hiệu, giao diện, âm thanh và dữ liệu lưu trữ."
      />

      <div style={{ maxWidth: 840, display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* BRAND IDENTITY */}
        <div className="card">
          <h2 className="section-title">Nhận diện Thương hiệu</h2>
          <label className="label">Tên hãng hàng không (3 - 24 ký tự)</label>
          <div className="field-row" style={{ marginBottom: 18 }}>
            <input
              className="input"
              maxLength={24}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <button
              className="btn"
              disabled={name.trim().length < 3}
              onClick={handleSaveIdentity}
            >
              <Save size={16} /> Lưu
            </button>
          </div>

          <label className="label">Màu sắc nhận diện</label>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 18 }}>
            {colors.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setSelectedColor(c)}
                className={`swatch ${selectedColor === c ? 'selected' : ''}`}
                style={{ background: c }}
                aria-label={`Màu ${c}`}
              />
            ))}
          </div>

          <label className="label">Biểu tượng logo hãng</label>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {icons.map((i) => (
              <button
                key={i}
                type="button"
                onClick={() => setSelectedIcon(i)}
                className={`logo-btn ${selectedIcon === i ? 'selected' : ''}`}
              >
                {i}
              </button>
            ))}
          </div>
        </div>

        {/* GAME CONTROLS & AUTO-MANAGER */}
        <div className="card">
          <h2 className="section-title">Tùy chọn Khai thác & Âm thanh</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="settings-toggle">
              <span className="settings-toggle-icon"><Sparkles size={18} /></span>
              <div className="settings-toggle-copy">
                <b>Chế độ đơn giản</b>
                <small>Ẩn nhân sự, nghiên cứu, vay và sự kiện nâng cao. Các công thức mô phỏng vẫn hoạt động đầy đủ.</small>
              </div>
              <button
                type="button"
                role="switch"
                aria-label="Chế độ đơn giản"
                aria-checked={simpleMode !== false}
                className={`switch ${simpleMode !== false ? 'on' : ''}`}
                onClick={() => update((s) => ({ ...s, simpleMode: !(s.simpleMode ?? true) }))}
              ><i /></button>
            </div>
            <div className="settings-toggle">
              <span className="settings-toggle-icon"><AlertTriangle size={18} /></span>
              <div className="settings-toggle-copy"><b>Chế độ Hardcore</b><small>Sự kiện dày gấp đôi, phá sản sau 3 ngày âm tiền, offline tối đa 4 giờ và nhận XP gấp 1,5 lần. Có huy hiệu đặc biệt.</small>{loan > 0 && <small style={{ color: 'var(--danger)' }}>Trả hết khoản vay để đổi chế độ.</small>}</div>
              <button type="button" role="switch" aria-label="Chế độ Hardcore" aria-checked={!!hardcore} disabled={loan > 0} className={`switch ${hardcore ? 'on' : ''}`} onClick={toggleHardcore}><i /></button>
            </div>
            {/* Auto-Manager AI (Level 15 unlock) */}
            <div className="control-row">
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Bot size={18} color="var(--blue)" />
                  <b style={{ fontSize: 14 }}>Chế độ Tự động quản lý (Auto-Manager AI)</b>
                  <span className="badge info" style={{ fontSize: 10 }}>
                    Mở ở Cấp 15
                  </span>
                </div>
                <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>
                  AI tự động tinh chỉnh giá vé ±10% theo nhu cầu thực tế từng sân bay để tối ưu lợi nhuận.
                </div>
              </div>

              <button
                className={`btn compact ${airline?.autoManage ? '' : 'secondary'}`}
                disabled={(airline?.level || 1) < 15}
                onClick={toggleAutoManage}
              >
                {(airline?.level || 1) < 15
                  ? 'Chưa mở khóa'
                  : airline?.autoManage
                  ? 'Đang bật ✓'
                  : 'Bật AI'}
              </button>
            </div>

            {/* Sound Toggle */}
            <div className="control-row">
              <div>
                <b style={{ fontSize: 14 }}>Hiệu ứng Âm thanh (Web Audio Synthesizer)</b>
                <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>
                  Âm thanh leng keng khi thu tiền, hiệu ứng vút khi mở tuyến bay và thăng cấp.
                </div>
              </div>

              <button
                className={`btn compact ${soundEnabled ? '' : 'ghost'}`}
                onClick={toggleSound}
              >
                {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
                <span>{soundEnabled ? 'Đang bật' : 'Đang tắt'}</span>
              </button>
            </div>

            {/* Currency toggle */}
            <div className="control-row">
              <div>
                <b style={{ fontSize: 14 }}>Đơn vị Tiền tệ hiển thị</b>
                <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>
                  Chuyển đổi linh hoạt giữa USD ($) và Việt Nam Đồng (₫ - Tỷ giá 1$ = 25.400₫).
                </div>
              </div>

              <button
                className="btn secondary compact"
                onClick={() => setCurrency(currency === 'USD' ? 'VND' : 'USD')}
              >
                <Coins size={16} /> Đang chọn: {currency}
              </button>
            </div>

            
          </div>
        </div>

        {/* TÀI KHOẢN */}
        <div className="card">
          <h2 className="section-title">Tài khoản</h2>
          <AccountSection />
        </div>

        {/* SAVE IMPORT / EXPORT */}
        <div className="card">
          <h2 className="section-title">Sao lưu & Khôi phục Dữ liệu</h2>
          <p className="muted" style={{ fontSize: 13, lineHeight: 1.6 }}>
            Dữ liệu game được lưu tự động trên LocalStorage của trình duyệt. Bạn có thể xuất bản lưu
            thành tệp JSON để chuyển sang điện thoại hoặc máy tính khác bất cứ lúc nào.
          </p>

          <div style={{ display: 'flex', gap: 10, marginTop: 14, flexWrap: 'wrap' }}>
            <button className="btn secondary" onClick={handleExportSave}>
              <Download size={16} /> Xuất bản lưu JSON
            </button>
            <button className="btn secondary" onClick={() => fileInputRef.current?.click()}>
              <Upload size={16} /> Nhập bản lưu từ tệp
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json,.json"
              hidden
              onChange={(e) => e.target.files?.[0] && handleImportSave(e.target.files[0])}
            />
          </div>
        </div>

        {/* DANGER ZONE: RESET GAME */}
        <div className="card danger-zone">
          <h2 className="section-title">
            <Trash2 size={20} style={{ verticalAlign: 'middle', marginRight: 6 }} />
            Xóa dữ liệu & Đặt lại Trò chơi
          </h2>
          <p className="muted" style={{ fontSize: 13, lineHeight: 1.6 }}>
            Xóa toàn bộ hãng bay, đội bay, đường bay và tiến trình hiện tại để bắt đầu lại từ đầu.
            Hành động này được bảo vệ bởi xác nhận 2 bước an toàn.
          </p>

          {resetConfirmStep === 0 && (
            <button
              className="btn danger"
              style={{ marginTop: 12 }}
              onClick={() => setResetConfirmStep(1)}
            >
              Bắt đầu quy trình đặt lại
            </button>
          )}

          {resetConfirmStep === 1 && (
            <div className="reset-step">
              <b>
                Bước 1: Bạn có thực sự muốn xóa toàn bộ tiến trình không?
              </b>
              <p style={{ margin: '0 0 14px' }}>
                Mọi máy bay, đường bay và số dư tiền mặt sẽ biến mất vĩnh viễn.
              </p>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <button className="btn danger" onClick={() => setResetConfirmStep(2)}>
                  Tôi chắc chắn, tiếp tục bước 2
                </button>
                <button className="btn ghost" onClick={() => setResetConfirmStep(0)}>
                  Hủy bỏ
                </button>
              </div>
            </div>
          )}

          {resetConfirmStep === 2 && (
            <div className="reset-step severe">
              <b>
                Bước 2: Chọn lại độ khó cho lần chơi mới và xác nhận xóa
              </b>
              <div style={{ margin: '12px 0' }}>
                <select
                  className="select"
                  value={newDifficulty}
                  onChange={(e) => setNewDifficulty(e.target.value as any)}
                >
                  <option value="de">Dễ (Vốn 15.000.000 $ · Nhu cầu cao)</option>
                  <option value="thuong">Thường (Vốn 10.000.000 $ · Cân bằng)</option>
                  <option value="kho">Khó (Vốn 6.000.000 $ · Nhu cầu giảm 10%)</option>
                </select>
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button className="btn danger" onClick={handleExecuteReset}>
                  Xác nhận xóa hoàn toàn & Chơi lại ngay
                </button>
                <button className="btn ghost" onClick={() => setResetConfirmStep(0)}>
                  Hủy bỏ
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export default function Settings() {
  return (
    <GameShell>
      <SettingsContent />
    </GameShell>
  );
}
