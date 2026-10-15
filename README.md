# KONYA BİLGİSAYAR - Stok + Alım/Satım + Cari Hesap Yönetim Sistemi

Elektronik ürün ticareti yapan (bilgisayar, laptop, MacBook, iPhone/akıllı telefon, PlayStation, ekran kartı, monitör, kulaklık vb.) **KONYA BİLGİSAYAR** için geliştirilmiş; hızlı, sade, kurumsal ve kullanımı son derece kolay web tabanlı yönetim sistemidir.

---

## 🚀 Hızlı Başlangıç

### 1. Uygulamayı Başlatma
Sistem tek bir komutla hem backend API'sini hem de React arayüzünü ayağa kaldırır:

```bash
npm start
```
Tarayıcınızdan **`http://localhost:5001`** adresine gidin.

### 2. Hazır Kullanıcı Giriş Bilgileri
Sistemde önceden tanımlanmış demo kullanıcılar bulunmaktadır (giriş ekranındaki hızlı butonlarla da tek tıkla giriş yapabilirsiniz):

| Rol | Kullanıcı Adı | Şifre | Yetki Seviyesi |
| :--- | :--- | :--- | :--- |
| **Yönetici (Admin)** | `admin` | `admin123` | Tüm maliyetleri, brüt/net kârları, silme/iptal işlemlerini, audit logları, yedeklemeyi ve kullanıcı yönetimini görebilir. |
| **Personel (Staff)** | `personel` | `personel123` | Hızlı satış, alış ve tahsilat yapabilir; ürün maliyetleri ve kâr oranları gizlidir, kayıt silemez. |

---

## 🌟 Öne Çıkan Özellikler ve Modüller

### 1. 📊 Yönetim Paneli (Dashboard)
- **Stoktaki Toplam Cihaz Adedi** ve **Tahmini Satış Değeri**
- **Toplam Stok Maliyeti** ve **Potansiyel Kâr** (Yöneticiye özel)
- **Bu Ayki Satışlar**, **Bu Ayki Alışlar**, **Brüt Kâr** ve **Net Kâr** (Masraflar düşülmüş)
- **Toplam Cari Alacak** (Müşterilerin bize olan toplam borcu)
- **Toplam Cari Borç** (Tedarikçilere olan borcumuz)
- **Kategori Bazında Stok Dağılımı**: Grafik çubukları ile hangi kategoride kaç cihaz ve ne kadar bütçe olduğu
- **Kritik / Bekleyen Cihazlar**: Stokta 30+ gündür satılmayan ürünlerin gün sayısıyla birlikte otomatik listelenmesi ve indirim aksiyonu
- **Son Yapılan Alış ve Satışlar** tablosu

### 2. 💻 Ürün ve Stok Yönetimi (Tekil IMEI / Seri No Takibi)
- Her cihaz tekil olarak takip edilir (Aynı modelden 5 adet olsa bile IMEI/Seri numaralarıyla ayrı kartlar oluşur).
- Bilgiler: Ürün adı, Kategori, Marka, Model, Seri No, IMEI, Durum (Sıfır / 2. El), Kozmetik Durum (A+, A, B, C, Sıfır Kapalı Kutu), Donanım Özellikleri (RAM, SSD, Ekran, Pil Sağlığı %), Alış Tarihi, Tedarikçi, Alış Fiyatı, Tahmini Satış Fiyatı, Fotoğraflar.
- **Canlı IMEI / Seri No Arama:** Üst arama çubuğundan barkod okutur gibi IMEI veya seri no yazıldığında anında cihaz kartı açılır.
- **Çoklu Kombine Filtreleme:** Kategori, marka, durum (sıfır/2.el), stok durumu (stokta, satıldı, rezerve, serviste), fiyat aralığı birlikte filtrelenebilir.
- Ürün fotoğrafları sunucuya yüklenir ve önizlenir.

### 3. 🛍️ Alış İşlemleri (Stok Girişi)
- Tedarikçiden veya müşteriden cihaz alımı yapılırken tek seferde birden fazla cihaz girilebilir.
- Alış fiyatı, ödenen peşinat ve kalan borç belirlenir.
- **Cari Entegrasyonu:** Ödeme tamamen yapılmadıysa kalan tutar otomatik olarak ilgili kişinin cari hesabına borç (bizim borcumuz) olarak işlenir.
- Alış iptal edildiğinde (Yönetici) ürünler stoktan silinir ve cari hareketleri güvenle geri alınır.

