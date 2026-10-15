import React, { useState, useEffect } from 'react';
import { X, Printer, ArrowDownLeft, ArrowUpRight, Phone, MapPin, Building, CreditCard, RefreshCw } from 'lucide-react';
import { api } from '../../utils/api';
import { formatCurrency, formatDate, formatDateTime, getCariTypeLabel } from '../../utils/formatters';

export default function CariDetailModal({ cariId, isOpen, onClose, onQuickPayment }) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  const loadStatement = async () => {
    if (!cariId) return;
    try {
      setLoading(true);
      setError('');
      const res = await api.get(`/cariler/${cariId}/statement`);
      if (res.success) {
        setData(res);
      }
    } catch (err) {
      setError(err.message || 'Ekstre yüklenemedi.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && cariId) {
      loadStatement();
    }
  }, [isOpen, cariId]);

  if (!isOpen || !cariId) return null;

  const cari = data?.cari;
  const statement = data?.statement || [];
  const balance = data?.currentBalanceCents || 0;

  return (
    <div className="modal-overlay">
      <div className="modal-content modal-lg" style={{ maxHeight: '92vh' }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{
              fontFamily: 'monospace',
              fontSize: '13px',
              backgroundColor: '#eff6ff',
              color: '#2563eb',
              padding: '2px 8px',
              borderRadius: '4px',
              fontWeight: 600
            }}>
              {cari?.code}
            </span>
            <div>
              <h3 className="modal-title" style={{ fontSize: '16px' }}>{cari?.name}</h3>
              <span style={{ fontSize: '11px', color: '#64748b' }}>
                {getCariTypeLabel(cari?.type)} • Cari Hesap Ekstresi
              </span>
            </div>
          </div>
          <button className="btn-icon" onClick={onClose}><X size={20} /></button>
        </div>

        <div className="modal-body">
          {loading ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
              Ekstre hesaplanıyor...
            </div>
          ) : error ? (
            <div style={{ padding: '20px', color: '#dc2626', textAlign: 'center' }}>{error}</div>
          ) : (
            <div>
              {/* Cari Profil & Bakiye Özeti */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '12px',
                padding: '16px',
                backgroundColor: '#f8fafc',
                borderRadius: '8px',
                border: '1px solid #e2e8f0',
                marginBottom: '20px'
              }}>
                <div>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>İletişim & Konum</div>
                  <div style={{ fontWeight: 600, fontSize: '13px', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                    <Phone size={13} style={{ color: '#2563eb' }} />
                    <span>{cari?.phone || 'Telefon yok'}</span>
                  </div>
                  <div style={{ fontSize: '12px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                    <MapPin size={13} />
                    <span>{cari?.district ? `${cari.district} / ` : ''}{cari?.city || 'Konya'}</span>
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>Vergi Bilgileri</div>
                  <div style={{ fontWeight: 500, fontSize: '12.5px', marginTop: '2px' }}>
                    {cari?.tax_office || 'Şahıs / Bireysel'}
                  </div>
                  <div style={{ fontSize: '12px', color: '#64748b', fontFamily: 'monospace' }}>
                    {cari?.tc_vkn ? `VKN/TC: ${cari.tc_vkn}` : ''}
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase' }}>
                    Güncel Cari Bakiye
                  </div>
                  <div style={{
                    fontSize: '22px',
                    fontWeight: 700,
                    fontFamily: 'monospace',
                    color: balance > 0 ? '#059669' : balance < 0 ? '#dc2626' : '#64748b'
                  }}>
                    {formatCurrency(balance)}
                  </div>
                  <div style={{
                    fontSize: '11px',
                    fontWeight: 600,
                    color: balance > 0 ? '#059669' : balance < 0 ? '#dc2626' : '#64748b'
                  }}>
                    {balance > 0 ? '✓ Bizim Alacağımız Var' : balance < 0 ? '⚠ Bizim Borcumuz Var' : 'Hesap Kapalı (0 TL)'}
                  </div>
                </div>
              </div>

              {/* Hızlı Tahsilat / Ödeme Butonları */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <h4 style={{ fontSize: '14px', fontWeight: 600, color: '#0f172a' }}>
                  Kronolojik Hesap Hareketleri ({statement.length} İşlem)
                </h4>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    className="btn btn-success btn-sm"
                    onClick={() => { onClose(); onQuickPayment && onQuickPayment(cari.id, 'collection'); }}
                  >
                    <ArrowDownLeft size={14} />
                    <span>Tahsilat Yap</span>
                  </button>
                  <button
                    type="button"
                    className="btn btn-danger btn-sm"
                    onClick={() => { onClose(); onQuickPayment && onQuickPayment(cari.id, 'payment'); }}
                  >
                    <ArrowUpRight size={14} />
                    <span>Ödeme Yap</span>
                  </button>
                </div>
              </div>

              {/* Ekstre Tablosu */}
              <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Tarih</th>
                      <th>Belge / Fiş No</th>
                      <th>Açıklama</th>
                      <th style={{ textAlign: 'right' }}>Borç (₺)</th>
                      <th style={{ textAlign: 'right' }}>Alacak (₺)</th>
                      <th style={{ textAlign: 'right' }}>Bakiye (₺)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {statement.length === 0 ? (
                      <tr>
                        <td colSpan={6} style={{ textAlign: 'center', padding: '24px', color: '#94a3b8' }}>
                          Henüz hiçbir hareket kaydedilmemiş.
                        </td>
                      </tr>
                    ) : (
                      statement.map(item => (
                        <tr key={item.id}>
                          <td style={{ whiteSpace: 'nowrap' }}>{formatDate(item.date)}</td>
                          <td style={{ fontFamily: 'monospace', fontWeight: 600 }}>{item.document_no || '-'}</td>
                          <td style={{ fontSize: '12.5px' }}>{item.description}</td>
                          <td style={{ textAlign: 'right', fontFamily: 'monospace', color: item.debt_cents > 0 ? '#0f172a' : '#94a3b8' }}>
                            {item.debt_cents > 0 ? formatCurrency(item.debt_cents) : '-'}
                          </td>
                          <td style={{ textAlign: 'right', fontFamily: 'monospace', color: item.credit_cents > 0 ? '#0f172a' : '#94a3b8' }}>
                            {item.credit_cents > 0 ? formatCurrency(item.credit_cents) : '-'}
                          </td>
                          <td style={{
                            textAlign: 'right',
                            fontFamily: 'monospace',
                            fontWeight: 700,
                            color: item.running_balance_cents > 0 ? '#059669' : item.running_balance_cents < 0 ? '#dc2626' : '#64748b'
                          }}>
                            {formatCurrency(item.running_balance_cents)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        <div className="modal-footer" style={{ justifyContent: 'space-between' }}>
          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={() => window.print()}
          >
            <Printer size={15} />
            <span>Ekstreyi Yazdır (A4)</span>
          </button>

          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Kapat
          </button>
        </div>
      </div>
    </div>
  );
}
