import React, { useState, useEffect } from 'react';
import { Search, Plus, Eye, Printer, Trash2, TrendingUp, RefreshCw } from 'lucide-react';
import { api } from '../utils/api';
import { formatCurrency, formatDate, getPaymentMethodLabel } from '../utils/formatters';

export default function SalesView({ user, cariler, onOpenAddSale, onPrintReceipt }) {
  const isAdmin = user?.role === 'admin';

  const [sales, setSales] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [cariId, setCariId] = useState('');
  const [dateStart, setDateStart] = useState('');
  const [dateEnd, setDateEnd] = useState('');

  // Selected sale detail modal
  const [selectedSale, setSelectedSale] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [saleItems, setSaleItems] = useState([]);

  const loadSales = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (cariId) params.append('cari_id', cariId);
      if (dateStart) params.append('date_start', dateStart);
      if (dateEnd) params.append('date_end', dateEnd);
      params.append('page', page);
      params.append('limit', 25);

      const res = await api.get(`/sales?${params.toString()}`);
      if (res.success) {
        setSales(res.sales || []);
        setTotal(res.pagination?.total || 0);
        setTotalPages(res.pagination?.totalPages || 1);
      }
    } catch (err) {
      console.error('Sales error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSales();
  }, [page, cariId, dateStart, dateEnd]);

  const viewSaleDetail = async (s) => {
    try {
      setSelectedSale(s);
      setDetailLoading(true);
      const res = await api.get(`/sales/${s.id}`);
      if (res.success) {
        setSelectedSale(res.sale);
        setSaleItems(res.items || []);
      }
    } catch (err) {
      alert('Detay yüklenemedi: ' + err.message);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleCancelSale = async (sale) => {
    if (!window.confirm(`${sale.invoice_no} numaralı satışı iptal etmek istediğinize emin misiniz? Satılan ürünler otomatik olarak stoka iade edilecek ve müşteri bakiyesi düzeltilecektir.`)) {
      return;
    }
    try {
      const res = await api.delete(`/sales/${sale.id}`);
      if (res.success) {
        loadSales();
        setSelectedSale(null);
      }
    } catch (err) {
      alert(err.message || 'Satış iptal edilemedi.');
    }
  };

  return (
    <div>
      {/* Filtre ve Arama Çubuğu */}
      <div className="filter-bar">
        <div className="search-input-box" style={{ flex: 1, minWidth: '240px' }}>
          <Search size={16} className="search-icon" />
          <input
            type="text"
            className="input-text"
            placeholder="Fatura No, Müşteri veya Açıklama ara..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && loadSales()}
          />
        </div>

        <div style={{ minWidth: '180px' }}>
          <select
            className="select-box"
            value={cariId}
            onChange={(e) => { setCariId(e.target.value); setPage(1); }}
          >
            <option value="">Tüm Müşteriler</option>
            {cariler.filter(c => c.type === 'customer' || c.type === 'both').map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          <input
            type="date"
            className="input-text input-no-icon"
            style={{ width: '135px' }}
            value={dateStart}
            onChange={(e) => { setDateStart(e.target.value); setPage(1); }}
            title="Başlangıç Tarihi"
          />
          <span style={{ color: '#94a3b8' }}>-</span>
          <input
            type="date"
            className="input-text input-no-icon"
            style={{ width: '135px' }}
            value={dateEnd}
            onChange={(e) => { setDateEnd(e.target.value); setPage(1); }}
            title="Bitiş Tarihi"
          />
        </div>

        <button
          className="btn btn-success"
          style={{ marginLeft: 'auto' }}
          onClick={onOpenAddSale}
        >
          <Plus size={16} />
          <span>Yeni Satış Yap (POS)</span>
        </button>
      </div>

      {/* Satış Faturaları Tablosu */}
      <div className="card">
        <div className="card-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontWeight: 600, fontSize: '15px' }}>Satış Faturaları & Makbuzlar</span>
            <span style={{ fontSize: '12px', color: '#64748b' }}>({total} işlem)</span>
          </div>
          <button className="btn-icon" onClick={loadSales} title="Yenile">
            <RefreshCw size={16} />
          </button>
        </div>

        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Fatura No</th>
                <th>Tarih</th>
                <th>Müşteri (Cari)</th>
                <th>Ürün Adedi</th>
                <th>Ödeme Şekli</th>
                <th style={{ textAlign: 'right' }}>Satış Tutarı (₺)</th>
                {isAdmin && <th style={{ textAlign: 'right' }}>Brüt Kâr (₺)</th>}
                <th style={{ textAlign: 'right' }}>Tahsil Edilen (₺)</th>
                <th style={{ textAlign: 'right' }}>Kalan Alacak (₺)</th>
                <th style={{ textAlign: 'center', width: '110px' }}>İşlemler</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={10} style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>Yükleniyor...</td>
                </tr>
              ) : sales.length === 0 ? (
                <tr>
                  <td colSpan={10} style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>Kayıt bulunamadı.</td>
                </tr>
              ) : (
                sales.map(s => (
                  <tr key={s.id}>
                    <td style={{ fontFamily: 'monospace', fontWeight: 600, color: '#2563eb' }}>
                      {s.invoice_no}
                    </td>
                    <td>{formatDate(s.sale_date)}</td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{s.cari_name}</div>
                      {s.cari_phone && <div style={{ fontSize: '11px', color: '#64748b' }}>{s.cari_phone}</div>}
                    </td>
                    <td>
                      <span className="badge badge-secondary">{s.item_count} Cihaz</span>
                    </td>
                    <td>{getPaymentMethodLabel(s.payment_method)}</td>
                    <td style={{ textAlign: 'right', fontWeight: 700, fontFamily: 'monospace' }}>
                      {formatCurrency(s.total_amount_cents)}
                    </td>
                    {isAdmin && (
                      <td style={{ textAlign: 'right', fontWeight: 600, color: '#059669', fontFamily: 'monospace' }}>
                        {formatCurrency(s.gross_profit_cents)}
                      </td>
                    )}
                    <td style={{ textAlign: 'right', fontWeight: 600, color: '#059669', fontFamily: 'monospace' }}>
                      {formatCurrency(s.collected_amount_cents)}
                    </td>
                    <td style={{
                      textAlign: 'right',
                      fontWeight: 700,
                      fontFamily: 'monospace',
                      color: s.remaining_amount_cents > 0 ? '#dc2626' : '#64748b'
                    }}>
                      {formatCurrency(s.remaining_amount_cents)}
                    </td>
                    <td>
                      <div style={{ display: 'flex', justifyContent: 'center', gap: '4px' }}>
                        <button
                          className="btn-icon"
                          style={{ color: '#2563eb' }}
                          onClick={() => viewSaleDetail(s)}
                          title="İncele & Kalemler"
                        >
                          <Eye size={15} />
                        </button>
                        <button
                          className="btn-icon"
                          style={{ color: '#059669' }}
                          onClick={() => onPrintReceipt && onPrintReceipt(s.id)}
                          title="Satış Fişi Yazdır"
                        >
                          <Printer size={15} />
                        </button>
                        {isAdmin && (
                          <button
                            className="btn-icon"
                            style={{ color: '#dc2626' }}
                            onClick={() => handleCancelSale(s)}
                            title="Satışı İptal Et (Stoka İade)"
                          >
                            <Trash2 size={15} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="pagination-wrapper">
            <span>Toplam {total} kayıttan {((page - 1) * 25) + 1} - {Math.min(page * 25, total)} arası</span>
            <div className="pagination-buttons">
              <button className="page-btn" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Önceki</button>
              <span style={{ fontSize: '12.5px', padding: '0 8px' }}>Sayfa {page} / {totalPages}</span>
              <button className="page-btn" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Sonraki</button>
            </div>
          </div>
        )}
      </div>

      {/* Satış Detay Modalı */}
      {selectedSale && (
        <div className="modal-overlay">
          <div className="modal-content modal-lg">
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontFamily: 'monospace', fontSize: '14px', fontWeight: 700, color: '#2563eb' }}>
                  {selectedSale.invoice_no}
                </span>
                <h3 className="modal-title">Satış Faturası Detayı</h3>
              </div>
              <button className="btn-icon" onClick={() => setSelectedSale(null)}>
                <X size={20} />
              </button>
            </div>

            <div className="modal-body">
              {detailLoading ? (
                <div style={{ padding: '30px', textAlign: 'center', color: '#64748b' }}>Yükleniyor...</div>
              ) : (
                <div>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                    gap: '12px',
                    padding: '14px',
                    backgroundColor: '#f8fafc',
                    borderRadius: '8px',
                    border: '1px solid #e2e8f0',
                    marginBottom: '16px'
                  }}>
                    <div>
                      <div style={{ fontSize: '11px', color: '#64748b' }}>Müşteri</div>
                      <div style={{ fontWeight: 700, fontSize: '13.5px' }}>{selectedSale.cari_name}</div>
                      <div style={{ fontSize: '12px', color: '#64748b' }}>{selectedSale.cari_phone || 'Telefon yok'}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '11px', color: '#64748b' }}>Tarih / Ödeme</div>
                      <div style={{ fontWeight: 600, fontSize: '13px' }}>{formatDate(selectedSale.sale_date)}</div>
                      <div style={{ fontSize: '12px', color: '#2563eb' }}>{getPaymentMethodLabel(selectedSale.payment_method)}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '11px', color: '#64748b' }}>Toplam Satış Tutarı</div>
                      <div style={{ fontSize: '18px', fontWeight: 700, fontFamily: 'monospace', color: '#059669' }}>
                        {formatCurrency(selectedSale.total_amount_cents)}
                      </div>
                      {isAdmin && (
                        <div style={{ fontSize: '12px', color: '#059669', fontWeight: 600 }}>
                          Kâr: {formatCurrency(selectedSale.gross_profit_cents)}
                        </div>
                      )}
                    </div>
                  </div>

                  <h4 style={{ fontSize: '13.5px', fontWeight: 600, marginBottom: '8px' }}>
                    Satılan Ürünler ({saleItems.length} Kalem)
                  </h4>
                  <table className="data-table" style={{ border: '1px solid #e2e8f0', borderRadius: '6px' }}>
                    <thead>
                      <tr>
                        <th>Ürün Adı</th>
                        <th>Kategori</th>
                        <th>Marka / Model</th>
                        <th>Seri No / IMEI</th>
                        <th style={{ textAlign: 'right' }}>Satış Fiyatı (₺)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {saleItems.map(item => (
                        <tr key={item.id}>
                          <td style={{ fontWeight: 600 }}>{item.product_name}</td>
                          <td>{item.category_name}</td>
                          <td>{item.brand} - {item.model}</td>
                          <td style={{ fontFamily: 'monospace', fontSize: '12px' }}>
                            {item.imei ? `IMEI: ${item.imei}` : item.serial_number ? `S/N: ${item.serial_number}` : item.product_code}
                          </td>
                          <td style={{ textAlign: 'right', fontWeight: 700, fontFamily: 'monospace' }}>
                            {formatCurrency(item.sale_price_cents)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="modal-footer" style={{ justifyContent: 'space-between' }}>
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => {
                  const id = selectedSale.id;
                  setSelectedSale(null);
                  onPrintReceipt && onPrintReceipt(id);
                }}
              >
                <Printer size={16} />
                <span>Fiş / Makbuz Yazdır</span>
              </button>

              <button type="button" className="btn btn-secondary" onClick={() => setSelectedSale(null)}>
                Kapat
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
