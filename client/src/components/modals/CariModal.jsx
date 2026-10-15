import React, { useState, useEffect } from 'react';
import { X, Check, Users, AlertCircle } from 'lucide-react';
import { api } from '../../utils/api';

export default function CariModal({ cari, isOpen, onClose, onSuccess }) {
  const isEdit = !!cari?.id;

  const [formData, setFormData] = useState({
    name: '',
    type: 'both',
    phone: '',
    email: '',
    tc_vkn: '',
    tax_office: '',
    city: 'Konya',
    district: '',
    address: '',
    notes: ''
  });

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (cari) {
      setFormData({
        name: cari.name || '',
        type: cari.type || 'both',
        phone: cari.phone || '',
        email: cari.email || '',
        tc_vkn: cari.tc_vkn || '',
        tax_office: cari.tax_office || '',
        city: cari.city || 'Konya',
        district: cari.district || '',
        address: cari.address || '',
        notes: cari.notes || ''
      });
    } else {
      setFormData({
        name: '',
        type: 'both',
        phone: '',
        email: '',
        tc_vkn: '',
        tax_office: '',
        city: 'Konya',
        district: '',
        address: '',
        notes: ''
      });
    }
  }, [cari]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setError('Cari Adı / Firma Ünvanı zorunludur.');
      return;
    }

    try {
      setSubmitting(true);
      setError('');

      if (isEdit) {
        await api.put(`/cariler/${cari.id}`, formData);
      } else {
        await api.post('/cariler', formData);
      }

      onSuccess && onSuccess();
      onClose();
    } catch (err) {
      setError(err.message || 'Cari kaydedilemedi.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '600px' }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ backgroundColor: '#eff6ff', color: '#2563eb', padding: '6px', borderRadius: '6px' }}>
              <Users size={20} />
            </div>
            <h3 className="modal-title">
              {isEdit ? 'Cari Hesap Bilgilerini Düzenle' : 'Yeni Cari Hesap Tanımla'}
            </h3>
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

            <div className="form-grid">
              <div className="form-group form-full">
                <label className="form-label">Cari Adı / Firma Ünvanı *</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Örn: Selçuk Bilişim Ltd. Şti. veya Ahmet Yılmaz"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Cari Tipi</label>
                <select
                  className="select-box"
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                >
                  <option value="both">Her İkisi (Müşteri & Tedarikçi)</option>
                  <option value="customer">Müşteri</option>
                  <option value="supplier">Tedarikçi</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Telefon Numarası</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="0 (5xx) xxx xx xx"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">TC Kimlik No / Vergi No</label>
                <input
                  type="text"
                  className="form-input font-mono"
                  placeholder="11 haneli TC veya 10 haneli VKN"
                  value={formData.tc_vkn}
                  onChange={(e) => setFormData({ ...formData, tc_vkn: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Vergi Dairesi</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Örn: Mevlana V.D."
                  value={formData.tax_office}
                  onChange={(e) => setFormData({ ...formData, tax_office: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Şehir</label>
                <input
                  type="text"
                  className="form-input"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">İlçe</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Örn: Meram, Selçuklu, Karatay"
                  value={formData.district}
                  onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                />
              </div>

              <div className="form-group form-full">
                <label className="form-label">Adres</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Cadde, sokak, kapı no..."
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                />
              </div>

              <div className="form-group form-full">
                <label className="form-label">Notlar</label>
                <textarea
                  className="form-input"
                  rows={2}
                  placeholder="Müşteri tercihleri, özel iskonto veya takas notları..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
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
              <span>{submitting ? 'Kaydediliyor...' : (isEdit ? 'Değişiklikleri Kaydet' : 'Cariyi Oluştur')}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
