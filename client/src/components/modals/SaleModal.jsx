import React, { useState, useEffect } from 'react';
import { X, Search, Trash2, Plus, Check, TrendingUp, AlertCircle, Printer, UserPlus } from 'lucide-react';
import { api } from '../../utils/api';
import { formatCurrency } from '../../utils/formatters';

export default function SaleModal({ initialProduct, cariler, isOpen, onClose, onSuccess, onOpenReceipt }) {
  const [selectedCariId, setSelectedCariId] = useState('');
  const [saleDate, setSaleDate] = useState(new Date().toISOString().substring(0, 10));
  const [paymentMethod, setPaymentMethod] = useState('nakit');
  const [notes, setNotes] = useState('');
  
  // Selected items for sale: array of { product, sale_price }
  const [cartItems, setCartItems] = useState([]);
  const [collectedAmount, setCollectedAmount] = useState('');
  
  // Search state for adding items to cart
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  // Quick New Customer state
  const [showNewCustomer, setShowNewCustomer] = useState(false);
  const [newCustName, setNewCustName] = useState('');
  const [newCustPhone, setNewCustPhone] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Auto-add initial product and reset form when opened
  useEffect(() => {
    if (isOpen) {
      if (initialProduct && initialProduct.status === 'in_stock') {
        const price = initialProduct.estimated_sale_price_cents 
          ? (initialProduct.estimated_sale_price_cents / 100) 
          : 0;
        setCartItems([{
          product: initialProduct,
          sale_price: price
        }]);
        setCollectedAmount(price.toString());
      } else {
        setCartItems([]);
        setCollectedAmount('');
      }
      setSelectedCariId('');
      setSaleDate(new Date().toISOString().substring(0, 10));
      setPaymentMethod('nakit');
      setNotes('');
      setSearchQuery('');
      setSearchResults([]);
      setShowNewCustomer(false);
      setNewCustName('');
      setNewCustPhone('');
      setError('');
    }
  }, [isOpen, initialProduct]);

  // Search in-stock products
  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setIsSearching(true);
        const data = await api.get(`/products/search-quick?q=${encodeURIComponent(searchQuery.trim())}`);
        if (data.success) {
          // Only show items that are currently in_stock and not already in cart
          const available = (data.products || []).filter(p => 
            p.status === 'in_stock' && !cartItems.some(ci => ci.product.id === p.id)
          );
          setSearchResults(available);
        }
      } catch (err) {
        console.error('Sale search error:', err);
      } finally {
        setIsSearching(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [searchQuery, cartItems]);

  const addToCart = (product) => {
    const price = product.estimated_sale_price_cents 
      ? (product.estimated_sale_price_cents / 100) 
      : 0;
    
    const newItems = [...cartItems, { product, sale_price: price }];
    setCartItems(newItems);
    setSearchQuery('');
    setSearchResults([]);

    // Recalculate default collected amount
    const newTotal = newItems.reduce((sum, item) => sum + (Number(item.sale_price) || 0), 0);
    setCollectedAmount(newTotal.toString());
  };

  const removeFromCart = (index) => {
    const newItems = cartItems.filter((_, i) => i !== index);
    setCartItems(newItems);
    const newTotal = newItems.reduce((sum, item) => sum + (Number(item.sale_price) || 0), 0);
    setCollectedAmount(newTotal.toString());
  };

  const updateItemPrice = (index, newPrice) => {
    const updated = [...cartItems];
    updated[index].sale_price = newPrice;
    setCartItems(updated);
    const newTotal = updated.reduce((sum, item) => sum + (Number(item.sale_price) || 0), 0);
    setCollectedAmount(newTotal.toString());
  };

  const totalAmount = cartItems.reduce((sum, item) => sum + (Number(item.sale_price) || 0), 0);
  const collected = Number(collectedAmount) || 0;
  const remaining = Math.max(0, totalAmount - collected);

  const handleCreateCustomer = async () => {
    if (!newCustName.trim()) return;
    try {
      const res = await api.post('/cariler', {
        name: newCustName.trim(),
        phone: newCustPhone.trim(),
        type: 'customer'
      });
      if (res.success) {
        setSelectedCariId(res.cariId);
        setShowNewCustomer(false);
        setNewCustName('');
        setNewCustPhone('');
        onSuccess && onSuccess(); // Refresh cariler
      }
    } catch (err) {
      alert('Müşteri eklenemedi: ' + err.message);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedCariId) {
      setError('Lütfen bir müşteri seçiniz veya hızlıca ekleyiniz.');
      return;
    }

    if (cartItems.length === 0) {
      setError('Lütfen satılacak en az bir ürün ekleyiniz.');
      return;
    }

    try {
      setSubmitting(true);
      setError('');

      const payload = {
        cari_id: selectedCariId,
        sale_date: saleDate,
        payment_method: paymentMethod,
        collected_amount: collected,
        notes,
        items: cartItems.map(item => ({
          product_id: item.product.id,
          sale_price: item.sale_price
        }))
      };

      const res = await api.post('/sales', payload);
      if (res.success) {
        onSuccess && onSuccess();
        onClose();
        if (onOpenReceipt) {
          onOpenReceipt(res.saleId);
        }
      }
    } catch (err) {
      setError(err.message || 'Satış kaydedilemedi.');
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
            <div style={{ backgroundColor: '#ecfdf5', color: '#059669', padding: '6px', borderRadius: '6px' }}>
              <TrendingUp size={20} />
            </div>
            <div>
              <h3 className="modal-title">Hızlı Satış Ekranı (Kasa / POS)</h3>
              <span style={{ fontSize: '11px', color: '#64748b' }}>Stoktan seri no / IMEI ile düşüş ve cari kayıt</span>
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

            {/* 1. Müşteri Seçimi & Hızlı Ekleme */}
            <div style={{
              backgroundColor: '#f8fafc',
              border: '1px solid #e2e8f0',
              padding: '14px',
              borderRadius: '8px',
              marginBottom: '16px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <label className="form-label">Müşteri Seçin *</label>
                <button
                  type="button"
                  style={{ color: '#2563eb', fontSize: '12px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}
                  onClick={() => setShowNewCustomer(!showNewCustomer)}
                >
                  <UserPlus size={14} />
                  <span>{showNewCustomer ? 'Listeden Seç' : '+ Yeni Müşteri Ekle'}</span>
                </button>
              </div>

              {showNewCustomer ? (
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Müşteri Adı Soyadı *"
                    value={newCustName}
                    onChange={(e) => setNewCustName(e.target.value)}
                    style={{ flex: 1.5 }}
                  />
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Telefon Numarası"
                    value={newCustPhone}
                    onChange={(e) => setNewCustPhone(e.target.value)}
                    style={{ flex: 1 }}
                  />
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={handleCreateCustomer}
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
                  <option value="">-- Satış Yapılacak Müşteriyi Seçin --</option>
                  {cariler.filter(c => c.type === 'customer' || c.type === 'both').map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name} - {c.phone || c.city || c.code} {c.balance_cents > 0 ? `(Borcu: ${formatCurrency(c.balance_cents)})` : ''}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* 2. Cihaz / Ürün Arama ve Sepete Ekleme */}
            <div style={{ marginBottom: '16px', position: 'relative' }}>
              <label className="form-label" style={{ marginBottom: '6px', display: 'block' }}>
                Stoktan Cihaz Ara (Seri No, IMEI veya Model Girin)
              </label>
              <div className="search-input-box">
                <Search size={16} className="search-icon" />
                <input
                  type="text"
                  className="input-text"
                  placeholder="Barkod okutun veya IMEI / Seri No yazın..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              {/* Arama Sonuç Dropdown */}
              {searchResults.length > 0 && (
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  backgroundColor: '#ffffff',
                  border: '1px solid #cbd5e1',
                  borderRadius: '6px',
                  boxShadow: '0 8px 16px rgba(0,0,0,0.1)',
                  zIndex: 20,
                  maxHeight: '200px',
                  overflowY: 'auto'
                }}>
                  {searchResults.map(p => (
                    <div
                      key={p.id}
                      onClick={() => addToCart(p)}
                      style={{
                        padding: '8px 12px',
                        borderBottom: '1px solid #f1f5f9',
                        cursor: 'pointer',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f1f5f9'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '13px' }}>{p.name}</div>
                        <div style={{ fontSize: '11px', color: '#64748b', fontFamily: 'monospace' }}>
                          {p.imei ? `IMEI: ${p.imei}` : p.serial_number ? `Seri: ${p.serial_number}` : p.product_code}
                        </div>
                      </div>
                      <div style={{ fontWeight: 600, color: '#059669', fontSize: '13px' }}>
                        {formatCurrency(p.estimated_sale_price_cents)} +
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 3. Satılacak Ürünler Tablosu */}
            <div style={{
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              overflow: 'hidden',
              marginBottom: '16px'
            }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Ürün / Cihaz</th>
                    <th>IMEI / Seri No</th>
                    <th style={{ width: '140px' }}>Satış Fiyatı (₺)</th>
                    <th style={{ width: '40px' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {cartItems.length === 0 ? (
                    <tr>
                      <td colSpan={4} style={{ textAlign: 'center', padding: '24px', color: '#94a3b8' }}>
                        Henüz ürün eklenmedi. Yukarıdan IMEI veya cihaz arayarak ekleyin.
                      </td>
                    </tr>
                  ) : (
                    cartItems.map((item, idx) => (
                      <tr key={item.product.id}>
                        <td>
                          <div style={{ fontWeight: 600 }}>{item.product.name}</div>
                          <div style={{ fontSize: '11px', color: '#64748b' }}>{item.product.brand} - {item.product.model}</div>
                        </td>
                        <td style={{ fontFamily: 'monospace', fontSize: '12px' }}>
                          {item.product.imei || item.product.serial_number || item.product.product_code}
                        </td>
                        <td>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            className="form-input font-mono"
                            style={{ padding: '4px 8px', fontSize: '13px', width: '100%' }}
                            value={item.sale_price}
                            onChange={(e) => updateItemPrice(idx, e.target.value)}
                          />
                        </td>
                        <td>
                          <button
                            type="button"
                            onClick={() => removeFromCart(idx)}
                            style={{ color: '#dc2626' }}
                            title="Listeden Kaldır"
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* 4. Ödeme ve Tahsilat Detayları */}
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
                    <option value="kredi_karti">Kredi Kartı / POS</option>
                    <option value="acik_hesap">Açık Hesap (Cari Borç)</option>
                    <option value="parcali">Parçalı Tahsilat</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Tahsil Edilen Peşinat (₺)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    className="form-input font-mono"
                    value={collectedAmount}
                    onChange={(e) => setCollectedAmount(e.target.value)}
                    placeholder="0.00"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Satış Tarihi</label>
                  <input
                    type="date"
                    className="form-input"
                    value={saleDate}
                    onChange={(e) => setSaleDate(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Fiş / Satış Notu</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Garantili teslim, kılıf hediye vb."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>
              </div>

              {/* Finansal Özet Çubuğu */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginTop: '16px',
                paddingTop: '12px',
                borderTop: '1px solid #cbd5e1'
              }}>
                <div>
                  <span style={{ fontSize: '12px', color: '#64748b' }}>Toplam Satış Tutarı: </span>
                  <span style={{ fontSize: '18px', fontWeight: 700, fontFamily: 'monospace' }}>
                    {formatCurrency(Math.round(totalAmount * 100))}
                  </span>
                </div>

                <div>
                  <span style={{ fontSize: '12px', color: '#64748b' }}>Tahsil Edilen: </span>
                  <span style={{ fontSize: '16px', fontWeight: 600, color: '#059669', fontFamily: 'monospace' }}>
                    {formatCurrency(Math.round(collected * 100))}
                  </span>
                </div>

                <div>
                  <span style={{ fontSize: '12px', color: '#64748b' }}>Cariye Kalan Alacak: </span>
                  <span style={{
                    fontSize: '16px',
                    fontWeight: 700,
                    color: remaining > 0 ? '#dc2626' : '#059669',
                    fontFamily: 'monospace'
                  }}>
                    {formatCurrency(Math.round(remaining * 100))}
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
              className="btn btn-success"
              style={{ padding: '10px 20px', fontSize: '14px', fontWeight: 600 }}
              disabled={submitting || cartItems.length === 0}
            >
              <Check size={18} />
              <span>{submitting ? 'Satış İşleniyor...' : 'Satışı Tamamla & Fiş Kes'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