### 4. 📈 Satış İşlemleri & Hızlı POS Ekranı
- Yoğun iş ortamında **"+ Hızlı Satış"** butonuna basarak anında POS satış ekranı açılır.
- Müşteri listeden seçilir veya 3 saniyede yeni müşteri oluşturulabilir.
- Stoktaki cihazlar IMEI veya isimle aranıp sepete eklenir.
- Satış tutarı, tahsil edilen peşinat ve ödeme yöntemi (Nakit, Havale, Kart, Açık Hesap) girilir.
- Cihaz stok durumu anında **`sold` (Satıldı)** olur, brüt kâr otomatik hesaplanır.
- Kalan bakiye müşterinin cari ekstresine **alacak** olarak işlenir.
- Satış tamamlandığında doğrudan **Satış Bilgi Fişi & Teslim Belgesi (Makbuz)** yazdırılabilir.

### 5. 🖨️ Yazdırılabilir Satış Fişi / Teslim Belgesi
- Tarayıcı üzerinden A4 formatında veya termal fiş formatında yazdırılabilir.
- Firma adı, adres, telefon ve vergi bilgileri yer alır.
- Satılan cihazların IMEI ve Seri numaraları tek tek dökülür.
- Garanti ve teslim şartları (1 ay firma garantisi, distribütör garantisi vb.) ve karşılıklı imza alanları mevcuttur.

### 6. 👥 Cariler (Müşteri & Tedarikçi Yönetimi)
- Tek bir çatı altında Müşteri, Tedarikçi veya Her İkisi olarak cari tanımlanır.
- Güncel bakiye otomatik hesaplanır:
  - Pozitif Bakiye: **Alacağımız Var** (Müşteri borçlu, Yeşil)
  - Negatif Bakiye: **Borcumuz Var** (Tedarikçiye borçluyuz, Kırmızı)
- **Kronolojik Cari Ekstre:** Cari detay ekranında o kişiyle yapılan tüm Alışlar, Satışlar, Tahsilatlar, Ödemeler ve **Yürüyen Bakiye (Running Balance)** satır satır incelenebilir ve tek tıkla yazdırılabilir.
- Ekstre üzerinden anında **Tahsilat Al** veya **Ödeme Yap** butonları mevcuttur.

### 7. 💳 Ödemeler ve Tahsilatlar (Kasa Hareketleri)
- Sonradan yapılan kısmi ödemeler veya tahsilatlar makbuz numarasıyla (`THS-2026-XXXX`, `ODM-2026-XXXX`) sisteme işlenir.
- Toplam tahsilat, toplam ödeme ve net kasa nakit akışı özet kartlarında gösterilir.

### 8. 🧾 Gider / Masraf Yönetimi
- Dükkan işletme giderleri (Kira, Kargo, Tamir/Bakım, Personel Avans/Maaş, Elektrik/Aidat vb.) tarih, tutar ve açıklamayla kaydedilir.
- Net kâr hesabında masraflar brüt kârdan otomatik düşülür: `Net Kâr = Brüt Kâr - Masraflar`.

### 9. 📊 Raporlama & Excel / PDF Çıktıları
- Tarih aralığı filtreleri: **Bugün**, **Bu Hafta**, **Bu Ay**, **Bu Yıl**, **Tüm Zamanlar** veya **Özel Tarih Aralığı**.
- Alış Raporu, Satış Raporu, Brüt Kâr, Masraflar, Net Kâr, Güncel Stok Değerleme Raporu.
- En çok ciro yapan ürün kategorileri ve en yüksek hacimli cariler.
- **Excel (.xlsx) Dışa Aktarma:** Tek tıkla çok sayfalı Microsoft Excel tablosu iner (`Satışlar`, `Alışlar`, `Güncel Stok`, `Masraflar`, `Cariler`).
- **Yazdır / PDF:** Temiz sayfa düzeniyle anında PDF çıktısı alınabilir.

