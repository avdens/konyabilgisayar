import React, { useState, useEffect } from 'react';
import { X, Check, Receipt, AlertCircle } from 'lucide-react';
import { api } from '../../utils/api';

export default function ExpenseModal({ isOpen, onClose, onSuccess }) {
  const [category, setCategory] = useState('Kira');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().substring(0, 10));
  const [paymentMethod, setPaymentMethod] = useState('nakit');
  const [description, setDescription] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setCategory('Kira');
      setAmount('');
      setDate(new Date().toISOString().substring(0, 10));
      setPaymentMethod('nakit');
      setDescription('');
      setError('');
    }
  }, [isOpen]);

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!amount || Number(amount) <= 0) {
      setError('Geçerli bir gider tutarı giriniz.');
      return;
    }

    try {
      setSubmitting(true);
      setError('');

      const payload = {
        category,
        amount: Number(amount),
        date,
        payment_method: paymentMethod,
        description
      };

      const res = await api.post('/expenses', payload);
      if (res.success) {
        onSuccess && onSuccess();
        onClose();
      }
    } catch (err) {
      setError(err.message || 'Gider kaydedilemedi.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '480px' }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ backgroundColor: '#fef2f2', color: '#dc2626', padding: '6px', borderRadius: '6px' }}>
              <Receipt size={20} />
            </div>
            <div>
              <h3 className="modal-title">İşletme Gideri / Masraf Ekle</h3>
              <span style={{ fontSize: '11px', color: '#64748b' }}>Net kâr raporundan otomatik olarak düşülür</span>
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

            <div className="form-group" style={{ marginBottom: '14px' }}>
              <label className="form-label">Masraf Kategorisi *</label>
              <select
                className="select-box"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                required
              >
                {categories.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Gider Tutarı (₺) *</label>
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
                  <option value="havale_eft">Havale / EFT</option>
                  <option value="kredi_karti">Kredi Kartı</option>
                  <option value="diger">Diğer</option>
                </select>
              </div>

              <div className="form-group form-full">
                <label className="form-label">Tarih</label>
                <input
                  type="date"
                  className="form-input"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>

              <div className="form-group form-full">
                <label className="form-label">Açıklama</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Örn: Aras Kargo kargo bedeli, dükkan temizlik malzemesi"
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
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              <Check size={16} />
              <span>{submitting ? 'Kaydediliyor...' : 'Masrafı Kaydet'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
