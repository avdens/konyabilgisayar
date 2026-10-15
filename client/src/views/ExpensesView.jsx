import React, { useState, useEffect } from 'react';
import {
  Receipt,
  Plus,
  Search,
  Trash2,
  RefreshCw,
  PieChart,
  Calendar,
  Layers
} from 'lucide-react';
import { api } from '../utils/api';
import { formatCurrency, formatDate, getPaymentMethodLabel } from '../utils/formatters';

export default function ExpensesView({ user, onOpenAddExpense }) {
  const isAdmin = user?.role === 'admin';

  const [expenses, setExpenses] = useState([]);
  const [summary, setSummary] = useState({ totalAmountCents: 0, categoryBreakdown: [] });
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  // Filters
  const [category, setCategory] = useState('all');
  const [search, setSearch] = useState('');
  const [dateStart, setDateStart] = useState('');
  const [dateEnd, setDateEnd] = useState('');

  const loadExpenses = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (category && category !== 'all') params.append('category', category);
      if (search) params.append('search', search);
      if (dateStart) params.append('date_start', dateStart);
      if (dateEnd) params.append('date_end', dateEnd);
      params.append('page', page);
      params.append('limit', 25);

      const res = await api.get(`/expenses?${params.toString()}`);
      if (res.success) {
        setExpenses(res.expenses || []);
        setSummary(res.summary || { totalAmountCents: 0, categoryBreakdown: [] });
        setTotal(res.pagination?.total || 0);
        setTotalPages(res.pagination?.totalPages || 1);
      }
    } catch (err) {
      console.error('Expenses error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadExpenses();
  }, [page, category, dateStart, dateEnd]);

  const handleDelete = async (e) => {
    if (!window.confirm(`${e.expense_no} numaralı masraf kaydını silmek istediğinize emin misiniz?`)) {
      return;
    }
    try {
      const res = await api.delete(`/expenses/${e.id}`);
      if (res.success) {
        loadExpenses();
      }
    } catch (err) {
      alert(err.message || 'Masraf silinemedi.');
    }
  };

  const categories = [
    'Kira',
    'Kargo',
    'Tamir & Bakım',
    'Komisyon',
    'Personel / Avans',
    'Elektrik / Aidat',
    'Yol / Ulaşım',
    'İkram & Temizlik',
    'Diğer'
  ];

  return (
    <div>
      {/* 1. ÜST MASRAF ÖZETİ VE KATEGORİ DAĞILIMI */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '20px', marginBottom: '20px' }}>
        <div className="kpi-card danger">
          <div className="kpi-header">
            <span>Filtrelenen Dönem Giderleri</span>
            <div className="kpi-icon-wrapper" style={{ backgroundColor: '#fef2f2', color: '#dc2626' }}>
              <Receipt size={18} />
            </div>
          </div>
          <div className="kpi-value text-negative">
            {formatCurrency(summary.totalAmountCents)}
          </div>
          <div className="kpi-subtext">Net kârdan düşülen toplam masraf</div>
        </div>

        {/* Kategori Bazında Masraf İlerleme Çubukları */}
        <div className="card" style={{ marginBottom: 0 }}>
          <div className="card-header" style={{ padding: '10px 16px' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Layers size={15} style={{ color: '#2563eb' }} />
              <span>Gider Kategorisi Dağılımı</span>
            </span>
          </div>
          <div className="card-body" style={{ padding: '12px 16px', maxHeight: '110px', overflowY: 'auto' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px' }}>
              {summary.categoryBreakdown.map((cat, idx) => {
                const total = summary.totalAmountCents || 1;
                const pct = Math.round((cat.total_amount / total) * 100);
                return (
                  <div key={idx} style={{ backgroundColor: '#f8fafc', padding: '6px 10px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 600 }}>
                      <span>{cat.category}</span>
                      <span style={{ color: '#dc2626' }}>{formatCurrency(cat.total_amount)} ({pct}%)</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* 2. FİLTRE VE ARAMA ÇUBUĞU */}
      <div className="filter-bar">
        <div className="search-input-box" style={{ flex: 1, minWidth: '220px' }}>
          <Search size={16} className="search-icon" />
          <input
            type="text"
            className="input-text"
            placeholder="Fiş No veya Açıklama ara..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && loadExpenses()}
          />
        </div>

        <div style={{ minWidth: '160px' }}>
          <select
            className="select-box"
            value={category}
            onChange={(e) => { setCategory(e.target.value); setPage(1); }}
          >
            <option value="all">Tüm Kategoriler</option>
            {categories.map(c => (
              <option key={c} value={c}>{c}</option>
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
          onClick={onOpenAddExpense}
        >
          <Plus size={16} />
          <span>Yeni Masraf Ekle</span>
        </button>
      </div>

      {/* 3. MASRAF TABLOSU */}
      <div className="card">
        <div className="card-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontWeight: 600, fontSize: '15px' }}>Masraf / Gider Kayıtları</span>
            <span style={{ fontSize: '12px', color: '#64748b' }}>({total} kayıt)</span>
          </div>
          <button className="btn-icon" onClick={loadExpenses} title="Yenile">
            <RefreshCw size={16} />
          </button>
        </div>

        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Fiş No</th>
                <th>Tarih</th>
                <th>Kategori</th>
                <th>Ödeme Şekli</th>
                <th>Açıklama</th>
                <th style={{ textAlign: 'right' }}>Gider Tutarı (₺)</th>
                <th style={{ textAlign: 'center', width: '60px' }}>İşlem</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>Yükleniyor...</td>
                </tr>
              ) : expenses.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>Masraf kaydı bulunamadı.</td>
                </tr>
              ) : (
                expenses.map(e => (
                  <tr key={e.id}>
                    <td style={{ fontFamily: 'monospace', fontWeight: 600, color: '#2563eb' }}>
                      {e.expense_no}
                    </td>
                    <td>{formatDate(e.date)}</td>
                    <td>
                      <span className="badge badge-warning" style={{ fontSize: '11.5px' }}>
                        {e.category}
                      </span>
                    </td>
                    <td>{getPaymentMethodLabel(e.payment_method)}</td>
                    <td style={{ fontSize: '12.5px', color: '#334155' }}>{e.description || '-'}</td>
                    <td style={{
                      textAlign: 'right',
                      fontWeight: 700,
                      fontFamily: 'monospace',
                      fontSize: '14px',
                      color: '#dc2626'
                    }}>
                      -{formatCurrency(e.amount_cents)}
                    </td>
                    <td>
                      {isAdmin && (
                        <div style={{ display: 'flex', justifyContent: 'center' }}>
                          <button
                            className="btn-icon"
                            style={{ color: '#dc2626' }}
                            onClick={() => handleDelete(e)}
                            title="Sil"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="pagination-wrapper">
            <span>Toplam {total} masraftan {((page - 1) * 25) + 1} - {Math.min(page * 25, total)} arası</span>
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
