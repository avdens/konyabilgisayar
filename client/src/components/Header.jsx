import React, { useState, useEffect, useRef } from 'react';
import {
  Menu,
  Search,
  PlusCircle,
  TrendingUp,
  ShoppingBag,
  CreditCard,
  X,
  Smartphone,
  Laptop
} from 'lucide-react';
import { api } from '../utils/api';
import { formatCurrency, getProductStatusInfo } from '../utils/formatters';

export default function Header({
  pageTitle,
  pageDesc,
  setMobileOpen,
  onOpenQuickSale,
  onOpenQuickPurchase,
  onOpenQuickPayment,
  onOpenAddProduct,
  onSelectProduct
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const searchRef = useRef(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Quick lookup debounce
  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.trim().length < 2) {
      setSearchResults([]);
      setShowDropdown(false);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setIsSearching(true);
        const data = await api.get(`/products/search-quick?q=${encodeURIComponent(searchQuery.trim())}`);
        if (data.success) {
          setSearchResults(data.products || []);
          setShowDropdown(true);
        }
      } catch (err) {
        console.error('Quick search error:', err);
      } finally {
        setIsSearching(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  return (
    <header className="header">
      {/* Sol Başlık ve Mobil Menü Butonu */}
      <div className="header-left">
        <button 
          className="mobile-toggle btn-icon"
          onClick={() => setMobileOpen(prev => !prev)}
        >
          <Menu size={22} />
        </button>

        <div className="page-title-box">
          <h1 className="page-title">{pageTitle}</h1>
          {pageDesc && <span className="page-desc">{pageDesc}</span>}
        </div>
      </div>

      {/* Orta Hızlı IMEI / Seri No Arama */}
      <div className="header-search-container" ref={searchRef} style={{ position: 'relative', width: '320px' }}>
        <div className="search-input-box">
          <Search size={16} className="search-icon" />
          <input
            type="text"
            className="input-text"
            placeholder="IMEI, Seri No veya Model ara..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => searchQuery.trim().length >= 2 && setShowDropdown(true)}
          />
          {searchQuery && (
            <button 
              onClick={() => { setSearchQuery(''); setShowDropdown(false); }}
              style={{ position: 'absolute', right: '10px', color: '#94a3b8' }}
            >
              <X size={15} />
            </button>
          )}
        </div>

        {/* Hızlı Arama Sonuç Dropdown */}
        {showDropdown && (
          <div style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            left: 0,
            right: 0,
            backgroundColor: '#ffffff',
            borderRadius: '8px',
            boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
            border: '1px solid #e2e8f0',
            zIndex: 90,
            maxHeight: '340px',
            overflowY: 'auto'
          }}>
            {isSearching ? (
              <div style={{ padding: '16px', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>
                Aranıyor...
              </div>
            ) : searchResults.length > 0 ? (
              searchResults.map(p => {
                const status = getProductStatusInfo(p.status);
                return (
                  <div
                    key={p.id}
                    onClick={() => {
                      setShowDropdown(false);
                      setSearchQuery('');
                      onSelectProduct && onSelectProduct(p);
                    }}
                    style={{
                      padding: '10px 14px',
                      borderBottom: '1px solid #f1f5f9',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      transition: 'background 0.15s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '13px', color: '#0f172a' }}>
                        {p.name}
                      </div>
                      <div style={{ fontSize: '11px', color: '#64748b', fontFamily: 'monospace' }}>
                        {p.imei ? `IMEI: ${p.imei}` : p.serial_number ? `Seri: ${p.serial_number}` : p.product_code}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 600, fontSize: '13px', color: '#2563eb' }}>
                        {formatCurrency(p.estimated_sale_price_cents)}
                      </div>
                      <span className={`badge ${status.className}`} style={{ fontSize: '10px', padding: '1px 6px' }}>
                        {status.label}
                      </span>
                    </div>
                  </div>
                );
              })
            ) : (
              <div style={{ padding: '16px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>
                Eşleşen cihaz bulunamadı.
              </div>
            )}
          </div>
        )}
      </div>

      {/* Sağ Hızlı Aksiyon Butonları */}
      <div className="header-actions">
        <button
          className="btn btn-success"
          onClick={onOpenQuickSale}
          title="Hızlı Satış Yap (POS Ekranı)"
        >
          <TrendingUp size={16} />
          <span>Hızlı Satış</span>
        </button>

        <button
          className="btn btn-primary"
          onClick={onOpenQuickPurchase}
          title="Hızlı Alış / Stok Girişi"
        >
          <ShoppingBag size={16} />
          <span>Hızlı Alış</span>
        </button>

        <button
          className="btn btn-secondary"
          onClick={onOpenQuickPayment}
          title="Tahsilat veya Ödeme Girişi"
        >
          <CreditCard size={16} />
          <span>Tahsilat/Ödeme</span>
        </button>

        <button
          className="btn btn-outline"
          onClick={onOpenAddProduct}
          title="Yeni Ürün Kartı Tanımla"
        >
          <PlusCircle size={16} />
          <span>Ürün Ekle</span>
        </button>
      </div>
    </header>
  );
}
