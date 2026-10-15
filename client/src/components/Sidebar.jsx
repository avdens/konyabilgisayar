import React from 'react';
import {
  LayoutDashboard,
  Laptop,
  ShoppingBag,
  TrendingUp,
  Users,
  CreditCard,
  Receipt,
  BarChart3,
  UserCog,
  Settings,
  LogOut,
  X
} from 'lucide-react';

export default function Sidebar({ activeTab, setActiveTab, user, onLogout, mobileOpen, setMobileOpen }) {
  const isAdmin = user?.role === 'admin';

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'products', label: 'Ürünler & Stok', icon: Laptop },
    { id: 'purchases', label: 'Alışlar', icon: ShoppingBag },
    { id: 'sales', label: 'Satışlar', icon: TrendingUp },
    { id: 'cariler', label: 'Cariler', icon: Users },
    { id: 'payments', label: 'Ödemeler / Tahsilat', icon: CreditCard },
    { id: 'expenses', label: 'Masraflar', icon: Receipt },
    { id: 'reports', label: 'Raporlar', icon: BarChart3 },
    ...(isAdmin ? [{ id: 'users', label: 'Kullanıcılar', icon: UserCog }] : []),
    { id: 'settings', label: 'Ayarlar & Sistem', icon: Settings }
  ];

  return (
    <aside className={`sidebar ${mobileOpen ? 'mobile-open' : ''}`}>
      {/* Üst Logo ve Başlık */}
      <div className="sidebar-header">
        <div className="logo-badge">KB</div>
        <div className="brand-info">
          <span className="brand-title">KONYA BİLGİSAYAR</span>
          <span className="brand-subtitle">Stok & Cari Yönetimi</span>
        </div>
        {mobileOpen && (
          <button 
            className="mobile-close-btn" 
            style={{ marginLeft: 'auto', color: '#94a3b8' }}
            onClick={() => setMobileOpen(false)}
          >
            <X size={20} />
          </button>
        )}
      </div>

      {/* Navigasyon Linkleri */}
      <nav className="sidebar-nav">
        {menuItems.map(item => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              className={`nav-item ${isActive ? 'active' : ''}`}
              onClick={() => {
                setActiveTab(item.id);
                setMobileOpen(false);
              }}
            >
              <Icon size={18} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Alt Profil ve Çıkış */}
      <div className="sidebar-footer">
        <div className="user-profile">
          <div className="user-avatar">
            {user?.full_name ? user.full_name.charAt(0).toUpperCase() : 'U'}
          </div>
          <div className="user-meta">
            <span className="user-name">{user?.full_name || 'Kullanıcı'}</span>
            <span className="user-role-badge">
              {user?.role === 'admin' ? 'Yönetici' : 'Personel'}
            </span>
          </div>
        </div>

        <button 
          className="btn-icon" 
          title="Güvenli Çıkış"
          onClick={onLogout}
          style={{ color: '#94a3b8' }}
        >
          <LogOut size={18} />
        </button>
      </div>
    </aside>
  );
}
