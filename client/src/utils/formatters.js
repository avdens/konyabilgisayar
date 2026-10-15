/**
 * KONYA BİLGİSAYAR - Formatlayıcı ve Yardımcı Fonksiyonlar
 */

// Para Formatı (Kuruş cinsinden integer -> TRY ₺)
export function formatCurrency(cents) {
  if (cents === null || cents === undefined) return '-';
  const val = Number(cents) / 100;
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(val);
}

// Sade Tutar Formatı (₺ simgesi olmadan sayısal)
export function formatNumber(cents) {
  if (cents === null || cents === undefined) return '0,00';
  const val = Number(cents) / 100;
  return val.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Tarih Formatı (GG.AA.YYYY)
export function formatDate(dateString) {
  if (!dateString) return '-';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    return d.toLocaleDateString('tr-TR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  } catch (e) {
    return dateString;
  }
}

// Tarih ve Saat Formatı (GG.AA.YYYY SS:DD)
export function formatDateTime(dateString) {
  if (!dateString) return '-';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    return d.toLocaleDateString('tr-TR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch (e) {
    return dateString;
  }
}

// Stok Durumu Türkçe Karşılık ve Renk Sınıfı
export function getProductStatusInfo(status) {
  switch (status) {
    case 'in_stock':
      return { label: 'Stokta', className: 'badge-in_stock', color: '#059669' };
    case 'sold':
      return { label: 'Satıldı', className: 'badge-sold', color: '#64748b' };
    case 'reserved':
      return { label: 'Rezerve', className: 'badge-reserved', color: '#d97706' };
    case 'in_service':
      return { label: 'Serviste', className: 'badge-in_service', color: '#7c3aed' };
    default:
      return { label: status, className: 'badge-secondary', color: '#64748b' };
  }
}

// Ürün Durumu (Sıfır / 2. El)
export function getProductConditionInfo(condition) {
  if (condition === 'zero') {
    return { label: 'Sıfır', className: 'badge-success' };
  }
  return { label: '2. El', className: 'badge-warning' };
}

// Ödeme Yöntemi Türkçe Karşılığı
export function getPaymentMethodLabel(method) {
  switch (method) {
    case 'nakit': return 'Nakit';
    case 'havale_eft': return 'Havale / EFT';
    case 'kredi_karti': return 'Kredi Kartı';
    case 'acik_hesap': return 'Açık Hesap (Cari)';
    case 'parcali': return 'Parçalı Ödeme';
    default: return method || 'Diğer';
  }
}

// Cari Tipi Türkçe Karşılığı
export function getCariTypeLabel(type) {
  switch (type) {
    case 'customer': return 'Müşteri';
    case 'supplier': return 'Tedarikçi';
    case 'both': return 'Müşteri / Tedarikçi';
    default: return type;
  }
}
