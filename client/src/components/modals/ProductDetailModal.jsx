import React from 'react';
import { X, Edit2, TrendingUp, Tag, Shield, Calendar, User, Phone, CheckCircle2 } from 'lucide-react';
import { formatCurrency, formatDate, getProductStatusInfo, getProductConditionInfo } from '../../utils/formatters';

export default function ProductDetailModal({ product, isOpen, onClose, onEdit, onSell, isAdmin }) {
  if (!isOpen || !product) return null;

  const status = getProductStatusInfo(product.status);
  const condition = getProductConditionInfo(product.condition);

  return (
    <div className="modal-overlay">
      <div className="modal-content modal-lg">
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
              {product.product_code}
            </span>
            <h3 className="modal-title" style={{ fontSize: '16px' }}>{product.name}</h3>
          </div>
          <button className="btn-icon" onClick={onClose}><X size={20} /></button>
        </div>

        <div className="modal-body">
          {/* Üst Özet Barı */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '14px 18px',
            backgroundColor: '#f8fafc',
            borderRadius: '8px',
            border: '1px solid #e2e8f0',
            marginBottom: '20px'
          }}>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <span className={`badge ${status.className}`} style={{ fontSize: '13px', padding: '4px 10px' }}>
                {status.label}
              </span>
              <span className={`badge ${condition.className}`} style={{ fontSize: '13px', padding: '4px 10px' }}>
                {condition.label}
              </span>
              {product.cosmetic_grade && (
                <span style={{ fontSize: '12.5px', color: '#475569', fontWeight: 500, backgroundColor: '#f1f5f9', padding: '4px 8px', borderRadius: '4px' }}>
                  {product.cosmetic_grade}
                </span>
              )}
            </div>

            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase' }}>Etiket / Satış Fiyatı</div>
              <div style={{ fontSize: '20px', fontWeight: 700, color: '#2563eb', fontFamily: 'monospace' }}>
                {formatCurrency(product.estimated_sale_price_cents)}
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '20px' }}>
            {/* Sol Taraf: Cihaz Kimlik & Teknik Detaylar */}
            <div>
              <h4 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px', color: '#0f172a', borderBottom: '1px solid #e2e8f0', paddingBottom: '6px' }}>
                Cihaz Kimlik & Donanım Bilgileri
              </h4>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>Kategori:</span>
                  <span style={{ fontWeight: 600 }}>{product.category_name}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>Marka / Model:</span>
                  <span style={{ fontWeight: 600 }}>{product.brand} - {product.model}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>Seri No:</span>
                  <span style={{ fontWeight: 600, fontFamily: 'monospace' }}>{product.serial_number || 'Belirtilmemiş'}</span>
                </div>
                {product.imei && (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748b' }}>IMEI:</span>
                    <span style={{ fontWeight: 600, fontFamily: 'monospace', color: '#2563eb' }}>{product.imei}</span>
                  </div>
                )}
                {product.specs && (
                  <div style={{ marginTop: '6px', backgroundColor: '#f1f5f9', padding: '10px', borderRadius: '6px' }}>
                    <span style={{ display: 'block', fontSize: '11px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', marginBottom: '2px' }}>
                      Teknik Özellikler:
                    </span>
                    <span style={{ color: '#1e293b' }}>{product.specs}</span>
                  </div>
                )}
                {product.description && (
                  <div style={{ marginTop: '6px', backgroundColor: '#fffbeb', border: '1px solid #fde68a', padding: '10px', borderRadius: '6px' }}>
                    <span style={{ display: 'block', fontSize: '11px', color: '#b45309', fontWeight: 600, textTransform: 'uppercase', marginBottom: '2px' }}>
                      Ekspertiz / Durum Notu:
                    </span>
                    <span style={{ color: '#78350f' }}>{product.description}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Sağ Taraf: Alış, Satış ve Tedarikçi Bilgileri */}
            <div>
              <h4 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px', color: '#0f172a', borderBottom: '1px solid #e2e8f0', paddingBottom: '6px' }}>
                Giriş / Alış Bilgileri
              </h4>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>Alış Tarihi:</span>
                  <span style={{ fontWeight: 600 }}>{formatDate(product.purchase_date)}</span>
                </div>
                {isAdmin && (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748b' }}>Alış Maliyeti:</span>
                    <span style={{ fontWeight: 600, fontFamily: 'monospace', color: '#059669' }}>
                      {formatCurrency(product.purchase_price_cents)}
                    </span>
                  </div>
                )}
                {product.supplier_name && (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748b' }}>Tedarikçi / Alınan Kişi:</span>
                    <span style={{ fontWeight: 600 }}>{product.supplier_name}</span>
                  </div>
                )}

                {/* Eğer Satıldıysa Satış Detayları */}
                {product.status === 'sold' && (
                  <div style={{
                    marginTop: '12px',
                    padding: '12px',
                    backgroundColor: '#ecfdf5',
                    border: '1px solid #a7f3d0',
                    borderRadius: '8px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#047857', fontWeight: 600, fontSize: '13px', marginBottom: '6px' }}>
                      <CheckCircle2 size={16} />
                      <span>Bu Ürün Satılmıştır</span>
                    </div>
                    <div style={{ fontSize: '12.5px', color: '#065f46', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <div><strong>Satılan Müşteri:</strong> {product.sold_customer_name || 'Bilinmiyor'}</div>
                      <div><strong>Satış Tarihi:</strong> {formatDate(product.sold_at)}</div>
                      <div><strong>Satış Fiyatı:</strong> {formatCurrency(product.sold_price_cents)}</div>
                      {isAdmin && (
                        <div><strong>Elde Edilen Brüt Kâr:</strong> {formatCurrency(product.sold_price_cents - product.purchase_price_cents)}</div>
                      )}
                    </div>
                  </div>
                )}

                {/* Fotoğraflar */}
                {product.images && product.images.length > 0 && (
                  <div style={{ marginTop: '16px' }}>
                    <span style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '8px' }}>
                      Ürün Fotoğrafları ({product.images.length})
                    </span>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      {product.images.map((img, i) => (
                        <a key={i} href={img} target="_blank" rel="noreferrer">
                          <img
                            src={img}
                            alt="Cihaz"
                            style={{ width: '60px', height: '60px', objectFit: 'cover', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                          />
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="modal-footer" style={{ justifyContent: 'space-between' }}>
          <div>
            {product.status === 'in_stock' && (
              <button
                type="button"
                className="btn btn-success"
                onClick={() => { onClose(); onSell && onSell(product); }}
              >
                <TrendingUp size={16} />
                <span>Bu Cihazı Sat (Hızlı Satış)</span>
              </button>
            )}
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Kapat
            </button>
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => { onClose(); onEdit && onEdit(product); }}
            >
              <Edit2 size={15} />
              <span>Düzenle</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
