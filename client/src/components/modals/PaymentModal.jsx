import React, { useState, useEffect } from 'react';
import { X, Check, CreditCard, ArrowDownLeft, ArrowUpRight, AlertCircle } from 'lucide-react';
import { api } from '../../utils/api';
import { formatCurrency } from '../../utils/formatters';

export default function PaymentModal({ defaultCariId, defaultType, cariler, isOpen, onClose, onSuccess }) {
  const [type, setType] = useState(defaultType || 'collection'); // 'collection' or 'payment'
  const [selectedCariId, setSelectedCariId] = useState(defaultCariId || '');
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('nakit');
  const [date, setDate] = useState(new Date().toISOString().substring(0, 10));
  const [description, setDescription] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setSelectedCariId(defaultCariId || '');
      setType(defaultType || 'collection');
      setAmount('');
      setPaymentMethod('nakit');
      setDate(new Date().toISOString().substring(0, 10));
      setDescription('');
      setError('');
    }
  }, [isOpen, defaultCariId, defaultType]);

  const selectedCari = cariler.find(c => String(c.id) === String(selectedCariId));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedCariId) {
      setError('Lütfen ilgili cari hesabı seçiniz.');
      return;
    }

    if (!amount || Number(amount) <= 0) {
      setError('Geçerli bir tutar giriniz.');
      return;
    }

    try {
      setSubmitting(true);
      setError('');

      const payload = {
        cari_id: selectedCariId,
        type,
        amount: Number(amount),
        payment_method: paymentMethod,
        date,
        description
      };

      const res = await api.post('/payments', payload);
      if (res.success) {
        onSuccess && onSuccess();
        onClose();
      }
    } catch (err) {
      setError(err.message || 'İşlem kaydedilemedi.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '520px' }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{
              backgroundColor: type === 'collection' ? '#ecfdf5' : '#fef2f2',
              color: type === 'collection' ? '#059669' : '#dc2626',
              padding: '6px',
              borderRadius: '6px'
            }}>
              {type === 'collection' ? <ArrowDownLeft size={20} /> : <ArrowUpRight size={20} />}
            </div>
            <div>
              <h3 className="modal-title">
                {type === 'collection' ? 'Tahsilat Al (Para Girişi)' : 'Ödeme Yap (Para Çıkışı)'}
              </h3>
              <span style={{ fontSize: '11px', color: '#64748b' }}>Cari hesaba işlenir ve bakiye anında güncellenir</span>
            </div>
          </div>
          <button className="btn-icon" onClick={onClose}><X size={20} /></button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && (
              <div style={{
                backgroundColor: '#fef2f2',
                border: '1px solid #fecaca',
                color: '#dc2626',
                borderRadius: '6px',
                padding: '10px 14px',
                fontSize: '13px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginBottom: '16px'
              }}>
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
            )}

            {/* İşlem Türü Seçici (Tabs) */}
            <div style={{
              display: 'flex',
              gap: '8px',
              backgroundColor: '#f1f5f9',
              padding: '4px',
              borderRadius: '8px',
              marginBottom: '16px'
            }}>
              <button
                type="button"
                onClick={() => setType('collection')}
                style={{
                  flex: 1,
                  padding: '8px',
                  borderRadius: '6px',
                  fontWeight: 600,
                  fontSize: '13px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  backgroundColor: type === 'collection' ? '#ffffff' : 'transparent',
                  color: type === 'collection' ? '#059669' : '#64748b',
                  boxShadow: type === 'collection' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                  transition: 'all 0.15s'
                }}
              >
                <ArrowDownLeft size={16} />
                <span>Tahsilat Al (Giriş)</span>
              </button>

              <button
                type="button"
                onClick={() => setType('payment')}
                style={{
                  flex: 1,
                  padding: '8px',
                  borderRadius: '6px',
                  fontWeight: 600,
                  fontSize: '13px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  backgroundColor: type === 'payment' ? '#ffffff' : 'transparent',
                  color: type === 'payment' ? '#dc2626' : '#64748b',
                  boxShadow: type === 'payment' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                  transition: 'all 0.15s'
                }}
              >
                <ArrowUpRight size={16} />
                <span>Ödeme Yap (Çıkış)</span>
              </button>
            </div>

            <div className="form-group" style={{ marginBottom: '14px' }}>
              <label className="form-label">Cari Hesap (Müşteri veya Tedarikçi) *</label>
              <select
                className="select-box"
                value={selectedCariId}
                onChange={(e) => setSelectedCariId(e.target.value)}
                required
              >
                <option value="">-- Cari Hesap Seçiniz --</option>
                {cariler.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.code}) - {c.phone || c.city}
                  </option>
                ))}
              </select>
            </div>

            {/* Seçili Cari Bakiye Bilgisi */}
            {selectedCari && (
              <div style={{
                padding: '10px 14px',
                backgroundColor: '#f8fafc',
                borderRadius: '6px',
                border: '1px solid #e2e8f0',
                marginBottom: '14px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontSize: '12.5px'
              }}>
                <span style={{ color: '#64748b' }}>Mevcut Cari Bakiye:</span>
                <span style={{
                  fontWeight: 700,
                  fontFamily: 'monospace',
                  color: selectedCari.balance_cents > 0 ? '#059669' : selectedCari.balance_cents < 0 ? '#dc2626' : '#64748b'
                }}>
                  {formatCurrency(selectedCari.balance_cents)} {selectedCari.balance_cents > 0 ? '(Alacağımız)' : selectedCari.balance_cents < 0 ? '(Borcumuz)' : '(Kapalı)'}
                </span>
              </div>
            )}

            <div className="form-grid" style={{ marginBottom: '14px' }}>
              <div className="form-group">
                <label className="form-label">Tutar (₺) *</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  className="form-input font-mono"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Ödeme Yöntemi</label>
                <select
                  className="select-box"
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                >
                  <option value="nakit">Nakit</option>
                  <option value="havale_eft">Banka Havale / EFT</option>
                  <option value="kredi_karti">Kredi Kartı / POS</option>
                  <option value="diger">Diğer</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Tarih</label>
                <input
                  type="date"
                  className="form-input"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Açıklama</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Örn: Ara ödeme, elden teslim"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Vazgeç
            </button>
            <button
              type="submit"
              className={`btn ${type === 'collection' ? 'btn-success' : 'btn-danger'}`}
              disabled={submitting}
            >
              <Check size={16} />
              <span>{submitting ? 'İşleniyor...' : (type === 'collection' ? 'Tahsilatı Onayla' : 'Ödemeyi Onayla')}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