### 10. ⚙️ Ayarlar, Yedekleme, Çöp Kutusu ve Audit Log
- **Firma Ayarları:** Şirket adı, adres, telefon, vergi dairesi ve fiş altı garanti sözleşmesi metni düzenlenebilir.
- **Veritabanı Yedeği:** Tek tıkla SQLite `.db` veritabanı kopyası veya tüm sistemin `.json` veri dökümü indirilebilir.
- **Çöp Kutusu (Soft Delete):** Yanlışlıkla silinen ürün, cari veya masraflar kalıcı olarak kaybolmaz; çöp kutusundan tek tıkla geri getirilebilir.
- **İşlem Geçmişi (Audit Log):** Hangi kullanıcının ne zaman, hangi IP adresinden, hangi cihazı veya faturayı eklediği/sildiği/düzenlediği kayıt altına alınır.

---

## 🛠️ Teknik Mimari ve Güvenilirlik

- **Veri Tabanı & Tutarlılık:** Node.js çekirdek SQLite (`node:sqlite`) motoru ile WAL (Write-Ahead Logging) modunda çalışır.
- **Finansal Doğruluk:** Para birimi hesaplamalarında floating-point hataları engellenmiştir; tüm tutarlar kuruş cinsinden tam sayı (`integer cents`) olarak saklanır ve işlenir.
- **ACID Transaction:** Alış, satış, tahsilat, ödeme ve stok hareketleri veritabanı transaction blokları içinde çalıştırılır; yarım kalma veya tutarsızlık riski sıfırdır.
- **Performans:** Sayfalama (pagination) ve indeksler (IMEI, Seri No, Tarih, Cari) sayesinde büyük verilerde dahi anında yanıt verir.
- **Tasarım:** Saf Vanilla CSS ile geliştirilmiş kurumsal, göz yormayan, responsive arayüz.

---

## 📁 Proje Dizin Yapısı

```
PCTAKIP/
├── client/                     # React Frontend Uygulaması
│   ├── src/
│   │   ├── components/         # Ortak Arayüz Bileşenleri
│   │   │   ├── Header.jsx      # Üst Başlık & Hızlı IMEI Arama
│   │   │   ├── Sidebar.jsx     # Sol Menü
│   │   │   ├── LoginScreen.jsx # Giriş Ekranı
│   │   │   └── modals/         # Satış, Alış, Ürün, Ekstre ve Fiş Modalları
│   │   ├── views/              # Ana Sayfa Görünümleri (Dashboard, Ürünler, Cariler, vb.)
│   │   ├── utils/              # API İstemcisi & Para/Tarih Formatlayıcıları
│   │   └── index.css           # Vanilla CSS Tasarım Sistemi & Yazdırma Stilleri
│   └── dist/                   # Üretim (Production) Derleme Dosyaları
├── server/                     # Node.js + Express Backend
│   ├── db/
│   │   ├── connection.js       # SQLite Bağlantısı, Transaction & Bakiye Hesaplama
│   │   ├── schema.sql          # Tablo Şemaları ve İndeksler
│   │   └── seed.js             # Konya Bilgisayar Gerçekçi Demo Verileri
│   ├── routes/                 # Modüler REST API Rotaları
│   │   ├── auth.js             # Giriş & Yetkilendirme
│   │   ├── dashboard.js        # KPI & Analitik Metrikleri
│   │   ├── products.js         # Ürün CRUD & IMEI Arama
│   │   ├── cariler.js          # Cari Hesaplar & Kronolojik Ekstre
│   │   ├── purchases.js        # Alış Faturaları
│   │   ├── sales.js            # Satış Faturaları & Kâr Hesabı
│   │   ├── payments.js         # Tahsilat & Ödemeler
│   │   ├── expenses.js         # Masraf Takibi
│   │   ├── reports.js          # Raporlar & Excel (.xlsx) Dışa Aktarma
│   │   ├── users.js            # Kullanıcı Yönetimi
│   │   ├── trash.js            # Çöp Kutusu & Geri Yükleme
│   │   ├── audit.js            # Audit Log Takibi
│   │   └── settings.js         # Sistem Ayarları & Yedekleme
│   ├── uploads/                # Yüklenen Ürün Fotoğrafları
│   ├── data/                   # pctakip.db SQLite Veritabanı
│   └── server.js               # Express Ana Sunucu
├── package.json
└── test_system.js              # Uçtan Uca Bütünlük Test Paketi
```

---
*Geliştirici: Google Antigravity - KONYA BİLGİSAYAR için özel olarak hazırlanmıştır.*
