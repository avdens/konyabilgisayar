import React, { useState, useEffect } from 'react';
import { X, Upload, Check, AlertCircle, Image as ImageIcon } from 'lucide-react';
import { api } from '../../utils/api';

export default function ProductModal({ product, categories, cariler, isOpen, onClose, onSuccess }) {
  const isEdit = !!product?.id;

  const [formData, setFormData] = useState({
    name: '',
    category_id: '',
    brand: '',
    model: '',
    serial_number: '',
    imei: '',
    condition: 'second_hand',
    cosmetic_grade: 'A Çok Temiz',
    specs: '',
    description: '',
    purchase_price: '',
    estimated_sale_price: '',
    purchase_date: new Date().toISOString().substring(0, 10),
    supplier_cari_id: '',
    status: 'in_stock',
    images: []
  });

  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name || '',
        category_id: product.category_id || (categories[0]?.id || ''),
        brand: product.brand || '',
        model: product.model || '',
        serial_number: product.serial_number || '',
        imei: product.imei || '',
        condition: product.condition || 'second_hand',
        cosmetic_grade: product.cosmetic_grade || 'A Çok Temiz',
        specs: product.specs || '',
        description: product.description || '',
        purchase_price: product.purchase_price_cents !== null ? (product.purchase_price_cents / 100) : '',
        estimated_sale_price: product.estimated_sale_price_cents !== null ? (product.estimated_sale_price_cents / 100) : '',
        purchase_date: product.purchase_date || new Date().toISOString().substring(0, 10),
        supplier_cari_id: product.supplier_cari_id || '',
        status: product.status || 'in_stock',
        images: product.images || []
      });
    } else {
      setFormData({
        name: '',
        category_id: categories[0]?.id || '',
        brand: '',
        model: '',
        serial_number: '',
        imei: '',
        condition: 'second_hand',
        cosmetic_grade: 'A Çok Temiz',
        specs: '',
        description: '',
        purchase_price: '',
        estimated_sale_price: '',
        purchase_date: new Date().toISOString().substring(0, 10),
        supplier_cari_id: '',
        status: 'in_stock',
        images: []
      });
    }
  }, [product, categories]);

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      setUploading(true);
      const data = new FormData();
      data.append('image', file);

      const res = await api.post('/products/upload', data);
      if (res.success && res.url) {
        setFormData(prev => ({
          ...prev,
          images: [...prev.images, res.url]
        }));
      }
    } catch (err) {
      alert('Görsel yüklenemedi: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  const removeImage = (index) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.category_id || !formData.brand || !formData.model) {
      setError('Ürün adı, kategori, marka ve model alanları zorunludur.');
      return;
    }

    try {
      setSubmitting(true);
      setError('');

      if (isEdit) {
        await api.put(`/products/${product.id}`, formData);
      } else {
        await api.post('/products', formData);
      }

      onSuccess && onSuccess();
      onClose();
    } catch (err) {
      setError(err.message || 'Ürün kaydedilirken hata oluştu.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content modal-lg">
        <div className="modal-header">
          <h3 className="modal-title">
            {isEdit ? 'Ürün Bilgilerini Düzenle' : 'Yeni Ürün Kartı Ekle'}
          </h3>
          <button className="btn-icon" onClick={onClose}><X size={20} /></button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
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
              {/* Ürün Adı */}
              <div className="form-group form-full">
                <label className="form-label">Ürün Tam Adı / Başlık *</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Örn: Apple MacBook Pro 16 M3 Max 36GB Space Black"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>

              {/* Kategori */}
              <div className="form-group">
                <label className="form-label">Kategori *</label>
                <select
                  className="select-box"
                  value={formData.category_id}
                  onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                  required
                >
                  <option value="">Kategori Seçin</option>
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              {/* Marka */}
              <div className="form-group">
                <label className="form-label">Marka *</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Örn: Apple, Asus, Sony, Samsung"
                  value={formData.brand}
                  onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                  required
                />
              </div>

              {/* Model */}
              <div className="form-group">
                <label className="form-label">Model *</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Örn: iPhone 15 Pro Max 256GB"
                  value={formData.model}
                  onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                  required
                />
              </div>

              {/* Durum (Sıfır / 2.El) */}
              <div className="form-group">
                <label className="form-label">Ürün Durumu</label>
                <select
                  className="select-box"
                  value={formData.condition}
                  onChange={(e) => setFormData({ ...formData, condition: e.target.value })}
                >
                  <option value="zero">Sıfır Cihaz</option>
                  <option value="second_hand">İkinci El</option>
                </select>
              </div>

              {/* Kozmetik Durum */}
              <div className="form-group">
                <label className="form-label">Kozmetik Durum</label>
                <select
                  className="select-box"
                  value={formData.cosmetic_grade}
                  onChange={(e) => setFormData({ ...formData, cosmetic_grade: e.target.value })}
                >
                  <option value="Sıfır Kapalı Kutu">Sıfır Kapalı Kutu</option>
                  <option value="A+ Kusursuz">A+ Kusursuz (Çiziksiz Sıfır Ayarında)</option>
                  <option value="A Çok Temiz">A Çok Temiz (Kılcal İz)</option>
                  <option value="B Kılcal Çizikler">B Kılcal Çizikler / Kullanım İzi</option>
                  <option value="C Belirgin Kullanım İzi">C Belirgin Kullanım İzi</option>
                  <option value="Parça / Arızalı">Parça / Arızalı (Yedek Parçalık)</option>
                </select>
              </div>

              {/* Seri No */}
              <div className="form-group">
                <label className="form-label">Seri Numarası (S/N)</label>
                <input
                  type="text"
                  className="form-input font-mono"
                  placeholder="Örn: C02G90J1MD6R"
                  value={formData.serial_number}
                  onChange={(e) => setFormData({ ...formData, serial_number: e.target.value })}
                />
              </div>

              {/* IMEI */}
              <div className="form-group">
                <label className="form-label">IMEI Numarası (Telefon / Tablet)</label>
                <input
                  type="text"
                  className="form-input font-mono"
                  placeholder="Örn: 356891234567891"
                  value={formData.imei}
                  onChange={(e) => setFormData({ ...formData, imei: e.target.value })}
                />
              </div>

              {/* Alış Fiyatı */}
              <div className="form-group">
                <label className="form-label">Alış Maliyeti (₺)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  className="form-input font-mono"
                  placeholder="0.00"
                  value={formData.purchase_price}
                  onChange={(e) => setFormData({ ...formData, purchase_price: e.target.value })}
                />
              </div>

              {/* Tahmini Satış Fiyatı */}
              <div className="form-group">
                <label className="form-label">Tahmini / Etiket Satış Fiyatı (₺)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  className="form-input font-mono"
                  placeholder="0.00"
                  value={formData.estimated_sale_price}
                  onChange={(e) => setFormData({ ...formData, estimated_sale_price: e.target.value })}
                />
              </div>

              {/* Alış Tarihi */}
              <div className="form-group">
                <label className="form-label">Alış Tarihi</label>
                <input
                  type="date"
                  className="form-input"
                  value={formData.purchase_date}
                  onChange={(e) => setFormData({ ...formData, purchase_date: e.target.value })}
                />
              </div>

              {/* Kimden Alındı (Tedarikçi / Cari) */}
              <div className="form-group">
                <label className="form-label">Tedarikçi / Alınan Kişi</label>
                <select
                  className="select-box"
                  value={formData.supplier_cari_id}
                  onChange={(e) => setFormData({ ...formData, supplier_cari_id: e.target.value })}
                >
                  <option value="">Cari Seçin (Opsiyonel)</option>
                  {cariler.map(c => (
                    <option key={c.id} value={c.id}>{c.name} ({c.code})</option>
                  ))}
                </select>
              </div>

              {/* Stok Durumu */}
              <div className="form-group">
                <label className="form-label">Stok Durumu</label>
                <select
                  className="select-box"
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                >
                  <option value="in_stock">Stokta (Satışa Hazır)</option>
                  <option value="reserved">Rezerve (Müşteri Bekletiyor)</option>
                  <option value="in_service">Serviste / Bakımda</option>
                  {isEdit && <option value="sold">Satıldı</option>}
                </select>
              </div>

              {/* Teknik Özellikler */}
              <div className="form-group form-full">
                <label className="form-label">Teknik Özellikler</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Örn: 32GB RAM, 1TB SSD, RTX 4070, Pil Sağlığı %98, Space Gray"
                  value={formData.specs}
                  onChange={(e) => setFormData({ ...formData, specs: e.target.value })}
                />
              </div>

              {/* Açıklama / Notlar */}
              <div className="form-group form-full">
                <label className="form-label">Açıklama / Ekspertiz Notu</label>
                <textarea
                  className="form-input"
                  rows={2}
                  placeholder="Kutu, fatura, garanti durumu, orijinal şarj aleti bilgisi vb."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>

              {/* Fotoğraf Yükleme */}
              <div className="form-group form-full">
                <label className="form-label">Ürün Fotoğrafları</label>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                  {formData.images.map((imgUrl, idx) => (
                    <div key={idx} style={{ position: 'relative', width: '64px', height: '64px', borderRadius: '6px', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
                      <img src={imgUrl} alt="Ürün" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      <button
                        type="button"
                        onClick={() => removeImage(idx)}
                        style={{
                          position: 'absolute',
                          top: '2px',
                          right: '2px',
                          backgroundColor: 'rgba(0,0,0,0.6)',
                          color: 'white',
                          borderRadius: '50%',
                          width: '18px',
                          height: '18px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '10px'
                        }}
                      >
                        ×
                      </button>
                    </div>
                  ))}

                  <label style={{
                    width: '64px',
                    height: '64px',
                    border: '2px dashed #cbd5e1',
                    borderRadius: '6px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#64748b',
                    cursor: 'pointer',
                    fontSize: '11px',
                    backgroundColor: '#f8fafc'
                  }}>
                    <Upload size={18} />
                    <span>{uploading ? '...' : '+ Ekle'}</span>
                    <input type="file" accept="image/*" onChange={handleImageUpload} style={{ display: 'none' }} disabled={uploading} />
                  </label>
                </div>
              </div>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Vazgeç
            </button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              <Check size={16} />
              <span>{submitting ? 'Kaydediliyor...' : (isEdit ? 'Değişiklikleri Kaydet' : 'Ürünü Kaydet')}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
