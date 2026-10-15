import React, { useState, useEffect } from 'react';
import {
  CreditCard,
  Plus,
  ArrowDownLeft,
  ArrowUpRight,
  Search,
  Trash2,
  RefreshCw,
  Wallet
} from 'lucide-react';
import { api } from '../utils/api';
import { formatCurrency, formatDate, getPaymentMethodLabel } from '../utils/formatters';

export default function PaymentsView({ user, cariler, onOpenAddPayment }) {
  const isAdmin = user?.role === 'admin';

  const [payments, setPayments] = useState([]);
  const [summary, setSummary] = useState({ total_collections: 0, total_payments: 0 });
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  // Filters
  const [type, setType] = useState('all');
  const [cariId, setCariId] = useState('');
  const [method, setMethod] = useState('');
  const [dateStart, setDateStart] = useState('');
  const [dateEnd, setDateEnd] = useState('');

  const loadPayments = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (type && type !== 'all') params.append('type', type);
      if (cariId) params.append('cari_id', cariId);
      if (method) params.append('payment_method', method);
      if (dateStart) params.append('date_start', dateStart);
      if (dateEnd) params.append('date_end', dateEnd);
      params.append('page', page);
      params.append('limit', 25);

      const res = await api.get(`/payments?${params.toString()}`);
      if (res.success) {
        setPayments(res.payments || []);
        setSummary(res.summary || { total_collections: 0, total_payments: 0 });
        setTotal(res.pagination?.total || 0);
        setTotalPages(res.pagination?.totalPages || 1);
      }
    } catch (err) {
      console.error('Payments error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPayments();
  }, [page, type, cariId, method, dateStart, dateEnd]);

  const handleDelete = async (p) => {
    if (!window.confirm(`${p.receipt_no} numaralı işlemi silmek ve cari hesap bakiyesini geri almak istediğinizden emin misiniz?`)) {
      return;
    }
    try {
      const res = await api.delete(`/payments/${p.id}`);
      if (res.success) {
        loadPayments();
      }
    } catch (err) {
      alert(err.message || 'Silinemedi.');
    }
  };

  return (
    <div>
      {/* 1. ÜST FİNANSAL AKIŞ KARTLARI */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px', marginBottom: '20px' }}>
        <div className="kpi-card success">
          <div className="kpi-header">
            <span>Toplam Tahsilat (Giriş)</span>
            <div className="kpi-icon-wrapper" style={{ backgroundColor: '#ecfdf5', color: '#059669' }}>
              <ArrowDownLeft size={18} />
            </div>
          </div>
          <div className="kpi-value text-positive">
            {formatCurrency(summary.total_collections)}
          </div>
          <div className="kpi-subtext">Müşterilerden alınan tahsilatlar</div>
        </div>

        <div className="kpi-card danger">
          <div className="kpi-header">
            <span>Toplam Yapılan Ödeme (Çıkış)</span>
            <div className="kpi-icon-wrapper" style={{ backgroundColor: '#fef2f2', color: '#dc2626' }}>
              <ArrowUpRight size={18} />
            </div>
          </div>
          <div className="kpi-value text-negative">
            {formatCurrency(summary.total_payments)}
          </div>
          <div className="kpi-subtext">Tedarikçilere ödenen tutarlar</div>
        </div>

        <div className="kpi-card info">
          <div className="kpi-header">
            <span>Net Finansal Akış</span>
            <div className="kpi-icon-wrapper" style={{ backgroundColor: '#f0f9ff', color: '#0284c7' }}>
              <Wallet size={18} />
            </div>
          </div>
          <div className="kpi-value" style={{ color: (summary.total_collections - summary.total_payments) >= 0 ? '#059669' : '#dc2626' }}>
            {formatCurrency(summary.total_collections - summary.total_payments)}
          </div>
          <div className="kpi-subtext">Tahsilat - Ödeme farkı</div>
        </div>
      </div>

      {/* 2. FİLTRE VE ARAMA ÇUBUĞU */}
      <div className="filter-bar">
        {/* İşlem Türü Filtresi */}
        <div style={{ minWidth: '150px' }}>
          <select
            className="select-box"
            value={type}
            onChange={(e) => { setType(e.target.value); setPage(1); }}
          >
            <option value="all">Tüm Hareketler</option>
            <option value="collection">Tahsilatlar (Para Girişi)</option>
            <option value="payment">Ödemeler (Para Çıkışı)</option>
          </select>
        </div>

        {/* Cari Filtresi */}
        <div style={{ minWidth: '180px' }}>
          <select
            className="select-box"
            value={cariId}
            onChange={(e) => { setCariId(e.target.value); setPage(1); }}
          >
            <option value="">Tüm Cariler</option>
            {cariler.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        {/* Ödeme Yöntemi */}
        <div style={{ minWidth: '140px' }}>
          <select
            className="select-box"
            value={method}
            onChange={(e) => { setMethod(e.target.value); setPage(1); }}
          >
            <option value="">Tüm Yöntemler</option>
            <option value="nakit">Nakit</option>
            <option value="havale_eft">Havale / EFT</option>
            <option value="kredi_karti">Kredi Kartı</option>
            <option value="diger">Diğer</option>
          </select>
        </div>

        {/* Tarih Aralığı */}
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          <input
            type="date"
            className="input-text input-no-icon"
            style={{ width: '135px' }}
            value={dateStart}
            onChange={(e) => { setDateStart(e.target.value); setPage(1); }}
          />
          <span style={{ color: '#94a3b8' }}>-</span>
          <input
            type="date"
            className="input-text input-no-icon"
            style={{ width: '135px' }}
            value={dateEnd}
            onChange={(e) => { setDateEnd(e.target.value); setPage(1); }}
          />
        </div>

        <button
          className="btn btn-primary"
          style={{ marginLeft: 'auto' }}
          onClick={onOpenAddPayment}
        >
          <Plus size={16} />
          <span>Yeni Tahsilat / Ödeme</span>
        </button>
      </div>

      {/* 3. TABLO */}
      <div className="card">
        <div className="card-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontWeight: 600, fontSize: '15px' }}>Tahsilat & Ödeme Hareketleri</span>
            <span style={{ fontSize: '12px', color: '#64748b' }}>({total} kayıt)</span>
          </div>
          <button className="btn-icon" onClick={loadPayments} title="Yenile">
            <RefreshCw size={16} />
          </button>
        </div>

        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Makbuz No</th>
                <th>Tarih</th>
                <th>İşlem Türü</th>
                <th>Cari Hesap</th>
                <th>Ödeme Yöntemi</th>
                <th>Açıklama</th>
                <th style={{ textAlign: 'right' }}>Tutar (₺)</th>
                <th style={{ textAlign: 'center', width: '60px' }}>İşlem</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>Yükleniyor...</td>
                </tr>
              ) : payments.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>Kayıt bulunamadı.</td>
                </tr>
              ) : (
                payments.map(p => {
                  const isCol = p.type === 'collection';
                  return (
                    <tr key={p.id}>
                      <td style={{ fontFamily: 'monospace', fontWeight: 600, color: '#2563eb' }}>
                        {p.receipt_no}
                      </td>
                      <td>{formatDate(p.date)}</td>
                      <td>
                        <span className={`badge ${isCol ? 'badge-success' : 'badge-danger'}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          {isCol ? <ArrowDownLeft size={13} /> : <ArrowUpRight size={13} />}
                          <span>{isCol ? 'Tahsilat (Giriş)' : 'Ödeme (Çıkış)'}</span>
                        </span>
                      </td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{p.cari_name}</div>
                        <div style={{ fontSize: '11px', color: '#64748b' }}>{p.cari_code}</div>
                      </td>
                      <td>{getPaymentMethodLabel(p.payment_method)}</td>
                      <td style={{ fontSize: '12.5px', color: '#475569' }}>{p.description || '-'}</td>
                      <td style={{
                        textAlign: 'right',
                        fontWeight: 700,
                        fontFamily: 'monospace',
                        fontSize: '14px',
                        color: isCol ? '#059669' : '#dc2626'
                      }}>
                        {isCol ? '+' : '-'}{formatCurrency(p.amount_cents)}
                      </td>
                      <td>
                        {isAdmin && (
                          <div style={{ display: 'flex', justifyContent: 'center' }}>
                            <button
                              className="btn-icon"
                              style={{ color: '#dc2626' }}
                              onClick={() => handleDelete(p)}
                              title="Sil (Cari Bakiyeyi Geri Alır)"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        )}
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
            <span>Toplam {total} işlemden {((page - 1) * 25) + 1} - {Math.min(page * 25, total)} arası</span>
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
