import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  Download,
  Printer,
  Calendar,
  TrendingUp,
  ShoppingBag,
  Receipt,
  DollarSign,
  Users,
  CreditCard,
  PackageCheck,
  RefreshCw
} from 'lucide-react';
import { api, getToken } from '../utils/api';
import { formatCurrency, formatDate } from '../utils/formatters';

export default function ReportsView({ user }) {
  const isAdmin = user?.role === 'admin';

  // Date range presets
  const today = new Date().toISOString().substring(0, 10);
  const firstDayOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().substring(0, 10);
  
  const [dateStart, setDateStart] = useState(firstDayOfMonth);
  const [dateEnd, setDateEnd] = useState(today);
  const [activePreset, setActivePreset] = useState('month');

  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(true);

  const applyPreset = (preset) => {
    setActivePreset(preset);
    const now = new Date();
    if (preset === 'today') {
      setDateStart(today);
      setDateEnd(today);
    } else if (preset === 'week') {
      const day = now.getDay() || 7;
      const monday = new Date(now);
      monday.setDate(now.getDate() - day + 1);
      setDateStart(monday.toISOString().substring(0, 10));
      setDateEnd(today);
    } else if (preset === 'month') {
      setDateStart(firstDayOfMonth);
      setDateEnd(today);
    } else if (preset === 'year') {
      setDateStart(new Date(now.getFullYear(), 0, 1).toISOString().substring(0, 10));
      setDateEnd(today);
    } else if (preset === 'all') {
      setDateStart('');
      setDateEnd('');
    }
  };

  const loadReport = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (dateStart) params.append('date_start', dateStart);
      if (dateEnd) params.append('date_end', dateEnd);

      const res = await api.get(`/reports/comprehensive?${params.toString()}`);
      if (res.success) {
        setReportData(res);
      }
    } catch (err) {
      console.error('Report error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReport();
  }, [dateStart, dateEnd]);

  const handleExportExcel = () => {
    const token = getToken();
    const params = new URLSearchParams();
    if (dateStart) params.append('date_start', dateStart);
    if (dateEnd) params.append('date_end', dateEnd);

    // Download via direct link or fetch blob
    fetch(`/api/reports/export/excel?${params.toString()}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.blob())
      .then(blob => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Konya_Bilgisayar_Rapor_${today}.xlsx`;
        document.body.appendChild(a);
        a.click();
        a.remove();
      })
      .catch(err => alert('Excel indirilemedi: ' + err.message));
  };

  const s = reportData?.summary || {};
  const topCategories = reportData?.topCategories || [];
  const topCariler = reportData?.topCariler || [];
  const stockReport = reportData?.stockReport || [];
  const expensesByCategory = reportData?.expensesByCategory || [];

  return (
    <div>
      {/* 1. TARİH ARALIĞI SEÇİCİ & ÇIKTI BUTONLARI */}
      <div className="filter-bar no-print" style={{ justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '13px', fontWeight: 600, color: '#475569', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Calendar size={15} />
            <span>Dönem:</span>
          </span>

          <button
            className={`btn btn-sm ${activePreset === 'today' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => applyPreset('today')}
          >
            Bugün
          </button>
          <button
            className={`btn btn-sm ${activePreset === 'week' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => applyPreset('week')}
          >
            Bu Hafta
          </button>
          <button
            className={`btn btn-sm ${activePreset === 'month' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => applyPreset('month')}
          >
            Bu Ay
          </button>
          <button
            className={`btn btn-sm ${activePreset === 'year' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => applyPreset('year')}
          >
            Bu Yıl
          </button>
          <button
            className={`btn btn-sm ${activePreset === 'all' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => applyPreset('all')}
          >
            Tüm Zamanlar
          </button>

          <div style={{ display: 'flex', gap: '4px', alignItems: 'center', marginLeft: '8px' }}>
            <input
              type="date"
              className="input-text input-no-icon"
              style={{ width: '135px' }}
              value={dateStart}
              onChange={(e) => { setDateStart(e.target.value); setActivePreset('custom'); }}
            />
            <span style={{ color: '#94a3b8' }}>-</span>
            <input
              type="date"
              className="input-text input-no-icon"
              style={{ width: '135px' }}
              value={dateEnd}
              onChange={(e) => { setDateEnd(e.target.value); setActivePreset('custom'); }}
            />
          </div>
        </div>

        {/* Dışa Aktarma Butonları */}
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            className="btn btn-outline"
            onClick={handleExportExcel}
            title="Excel Tablosu (.xlsx) Olarak İndir"
          >
            <Download size={16} />
            <span>Excel İndir (.xlsx)</span>
          </button>

          <button
            className="btn btn-secondary"
            onClick={() => window.print()}
            title="Raporu Yazdır veya PDF Olarak Kaydet"
          >
            <Printer size={16} />
            <span>Yazdır / PDF</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: '#64748b' }}>
          <RefreshCw size={28} className="animate-spin" style={{ margin: '0 auto 12px' }} />
          <div>Rapor hesaplanıyor...</div>
        </div>
      ) : (
        <div>
          {/* YAZDIRMA BAŞLIĞI */}
          <div className="printable-report-header" style={{ display: 'none' }}>
            <h2>KONYA BİLGİSAYAR - FİNANS VE STOK RAPORU</h2>
            <p>Dönem: {dateStart || 'Başlangıç'} - {dateEnd || 'Bugün'}</p>
          </div>

          {/* 2. DÖNEM FİNANSAL ÖZET KARTLARI */}
          <div className="dashboard-grid">
            {/* Toplam Satış */}
            <div className="kpi-card success">
              <div className="kpi-header">
                <span>Dönem Satış Hacmi</span>
                <TrendingUp size={16} style={{ color: '#059669' }} />
              </div>
              <div className="kpi-value text-positive">{formatCurrency(s.totalSales)}</div>
              <div className="kpi-subtext">{s.salesCount} adet satış işlemi</div>
            </div>

            {/* Toplam Alış */}
            <div className="kpi-card info">
              <div className="kpi-header">
                <span>Dönem Alış Hacmi</span>
                <ShoppingBag size={16} style={{ color: '#0284c7' }} />
              </div>
              <div className="kpi-value">{formatCurrency(s.totalPurchases)}</div>
              <div className="kpi-subtext">{s.purchasesCount} adet mal alışı</div>
            </div>

            {/* Brüt Kâr (Admin) */}
            {isAdmin && (
              <div className="kpi-card success">
                <div className="kpi-header">
                  <span>Dönem Brüt Kârı</span>
                  <DollarSign size={16} style={{ color: '#059669' }} />
                </div>
                <div className="kpi-value text-positive">{formatCurrency(s.grossProfit)}</div>
                <div className="kpi-subtext">Satılan ürünlerin kâr marjı</div>
              </div>
            )}

            {/* Masraflar */}
            <div className="kpi-card danger">
              <div className="kpi-header">
                <span>Dönem Masrafları</span>
                <Receipt size={16} style={{ color: '#dc2626' }} />
              </div>
              <div className="kpi-value text-negative">{formatCurrency(s.totalExpenses)}</div>
              <div className="kpi-subtext">{s.expensesCount} adet gider kalemi</div>
            </div>

            {/* Net Kâr (Admin) */}
            {isAdmin && (
              <div className="kpi-card purple">
                <div className="kpi-header">
                  <span>Dönem Net Kârı</span>
                  <DollarSign size={16} style={{ color: '#7c3aed' }} />
                </div>
                <div className="kpi-value" style={{ color: s.netProfit >= 0 ? '#059669' : '#dc2626' }}>
                  {formatCurrency(s.netProfit)}
                </div>
                <div className="kpi-subtext">Brüt Kâr - İşletme Giderleri</div>
              </div>
            )}

            {/* Toplam Alacak */}
            <div className="kpi-card warning">
              <div className="kpi-header">
                <span>Toplam Cari Alacak</span>
                <Users size={16} style={{ color: '#d97706' }} />
              </div>
              <div className="kpi-value" style={{ color: '#d97706' }}>
                {formatCurrency(s.totalReceivables)}
              </div>
              <div className="kpi-subtext">{s.debtorCount} müşteriden alacak</div>
            </div>

            {/* Toplam Borç */}
            <div className="kpi-card danger">
              <div className="kpi-header">
                <span>Toplam Cari Borç</span>
                <CreditCard size={16} style={{ color: '#dc2626' }} />
              </div>
              <div className="kpi-value text-negative">
                {formatCurrency(s.totalPayables)}
              </div>
              <div className="kpi-subtext">{s.creditorCount} tedarikçiye borç</div>
            </div>
          </div>

          {/* 3. EN ÇOK SATAN KATEGORİLER VE EN ÇOK İŞLEM YAPILAN CARİLER */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px', marginBottom: '24px' }}>
            {/* En Çok Satan Kategoriler */}
            <div className="card">
              <div className="card-header">
                <h3 className="card-title">
                  <BarChart3 size={18} style={{ color: '#2563eb' }} />
                  <span>En Çok Ciro Yapan Kategoriler</span>
                </h3>
              </div>
              <div className="table-responsive">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Kategori</th>
                      <th style={{ textAlign: 'center' }}>Adet</th>
                      <th style={{ textAlign: 'right' }}>Toplam Ciro (₺)</th>
                      {isAdmin && <th style={{ textAlign: 'right' }}>Kâr (₺)</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {topCategories.length === 0 ? (
                      <tr>
                        <td colSpan={4} style={{ textAlign: 'center', padding: '20px', color: '#94a3b8' }}>
                          Bu dönemde satış kaydı yok.
                        </td>
                      </tr>
                    ) : (
                      topCategories.map((c, i) => (
                        <tr key={i}>
                          <td style={{ fontWeight: 600 }}>{c.category_name}</td>
                          <td style={{ textAlign: 'center' }}>{c.sold_count}</td>
                          <td style={{ textAlign: 'right', fontWeight: 700, fontFamily: 'monospace' }}>
                            {formatCurrency(c.total_sales)}
                          </td>
                          {isAdmin && (
                            <td style={{ textAlign: 'right', color: '#059669', fontWeight: 600, fontFamily: 'monospace' }}>
                              {formatCurrency(c.total_profit)}
                            </td>
                          )}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* En Çok İşlem Yapılan Cariler */}
            <div className="card">
              <div className="card-header">
                <h3 className="card-title">
                  <Users size={18} style={{ color: '#059669' }} />
                  <span>En Çok İşlem Yapılan Cariler</span>
                </h3>
              </div>
              <div className="table-responsive">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Cari Adı</th>
                      <th>Tip</th>
                      <th style={{ textAlign: 'right' }}>Satış Hacmi</th>
                      <th style={{ textAlign: 'right' }}>Alış Hacmi</th>
                      <th style={{ textAlign: 'right' }}>Bakiye</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topCariler.length === 0 ? (
                      <tr>
                        <td colSpan={5} style={{ textAlign: 'center', padding: '20px', color: '#94a3b8' }}>Kayıt yok</td>
                      </tr>
                    ) : (
                      topCariler.map(c => (
                        <tr key={c.id}>
                          <td style={{ fontWeight: 600 }}>{c.name}</td>
                          <td>
                            <span className="badge badge-secondary" style={{ fontSize: '10.5px' }}>
                              {c.type === 'customer' ? 'Müşteri' : c.type === 'supplier' ? 'Tedarikçi' : 'Her İkisi'}
                            </span>
                          </td>
                          <td style={{ textAlign: 'right', fontFamily: 'monospace', fontWeight: 600 }}>
                            {c.total_sales_volume > 0 ? formatCurrency(c.total_sales_volume) : '-'}
                          </td>
                          <td style={{ textAlign: 'right', fontFamily: 'monospace', fontWeight: 600 }}>
                            {c.total_purchases_volume > 0 ? formatCurrency(c.total_purchases_volume) : '-'}
                          </td>
                          <td style={{
                            textAlign: 'right',
                            fontFamily: 'monospace',
                            fontWeight: 700,
                            color: c.balance_cents > 0 ? '#059669' : c.balance_cents < 0 ? '#dc2626' : '#64748b'
                          }}>
                            {formatCurrency(c.balance_cents)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* 4. GÜNCEL STOK RAPORU VE MALİYET TABLOSU */}
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">
                <PackageCheck size={18} style={{ color: '#2563eb' }} />
                <span>Güncel Stok Raporu ve Kategori Maliyeti</span>
              </h3>
            </div>
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Kategori</th>
                    <th style={{ textAlign: 'center' }}>Stoktaki Adet</th>
                    {isAdmin && <th style={{ textAlign: 'right' }}>Toplam Alış Maliyeti (₺)</th>}
                    <th style={{ textAlign: 'right' }}>Tahmini Perakende Değer (₺)</th>
                    {isAdmin && <th style={{ textAlign: 'right' }}>Potansiyel Kâr (₺)</th>}
                  </tr>
                </thead>
                <tbody>
                  {stockReport.map((s, idx) => (
                    <tr key={idx}>
                      <td style={{ fontWeight: 600 }}>{s.category_name}</td>
                      <td style={{ textAlign: 'center', fontWeight: 700 }}>{s.in_stock_count}</td>
                      {isAdmin && (
                        <td style={{ textAlign: 'right', fontFamily: 'monospace', color: '#64748b' }}>
                          {formatCurrency(s.total_cost)}
                        </td>
                      )}
                      <td style={{ textAlign: 'right', fontWeight: 700, fontFamily: 'monospace', color: '#0f172a' }}>
                        {formatCurrency(s.total_estimated_value)}
                      </td>
                      {isAdmin && (
                        <td style={{ textAlign: 'right', fontWeight: 700, fontFamily: 'monospace', color: '#059669' }}>
                          {formatCurrency(s.total_estimated_value - s.total_cost)}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
