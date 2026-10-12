'use client';

import { useState, useMemo } from 'react';
import {
  Wallet,
  TrendingUp,
  Landmark,
  ArrowDownLeft,
  ArrowUpRight,
  ShieldAlert,
  Coins,
  History,
  AlertTriangle,
  RotateCcw,
  Clock,
  Sparkles,
  PieChart,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  BarChart,
  Bar,
} from 'recharts';
import {
  GameShell,
  PageHeading,
  StatCard,
  AnimatedCounter,
} from '@/components/game-shell';
import { useGameStore } from '@/store/useGameStore';
import { airlineValue, formatCurrency } from '@/lib/formulas';

function FinanceContent() {
  const {
    airline,
    planes,
    airports,
    routes,
    transactions,
    loan,
    borrow,
    repay,
    restructure,
    notify,
    currency,
    simpleMode,
    goPublic,
  } = useGameStore();

  const [timeframe, setTimeframe] = useState<7 | 30>(7);
  const [loanModalOpen, setLoanModalOpen] = useState(false);
  const [loanAmount, setLoanAmount] = useState(500000);
  const [repayAmount, setRepayAmount] = useState(500000);
  const [ipoConfirm, setIpoConfirm] = useState(false);

  const currentCash = airline?.cash || 0;
  const currentValuation = airlineValue(currentCash, planes, airports);
  const maxBorrowLimit = Math.max(0, Math.floor(currentValuation * 0.5) - loan);

  const hourlyProfit = routes
    .filter((r) => r.active)
    .reduce((acc, r) => acc + (r.profitPerHour || 0), 0);

  const forecast24h = hourlyProfit * 24;

  // Breakdown of income and expense by category
  const breakdownStats = useMemo(() => {
    let ticketIncome = 0;
    let fuelExpense = 0;
    let maintExpense = 0;
    let salaryExpense = 0;
    let airportExpense = 0;
    let loanInterestExpense = (loan * 0.05) / 24; // per hour approx

    transactions.forEach((tx) => {
      if (tx.amount > 0) {
        ticketIncome += tx.amount;
      } else {
        const absAmt = Math.abs(tx.amount);
        if (tx.type === 'Bảo trì') maintExpense += absAmt;
        else if (tx.type === 'Lương nhân sự') salaryExpense += absAmt;
        else if (tx.type === 'Slot sân bay' || tx.type === 'Căn cứ thứ 2') airportExpense += absAmt;
        else fuelExpense += absAmt * 0.4;
      }
    });

    return {
      ticketIncome,
      fuelExpense,
      maintExpense,
      salaryExpense,
      airportExpense,
      loanInterestExpense,
    };
  }, [transactions, loan]);

  // Chart data calculation
  const chartData = useMemo(() => {
    const daysCount = timeframe;
    const baseDailyIncome = Math.max(80000, breakdownStats.ticketIncome / daysCount);
    const baseDailyExpense = Math.max(35000, (breakdownStats.fuelExpense + breakdownStats.maintExpense) / daysCount);

    return Array.from({ length: daysCount }, (_, i) => ({
      day: timeframe === 7 ? `Ngày ${i + 1}` : `${i + 1}`,
      thu: Math.round(baseDailyIncome * (0.8 + i * 0.04)),
      chi: Math.round(baseDailyExpense * (0.85 + i * 0.02)),
    }));
  }, [timeframe, breakdownStats]);

  const handleBorrow = () => {
    if (loanAmount <= 0) return;
    borrow(loanAmount);
    setLoanModalOpen(false);
  };

  const handleRepay = () => {
    if (repayAmount <= 0) return;
    repay(repayAmount);
    setLoanModalOpen(false);
  };

  return (
    <>
      <PageHeading
        title="Tài chính & Dòng tiền"
        subtitle="Kiểm soát ngân sách, quản lý dư nợ tín dụng và dự báo doanh thu."
        action={!simpleMode && (airline?.level||1)>=8 ? (
          <button className="btn" onClick={() => setLoanModalOpen(true)}>
            <Landmark size={16} /> Vay & Trả nợ ngân hàng
          </button>
        ) : undefined}
      />

      {(airline?.ipoShares || 0) > 0 && <div className="ipo-status-strip"><Sparkles size={18}/><b>{airline?.ipoShares} cổ phiếu danh tiếng</b><span>+{(airline?.ipoShares || 0) * 8}% lợi nhuận vĩnh viễn</span></div>}
      {currentValuation >= 500000000 && <div className="ipo-offer card"><div className="ipo-offer-icon">✦</div><div><span className="eyebrow">CƠ HỘI PRESTIGE</span><h2>Hãng đã đủ điều kiện lên sàn</h2><p>Định giá {formatCurrency(currentValuation, currency)} · nhận {Math.floor(Math.sqrt(currentValuation / 500000000))} cổ phiếu. Tài sản khai thác được quy đổi thành 10.000.000 $ vốn khởi đầu cho hành trình mới.</p></div><button className="btn" onClick={() => setIpoConfirm(true)}>Lên sàn chứng khoán</button></div>}
      {ipoConfirm && <div className="modal-backdrop"><div className="card ipo-confirm"><button className="modal-close" onClick={() => setIpoConfirm(false)} aria-label="Đóng">×</button><span className="eyebrow">XÁC NHẬN IPO</span><h2>Bắt đầu hành trình mới?</h2><p>Sau IPO, đội bay và các tuyến hiện tại sẽ được thanh lý để hãng khởi động lại với 10.000.000 $. Bạn nhận {Math.floor(Math.sqrt(currentValuation / 500000000))} cổ phiếu mới; {airline?.ipoShares || 0} cổ phiếu cũ vẫn được giữ.</p><div className="ipo-confirm-actions"><button className="btn ghost" onClick={() => setIpoConfirm(false)}>Tiếp tục điều hành</button><button className="btn" onClick={() => { setIpoConfirm(false); goPublic(); }}>Xác nhận lên sàn</button></div></div></div>}

      {/* Bankruptcy Warning Alert */}
      {currentCash < 0 && (
        <div className="card danger-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <AlertTriangle color="var(--danger)" size={26} />
            <div>
              <b style={{ fontSize: 15 }}>Cảnh báo nguy cơ phá sản!</b>
              <div style={{ fontSize: 13, marginTop: 2 }}>
                Số dư tài khoản đang bị âm ({formatCurrency(currentCash, currency)}). Nếu kéo dài quá 7 ngày, hãng sẽ bị đình chỉ hoạt động.
              </div>
            </div>
          </div>
          <button
            className="btn danger"
            onClick={restructure}
          >
            <RotateCcw size={16} /> Kích hoạt bảo hiểm tái cơ cấu (50% tài sản)
          </button>
        </div>
      )}

      {/* 4 StatCards */}
      <div className="stat-grid">
        <StatCard
          title="Số dư hiện tại"
          value={<AnimatedCounter value={currentCash} currency={currency} />}
          sub="Tiền mặt lưu động"
          icon={<Wallet size={20} />}
          color="#0a58ca"
        />
        <StatCard
          title="Định giá hãng bay"
          value={formatCurrency(currentValuation, currency)}
          sub="Tiền mặt + Đội bay + Slot"
          icon={<Coins size={20} />}
          color="#12a678"
        />
        {!simpleMode&&<StatCard
          title="Dư nợ tín dụng"
          value={formatCurrency(loan, currency)}
          sub="Lãi suất 5% / ngày game"
          icon={<Landmark size={20} />}
          color="#e89a20"
        />}
        <StatCard
          title="Dự báo 24 giờ tới"
          value={
            <span className={forecast24h >= 0 ? 'positive' : 'negative'}>
              {forecast24h >= 0 ? '+' : ''}
              {formatCurrency(forecast24h, currency)}
            </span>
          }
          sub="Theo mạng bay đang hoạt động"
          icon={<TrendingUp size={20} />}
          color="#7b4fe0"
        />
      </div>

      {/* Middle Row: Revenue Chart & Category Breakdown */}
      <div className="grid-2" style={{ marginTop: 24 }}>
        {/* Chart */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div>
              <h2 className="section-title" style={{ margin: 0 }}>
                Biểu đồ Dòng tiền
              </h2>
              <div className="muted" style={{ fontSize: 12 }}>
                So sánh doanh thu và chi phí khai thác
              </div>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button
                className={`btn compact ${timeframe === 7 ? '' : 'ghost'}`}
                onClick={() => setTimeframe(7)}
              >
                7 ngày
              </button>
              <button
                className={`btn compact ${timeframe === 30 ? '' : 'ghost'}`}
                onClick={() => setTimeframe(30)}
              >
                30 ngày
              </button>
            </div>
          </div>

          <div style={{ height: 260 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="finIncome" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0a58ca" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#0a58ca" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="finCost" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ffb800" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#ffb800" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--line)" />
                <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--muted)' }} />
                <YAxis hide />
                <Tooltip
                  formatter={(val: any) => [formatCurrency(Number(val), currency), '']}
                  contentStyle={{
                    background: 'var(--surface)',
                    borderColor: 'var(--line)',
                    borderRadius: 12,
                    fontSize: 12,
                  }}
                />
                <Area type="monotone" dataKey="thu" name="Doanh thu" stroke="#0a58ca" strokeWidth={2.5} fill="url(#finIncome)" />
                <Area type="monotone" dataKey="chi" name="Chi phí" stroke="#ffb800" strokeWidth={2} fill="url(#finCost)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Categories Breakdown */}
        <div className="card">
          <h2 className="section-title">Cơ cấu thu chi hoạt động</h2>
          <div style={{ fontSize: 13 }}>
            <div className="kv">
              <span>Doanh thu bán vé máy bay</span>
              <b className="positive">+{formatCurrency(breakdownStats.ticketIncome, currency)}</b>
            </div>
            <div className="kv">
              <span>Chi phí nhiên liệu Jet A-1</span>
              <b className="negative">-{formatCurrency(breakdownStats.fuelExpense, currency)}</b>
            </div>
            <div className="kv">
              <span>Bảo dưỡng & phụ tùng kỹ thuật</span>
              <b className="negative">-{formatCurrency(breakdownStats.maintExpense, currency)}</b>
            </div>
            <div className="kv">
              <span>Lương tổ bay & kỹ sư</span>
              <b className="negative">-{formatCurrency(breakdownStats.salaryExpense, currency)}</b>
            </div>
            <div className="kv">
              <span>Phí slot & dịch vụ sân bay</span>
              <b className="negative">-{formatCurrency(breakdownStats.airportExpense, currency)}</b>
            </div>
            {!simpleMode&&<div className="kv">
              <span>Lãi vay ngân hàng (5%/ngày)</span>
              <b className="negative">-{formatCurrency(loan * 0.05, currency)}/ngày</b>
            </div>}
          </div>
        </div>
      </div>

      {/* Transaction History Table */}
      <div className="card" style={{ marginTop: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div>
            <h2 className="section-title" style={{ margin: 0 }}>
              Sổ cái Giao dịch gần đây
            </h2>
            <div className="muted" style={{ fontSize: 12 }}>
              Lịch sử ghi nhận dòng tiền ra vào của hãng
            </div>
          </div>
          <span className="badge">
            <History size={14} /> {transactions.length} giao dịch
          </span>
        </div>

        {transactions.length === 0 ? (
          <div className="muted" style={{ padding: '30px 0', textAlign: 'center' }}>
            Chưa có giao dịch nào được ghi nhận.
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>THỜI GIAN</th>
                  <th>HẠNG MỤC</th>
                  <th>CHI TIẾT</th>
                  <th>SỐ TIỀN</th>
                </tr>
              </thead>
              <tbody>
                {transactions.slice(0, 30).map((tx) => (
                  <tr key={tx.id}>
                    <td className="muted" style={{ fontSize: 12 }}>
                      {new Date(tx.at).toLocaleString('vi-VN')}
                    </td>
                    <td>
                      <span className="badge" style={{ fontSize: 11 }}>
                        {tx.type}
                      </span>
                    </td>
                    <td style={{ fontWeight: 500 }}>{tx.note}</td>
                    <td>
                      <b
                        className={tx.amount >= 0 ? 'positive' : 'negative'}
                        style={{ fontSize: 14 }}
                      >
                        {tx.amount >= 0 ? '+' : ''}
                        {formatCurrency(tx.amount, currency)}
                      </b>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL: LOAN & REPAY */}
      {loanModalOpen && !simpleMode && (
        <div
          className="modal-backdrop"
          onClick={() => setLoanModalOpen(false)}
        >
          <div
            className="card"
            style={{ width: 'min(100%, 500px)', padding: 28 }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: '0 0 8px', fontSize: 20 }}>Tín dụng & Vay ngân hàng</h3>
            <p className="muted" style={{ fontSize: 13, marginBottom: 20 }}>
              Hạn mức vay tối đa bằng <b>50% giá trị hãng bay</b>. Lãi suất cố định 5% mỗi ngày game.
            </p>

            {/* Current Loan Stats */}
            <div className="sub-card" style={{ marginBottom: 20, fontSize: 13 }}>
              <div className="kv">
                <span>Hạn mức khả dụng có thể vay:</span>
                <b className="positive">{formatCurrency(maxBorrowLimit, currency)}</b>
              </div>
              <div className="kv">
                <span>Dư nợ tín dụng hiện tại:</span>
                <b className="negative">{formatCurrency(loan, currency)}</b>
              </div>
              <div className="kv">
                <span>Tiền lãi phát sinh mỗi ngày:</span>
                <b>{formatCurrency(loan * 0.05, currency)}</b>
              </div>
            </div>

            {/* Borrow Tab */}
            <div style={{ marginBottom: 20 }}>
              <label className="label">Vay thêm vốn kinh doanh</label>
              <div className="field-row">
                <input
                  type="number"
                  className="input"
                  min={100000}
                  max={maxBorrowLimit}
                  step={100000}
                  value={loanAmount}
                  onChange={(e) => setLoanAmount(Number(e.target.value))}
                />
                <button
                  className="btn"
                  disabled={maxBorrowLimit <= 0 || loanAmount <= 0 || loanAmount > maxBorrowLimit}
                  onClick={handleBorrow}
                >
                  Vay ngay
                </button>
              </div>
            </div>

            {/* Repay Tab */}
            {loan > 0 && (
              <div style={{ borderTop: '1px solid var(--line)', paddingTop: 18 }}>
                <label className="label">Trả nợ ngân hàng</label>
                <div className="field-row">
                  <input
                    type="number"
                    className="input"
                    min={50000}
                    max={Math.min(loan, currentCash)}
                    step={100000}
                    value={repayAmount}
                    onChange={(e) => setRepayAmount(Number(e.target.value))}
                  />
                  <button
                    className="btn secondary"
                    disabled={currentCash <= 0 || repayAmount <= 0}
                    onClick={handleRepay}
                  >
                    Trả nợ
                  </button>
                </div>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 24 }}>
              <button className="btn ghost" onClick={() => setLoanModalOpen(false)}>
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default function Finance() {
  return (
    <GameShell>
      <FinanceContent />
    </GameShell>
  );
}
