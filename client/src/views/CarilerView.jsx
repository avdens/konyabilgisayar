import React, { useState, useEffect } from 'react';
import {
  Search,
  Plus,
  FileText,
  ArrowDownLeft,
  ArrowUpRight,
  Edit2,
  Trash2,
  Users,
  Phone,
  RefreshCw,
  Building
} from 'lucide-react';
import { api } from '../utils/api';
import { formatCurrency, getCariTypeLabel } from '../utils/formatters';

export default function CarilerView({
  user,
  onOpenAddCari,
  onEditCari,
  onViewStatement,
  onQuickPayment
}) {
  const isAdmin = user?.role === 'admin';

  const [cariler, setCariler] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [type, setType] = useState('all');
  const [balanceStatus, setBalanceStatus] = useState('');

  const loadCariler = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (type && type !== 'all') params.append('type', type);
      if (balanceStatus) params.append('balance_status', balanceStatus);
      params.append('page', page);
      params.append('limit', 50);

      const res = await api.get(`/cariler?${params.toString()}`);
      if (res.success) {
        setCariler(res.cariler || []);
        setTotal(res.pagination?.total || 0);
        setTotalPages(res.pagination?.totalPages || 1);
      }
    } catch (err) {
      console.error('Cariler error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCariler();
  }, [page, type, balanceStatus]);

  const handleDeleteCari = async (cari) => {
    if (cari.balance_cents !== 0) {
      alert('Bakiyesi 0 TL olmayan cari hesap silinemez. Lütfen önce bakiyeyi sıfırlayınız.');
      return;
    }
    if (!window.confirm(`"${cari.name}" (${cari.code}) adlı cari hesabı çöp kutusuna taşımak istediğinizden emin misiniz?`)) {
      return;
    }
    try {
      const res = await api.delete(`/cariler/${cari.id}`);
      if (res.success) {
        loadCariler();
      }
    } catch (err) {
      alert(err.message || 'Cari silinemedi.');
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
            placeholder="Cari Adı, Telefon, TC/VKN veya Şehir ara..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && loadCariler()}
          />
        </div>

        {/* Cari Tipi Filtresi */}
        <div style={{ minWidth: '150px' }}>
          <select
            className="select-box"
            value={type}
            onChange={(e) => { setType(e.target.value); setPage(1); }}
          >
            <option value="all">Tüm Cariler</option>
            <option value="customer">Müşteriler</option>
            <option value="supplier">Tedarikçiler</option>
            <option value="both">Her İkisi</option>
          </select>
        </div>

        {/* Bakiye Durumu Filtresi */}
        <div style={{ minWidth: '170px' }}>
          <select
            className="select-box"
            value={balanceStatus}
            onChange={(e) => { setBalanceStatus(e.target.value); setPage(1); }}
          >
            <option value="">Tüm Bakiyeler</option>
            <option value="receivable">Alacağımız Olanlar (Borçlu)</option>
            <option value="payable">Borcumuz Olanlar (Alacaklı)</option>
            <option value="zero">Bakiyesi Sıfır (Kapalı)</option>
          </select>
        </div>

        <button
          className="btn btn-primary"
          style={{ marginLeft: 'auto' }}
          onClick={onOpenAddCari}
        >
          <Plus size={16} />
          <span>Yeni Cari Hesap</span>
        </button>
      </div>

      {/* Cariler Tablosu */}
      <div className="card">
        <div className="card-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontWeight: 600, fontSize: '15px' }}>Müşteri & Tedarikçi Cari Hesapları</span>
            <span style={{ fontSize: '12px', color: '#64748b' }}>({total} kayıt)</span>
          </div>
          <button className="btn-icon" onClick={loadCariler} title="Yenile">
            <RefreshCw size={16} />
          </button>
        </div>

        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Cari Kodu</th>
                <th>Cari Adı / Firma Ünvanı</th>
                <th>Tip</th>
                <th>Telefon</th>
                <th>Konum / Şehir</th>
                <th>İşlem Hacmi</th>
                <th style={{ textAlign: 'right' }}>Güncel Bakiye (₺)</th>
                <th>Bakiye Durumu</th>
                <th style={{ textAlign: 'center', width: '150px' }}>Hızlı İşlemler</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9} style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>Yükleniyor...</td>
                </tr>
              ) : cariler.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>Kayıt bulunamadı.</td>
                </tr>
              ) : (
                cariler.map(c => {
                  const b = c.balance_cents;
                  return (
                    <tr key={c.id}>
                      <td style={{ fontFamily: 'monospace', fontWeight: 600, color: '#2563eb' }}>
                        {c.code}
                      </td>
                      <td>
                        <div style={{ fontWeight: 600, color: '#0f172a' }}>{c.name}</div>
                        {c.tc_vkn && (
                          <div style={{ fontSize: '11px', color: '#64748b', fontFamily: 'monospace' }}>
                            VKN/TC: {c.tc_vkn}
                          </div>
                        )}
                      </td>
                      <td>
                        <span className="badge badge-secondary" style={{ fontSize: '11px' }}>
                          {getCariTypeLabel(c.type)}
                        </span>
                      </td>
                      <td>
                        {c.phone ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Phone size={12} style={{ color: '#2563eb' }} />
                            <span>{c.phone}</span>
                          </div>
                        ) : (
                          <span style={{ color: '#cbd5e1' }}>-</span>
                        )}
                      </td>
                      <td>
                        {c.district ? `${c.district} / ` : ''}{c.city || 'Konya'}
                      </td>
                      <td>
                        <div style={{ fontSize: '11.5px', color: '#64748b' }}>
                          {c.total_sales_count > 0 && <span>{c.total_sales_count} Satış </span>}
                          {c.total_purchases_count > 0 && <span>• {c.total_purchases_count} Alış</span>}
                          {!c.total_sales_count && !c.total_purchases_count && <span>Yeni Cari</span>}
                        </div>
                      </td>
                      <td style={{
                        textAlign: 'right',
                        fontWeight: 700,
                        fontFamily: 'monospace',
                        fontSize: '14px',
                        color: b > 0 ? '#059669' : b < 0 ? '#dc2626' : '#64748b'
                      }}>
                        {formatCurrency(b)}
                      </td>
                      <td>
                        {b > 0 ? (
                          <span className="badge badge-success" style={{ fontSize: '11px' }}>
                            Alacağımız Var
                          </span>
                        ) : b < 0 ? (
                          <span className="badge badge-danger" style={{ fontSize: '11px' }}>
                            Borcumuz Var
                          </span>
                        ) : (
                          <span className="badge badge-secondary" style={{ fontSize: '11px' }}>
                            Hesap Kapalı
                          </span>
                        )}
                      </td>
                      <td>
                        <div style={{ display: 'flex', justifyContent: 'center', gap: '4px' }}>
                          {/* Ekstre Görüntüle */}
                          <button
                            className="btn-icon"
                            style={{ color: '#2563eb' }}
                            onClick={() => onViewStatement && onViewStatement(c.id)}
                            title="Hesap Ekstresi Görüntüle"
                          >
                            <FileText size={15} />
                          </button>

                          {/* Tahsilat / Ödeme */}
                          <button
                            className="btn-icon"
                            style={{ color: b > 0 ? '#059669' : '#dc2626' }}
                            onClick={() => onQuickPayment && onQuickPayment(c.id, b < 0 ? 'payment' : 'collection')}
                            title={b < 0 ? 'Ödeme Yap' : 'Tahsilat Al'}
                          >
                            {b < 0 ? <ArrowUpRight size={15} /> : <ArrowDownLeft size={15} />}
                          </button>

                          {/* Düzenle */}
                          <button
                            className="btn-icon"
                            style={{ color: '#475569' }}
                            onClick={() => onEditCari && onEditCari(c)}
                            title="Cariyi Düzenle"
                          >
                            <Edit2 size={15} />
                          </button>

                          {/* Sil (Admin) */}
                          {isAdmin && (
                            <button
                              className="btn-icon"
                              style={{ color: '#dc2626' }}
                              onClick={() => handleDeleteCari(c)}
                              title="Sil"
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
            <span>Toplam {total} kayıttan {((page - 1) * 50) + 1} - {Math.min(page * 50, total)} arası</span>
            <div className="pagination-buttons">
              <button className="page-btn" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Önceki</button>
              <span style={{ fontSize: '12.5px', padding: '0 8px' }}>Sayfa {page} / {totalPages}</span>
              <button className="page-btn" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Sonraki</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
