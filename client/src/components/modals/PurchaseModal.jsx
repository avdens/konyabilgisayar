import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, Check, ShoppingBag, AlertCircle, UserPlus } from 'lucide-react';
import { api } from '../../utils/api';
import { formatCurrency } from '../../utils/formatters';

export default function PurchaseModal({ cariler, categories, isOpen, onClose, onSuccess }) {
  const [selectedCariId, setSelectedCariId] = useState('');
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().substring(0, 10));
  const [paymentMethod, setPaymentMethod] = useState('nakit');
  const [paidAmount, setPaidAmount] = useState('');
  const [notes, setNotes] = useState('');

  // Quick New Supplier / Customer
  const [showNewCari, setShowNewCari] = useState(false);
  const [newCariName, setNewCariName] = useState('');
  const [newCariPhone, setNewCariPhone] = useState('');

  // Items to purchase: array of objects
  const [items, setItems] = useState([
    {
      name: '',
      category_id: categories[0]?.id || '',
      brand: '',
      model: '',
      serial_number: '',
      imei: '',
      condition: 'second_hand',
      cosmetic_grade: 'A Çok Temiz',
      specs: '',
      purchase_price: '',
      estimated_sale_price: ''
    }
  ]);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedCariId('');
      setPurchaseDate(new Date().toISOString().substring(0, 10));
      setPaymentMethod('nakit');
      setPaidAmount('');
      setNotes('');
      setShowNewCari(false);
      setNewCariName('');
      setNewCariPhone('');
      setItems([
        {
          name: '',
          category_id: categories[0]?.id || '',
          brand: '',
          model: '',
          serial_number: '',
          imei: '',
          condition: 'second_hand',
          cosmetic_grade: 'A Çok Temiz',
          specs: '',
          purchase_price: '',
          estimated_sale_price: ''
        }
      ]);
      setError('');
    }
  }, [isOpen, categories]);

  const handleAddItem = () => {
    setItems([
      ...items,
      {
        name: '',
        category_id: categories[0]?.id || '',
        brand: '',
        model: '',
        serial_number: '',
        imei: '',
        condition: 'second_hand',
        cosmetic_grade: 'A Çok Temiz',
        specs: '',
        purchase_price: '',
        estimated_sale_price: ''
      }
    ]);
  };

  const handleRemoveItem = (index) => {
    if (items.length <= 1) return;
    setItems(items.filter((_, i) => i !== index));
  };

  const handleItemChange = (index, field, value) => {
    const updated = [...items];
    updated[index][field] = value;
    
    // Auto-generate name from brand and model if name is empty or matches previous brand+model
    if (field === 'brand' || field === 'model') {
      const b = field === 'brand' ? value : updated[index].brand;
      const m = field === 'model' ? value : updated[index].model;
      if (b && m && (!updated[index].name || updated[index].name.startsWith(b))) {
        updated[index].name = `${b} ${m}`.trim();
      }
    }

    setItems(updated);
  };

  const totalCost = items.reduce((sum, item) => sum + (Number(item.purchase_price) || 0), 0);
  const paid = Number(paidAmount) || 0;
  const remainingDebt = Math.max(0, totalCost - paid);

  const handleCreateCari = async () => {
    if (!newCariName.trim()) return;
    try {
      const res = await api.post('/cariler', {
        name: newCariName.trim(),
        phone: newCariPhone.trim(),
        type: 'both'
      });
      if (res.success) {
        setSelectedCariId(res.cariId);
        setShowNewCari(false);
        setNewCariName('');
        setNewCariPhone('');
        onSuccess && onSuccess();
      }
    } catch (err) {
      alert('Cari oluşturulamadı: ' + err.message);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedCariId) {
      setError('Lütfen ürünün alındığı tedarikçiyi veya kişiyi seçiniz.');
      return;
    }

    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      if (!it.name || !it.category_id || !it.brand || !it.model || !it.purchase_price) {
        setError(`${i + 1}. sıradaki ürünün adı, kategori, marka, model ve alış fiyatı zorunludur.`);
        return;
      }
    }

    try {
      setSubmitting(true);
      setError('');

      const payload = {
        cari_id: selectedCariId,
        purchase_date: purchaseDate,
        payment_method: paymentMethod,
        paid_amount: paid,
        notes,
        items
      };

      const res = await api.post('/purchases', payload);
      if (res.success) {
        onSuccess && onSuccess();
        onClose();
      }
    } catch (err) {
      setError(err.message || 'Alış işlemi kaydedilemedi.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content modal-lg">
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ backgroundColor: '#eff6ff', color: '#2563eb', padding: '6px', borderRadius: '6px' }}>
              <ShoppingBag size={20} />
            </div>
            <div>
              <h3 className="modal-title">Ürün Alışı / Stok Girişi</h3>
              <span style={{ fontSize: '11px', color: '#64748b' }}>Tedarikçi veya müşteriden cihaz alımı ve cari borçlandırma</span>
            </div>
          </div>
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

            {/* Tedarikçi / Cari Seçimi */}
            <div style={{
              backgroundColor: '#f8fafc',
              border: '1px solid #e2e8f0',
              padding: '14px',
              borderRadius: '8px',
              marginBottom: '16px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <label className="form-label">Tedarikçi / Cihazı Satan Kişi *</label>
                <button
                  type="button"
                  style={{ color: '#2563eb', fontSize: '12px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}
                  onClick={() => setShowNewCari(!showNewCari)}
                >
                  <UserPlus size={14} />
                  <span>{showNewCari ? 'Listeden Seç' : '+ Yeni Tedarikçi / Cari Ekle'}</span>
                </button>
              </div>

              {showNewCari ? (
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Ad Soyad veya Firma Ünvanı *"
                    value={newCariName}
                    onChange={(e) => setNewCariName(e.target.value)}
                    style={{ flex: 1.5 }}
                  />
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Telefon Numarası"
                    value={newCariPhone}
                    onChange={(e) => setNewCariPhone(e.target.value)}
                    style={{ flex: 1 }}
                  />
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={handleCreateCari}
                  >
                    Kaydet & Seç
                  </button>
                </div>
              ) : (
                <select
                  className="select-box"
                  value={selectedCariId}
                  onChange={(e) => setSelectedCariId(e.target.value)}
                  required
                >
                  <option value="">-- Tedarikçi veya Cari Seçin --</option>
                  {cariler.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.type === 'supplier' ? 'Tedarikçi' : c.type === 'customer' ? 'Müşteri' : 'Her İkisi'}) - {c.phone || c.city}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Alınan Ürünler Listesi */}
            <div style={{ marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a' }}>
                  Alınan Ürünler ({items.length} Kalem)
                </span>
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  onClick={handleAddItem}
                >
                  <Plus size={14} />
                  <span>+ Başka Ürün Ekle</span>
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {items.map((item, index) => (
                  <div
                    key={index}
                    style={{
                      border: '1px solid #cbd5e1',
                      borderRadius: '8px',
                      padding: '14px',
                      backgroundColor: '#ffffff',
                      position: 'relative'
                    }}
                  >
                    {items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(index)}
                        style={{
                          position: 'absolute',
                          top: '10px',
                          right: '10px',
                          color: '#dc2626'
                        }}
                        title="Bu Ürünü Kaldır"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}

                    <div style={{ fontSize: '12px', fontWeight: 700, color: '#2563eb', marginBottom: '8px' }}>
                      {index + 1}. Ürün Kartı
                    </div>

                    <div className="form-grid">
                      <div className="form-group form-full">
                        <label className="form-label">Ürün Tam Adı *</label>
                        <input
                          type="text"
                          className="form-input"
                          placeholder="Örn: Apple iPhone 15 Pro 128GB Naturel Titanyum"
                          value={item.name}
                          onChange={(e) => handleItemChange(index, 'name', e.target.value)}
                          required
                        />
                      </div>

                      <div className="form-group">
                        <label className="form-label">Kategori *</label>
                        <select
                          className="select-box"
                          value={item.category_id}
                          onChange={(e) => handleItemChange(index, 'category_id', e.target.value)}
                          required
                        >
                          {categories.map(c => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                          ))}
                        </select>
                      </div>

                      <div className="form-group">
                        <label className="form-label">Durum</label>
                        <select
                          className="select-box"
                          value={item.condition}
                          onChange={(e) => handleItemChange(index, 'condition', e.target.value)}
                        >
                          <option value="zero">Sıfır Kapalı Kutu</option>
                          <option value="second_hand">İkinci El</option>
                        </select>
                      </div>

                      <div className="form-group">
                        <label className="form-label">Marka *</label>
                        <input
                          type="text"
                          className="form-input"
                          placeholder="Örn: Apple, Sony, Asus"
                          value={item.brand}
                          onChange={(e) => handleItemChange(index, 'brand', e.target.value)}
                          required
                        />
                      </div>

                      <div className="form-group">
                        <label className="form-label">Model *</label>
                        <input
                          type="text"
                          className="form-input"
                          placeholder="Örn: iPhone 15 Pro, ROG G16"
                          value={item.model}
                          onChange={(e) => handleItemChange(index, 'model', e.target.value)}
                          required
                        />
                      </div>

                      <div className="form-group">
                        <label className="form-label">IMEI (Telefon/Tablet için)</label>
                        <input
                          type="text"
                          className="form-input font-mono"
                          placeholder="15 haneli IMEI"
                          value={item.imei}
                          onChange={(e) => handleItemChange(index, 'imei', e.target.value)}
                        />
                      </div>

                      <div className="form-group">
                        <label className="form-label">Seri No (S/N)</label>
                        <input
                          type="text"
                          className="form-input font-mono"
                          placeholder="Seri numarası"
                          value={item.serial_number}
                          onChange={(e) => handleItemChange(index, 'serial_number', e.target.value)}
                        />
                      </div>

                      <div className="form-group">
                        <label className="form-label">Alış Fiyatı (₺) *</label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          className="form-input font-mono"
                          placeholder="0.00"
                          value={item.purchase_price}
                          onChange={(e) => handleItemChange(index, 'purchase_price', e.target.value)}
                          required
                        />
                      </div>

                      <div className="form-group">
                        <label className="form-label">Tahmini Satış Fiyatı (₺)</label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          className="form-input font-mono"
                          placeholder="0.00"
                          value={item.estimated_sale_price}
                          onChange={(e) => handleItemChange(index, 'estimated_sale_price', e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Ödeme Detayları ve Kalan Borç */}
            <div style={{
              backgroundColor: '#f8fafc',
              border: '1px solid #e2e8f0',
              padding: '16px',
              borderRadius: '8px'
            }}>
              <div className="form-grid">
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
                    <option value="acik_hesap">Açık Hesap (Sonradan Ödenecek)</option>
                    <option value="parcali">Kısmi / Parçalı Ödeme</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Ödenen Peşinat (₺)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    className="form-input font-mono"
                    value={paidAmount}
                    onChange={(e) => setPaidAmount(e.target.value)}
                    placeholder="0.00"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Alış Tarihi</label>
                  <input
                    type="date"
                    className="form-input"
                    value={purchaseDate}
                    onChange={(e) => setPurchaseDate(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Açıklama / Fatura No</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Örn: Rampalı Çarşı elden teslim, kutulu"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>
              </div>

              {/* Borç Özet Çubuğu */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginTop: '16px',
                paddingTop: '12px',
                borderTop: '1px solid #cbd5e1'
              }}>
                <div>
                  <span style={{ fontSize: '12px', color: '#64748b' }}>Toplam Alış Tutarı: </span>
                  <span style={{ fontSize: '18px', fontWeight: 700, fontFamily: 'monospace' }}>
                    {formatCurrency(Math.round(totalCost * 100))}
                  </span>
                </div>

                <div>
                  <span style={{ fontSize: '12px', color: '#64748b' }}>Ödenen Tutar: </span>
                  <span style={{ fontSize: '16px', fontWeight: 600, color: '#059669', fontFamily: 'monospace' }}>
                    {formatCurrency(Math.round(paid * 100))}
                  </span>
                </div>

                <div>
                  <span style={{ fontSize: '12px', color: '#64748b' }}>Tedarikçiye Kalan Borç: </span>
                  <span style={{
                    fontSize: '16px',
                    fontWeight: 700,
                    color: remainingDebt > 0 ? '#dc2626' : '#64748b',
                    fontFamily: 'monospace'
                  }}>
                    {formatCurrency(Math.round(remainingDebt * 100))}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Vazgeç
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              style={{ padding: '10px 20px', fontSize: '14px', fontWeight: 600 }}
              disabled={submitting}
            >
              <Check size={18} />
              <span>{submitting ? 'Alış Kaydediliyor...' : 'Alışı Onayla & Stoka Ekle'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
