import React, { useState } from 'react';
import { Lock, User, ShieldCheck, ArrowRight, AlertCircle } from 'lucide-react';
import { api, setAuth } from '../utils/api';

export default function LoginScreen({ onLoginSuccess }) {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin123');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username || !password) {
      setError('Kullanıcı adı ve şifre gereklidir.');
      return;
    }

    try {
      setLoading(true);
      setError('');
      const data = await api.post('/auth/login', { username, password });
      if (data.success) {
        setAuth(data.token, data.user, data.settings);
        onLoginSuccess(data.user, data.settings);
      } else {
        setError(data.message || 'Giriş başarısız.');
      }
    } catch (err) {
      setError(err.message || 'Giriş yapılırken bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = (userType) => {
    if (userType === 'admin') {
      setUsername('admin');
      setPassword('admin123');
    } else {
      setUsername('personel');
      setPassword('personel123');
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#0f172a',
      padding: '20px',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Arka plan süslemesi */}
      <div style={{
        position: 'absolute',
        top: '-15%',
        right: '-10%',
        width: '500px',
        height: '500px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(37, 99, 235, 0.2) 0%, rgba(15, 23, 42, 0) 70%)',
        pointerEvents: 'none'
      }} />

      <div style={{
        width: '100%',
        maxWidth: '420px',
        backgroundColor: '#ffffff',
        borderRadius: '12px',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        overflow: 'hidden',
        zIndex: 1
      }}>
        {/* Başlık Alanı */}
        <div style={{
          backgroundColor: '#1e293b',
          padding: '28px 24px',
          textAlign: 'center',
          color: 'white',
          borderBottom: '2px solid #2563eb'
        }}>
          <div style={{
            width: '52px',
            height: '52px',
            borderRadius: '10px',
            backgroundColor: '#2563eb',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 12px',
            color: 'white',
            fontWeight: 800,
            fontSize: '22px'
          }}>
            KB
          </div>
          <h2 style={{ fontSize: '18px', fontWeight: 700, letterSpacing: '0.5px' }}>
            KONYA BİLGİSAYAR
          </h2>
          <p style={{ color: '#94a3b8', fontSize: '12px', marginTop: '4px' }}>
            Stok + Alım/Satım + Cari Yönetim Sistemi
          </p>
        </div>

        {/* Form Alanı */}
        <div style={{ padding: '24px' }}>
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

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="form-group">
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <User size={14} />
                <span>Kullanıcı Adı</span>
              </label>
              <input
                type="text"
                className="input-text input-no-icon"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Kullanıcı adınızı girin"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Lock size={14} />
                <span>Şifre</span>
              </label>
              <input
                type="password"
                className="input-text input-no-icon"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', padding: '10px', marginTop: '6px', fontSize: '14px', fontWeight: 600 }}
              disabled={loading}
            >
              {loading ? 'Giriş Yapılıyor...' : (
                <>
                  <span>Giriş Yap</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          {/* Test / Hızlı Demo Hesap Butonları */}
          <div style={{
            marginTop: '24px',
            paddingTop: '16px',
            borderTop: '1px solid #e2e8f0',
            textAlign: 'center'
          }}>
            <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>
              Hızlı Demo Girişi:
            </span>
            <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                style={{ flex: 1, fontSize: '11.5px' }}
                onClick={() => handleQuickLogin('admin')}
              >
                <ShieldCheck size={14} style={{ color: '#2563eb' }} />
                <span>Yönetici (admin)</span>
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                style={{ flex: 1, fontSize: '11.5px' }}
                onClick={() => handleQuickLogin('staff')}
              >
                <User size={14} style={{ color: '#059669' }} />
                <span>Personel (personel)</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
