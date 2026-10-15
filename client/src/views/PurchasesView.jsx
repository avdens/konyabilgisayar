import React, { useState, useEffect } from 'react';
import { Search, Plus, Eye, Trash2, ShoppingBag, RefreshCw, AlertCircle } from 'lucide-react';
import { api } from '../utils/api';
import { formatCurrency, formatDate, getPaymentMethodLabel } from '../utils/formatters';

export default function PurchasesView({ user, cariler, onOpenAddPurchase }) {
  const isAdmin = user?.role === 'admin';

  const [purchases, setPurchases] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [cariId, setCariId] = useState('');
  const [dateStart, setDateStart] = useState('');
  const [dateEnd, setDateEnd] = useState('');

  // Selected purchase detail modal
  const [selectedPurchase, setSelectedPurchase] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [purchaseItems, setPurchaseItems] = useState([]);

  const loadPurchases = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (cariId) params.append('cari_id', cariId);
      if (dateStart) params.append('date_start', dateStart);
      if (dateEnd) params.append('date_end', dateEnd);
      params.append('page', page);
      params.append('limit', 25);

      const res = await api.get(`/purchases?${params.toString()}`);
      if (res.success) {
        setPurchases(res.purchases || []);
        setTotal(res.pagination?.total || 0);
        setTotalPages(res.pagination?.totalPages || 1);
      }
    } catch (err) {
      console.error('Purchases error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPurchases();
  }, [page, cariId, dateStart, dateEnd]);

  const viewPurchaseDetail = async (p) => {
    try {
      setSelectedPurchase(p);
      setDetailLoading(true);
      const res = await api.get(`/purchases/${p.id}`);
      if (res.success) {
        setSelectedPurchase(res.purchase);
        setPurchaseItems(res.items || []);
      }
    } catch (err) {
      alert('Detay yüklenemedi: ' + err.message);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleCancelPurchase = async (purchase) => {
    if (!window.confirm(`${purchase.invoice_no} numaralı alış kaydını iptal etmek istediğinize emin misiniz? İlgili ürünler stoktan kaldırılacak ve tedarikçi bakiyesi düzeltilecektir.`)) {
      return;
    }
    try {
      const res = await api.delete(`/purchases/${purchase.id}`);
      if (res.success) {
        loadPurchases();
        setSelectedPurchase(null);
      }
    } catch (err) {
      alert(err.message || 'Alış iptal edilemedi.');
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
            placeholder="Fatura No, Tedarikçi veya Açıklama ara..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && loadPurchases()}
          />
        </div>

        <div style={{ minWidth: '180px' }}>
          <select
            className="select-box"
            value={cariId}
            onChange={(e) => { setCariId(e.target.value); setPage(1); }}
          >
            <option value="">Tüm Tedarikçiler</option>
            {cariler.filter(c => c.type === 'supplier' || c.type === 'both').map(c => (
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
          className="btn btn-primary"
          style={{ marginLeft: 'auto' }}
          onClick={onOpenAddPurchase}
        >
          <Plus size={16} />
          <span>Yeni Alış Girişi</span>
        </button>
      </div>

      {/* Alış Faturaları Tablosu */}
      <div className="card">
        <div className="card-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontWeight: 600, fontSize: '15px' }}>Alış Faturaları & İrsaliyeler</span>
            <span style={{ fontSize: '12px', color: '#64748b' }}>({total} işlem)</span>
          </div>
          <button className="btn-icon" onClick={loadPurchases} title="Yenile">
            <RefreshCw size={16} />
          </button>
        </div>

        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Fatura No</th>
                <th>Tarih</th>
                <th>Tedarikçi / Cari</th>
                <th>Ürün Adedi</th>
                <th>Ödeme Şekli</th>
                <th style={{ textAlign: 'right' }}>Toplam Alış Tutarı (₺)</th>
                <th style={{ textAlign: 'right' }}>Ödenen Tutar (₺)</th>
                <th style={{ textAlign: 'right' }}>Kalan Borç (₺)</th>
                <th style={{ textAlign: 'center', width: '90px' }}>İşlem</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9} style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>Yükleniyor...</td>
                </tr>
              ) : purchases.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>Kayıt bulunamadı.</td>
                </tr>
              ) : (
                purchases.map(p => {
                  const rem = p.total_amount_cents - p.paid_amount_cents;
                  return (
                    <tr key={p.id}>
                      <td style={{ fontFamily: 'monospace', fontWeight: 600, color: '#2563eb' }}>
                        {p.invoice_no}
                      </td>
                      <td>{formatDate(p.purchase_date)}</td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{p.cari_name}</div>
                        {p.cari_phone && <div style={{ fontSize: '11px', color: '#64748b' }}>{p.cari_phone}</div>}
                      </td>
                      <td>
                        <span className="badge badge-secondary">{p.item_count} Kalem</span>
                      </td>
                      <td>{getPaymentMethodLabel(p.payment_method)}</td>
                      <td style={{ textAlign: 'right', fontWeight: 700, fontFamily: 'monospace' }}>
                        {formatCurrency(p.total_amount_cents)}
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 600, color: '#059669', fontFamily: 'monospace' }}>
                        {formatCurrency(p.paid_amount_cents)}
                      </td>
                      <td style={{
                        textAlign: 'right',
                        fontWeight: 700,
                        fontFamily: 'monospace',
                        color: rem > 0 ? '#dc2626' : '#64748b'
                      }}>
                        {formatCurrency(rem)}
                      </td>
                      <td>
                        <div style={{ display: 'flex', justifyContent: 'center', gap: '4px' }}>
                          <button
                            className="btn-icon"
                            style={{ color: '#2563eb' }}
                            onClick={() => viewPurchaseDetail(p)}
                            title="İncele & Kalemler"
                          >
                            <Eye size={15} />
                          </button>
                          {isAdmin && (
                            <button
                              className="btn-icon"
                              style={{ color: '#dc2626' }}
                              onClick={() => handleCancelPurchase(p)}
                              title="Alış Kaydını İptal Et"
                            >
                              <Trash2 size={15} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
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

      {/* Alış Detay Modalı */}
      {selectedPurchase && (
        <div className="modal-overlay">
          <div className="modal-content modal-lg">
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontFamily: 'monospace', fontSize: '14px', fontWeight: 700, color: '#2563eb' }}>
                  {selectedPurchase.invoice_no}
                </span>
                <h3 className="modal-title">Alış Faturası Detayı</h3>
              </div>
              <button className="btn-icon" onClick={() => setSelectedPurchase(null)}>
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
                      <div style={{ fontSize: '11px', color: '#64748b' }}>Tedarikçi</div>
                      <div style={{ fontWeight: 700, fontSize: '13.5px' }}>{selectedPurchase.cari_name}</div>
                      <div style={{ fontSize: '12px', color: '#64748b' }}>{selectedPurchase.cari_phone || 'Telefon yok'}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '11px', color: '#64748b' }}>Tarih / Ödeme</div>
                      <div style={{ fontWeight: 600, fontSize: '13px' }}>{formatDate(selectedPurchase.purchase_date)}</div>
                      <div style={{ fontSize: '12px', color: '#2563eb' }}>{getPaymentMethodLabel(selectedPurchase.payment_method)}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '11px', color: '#64748b' }}>Toplam Alış Tutarı</div>
                      <div style={{ fontSize: '18px', fontWeight: 700, fontFamily: 'monospace' }}>
                        {formatCurrency(selectedPurchase.total_amount_cents)}
                      </div>
                      <div style={{ fontSize: '11.5px', color: '#dc2626', fontWeight: 600 }}>
                        Kalan Borç: {formatCurrency(selectedPurchase.total_amount_cents - selectedPurchase.paid_amount_cents)}
                      </div>
                    </div>
                  </div>

                  <h4 style={{ fontSize: '13.5px', fontWeight: 600, marginBottom: '8px' }}>
                    Alınan Ürünler ({purchaseItems.length} Kalem)
                  </h4>
                  <table className="data-table" style={{ border: '1px solid #e2e8f0', borderRadius: '6px' }}>
                    <thead>
                      <tr>
                        <th>Ürün Adı</th>
                        <th>Kategori</th>
                        <th>Marka / Model</th>
                        <th>Seri No / IMEI</th>
                        <th style={{ textAlign: 'right' }}>Alış Maliyeti (₺)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {purchaseItems.map(item => (
                        <tr key={item.id}>
                          <td style={{ fontWeight: 600 }}>{item.product_name}</td>
                          <td>{item.category_name}</td>
                          <td>{item.brand} - {item.model}</td>
                          <td style={{ fontFamily: 'monospace', fontSize: '12px' }}>
                            {item.imei ? `IMEI: ${item.imei}` : item.serial_number ? `S/N: ${item.serial_number}` : item.product_code}
                          </td>
                          <td style={{ textAlign: 'right', fontWeight: 700, fontFamily: 'monospace' }}>
                            {formatCurrency(item.price_cents)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={() => setSelectedPurchase(null)}>
                Kapat
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
