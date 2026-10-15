import React, { useState, useEffect } from 'react';
import {
  Settings,
  Database,
  Trash2,
  History,
  Download,
  RotateCcw,
  Check,
  AlertCircle,
  Building,
  Phone,
  MapPin,
  FileText,
  RefreshCw
} from 'lucide-react';
import { api, getToken } from '../utils/api';
import { formatDateTime } from '../utils/formatters';

export default function SettingsView({ user }) {
  const isAdmin = user?.role === 'admin';

  const [activeTab, setActiveTab] = useState('company'); // company, backup, trash, audit

  // Settings state
  const [settings, setSettings] = useState({
    company_name: 'KONYA BİLGİSAYAR',
    phone: '',
    email: '',
    address: '',
    tax_info: '',
    currency: 'TRY',
    receipt_footer: ''
  });
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Trash Bin state
  const [trashItems, setTrashItems] = useState([]);
  const [trashLoading, setTrashLoading] = useState(false);

  // Audit Logs state
  const [auditLogs, setAuditLogs] = useState([]);
  const [auditLoading, setAuditLoading] = useState(false);

  useEffect(() => {
    async function loadSettings() {
      try {
        setSettingsLoading(true);
        const res = await api.get('/settings');
        if (res.success && res.settings) {
          setSettings(prev => ({ ...prev, ...res.settings }));
        }
      } catch (err) {
        console.error(err);
      } finally {
        setSettingsLoading(false);
      }
    }
    loadSettings();
  }, []);

  const loadTrash = async () => {
    try {
      setTrashLoading(true);
      const res = await api.get('/trash');
      if (res.success) setTrashItems(res.items || []);
    } catch (err) {
      console.error(err);
    } finally {
      setTrashLoading(false);
    }
  };

  const loadAudit = async () => {
    try {
      setAuditLoading(true);
      const res = await api.get('/audit');
      if (res.success) setAuditLogs(res.logs || []);
    } catch (err) {
      console.error(err);
    } finally {
      setAuditLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'trash') loadTrash();
    if (activeTab === 'audit') loadAudit();
  }, [activeTab]);

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    try {
      setSettingsLoading(true);
      const res = await api.put('/settings', { settings });
      if (res.success) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      }
    } catch (err) {
      alert('Ayarlar kaydedilemedi: ' + err.message);
    } finally {
      setSettingsLoading(false);
    }
  };

  const handleRestoreTrash = async (item) => {
    if (!window.confirm(`"${item.name || item.code}" kaydını geri yüklemek istediğinize emin misiniz?`)) {
      return;
    }
    try {
      const res = await api.post('/trash/restore', { type: item.item_type, id: item.id });
      if (res.success) {
        loadTrash();
      }
    } catch (err) {
      alert(err.message || 'Geri yüklenemedi.');
    }
  };

  const handlePurgeTrash = async (item) => {
    if (!window.confirm(`"${item.name || item.code}" kaydını kalıcı olarak silmek istediğinize emin misiniz? Bu işlem GERİ ALINAMAZ.`)) {
      return;
    }
    try {
      const res = await api.delete('/trash/purge', { type: item.item_type, id: item.id });
      if (res.success) {
        loadTrash();
      }
    } catch (err) {
      alert(err.message || 'Kalıcı silinemedi.');
    }
  };

  const downloadDbBackup = () => {
    const token = getToken();
    fetch('/api/settings/backup/download', {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.blob())
      .then(blob => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `KonyaBilgisayar_Yedek_${new Date().toISOString().substring(0, 10)}.db`;
        document.body.appendChild(a);
        a.click();
        a.remove();
      })
      .catch(err => alert('Yedek indirilemedi: ' + err.message));
  };

  const downloadJsonBackup = () => {
    const token = getToken();
    fetch('/api/settings/backup/json', {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.blob())
      .then(blob => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `KonyaBilgisayar_Yedek_${new Date().toISOString().substring(0, 10)}.json`;
        document.body.appendChild(a);
        a.click();
        a.remove();
      })
      .catch(err => alert('JSON yedeği indirilemedi: ' + err.message));
  };

  return (
    <div>
      {/* Tab Navigasyon */}
      <div style={{
        display: 'flex',
        gap: '8px',
        backgroundColor: '#ffffff',
        padding: '8px',
        borderRadius: '8px',
        border: '1px solid #e2e8f0',
        marginBottom: '20px',
        flexWrap: 'wrap'
      }}>
        <button
          className={`btn ${activeTab === 'company' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('company')}
        >
          <Building size={16} />
          <span>Firma & Fiş Bilgileri</span>
        </button>

        {isAdmin && (
          <>
            <button
              className={`btn ${activeTab === 'backup' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setActiveTab('backup')}
            >
              <Database size={16} />
              <span>Veritabanı Yedekleme</span>
            </button>

            <button
              className={`btn ${activeTab === 'trash' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setActiveTab('trash')}
            >
              <Trash2 size={16} />
              <span>Çöp Kutusu (Geri Yükleme)</span>
            </button>

            <button
              className={`btn ${activeTab === 'audit' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setActiveTab('audit')}
            >
              <History size={16} />
              <span>İşlem Geçmişi (Audit Log)</span>
            </button>
          </>
        )}
      </div>

      {/* 1. FİRMA BİLGİLERİ SEKMESİ */}
      {activeTab === 'company' && (
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">
              <Building size={18} style={{ color: '#2563eb' }} />
              <span>İşletme Bilgileri ve Fiş Şablonu</span>
            </h3>
          </div>

          <form onSubmit={handleSaveSettings}>
            <div className="card-body">
              {saveSuccess && (
                <div style={{
                  backgroundColor: '#ecfdf5',
                  border: '1px solid #a7f3d0',
                  color: '#059669',
                  padding: '10px 14px',
                  borderRadius: '6px',
                  fontSize: '13px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  marginBottom: '16px'
                }}>
                  <Check size={16} />
                  <span>Ayarlar başarıyla kaydedildi.</span>
                </div>
              )}

              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">İşletme Adı / Ünvan</label>
                  <input
                    type="text"
                    className="form-input"
                    value={settings.company_name}
                    onChange={(e) => setSettings({ ...settings, company_name: e.target.value })}
                    disabled={!isAdmin}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">İletişim Telefonu</label>
                  <input
                    type="text"
                    className="form-input"
                    value={settings.phone}
                    onChange={(e) => setSettings({ ...settings, phone: e.target.value })}
                    disabled={!isAdmin}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">E-Posta Adresi</label>
                  <input
                    type="email"
                    className="form-input"
                    value={settings.email}
                    onChange={(e) => setSettings({ ...settings, email: e.target.value })}
                    disabled={!isAdmin}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Vergi Dairesi ve No</label>
                  <input
                    type="text"
                    className="form-input"
                    value={settings.tax_info}
                    onChange={(e) => setSettings({ ...settings, tax_info: e.target.value })}
                    disabled={!isAdmin}
                  />
                </div>

                <div className="form-group form-full">
                  <label className="form-label">Açık Adres</label>
                  <input
                    type="text"
                    className="form-input"
                    value={settings.address}
                    onChange={(e) => setSettings({ ...settings, address: e.target.value })}
                    disabled={!isAdmin}
                  />
                </div>

                <div className="form-group form-full">
                  <label className="form-label">Satış Fişi Altı Açıklama & Garanti Şartı</label>
                  <textarea
                    className="form-input"
                    rows={3}
                    value={settings.receipt_footer}
                    onChange={(e) => setSettings({ ...settings, receipt_footer: e.target.value })}
                    disabled={!isAdmin}
                  />
                  <span style={{ fontSize: '11px', color: '#64748b' }}>
                    Yazdırılan satış fişlerinin altında çıkan garanti ve teslim sözleşmesi metnidir.
                  </span>
                </div>
              </div>
            </div>

            {isAdmin && (
              <div style={{ padding: '14px 20px', borderTop: '1px solid #e2e8f0', backgroundColor: '#f8fafc', display: 'flex', justifyContent: 'flex-end' }}>
                <button type="submit" className="btn btn-primary" disabled={settingsLoading}>
                  <Check size={16} />
                  <span>{settingsLoading ? 'Kaydediliyor...' : 'Ayarları Kaydet'}</span>
                </button>
              </div>
            )}
          </form>
        </div>
      )}

      {/* 2. VERİTABANI YEDEKLEME SEKMESİ */}
      {activeTab === 'backup' && isAdmin && (
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">
              <Database size={18} style={{ color: '#2563eb' }} />
              <span>Veritabanı Yedekleme ve Dışa Aktarma</span>
            </h3>
          </div>
          <div className="card-body">
            <p style={{ color: '#475569', fontSize: '13px', lineHeight: '1.6', marginBottom: '20px' }}>
              Sistemdeki tüm ürünler, müşteri/tedarikçi carileri, alışlar, satışlar, kasa hareketleri ve masraflar güvenli bir şekilde yedeklenebilir. Yedek dosyasını harici diske veya bulut sürücünüze kaydedebilirsiniz.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
              {/* SQLite DB Yedeği */}
              <div style={{
                border: '1px solid #cbd5e1',
                padding: '20px',
                borderRadius: '8px',
                backgroundColor: '#f8fafc',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between'
              }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '14px', color: '#0f172a', marginBottom: '4px' }}>
                    Tam SQLite (.db) Dosyası
                  </div>
                  <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '16px' }}>
                    Veritabanının orijinal SQLite ikili kopyasıdır. Sunucu taşımalarında veya acil geri yüklemelerde doğrudan kullanılır.
                  </div>
                </div>

                <button className="btn btn-primary" onClick={downloadDbBackup}>
                  <Download size={16} />
                  <span>pctakip.db Yedeğini İndir</span>
                </button>
              </div>

              {/* JSON Yedeği */}
              <div style={{
                border: '1px solid #cbd5e1',
                padding: '20px',
                borderRadius: '8px',
                backgroundColor: '#f8fafc',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between'
              }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '14px', color: '#0f172a', marginBottom: '4px' }}>
                    JSON Veri Yedeği (.json)
                  </div>
                  <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '16px' }}>
                    Tüm tabloların insan tarafından okunabilir ve harici yazılımlara aktarılabilir JSON formatındaki yedeğidir.
                  </div>
                </div>

                <button className="btn btn-outline" onClick={downloadJsonBackup}>
                  <Download size={16} />
                  <span>JSON Veri Yedeğini İndir</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. ÇÖP KUTUSU SEKMESİ */}
      {activeTab === 'trash' && isAdmin && (
        <div className="card">
          <div className="card-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Trash2 size={18} style={{ color: '#dc2626' }} />
              <div>
                <h3 className="card-title">Çöp Kutusu & Geri Yükleme</h3>
                <span style={{ fontSize: '11px', color: '#64748b' }}>
                  Yanlışlıkla silinen kayıtları tek tıkla geri getirin
                </span>
              </div>
            </div>

            <button className="btn-icon" onClick={loadTrash} title="Yenile">
              <RefreshCw size={16} />
            </button>
          </div>

          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Tür</th>
                  <th>Kod / Fiş No</th>
                  <th>Kayıt Adı / Açıklama</th>
                  <th>Ek Bilgi</th>
                  <th>Silinme Tarihi</th>
                  <th style={{ textAlign: 'center', width: '140px' }}>İşlemler</th>
                </tr>
              </thead>
              <tbody>
                {trashLoading ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>Yükleniyor...</td>
                  </tr>
                ) : trashItems.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '30px', color: '#94a3b8' }}>Çöp kutusu boş.</td>
                  </tr>
                ) : (
                  trashItems.map((item, idx) => (
                    <tr key={idx}>
                      <td>
                        <span className="badge badge-secondary" style={{ textTransform: 'uppercase', fontSize: '10px' }}>
                          {item.item_type}
                        </span>
                      </td>
                      <td style={{ fontFamily: 'monospace', fontWeight: 600 }}>{item.code || '-'}</td>
                      <td style={{ fontWeight: 600 }}>{item.name}</td>
                      <td style={{ fontSize: '12px', color: '#64748b' }}>{item.brand} {item.model}</td>
                      <td>{formatDateTime(item.deleted_at)}</td>
                      <td>
                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                          <button
                            className="btn btn-success btn-sm"
                            style={{ padding: '3px 8px', fontSize: '11px' }}
                            onClick={() => handleRestoreTrash(item)}
                            title="Geri Yükle"
                          >
                            <RotateCcw size={12} />
                            <span>Geri Al</span>
                          </button>
                          <button
                            className="btn btn-danger btn-sm"
                            style={{ padding: '3px 8px', fontSize: '11px' }}
                            onClick={() => handlePurgeTrash(item)}
                            title="Kalıcı Olarak Sil"
                          >
                            <span>Kalıcı Sil</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 4. AUDIT LOG SEKMESİ */}
      {activeTab === 'audit' && isAdmin && (
        <div className="card">
          <div className="card-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <History size={18} style={{ color: '#2563eb' }} />
              <div>
                <h3 className="card-title">İşlem Geçmişi (Audit Log)</h3>
                <span style={{ fontSize: '11px', color: '#64748b' }}>
                  Kullanıcıların yaptığı tüm ekleme, silme, güncelleme ve giriş kayıtları
                </span>
              </div>
            </div>

            <button className="btn-icon" onClick={loadAudit} title="Yenile">
              <RefreshCw size={16} />
            </button>
          </div>

          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Tarih / Saat</th>
                  <th>Kullanıcı</th>
                  <th>İşlem (Aksiyon)</th>
                  <th>Modül</th>
                  <th>Detaylar</th>
                  <th>IP Adresi</th>
                </tr>
              </thead>
              <tbody>
                {auditLoading ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>Yükleniyor...</td>
                  </tr>
                ) : auditLogs.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '30px', color: '#94a3b8' }}>İşlem kaydı yok.</td>
                  </tr>
                ) : (
                  auditLogs.map(log => (
                    <tr key={log.id}>
                      <td style={{ whiteSpace: 'nowrap', fontSize: '12px' }}>{formatDateTime(log.created_at)}</td>
                      <td style={{ fontWeight: 600 }}>{log.username}</td>
                      <td>
                        <span className={`badge ${
                          log.action === 'CREATE' ? 'badge-success' :
                          log.action === 'DELETE' ? 'badge-danger' :
                          log.action === 'RESTORE' ? 'badge-purple' : 'badge-secondary'
                        }`} style={{ fontSize: '10.5px' }}>
                          {log.action}
                        </span>
                      </td>
                      <td style={{ fontWeight: 500, color: '#2563eb' }}>{log.entity_type}</td>
                      <td style={{ fontSize: '12px', color: '#334155', maxWidth: '300px', wordBreak: 'break-all' }}>
                        {log.details_json}
                      </td>
                      <td style={{ fontFamily: 'monospace', fontSize: '11px', color: '#64748b' }}>{log.ip_address}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
