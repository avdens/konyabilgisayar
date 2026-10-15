import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import LoginScreen from './components/LoginScreen';

// Modals
import ProductModal from './components/modals/ProductModal';
import ProductDetailModal from './components/modals/ProductDetailModal';
import SaleModal from './components/modals/SaleModal';
import PurchaseModal from './components/modals/PurchaseModal';
import PaymentModal from './components/modals/PaymentModal';
import CariModal from './components/modals/CariModal';
import CariDetailModal from './components/modals/CariDetailModal';
import ExpenseModal from './components/modals/ExpenseModal';
import ReceiptPrintModal from './components/modals/ReceiptPrintModal';

// Views
import DashboardView from './views/DashboardView';
import ProductsView from './views/ProductsView';
import PurchasesView from './views/PurchasesView';
import SalesView from './views/SalesView';
import CarilerView from './views/CarilerView';
import PaymentsView from './views/PaymentsView';
import ExpensesView from './views/ExpensesView';
import ReportsView from './views/ReportsView';
import UsersView from './views/UsersView';
import SettingsView from './views/SettingsView';

import { api, getToken, getStoredUser, clearAuth } from './utils/api';

export default function App() {
  const [user, setUser] = useState(getStoredUser());
  const [token, setToken] = useState(getToken());
  const [activeTab, setActiveTab] = useState('dashboard');
  const [mobileOpen, setMobileOpen] = useState(false);

  // Common metadata
  const [categories, setCategories] = useState([]);
  const [cariler, setCariler] = useState([]);

  // Toast notification
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Modals state
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [selectedProductForEdit, setSelectedProductForEdit] = useState(null);

  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedProductForDetail, setSelectedProductForDetail] = useState(null);

  const [saleModalOpen, setSaleModalOpen] = useState(false);
  const [productForSale, setProductForSale] = useState(null);

  const [purchaseModalOpen, setPurchaseModalOpen] = useState(false);

  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [paymentDefaultCariId, setPaymentDefaultCariId] = useState('');
  const [paymentDefaultType, setPaymentDefaultType] = useState('collection');

  const [cariModalOpen, setCariModalOpen] = useState(false);
  const [selectedCariForEdit, setSelectedCariForEdit] = useState(null);

  const [cariDetailModalOpen, setCariDetailModalOpen] = useState(false);
  const [selectedCariIdForDetail, setSelectedCariIdForDetail] = useState(null);

  const [expenseModalOpen, setExpenseModalOpen] = useState(false);

  const [receiptModalOpen, setReceiptModalOpen] = useState(false);
  const [receiptSaleId, setReceiptSaleId] = useState(null);

  // Listen for unauthorized events
  useEffect(() => {
    const handleUnauthorized = () => {
      setUser(null);
      setToken(null);
    };
    window.addEventListener('auth:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('auth:unauthorized', handleUnauthorized);
  }, []);

  const loadCommonData = async () => {
    if (!token) return;
    try {
      const [catsRes, carisRes] = await Promise.all([
        api.get('/categories'),
        api.get('/cariler?limit=500')
      ]);
      if (catsRes.success) setCategories(catsRes.categories || []);
      if (carisRes.success) setCariler(carisRes.cariler || []);
    } catch (e) {
      console.error('Common data error:', e);
    }
  };

  useEffect(() => {
    if (token) {
      loadCommonData();
    }
  }, [token]);

  const handleLoginSuccess = (userData) => {
    setUser(userData);
    setToken(getToken());
    showToast(`Hoş geldiniz, ${userData.full_name}!`);
  };

  const handleLogout = () => {
    clearAuth();
    setUser(null);
    setToken(null);
  };

  if (!token || !user) {
    return <LoginScreen onLoginSuccess={handleLoginSuccess} />;
  }

  // Page titles
  const pageTitles = {
    dashboard: { title: 'Yönetim Paneli (Dashboard)', desc: 'İşletme genel stok, satış, kâr ve bakiye özeti' },
    products: { title: 'Ürün ve Stok Yönetimi', desc: 'Seri no, IMEI ve donanım bazlı tekil ürün takibi' },
    purchases: { title: 'Alış İşlemleri', desc: 'Tedarikçi ve müşterilerden mal alımları ve stok girişleri' },
    sales: { title: 'Satış İşlemleri', desc: 'Satış faturaları, kâr hesabı ve fiş dökümleri' },
    cariler: { title: 'Cari Hesap Yönetimi', desc: 'Müşteri ve tedarikçi bakiyeleri, borç/alacak takibi' },
    payments: { title: 'Ödemeler ve Tahsilatlar', desc: 'Nakit, havale ve POS kasa hareketleri' },
    expenses: { title: 'Gider / Masraf Yönetimi', desc: 'Dükkan işletme masrafları ve kategori dökümleri' },
    reports: { title: 'Raporlama & Çıktılar', desc: 'Dönemsel kâr-zarar, stok değerleme ve Excel/PDF raporları' },
    users: { title: 'Kullanıcı ve Rol Yönetimi', desc: 'Yönetici ve personel yetkilendirmesi' },
    settings: { title: 'Sistem Ayarları & Yedekleme', desc: 'Firma profili, veritabanı yedeği, çöp kutusu ve loglar' }
  };

  const currentMeta = pageTitles[activeTab] || { title: 'KONYA BİLGİSAYAR', desc: '' };

  return (
    <div className="app-container">
      {/* Sol Menü */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        user={user}
        onLogout={handleLogout}
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
      />

      {/* Ana Ekran Konteyneri */}
      <div className="main-wrapper">
        <Header
          pageTitle={currentMeta.title}
          pageDesc={currentMeta.desc}
          setMobileOpen={setMobileOpen}
          onOpenQuickSale={() => {
            setProductForSale(null);
            setSaleModalOpen(true);
          }}
          onOpenQuickPurchase={() => setPurchaseModalOpen(true)}
          onOpenQuickPayment={() => {
            setPaymentDefaultCariId('');
            setPaymentDefaultType('collection');
            setPaymentModalOpen(true);
          }}
          onOpenAddProduct={() => {
            setSelectedProductForEdit(null);
            setProductModalOpen(true);
          }}
          onSelectProduct={(p) => {
            setSelectedProductForDetail(p);
            setDetailModalOpen(true);
          }}
        />

        <main className="content-area">
          {activeTab === 'dashboard' && (
            <DashboardView
              user={user}
              onOpenQuickSale={() => {
                setProductForSale(null);
                setSaleModalOpen(true);
              }}
              onOpenQuickPurchase={() => setPurchaseModalOpen(true)}
              onOpenQuickPayment={() => {
                setPaymentDefaultCariId('');
                setPaymentDefaultType('collection');
                setPaymentModalOpen(true);
              }}
              onSelectProduct={(p) => {
                setSelectedProductForDetail(p);
                setDetailModalOpen(true);
              }}
            />
          )}

          {activeTab === 'products' && (
            <ProductsView
              user={user}
              categories={categories}
              onOpenAddProduct={() => {
                setSelectedProductForEdit(null);
                setProductModalOpen(true);
              }}
              onSelectProduct={(p) => {
                setSelectedProductForDetail(p);
                setDetailModalOpen(true);
              }}
              onEditProduct={(p) => {
                setSelectedProductForEdit(p);
                setProductModalOpen(true);
              }}
              onSellProduct={(p) => {
                setProductForSale(p);
                setSaleModalOpen(true);
              }}
            />
          )}

          {activeTab === 'purchases' && (
            <PurchasesView
              user={user}
              cariler={cariler}
              onOpenAddPurchase={() => setPurchaseModalOpen(true)}
            />
          )}

          {activeTab === 'sales' && (
            <SalesView
              user={user}
              cariler={cariler}
              onOpenAddSale={() => {
                setProductForSale(null);
                setSaleModalOpen(true);
              }}
              onPrintReceipt={(saleId) => {
                setReceiptSaleId(saleId);
                setReceiptModalOpen(true);
              }}
            />
          )}

          {activeTab === 'cariler' && (
            <CarilerView
              user={user}
              onOpenAddCari={() => {
                setSelectedCariForEdit(null);
                setCariModalOpen(true);
              }}
              onEditCari={(c) => {
                setSelectedCariForEdit(c);
                setCariModalOpen(true);
              }}
              onViewStatement={(cariId) => {
                setSelectedCariIdForDetail(cariId);
                setCariDetailModalOpen(true);
              }}
              onQuickPayment={(cariId, type) => {
                setPaymentDefaultCariId(cariId);
                setPaymentDefaultType(type);
                setPaymentModalOpen(true);
              }}
            />
          )}

          {activeTab === 'payments' && (
            <PaymentsView
              user={user}
              cariler={cariler}
              onOpenAddPayment={() => {
                setPaymentDefaultCariId('');
                setPaymentDefaultType('collection');
                setPaymentModalOpen(true);
              }}
            />
          )}

          {activeTab === 'expenses' && (
            <ExpensesView
              user={user}
              onOpenAddExpense={() => setExpenseModalOpen(true)}
            />
          )}

          {activeTab === 'reports' && (
            <ReportsView user={user} />
          )}

          {activeTab === 'users' && user.role === 'admin' && (
            <UsersView />
          )}

          {activeTab === 'settings' && (
            <SettingsView user={user} />
          )}
        </main>
      </div>

      {/* =========================================================================
          PAYLAŞILAN MODALLAR (HER YERDEN ERİŞİLEBİLİR)
          ========================================================================= */}
      
      {/* 1. Ürün Ekle / Düzenle Modalı */}
      {productModalOpen && (
        <ProductModal
          isOpen={productModalOpen}
          product={selectedProductForEdit}
          categories={categories}
          cariler={cariler}
          onClose={() => {
            setProductModalOpen(false);
            setSelectedProductForEdit(null);
          }}
          onSuccess={() => {
            showToast('Ürün başarıyla kaydedildi.');
            loadCommonData();
          }}
        />
      )}

      {/* 2. Ürün Detay Modalı */}
      {detailModalOpen && (
        <ProductDetailModal
          isOpen={detailModalOpen}
          product={selectedProductForDetail}
          isAdmin={user.role === 'admin'}
          onClose={() => {
            setDetailModalOpen(false);
            setSelectedProductForDetail(null);
          }}
          onEdit={(p) => {
            setSelectedProductForEdit(p);
            setProductModalOpen(true);
          }}
          onSell={(p) => {
            setProductForSale(p);
            setSaleModalOpen(true);
          }}
        />
      )}

      {/* 3. Hızlı Satış Modalı */}
      {saleModalOpen && (
        <SaleModal
          isOpen={saleModalOpen}
          initialProduct={productForSale}
          cariler={cariler}
          onClose={() => {
            setSaleModalOpen(false);
            setProductForSale(null);
          }}
          onSuccess={() => {
            showToast('Satış başarıyla tamamlandı.');
            loadCommonData();
          }}
          onOpenReceipt={(saleId) => {
            setReceiptSaleId(saleId);
            setReceiptModalOpen(true);
          }}
        />
      )}

      {/* 4. Hızlı Alış Modalı */}
      {purchaseModalOpen && (
        <PurchaseModal
          isOpen={purchaseModalOpen}
          cariler={cariler}
          categories={categories}
          onClose={() => setPurchaseModalOpen(false)}
          onSuccess={() => {
            showToast('Alış işlemi stoka işlendi.');
            loadCommonData();
          }}
        />
      )}

      {/* 5. Tahsilat / Ödeme Modalı */}
      {paymentModalOpen && (
        <PaymentModal
          isOpen={paymentModalOpen}
          defaultCariId={paymentDefaultCariId}
          defaultType={paymentDefaultType}
          cariler={cariler}
          onClose={() => {
            setPaymentModalOpen(false);
            setPaymentDefaultCariId('');
            setPaymentDefaultType('collection');
          }}
          onSuccess={() => {
            showToast('Ödeme/tahsilat cari hesaba işlendi.');
            loadCommonData();
          }}
        />
      )}

      {/* 6. Cari Hesap Ekle / Düzenle Modalı */}
      {cariModalOpen && (
        <CariModal
          isOpen={cariModalOpen}
          cari={selectedCariForEdit}
          onClose={() => {
            setCariModalOpen(false);
            setSelectedCariForEdit(null);
          }}
          onSuccess={() => {
            showToast('Cari hesap başarıyla kaydedildi.');
            loadCommonData();
          }}
        />
      )}

      {/* 7. Cari Ekstre Modalı */}
      {cariDetailModalOpen && (
        <CariDetailModal
          isOpen={cariDetailModalOpen}
          cariId={selectedCariIdForDetail}
          onClose={() => {
            setCariDetailModalOpen(false);
            setSelectedCariIdForDetail(null);
          }}
          onQuickPayment={(cId, type) => {
            setPaymentDefaultCariId(cId);
            setPaymentDefaultType(type);
            setPaymentModalOpen(true);
          }}
        />
      )}

      {/* 8. Masraf Ekleme Modalı */}
      {expenseModalOpen && (
        <ExpenseModal
          isOpen={expenseModalOpen}
          onClose={() => setExpenseModalOpen(false)}
          onSuccess={() => {
            showToast('Gider masrafı kaydedildi.');
          }}
        />
      )}

      {/* 9. Satış Fişi Yazdırma Modalı */}
      {receiptModalOpen && (
        <ReceiptPrintModal
          isOpen={receiptModalOpen}
          saleId={receiptSaleId}
          onClose={() => {
            setReceiptModalOpen(false);
            setReceiptSaleId(null);
          }}
        />
      )}

      {/* Toast Bildirimi */}
      {toast && (
        <div className="toast-container">
          <div className={`toast toast-${toast.type}`}>
            <span>{toast.message}</span>
          </div>
        </div>
      )}
    </div>
  );
}
