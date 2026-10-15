import React, { useState, useEffect } from 'react';
import { UserCog, Plus, Shield, Check, X, Lock, RefreshCw, AlertCircle } from 'lucide-react';
import { api } from '../utils/api';
import { formatDate } from '../utils/formatters';

export default function UsersView() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  // New / Edit User Modal
  const [showModal, setShowModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState('staff');
  const [password, setPassword] = useState('');
  const [isActive, setIsActive] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const loadUsers = async () => {
    try {
      setLoading(true);
      const res = await api.get('/users');
      if (res.success) {
        setUsers(res.users || []);
      }
    } catch (err) {
      console.error('Users load error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const openAddModal = () => {
    setSelectedUser(null);
    setUsername('');
    setFullName('');
    setRole('staff');
    setPassword('');
    setIsActive(1);
    setError('');
    setShowModal(true);
  };

  const openEditModal = (u) => {
    setSelectedUser(u);
    setUsername(u.username);
    setFullName(u.full_name);
    setRole(u.role);
    setPassword(''); // leave blank if keeping same
    setIsActive(u.is_active);
    setError('');
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username || !fullName) {
      setError('Kullanıcı adı ve ad soyad zorunludur.');
      return;
    }

    if (!selectedUser && (!password || password.length < 6)) {
      setError('Yeni kullanıcı için en az 6 karakterli şifre girilmelidir.');
      return;
    }

    try {
      setSubmitting(true);
      setError('');

      if (selectedUser) {
        await api.put(`/users/${selectedUser.id}`, {
          full_name: fullName,
          role,
          is_active: isActive,
          password: password || undefined
        });
      } else {
        await api.post('/users', {
          username,
          full_name: fullName,
          role,
          password
        });
      }

      setShowModal(false);
      loadUsers();
    } catch (err) {
      setError(err.message || 'Kullanıcı kaydedilemedi.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <div className="card">
        <div className="card-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <UserCog size={20} style={{ color: '#2563eb' }} />
            <div>
              <h3 className="card-title">Kullanıcı & Yetki Yönetimi</h3>
              <span style={{ fontSize: '11px', color: '#64748b' }}>
                Yönetici (Tüm yetkiler) ve Personel (Kısıtlı yetkiler) hesapları
              </span>
            </div>
          </div>

          <button className="btn btn-primary" onClick={openAddModal}>
            <Plus size={16} />
            <span>Yeni Kullanıcı Ekle</span>
          </button>
        </div>

        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Kullanıcı Adı</th>
                <th>Ad Soyad</th>
                <th>Rol / Yetki</th>
                <th>Durum</th>
                <th>Kayıt Tarihi</th>
                <th style={{ textAlign: 'center', width: '100px' }}>İşlem</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>Yükleniyor...</td>
                </tr>
              ) : (
                users.map(u => (
                  <tr key={u.id}>
                    <td style={{ fontFamily: 'monospace' }}>#{u.id}</td>
                    <td style={{ fontWeight: 600, color: '#0f172a' }}>{u.username}</td>
                    <td>{u.full_name}</td>
                    <td>
                      <span className={`badge ${u.role === 'admin' ? 'badge-primary' : 'badge-secondary'}`} style={{
                        backgroundColor: u.role === 'admin' ? '#eff6ff' : '#f1f5f9',
                        color: u.role === 'admin' ? '#2563eb' : '#475569',
                        border: u.role === 'admin' ? '1px solid #bfdbfe' : '1px solid #cbd5e1'
                      }}>
                        {u.role === 'admin' ? 'Yönetici (Tam Yetki)' : 'Personel (Kısıtlı)'}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${u.is_active ? 'badge-success' : 'badge-danger'}`}>
                        {u.is_active ? 'Aktif' : 'Pasif'}
                      </span>
                    </td>
                    <td>{formatDate(u.created_at)}</td>
                    <td style={{ textAlign: 'center' }}>
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => openEditModal(u)}
                      >
                        Düzenle
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Yetki Açıklama Kutusu */}
      <div style={{
        backgroundColor: '#f8fafc',
        border: '1px solid #e2e8f0',
        borderRadius: '8px',
        padding: '16px',
        fontSize: '12.5px',
        color: '#475569',
        lineHeight: '1.6'
      }}>
        <h4 style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a', marginBottom: '4px' }}>
          Yetkilendirme Seviyeleri:
        </h4>
        <ul style={{ paddingLeft: '20px' }}>
          <li><strong>Yönetici (Admin):</strong> Tüm alış maliyetleri, brüt kâr oranları, net kâr tabloları, çöp kutusu, audit log, yedekleme ve kullanıcı yönetimine tam erişim sahibidir.</li>
          <li><strong>Personel (Staff):</strong> Ürün alış/satış/stok kaydı girebilir, tahsilat ve ödeme yapabilir. Ancak ürün alış maliyetleri, brüt kârlar gizlenir; finansal kayıt silme ve kullanıcı yönetimi yetkisi kısıtlanır.</li>
        </ul>
      </div>

      {/* Kullanıcı Ekle / Düzenle Modal */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '480px' }}>
            <div className="modal-header">
              <h3 className="modal-title">
                {selectedUser ? 'Kullanıcı Düzenle' : 'Yeni Kullanıcı Oluştur'}
              </h3>
              <button className="btn-icon" onClick={() => setShowModal(false)}><X size={20} /></button>
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
                  <label className="form-label">Kullanıcı Adı *</label>
                  <input
                    type="text"
                    className="form-input"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    disabled={!!selectedUser}
                    required
                  />
                </div>

                <div className="form-group" style={{ marginBottom: '14px' }}>
                  <label className="form-label">Ad Soyad *</label>
                  <input
                    type="text"
                    className="form-input"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group" style={{ marginBottom: '14px' }}>
                  <label className="form-label">Rol & Yetki</label>
                  <select
                    className="select-box"
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                  >
                    <option value="staff">Personel (Maliyet ve Kâr Gizli, Kısıtlı)</option>
                    <option value="admin">Yönetici (Tam Yetkili)</option>
                  </select>
                </div>

                <div className="form-group" style={{ marginBottom: '14px' }}>
                  <label className="form-label">
                    {selectedUser ? 'Yeni Şifre (Değiştirmek istemiyorsanız boş bırakın)' : 'Şifre *'}
                  </label>
                  <input
                    type="password"
                    className="form-input"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required={!selectedUser}
                  />
                </div>

                {selectedUser && (
                  <div className="form-group">
                    <label className="form-label">Hesap Durumu</label>
                    <select
                      className="select-box"
                      value={isActive}
                      onChange={(e) => setIsActive(Number(e.target.value))}
                    >
                      <option value={1}>Aktif</option>
                      <option value={0}>Pasif (Giriş Yapamaz)</option>
                    </select>
                  </div>
                )}
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                  Vazgeç
                </button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  <Check size={16} />
                  <span>{submitting ? 'Kaydediliyor...' : 'Kaydet'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
