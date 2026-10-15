import React, { useState, useEffect } from 'react';
import {
  Search,
  Filter,
  Plus,
  Eye,
  Edit2,
  Trash2,
  TrendingUp,
  Image as ImageIcon,
  CheckCircle,
  X,
  RefreshCw,
  Download
} from 'lucide-react';
import { api } from '../utils/api';
import { formatCurrency, formatDate, getProductStatusInfo, getProductConditionInfo } from '../utils/formatters';

export default function ProductsView({
  user,
  categories,
  onOpenAddProduct,
  onSelectProduct,
  onEditProduct,
  onSellProduct
}) {
  const isAdmin = user?.role === 'admin';

  const [products, setProducts] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [brand, setBrand] = useState('');
  const [status, setStatus] = useState('');
  const [condition, setCondition] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');

  const [brandsList, setBrandsList] = useState([]);

  // Load brands for dropdown
  useEffect(() => {
    async function loadBrands() {
      try {
        const res = await api.get('/products/meta/brands');
        if (res.success) setBrandsList(res.brands || []);
      } catch (e) {
        console.error(e);
      }
    }
    loadBrands();
  }, []);

  const loadProducts = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (categoryId) params.append('category_id', categoryId);
      if (brand) params.append('brand', brand);
      if (status) params.append('status', status);
      if (condition) params.append('condition', condition);
      if (minPrice) params.append('min_price', minPrice);
      if (maxPrice) params.append('max_price', maxPrice);
      params.append('page', page);
      params.append('limit', 25);

      const res = await api.get(`/products?${params.toString()}`);
      if (res.success) {
        setProducts(res.products || []);
        setTotal(res.pagination?.total || 0);
        setTotalPages(res.pagination?.totalPages || 1);
      }
    } catch (err) {
      console.error('Products error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, [page, categoryId, brand, status, condition]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    loadProducts();
  };

  const handleClearFilters = () => {
    setSearch('');
    setCategoryId('');
    setBrand('');
    setStatus('');
    setCondition('');
    setMinPrice('');
    setMaxPrice('');
    setPage(1);
  };

  const handleDeleteProduct = async (product) => {
    if (!window.confirm(`"${product.name}" (${product.product_code}) adlı ürünü çöp kutusuna taşımak istediğinizden emin misiniz?`)) {
      return;
    }
    try {
      const res = await api.delete(`/products/${product.id}`);
      if (res.success) {
        loadProducts();
      }
    } catch (err) {
      alert(err.message || 'Ürün silinemedi.');
    }
  };

  return (
    <div>
      {/* 1. KOMBİNE FİLTRE VE ARAMA ÇUBUĞU */}
      <div className="filter-bar">
        {/* Arama Inputu */}
        <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '8px', flex: 1, minWidth: '280px' }}>
          <div className="search-input-box">
            <Search size={16} className="search-icon" />
            <input
              type="text"
              className="input-text"
              placeholder="Model, Marka, Seri No, IMEI veya Özellik ara..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <button type="submit" className="btn btn-secondary">
            Ara
          </button>
        </form>

        {/* Kategori Filtresi */}
        <div style={{ minWidth: '150px' }}>
          <select
            className="select-box"
            value={categoryId}
            onChange={(e) => { setCategoryId(e.target.value); setPage(1); }}
          >
            <option value="">Tüm Kategoriler</option>
            {categories.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        {/* Marka Filtresi */}
        <div style={{ minWidth: '120px' }}>
          <select
            className="select-box"
            value={brand}
            onChange={(e) => { setBrand(e.target.value); setPage(1); }}
          >
            <option value="">Tüm Markalar</option>
            {brandsList.map(b => (
              <option key={b} value={b}>{b}</option>
            ))}
          </select>
        </div>

        {/* Stok Durumu Filtresi */}
        <div style={{ minWidth: '130px' }}>
          <select
            className="select-box"
            value={status}
            onChange={(e) => { setStatus(e.target.value); setPage(1); }}
          >
            <option value="">Tüm Durumlar</option>
            <option value="in_stock">Sadece Stoktakiler</option>
            <option value="sold">Satılanlar</option>
            <option value="reserved">Rezerve Edilenler</option>
            <option value="in_service">Servistekiler</option>
          </select>
        </div>

        {/* Sıfır / 2.El Filtresi */}
        <div style={{ minWidth: '120px' }}>
          <select
            className="select-box"
            value={condition}
            onChange={(e) => { setCondition(e.target.value); setPage(1); }}
          >
            <option value="">Sıfır & 2.El</option>
            <option value="zero">Sıfır</option>
            <option value="second_hand">İkinci El</option>
          </select>
        </div>

        {/* Filtreleri Temizle Butonu */}
        {(search || categoryId || brand || status || condition || minPrice || maxPrice) && (
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={handleClearFilters}
            title="Tüm filtreleri sıfırla"
          >
            <X size={14} />
            <span>Filtreleri Temizle</span>
          </button>
        )}

        <button
          className="btn btn-primary"
          style={{ marginLeft: 'auto' }}
          onClick={onOpenAddProduct}
        >
          <Plus size={16} />
          <span>Yeni Ürün Ekle</span>
        </button>
      </div>

      {/* 2. ÜRÜN TABLOSU */}
      <div className="card">
        <div className="card-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontWeight: 600, fontSize: '15px' }}>Ürün ve Cihaz Listesi</span>
            <span style={{ fontSize: '12px', color: '#64748b' }}>({total} kayıt listelendi)</span>
          </div>
          <button
            className="btn-icon"
            onClick={loadProducts}
            title="Yenile"
            style={{ color: '#64748b' }}
          >
            <RefreshCw size={16} />
          </button>
        </div>

        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: '40px' }}>Görsel</th>
                <th>Ürün Kodu</th>
                <th>Cihaz / Model</th>
                <th>Kategori</th>
                <th>Seri No / IMEI</th>
                <th>Durum</th>
                <th>Kozmetik</th>
                {isAdmin && <th style={{ textAlign: 'right' }}>Maliyet (₺)</th>}
                <th style={{ textAlign: 'right' }}>Etiket / Satış (₺)</th>
                <th>Stok Durumu</th>
                <th style={{ textAlign: 'center', width: '120px' }}>İşlemler</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={11} style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                    Yükleniyor...
                  </td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={11} style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                    Aradığınız kriterlere uygun ürün bulunamadı.
                  </td>
                </tr>
              ) : (
                products.map(p => {
                  const statusInfo = getProductStatusInfo(p.status);
                  const conditionInfo = getProductConditionInfo(p.condition);
                  const hasImage = p.images && p.images.length > 0;

                  return (
                    <tr key={p.id}>
                      {/* Ürün Görseli / Küçük Resim */}
                      <td>
                        <div style={{
                          width: '36px',
                          height: '36px',
                          borderRadius: '4px',
                          overflow: 'hidden',
                          backgroundColor: '#f1f5f9',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          border: '1px solid #e2e8f0'
                        }}>
                          {hasImage ? (
                            <img src={p.images[0]} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          ) : (
                            <ImageIcon size={18} style={{ color: '#94a3b8' }} />
                          )}
                        </div>
                      </td>

                      {/* Ürün Kodu */}
                      <td style={{ fontFamily: 'monospace', fontWeight: 600, color: '#2563eb' }}>
                        {p.product_code}
                      </td>

                      {/* Cihaz Adı & Marka/Model */}
                      <td>
                        <div style={{ fontWeight: 600, color: '#0f172a' }}>{p.name}</div>
                        <div style={{ fontSize: '11.5px', color: '#64748b' }}>
                          {p.brand} {p.model}
                        </div>
                      </td>

                      {/* Kategori */}
                      <td>{p.category_name}</td>

                      {/* Seri No / IMEI */}
                      <td style={{ fontFamily: 'monospace', fontSize: '12px' }}>
                        {p.imei ? (
                          <div>
                            <span style={{ color: '#2563eb', fontWeight: 600 }}>IMEI:</span> {p.imei}
                          </div>
                        ) : p.serial_number ? (
                          <div>
                            <span style={{ color: '#475569' }}>S/N:</span> {p.serial_number}
                          </div>
                        ) : (
                          <span style={{ color: '#cbd5e1' }}>-</span>
                        )}
                      </td>

                      {/* Sıfır / 2.El */}
                      <td>
                        <span className={`badge ${conditionInfo.className}`} style={{ fontSize: '10.5px' }}>
                          {conditionInfo.label}
                        </span>
                      </td>

                      {/* Kozmetik */}
                      <td style={{ fontSize: '12px', color: '#475569' }}>
                        {p.cosmetic_grade || '-'}
                      </td>

                      {/* Maliyet (Sadece Yönetici) */}
                      {isAdmin && (
                        <td style={{ textAlign: 'right', fontFamily: 'monospace', color: '#64748b' }}>
                          {formatCurrency(p.purchase_price_cents)}
                        </td>
                      )}

                      {/* Satış Fiyatı */}
                      <td style={{ textAlign: 'right', fontWeight: 700, fontFamily: 'monospace', color: '#0f172a' }}>
                        {formatCurrency(p.estimated_sale_price_cents)}
                      </td>

                      {/* Durum */}
                      <td>
                        <span className={`badge ${statusInfo.className}`}>
                          {statusInfo.label}
                        </span>
                      </td>

                      {/* İşlem Butonları */}
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                          {/* Satış Butonu (Sadece Stoktaysa) */}
                          {p.status === 'in_stock' && (
                            <button
                              className="btn-icon"
                              style={{ color: '#059669', width: '28px', height: '28px' }}
                              onClick={() => onSellProduct && onSellProduct(p)}
                              title="Hızlı Sat"
                            >
                              <TrendingUp size={15} />
                            </button>
                          )}

                          {/* Detay Görüntüle */}
                          <button
                            className="btn-icon"
                            style={{ color: '#2563eb', width: '28px', height: '28px' }}
                            onClick={() => onSelectProduct && onSelectProduct(p)}
                            title="İncele & Detay"
                          >
                            <Eye size={15} />
                          </button>

                          {/* Düzenle */}
                          <button
                            className="btn-icon"
                            style={{ color: '#475569', width: '28px', height: '28px' }}
                            onClick={() => onEditProduct && onEditProduct(p)}
                            title="Düzenle"
                          >
                            <Edit2 size={15} />
                          </button>

                          {/* Çöp Kutusuna Gönder (Admin) */}
                          {isAdmin && p.status !== 'sold' && (
                            <button
                              className="btn-icon"
                              style={{ color: '#dc2626', width: '28px', height: '28px' }}
                              onClick={() => handleDeleteProduct(p)}
                              title="Sil (Çöp Kutusu)"
                            >
                              <Trash2 size={15} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Sayfalama Kontrolleri */}
        {totalPages > 1 && (
          <div className="pagination-wrapper">
            <span>Toplam {total} üründen {((page - 1) * 25) + 1} - {Math.min(page * 25, total)} arası gösteriliyor</span>
            <div className="pagination-buttons">
              <button
                className="page-btn"
                disabled={page <= 1}
                onClick={() => setPage(p => Math.max(1, p - 1))}
              >
                Önceki
              </button>
              <span style={{ fontSize: '12.5px', padding: '0 8px' }}>
                Sayfa {page} / {totalPages}
              </span>
              <button
                className="page-btn"
                disabled={page >= totalPages}
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              >
                Sonraki
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
