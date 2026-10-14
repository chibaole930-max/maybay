'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Check, CloudUpload, KeyRound, LogIn, LogOut, RefreshCw } from 'lucide-react';
import { useOnlineSync } from '@/lib/useOnlineSync';
import { netClient } from '@/lib/net/netClient';
import { useGameStore } from '@/store/useGameStore';

/** Muc quan ly tai khoan trong trang Cai dat. */
export function AccountSection() {
  const router = useRouter();
  const online = useOnlineSync();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!message && !error) return;
    const timer = setTimeout(() => { setMessage(''); setError(''); }, 4000);
    return () => clearTimeout(timer);
  }, [message, error]);

  const saveNow = async () => {
    setBusy(true);
    setError('');
    setMessage('');
    const ok = await online.saveNow();
    setBusy(false);
    if (ok) setMessage('Đã lưu tiến độ lên máy chủ.');
    else setError('Chưa có hãng bay để lưu, hoặc máy chủ không phản hồi.');
  };

  const restoreNow = async () => {
    setBusy(true);
    setError('');
    setMessage('');
    const ok = await online.restoreFromCloud();
    setBusy(false);
    if (ok) { setMessage('Đã khôi phục bản lưu từ máy chủ.'); router.refresh(); }
    else setError('Không có bản lưu nào trên máy chủ.');
  };

  const submitPassword = async (event: React.FormEvent) => {
    event.preventDefault();
    if (next.length < 6) { setError('Mật khẩu mới cần tối thiểu 6 ký tự.'); return; }
    setBusy(true);
    setError('');
    setMessage('');
    const result = await netClient.changePassword(current, next);
    setBusy(false);
    if (!result.ok) { setError(result.error || 'Đổi mật khẩu thất bại.'); return; }
    setMessage('Đã đổi mật khẩu. Các phiên đăng nhập cũ đã bị thu hồi.');
    setCurrent('');
    setNext('');
  };

  if (!online.ready) {
    return <p className="muted" style={{ fontSize: 13 }}>Đang kiểm tra phiên đăng nhập…</p>;
  }

  if (!online.account) {
    return (
      <div>
        <p className="muted" style={{ fontSize: 13, lineHeight: 1.6 }}>
          Bạn chưa đăng nhập. Muốn chơi và lưu tiến độ lên máy chủ thì phải có tài khoản —
          nhờ vậy bạn chơi lại được trên điện thoại hoặc máy tính khác, và tham gia được
          bảng xếp hạng, chợ máy bay cũ, liên minh.
        </p>
        <div style={{ display: 'flex', gap: 10, marginTop: 14, flexWrap: 'wrap' }}>
          <Link className="btn" href="/login"><LogIn size={16} /> Đăng nhập / Đăng ký</Link>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        <span className="badge" style={{ color: '#12a678' }}>
          <Check size={13} /> Đã đăng nhập
        </span>
        <b style={{ fontSize: 14 }}>{online.account.name}</b>
        <span className="muted" style={{ fontSize: 12 }}>
          {online.account.email || online.account.username} · mã {online.account.code}
        </span>
      </div>

      <p className="muted" style={{ fontSize: 12, marginTop: 8 }}>
        {online.lastSavedAt
          ? `Tiến độ đã lưu lên máy chủ lúc ${new Date(online.lastSavedAt).toLocaleTimeString('vi-VN')}.`
          : 'Tiến độ sẽ tự động lưu lên máy chủ mỗi 30 giây.'}
        {online.status === 'error' && ' Lần lưu gần nhất thất bại — sẽ thử lại ở lượt sau.'}
      </p>

      <p className="muted" style={{ fontSize: 12, marginTop: 6, lineHeight: 1.6 }}>
        <b>Đồng bộ tự động:</b> mỗi lần đăng nhập, tiến trình mới hơn trên máy khác sẽ
        tự về máy này; nếu máy này đang xa hơn thì tiến trình ở đây được đẩy lên.
        Không mất tiến trình ở cả hai chiều.
      </p>

      <div style={{ display: 'flex', gap: 10, marginTop: 14, flexWrap: 'wrap' }}>
        <button className="btn secondary" disabled={busy || online.status === 'saving'} onClick={saveNow}>
          <CloudUpload size={16} /> Lưu lên mây ngay
        </button>
        <button className="btn secondary" disabled={busy} onClick={restoreNow}>
          <RefreshCw size={16} /> Khôi phục từ mây
        </button>
      </div>

      <form onSubmit={submitPassword} style={{ marginTop: 20, borderTop: '1px solid var(--line)', paddingTop: 16 }}>
        <h3 style={{ fontSize: 14, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
          <KeyRound size={16} /> Đổi mật khẩu
        </h3>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <input
            className="input"
            type="password"
            placeholder="Mật khẩu hiện tại"
            value={current}
            autoComplete="current-password"
            onChange={(e) => setCurrent(e.target.value)}
            style={{ flex: '1 1 200px' }}
          />
          <input
            className="input"
            type="password"
            placeholder="Mật khẩu mới (tối thiểu 6 ký tự)"
            value={next}
            autoComplete="new-password"
            onChange={(e) => setNext(e.target.value)}
            style={{ flex: '1 1 200px' }}
          />
          <button className="btn" type="submit" disabled={busy || !current || next.length < 6}>
            Cập nhật
          </button>
        </div>
        <p className="muted" style={{ fontSize: 11, marginTop: 8 }}>
          Sau khi đổi, mọi phiên đăng nhập cũ (kể cả trên máy khác) đều bị đăng xuất.
        </p>
        {error && <p style={{ color: '#e84b3c', fontSize: 12, marginTop: 8 }}>{error}</p>}
        {message && <p style={{ color: '#12a678', fontSize: 12, marginTop: 8 }}>{message}</p>}
      </form>

      <div style={{ marginTop: 18, borderTop: '1px solid var(--line)', paddingTop: 14 }}>
        <button
          className="btn ghost"
          onClick={async () => { await online.logout(); router.push('/login'); }}
          disabled={busy}
        >
          <LogOut size={16} /> Đăng xuất
        </button>
        <p className="muted" style={{ fontSize: 11, marginTop: 8 }}>
          Đăng xuất không xóa tiến độ trong trình duyệt này.
        </p>
      </div>
    </div>
  );
}
