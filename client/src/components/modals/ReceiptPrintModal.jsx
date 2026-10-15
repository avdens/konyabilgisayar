import React, { useState, useEffect } from 'react';
import { X, Printer, CheckCircle } from 'lucide-react';
import { api, getStoredSettings } from '../../utils/api';
import { formatCurrency, formatDate, formatDateTime, getPaymentMethodLabel } from '../../utils/formatters';

export default function ReceiptPrintModal({ saleId, isOpen, onClose }) {
  const [sale, setSale] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState(getStoredSettings() || {});

  useEffect(() => {
    async function loadSale() {
      if (!saleId) return;
      try {
        setLoading(true);
        const res = await api.get(`/sales/${saleId}`);
        if (res.success) {
          setSale(res.sale);
          setItems(res.items || []);
        }
      } catch (err) {
        console.error('Receipt load error:', err);
      } finally {
        setLoading(false);
      }
    }
    if (isOpen && saleId) {
      loadSale();
    }
  }, [isOpen, saleId]);

  if (!isOpen || !saleId) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content modal-lg" style={{ maxHeight: '95vh' }}>
        <div className="modal-header no-print">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Printer size={20} style={{ color: '#2563eb' }} />
            <h3 className="modal-title">Satış Fişi / Teslim Belgesi</h3>
          </div>
          <button className="btn-icon" onClick={onClose}><X size={20} /></button>
        </div>

        <div className="modal-body" style={{ backgroundColor: '#ffffff', padding: '30px' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>Yükleniyor...</div>
          ) : !sale ? (
            <div style={{ textAlign: 'center', color: '#dc2626' }}>Fiş bulunamadı.</div>
          ) : (
            <div className="printable-receipt">
              {/* Şirket Başlığı */}
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #0f172a', paddingBottom: '16px', marginBottom: '16px' }}>
                <div>
                  <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a', letterSpacing: '0.5px' }}>
                    {settings.company_name || 'KONYA BİLGİSAYAR'}
                  </h2>
                  <div style={{ fontSize: '12px', color: '#475569', marginTop: '2px' }}>
                    Sıfır & İkinci El Elektronik Alım-Satım & Teknik Destek
                  </div>
                  <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
                    {settings.address || 'Rampalı Çarşı No: 42 Meram / KONYA'}
                  </div>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>
                    Tel: {settings.phone || '0 (332) 350 42 42'} • {settings.tax_info || 'Mevlana V.D.'}
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '18px', fontWeight: 700, color: '#2563eb', fontFamily: 'monospace' }}>
                    {sale.invoice_no}
                  </div>
                  <div style={{ fontSize: '12px', color: '#475569', marginTop: '4px' }}>
                    Tarih: {formatDateTime(sale.created_at || sale.sale_date)}
                  </div>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>
                    Ödeme: {getPaymentMethodLabel(sale.payment_method)}
                  </div>
                </div>
              </div>

              {/* Müşteri Bilgileri */}
              <div style={{
                backgroundColor: '#f8fafc',
                padding: '12px 16px',
                borderRadius: '6px',
                border: '1px solid #e2e8f0',
                marginBottom: '20px',
                display: 'flex',
                justifyContent: 'space-between'
              }}>
                <div>
                  <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>Müşteri Bilgisi</div>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>{sale.cari_name}</div>
                  <div style={{ fontSize: '12px', color: '#475569' }}>{sale.cari_phone || 'Telefon kaydı yok'}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>Cari Durumu</div>
                  <div style={{ fontSize: '12px', color: '#0f172a' }}>
                    Güncel Bakiye: <strong style={{ fontFamily: 'monospace' }}>{formatCurrency(sale.cari_current_balance)}</strong>
                  </div>
                </div>
              </div>

              {/* Ürün Listesi Tablosu */}
              <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '20px', fontSize: '12.5px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f1f5f9', borderBottom: '1px solid #cbd5e1' }}>
                    <th style={{ padding: '8px 12px', textAlign: 'left' }}>Sıra</th>
                    <th style={{ padding: '8px 12px', textAlign: 'left' }}>Ürün / Cihaz Açıklaması</th>
                    <th style={{ padding: '8px 12px', textAlign: 'left' }}>Seri No / IMEI</th>
                    <th style={{ padding: '8px 12px', textAlign: 'left' }}>Durum</th>
                    <th style={{ padding: '8px 12px', textAlign: 'right' }}>Tutar</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, idx) => (
                    <tr key={item.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ padding: '8px 12px' }}>{idx + 1}</td>
                      <td style={{ padding: '8px 12px', fontWeight: 600 }}>
                        {item.product_name}
                        <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 'normal' }}>
                          {item.brand} - {item.model}
                        </div>
                      </td>
                      <td style={{ padding: '8px 12px', fontFamily: 'monospace', fontSize: '12px' }}>
                        {item.imei ? `IMEI: ${item.imei}` : item.serial_number ? `S/N: ${item.serial_number}` : item.product_code}
                      </td>
                      <td style={{ padding: '8px 12px' }}>
                        {item.condition === 'zero' ? 'Sıfır' : '2. El'} ({item.cosmetic_grade || '-'})
                      </td>
                      <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 700, fontFamily: 'monospace' }}>
                        {formatCurrency(item.sale_price_cents)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Toplam ve Ödeme Özeti */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '24px' }}>
                <div style={{ width: '280px', display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748b' }}>Ara Toplam:</span>
                    <span style={{ fontWeight: 600, fontFamily: 'monospace' }}>{formatCurrency(sale.total_amount_cents)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#059669' }}>
                    <span>Tahsil Edilen ({getPaymentMethodLabel(sale.payment_method)}):</span>
                    <span style={{ fontWeight: 700, fontFamily: 'monospace' }}>{formatCurrency(sale.collected_amount_cents)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #cbd5e1', paddingTop: '6px' }}>
                    <span style={{ fontWeight: 700 }}>Kalan Borç (Cari):</span>
                    <span style={{
                      fontWeight: 800,
                      fontFamily: 'monospace',
                      fontSize: '15px',
                      color: sale.remaining_amount_cents > 0 ? '#dc2626' : '#059669'
                    }}>
                      {formatCurrency(sale.remaining_amount_cents)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Garanti Şartları & Not */}
              <div style={{
                border: '1px dashed #cbd5e1',
                padding: '12px',
                borderRadius: '6px',
                fontSize: '11px',
                color: '#475569',
                lineHeight: '1.4',
                marginBottom: '30px'
              }}>
                <strong>GARANTİ VE TESLİM ŞARTLARI:</strong><br />
                {settings.receipt_footer || 'Ürünlerimiz kontrolleri yapılmış olarak teslim edilmiştir. İkinci el ürünler 1 ay Konya Bilgisayar garanti kapsamındadır. Sıfır kapalı kutu ürünlerde distribütör garanti koşulları geçerlidir. Sıvı teması, kırılma ve kullanıcı kaynaklı arızalar garanti kapsamı dışındadır.'}
              </div>

              {/* İmza Alanı */}
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0 30px' }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '12px', fontWeight: 600 }}>Teslim Eden</div>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>KONYA BİLGİSAYAR</div>
                  <div style={{ height: '50px' }}></div>
                  <div style={{ borderTop: '1px solid #94a3b8', width: '150px', fontSize: '11px' }}>İmza / Kaşe</div>
                </div>

                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '12px', fontWeight: 600 }}>Teslim Alan (Müşteri)</div>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>{sale.cari_name}</div>
                  <div style={{ height: '50px' }}></div>
                  <div style={{ borderTop: '1px solid #94a3b8', width: '150px', fontSize: '11px' }}>İmza</div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="modal-footer no-print" style={{ justifyContent: 'space-between' }}>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => window.print()}
          >
            <Printer size={16} />
            <span>Yazdır (A4 / Fiş)</span>
          </button>

          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Kapat
          </button>
        </div>
      </div>
    </div>
  );
}
