import React, { useState, useEffect } from 'react';
import {
  Laptop,
  ShoppingBag,
  TrendingUp,
  Receipt,
  Users,
  CreditCard,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownLeft,
  DollarSign,
  PackageCheck,
  Clock,
  Layers,
  ChevronRight,
  RefreshCw
} from 'lucide-react';
import { api } from '../utils/api';
import { formatCurrency, formatDate, getProductStatusInfo } from '../utils/formatters';

export default function DashboardView({
  user,
  onOpenQuickSale,
  onOpenQuickPurchase,
  onOpenQuickPayment,
  onSelectProduct
}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const isAdmin = user?.role === 'admin';

  const loadDashboard = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await api.get('/dashboard');
      if (res.success) {
        setData(res);
      }
    } catch (err) {
      setError(err.message || 'Dashboard verileri alınamadı.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 20px', color: '#64748b' }}>
        <RefreshCw size={28} className="animate-spin" style={{ margin: '0 auto 12px' }} />
        <div>Dashboard verileri yükleniyor...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '24px', backgroundColor: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', borderRadius: '8px' }}>
        Dashboard hatası: {error}
      </div>
    );
  }

  const m = data?.metrics || {};
  const categories = data?.categoryDistribution || [];
  const slowItems = data?.slowMovingItems || [];
  const recentSales = data?.recentSales || [];
  const recentPurchases = data?.recentPurchases || [];

  return (
    <div>
      {/* 1. ÜST KPI KARTLARI GRİDİ */}
      <div className="dashboard-grid">
        {/* Stoktaki Cihaz Sayısı */}
        <div className="kpi-card info">
          <div className="kpi-header">
            <span>Stoktaki Toplam Ürün</span>
            <div className="kpi-icon-wrapper" style={{ backgroundColor: '#e0f2fe', color: '#0284c7' }}>
              <PackageCheck size={18} />
            </div>
          </div>
          <div className="kpi-value">{m.totalStockCount} Adet</div>
          <div className="kpi-subtext">Satışa hazır cihazlar</div>
        </div>

        {/* Tahmini Stok Değeri */}
        <div className="kpi-card success">
          <div className="kpi-header">
            <span>Tahmini Stok Satış Değeri</span>
            <div className="kpi-icon-wrapper" style={{ backgroundColor: '#ecfdf5', color: '#059669' }}>
              <TrendingUp size={18} />
            </div>
          </div>
          <div className="kpi-value">{formatCurrency(m.totalStockEstimatedValue)}</div>
          <div className="kpi-subtext">Perakende etiket değeri</div>
        </div>

        {/* Stok Maliyeti (Yönetici) */}
        {isAdmin && (
          <div className="kpi-card purple">
            <div className="kpi-header">
              <span>Toplam Stok Maliyeti</span>
              <div className="kpi-icon-wrapper" style={{ backgroundColor: '#f5f3ff', color: '#7c3aed' }}>
                <Laptop size={18} />
              </div>
            </div>
            <div className="kpi-value">{formatCurrency(m.totalStockCost)}</div>
            <div className="kpi-subtext">
              Potansiyel Kâr: <strong>{formatCurrency(m.potentialStockProfit)}</strong>
            </div>
          </div>
        )}

        {/* Bu Ayki Satışlar */}
        <div className="kpi-card success">
          <div className="kpi-header">
            <span>Bu Ay Yapılan Satış</span>
            <div className="kpi-icon-wrapper" style={{ backgroundColor: '#ecfdf5', color: '#059669' }}>
              <ArrowUpRight size={18} />
            </div>
          </div>
          <div className="kpi-value">{formatCurrency(m.monthlySalesTotal)}</div>
          <div className="kpi-subtext">{m.monthlySalesCount} adet faturalı satış</div>
        </div>

        {/* Bu Ayki Brüt Kâr (Yönetici) */}
        {isAdmin && (
          <div className="kpi-card success">
            <div className="kpi-header">
              <span>Bu Ayki Brüt Kâr</span>
              <div className="kpi-icon-wrapper" style={{ backgroundColor: '#ecfdf5', color: '#059669' }}>
                <DollarSign size={18} />
              </div>
            </div>
            <div className="kpi-value text-positive">{formatCurrency(m.monthlyGrossProfit)}</div>
            <div className="kpi-subtext">Satış Fiyatı - Alış Maliyeti</div>
          </div>
        )}

        {/* Bu Ayki Net Kâr (Yönetici) */}
        {isAdmin && (
          <div className="kpi-card info">
            <div className="kpi-header">
              <span>Bu Ayki Net Kâr</span>
              <div className="kpi-icon-wrapper" style={{ backgroundColor: '#f0f9ff', color: '#0284c7' }}>
                <TrendingUp size={18} />
              </div>
            </div>
            <div className="kpi-value" style={{ color: m.monthlyNetProfit >= 0 ? '#059669' : '#dc2626' }}>
              {formatCurrency(m.monthlyNetProfit)}
            </div>
            <div className="kpi-subtext">
              Giderler: {formatCurrency(m.monthlyExpensesTotal)} düşüldü
            </div>
          </div>
        )}

        {/* Toplam Alacak (Müşterilerin Borcu) */}
        <div className="kpi-card warning">
          <div className="kpi-header">
            <span>Toplam Cari Alacak</span>
            <div className="kpi-icon-wrapper" style={{ backgroundColor: '#fffbeb', color: '#d97706' }}>
              <Users size={18} />
            </div>
          </div>
          <div className="kpi-value" style={{ color: '#d97706' }}>
            {formatCurrency(m.totalReceivables)}
          </div>
          <div className="kpi-subtext">Müşterilerden tahsil edilecek</div>
        </div>

        {/* Toplam Borç (Tedarikçilere Olan) */}
        <div className="kpi-card danger">
          <div className="kpi-header">
            <span>Toplam Cari Borç</span>
            <div className="kpi-icon-wrapper" style={{ backgroundColor: '#fef2f2', color: '#dc2626' }}>
              <CreditCard size={18} />
            </div>
          </div>
          <div className="kpi-value text-negative">
            {formatCurrency(m.totalPayables)}
          </div>
          <div className="kpi-subtext">Tedarikçilere ödenecek borç</div>
        </div>
      </div>

      {/* 2. ORTA BÖLÜM: KATEGORİ DAĞILIMI VE BEKLEYEN CİHAZLAR */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '24px', marginBottom: '24px' }}>
        {/* Kategori Bazında Stok Dağılımı */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">
              <Layers size={18} style={{ color: '#2563eb' }} />
              <span>Kategori Bazında Stok Dağılımı</span>
            </h3>
            <span style={{ fontSize: '12px', color: '#64748b' }}>{categories.length} Kategori</span>
          </div>
          <div className="card-body" style={{ padding: '12px 20px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {categories.map(cat => {
                const totalValue = categories.reduce((sum, c) => sum + (c.total_retail_value || 0), 0) || 1;
                const percentage = Math.round(((cat.total_retail_value || 0) / totalValue) * 100);

                return (
                  <div key={cat.id}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '4px' }}>
                      <span style={{ fontWeight: 600, color: '#1e293b' }}>{cat.name}</span>
                      <span style={{ color: '#64748b' }}>
                        <strong>{cat.item_count} adet</strong> • {formatCurrency(cat.total_retail_value)} ({percentage}%)
                      </span>
                    </div>
                    {/* Görsel ilerleme çubuğu */}
                    <div style={{ width: '100%', height: '8px', backgroundColor: '#f1f5f9', borderRadius: '4px', overflow: 'hidden' }}>
                      <div
                        style={{
                          width: `${Math.min(100, Math.max(5, percentage))}%`,
                          height: '100%',
                          backgroundColor: '#2563eb',
                          borderRadius: '4px'
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Kritik / 30+ Gündür Stokta Bekleyen Cihazlar */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title" style={{ color: '#b45309' }}>
              <Clock size={18} style={{ color: '#d97706' }} />
              <span>Bekleyen Cihazlar (30+ Gün)</span>
            </h3>
            <span style={{ fontSize: '11px', color: '#b45309', backgroundColor: '#fffbeb', padding: '2px 8px', borderRadius: '4px', fontWeight: 600 }}>
              {slowItems.length} Cihaz
            </span>
          </div>
          <div className="card-body" style={{ padding: '0', maxHeight: '320px', overflowY: 'auto' }}>
            {slowItems.length === 0 ? (
              <div style={{ padding: '30px', textAlign: 'center', color: '#059669', fontSize: '13px' }}>
                Tüm ürünler hızlı hareket ediyor, 30 günü aşan bekleyen cihaz yok!
              </div>
            ) : (
              slowItems.map(item => (
                <div
                  key={item.id}
                  onClick={() => onSelectProduct && onSelectProduct(item)}
                  style={{
                    padding: '12px 16px',
                    borderBottom: '1px solid #f1f5f9',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    transition: 'background 0.15s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '13px', color: '#0f172a' }}>{item.name}</div>
                    <div style={{ fontSize: '11px', color: '#64748b' }}>
                      {item.brand} • Giriş: {formatDate(item.purchase_date)} (<strong>{item.days_in_stock} gündür stokta</strong>)
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 700, fontSize: '13.5px', color: '#2563eb', fontFamily: 'monospace' }}>
                      {formatCurrency(item.estimated_sale_price_cents)}
                    </div>
                    <span style={{ fontSize: '11px', color: '#d97706', fontWeight: 600 }}>İndirim Düşün</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* 3. ALT BÖLÜM: SON SATIŞLAR VE SON ALIŞLAR */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px' }}>
        {/* Son Yapılan Satışlar */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">
              <TrendingUp size={18} style={{ color: '#059669' }} />
              <span>Son Yapılan Satışlar</span>
            </h3>
            <button className="btn btn-outline btn-sm" onClick={onOpenQuickSale}>
              + Yeni Satış
            </button>
          </div>
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Fatura No</th>
                  <th>Müşteri</th>
                  <th>Tarih</th>
                  <th>Tutar (₺)</th>
                  {isAdmin && <th>Kâr (₺)</th>}
                </tr>
              </thead>
              <tbody>
                {recentSales.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', padding: '20px', color: '#94a3b8' }}>Kayıt yok</td>
                  </tr>
                ) : (
                  recentSales.map(s => (
                    <tr key={s.id}>
                      <td style={{ fontFamily: 'monospace', fontWeight: 600, color: '#2563eb' }}>{s.invoice_no}</td>
                      <td>{s.cari_name}</td>
                      <td>{formatDate(s.sale_date)}</td>
                      <td style={{ fontWeight: 700, fontFamily: 'monospace' }}>{formatCurrency(s.total_amount_cents)}</td>
                      {isAdmin && (
                        <td style={{ color: '#059669', fontWeight: 600, fontFamily: 'monospace' }}>
                          {formatCurrency(s.gross_profit_cents)}
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Son Yapılan Alışlar */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">
              <ShoppingBag size={18} style={{ color: '#2563eb' }} />
              <span>Son Yapılan Alışlar</span>
            </h3>
            <button className="btn btn-outline btn-sm" onClick={onOpenQuickPurchase}>
              + Yeni Alış
            </button>
          </div>
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Fatura No</th>
                  <th>Tedarikçi / Cari</th>
                  <th>Tarih</th>
                  <th>Tutar (₺)</th>
                  <th>Kalan Borç (₺)</th>
                </tr>
              </thead>
              <tbody>
                {recentPurchases.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', padding: '20px', color: '#94a3b8' }}>Kayıt yok</td>
                  </tr>
                ) : (
                  recentPurchases.map(p => (
                    <tr key={p.id}>
                      <td style={{ fontFamily: 'monospace', fontWeight: 600 }}>{p.invoice_no}</td>
                      <td>{p.cari_name}</td>
                      <td>{formatDate(p.purchase_date)}</td>
                      <td style={{ fontWeight: 700, fontFamily: 'monospace' }}>{formatCurrency(p.total_amount_cents)}</td>
                      <td style={{
                        fontFamily: 'monospace',
                        fontWeight: 600,
                        color: (p.total_amount_cents - p.paid_amount_cents) > 0 ? '#dc2626' : '#64748b'
                      }}>
                        {formatCurrency(p.total_amount_cents - p.paid_amount_cents)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
