# 🔥 Firebase Event Tracker

Firebase Analytics DebugView sayfasında tetiklenen event'leri takip eden Chrome uzantısı.

## 📋 Özellikler

- Firebase DebugView'da event'leri gerçek zamanlı takip
- Event tetiklenme sayılarını gösterme
- Önemli event'leri filtreleme (keyword bazlı)
- Event listesini tablo formatında kopyalama (Slack ve Excel'e yapıştırılabilir)
- Sürüklenebilir panel

## 🚀 Kurulum

1. Bu klasörü bilgisayarınıza indirin/kopyalayın
2. Chrome tarayıcısında `chrome://extensions` adresine gidin
3. Sağ üst köşeden **"Geliştirici modu"** nu açın
4. **"Paketlenmemiş öğe yükle"** butonuna tıklayın
5. İndirdiğiniz klasörü seçin
6. Uzantı yüklenecektir ✅

## 📖 Kullanım

1. Firebase Console'da **DebugView** sayfasını açın
2. Sayfada sağ üstte **🔥 Event Tracker** paneli görünecek
3. **Başlat** butonuna tıklayın
4. Event'ler otomatik olarak listelenecek
5. **Kopyala** butonu ile event listesini kopyalayabilirsiniz

### Önemli Event Filtreleri

- "Önemli Event Filtreleri" bölümüne keyword ekleyerek belirli event'leri filtreleyebilirsiniz
- Örnek: "purchase" eklerseniz, adında "purchase" geçen tüm event'ler "Önemli Olaylar" sekmesinde görünür

## 📁 Dosya Yapısı

```
firebase_event_tracker/
├── manifest.json          # Uzantı yapılandırması
├── js/
│   ├── content.js         # Ana içerik scripti
│   ├── background.js      # Arka plan scripti
│   └── iframe-scanner.js  # iframe tarayıcı
├── icons/                 # Uzantı ikonları
└── README.md              # Bu dosya
```

## ⚠️ Notlar

- Uzantı sadece Firebase Analytics DebugView sayfasında çalışır
- Panel sürüklenebilir - istediğiniz konuma taşıyabilirsiniz
- "Temizle" butonu tüm sayaçları sıfırlar

## 🔧 Sorun Giderme

**Panel görünmüyor:**

- Sayfayı yenileyin
- Uzantının etkin olduğundan emin olun

**Event'ler sayılmıyor:**

- "Başlat" butonuna tıkladığınızdan emin olun
- DebugView'da cihaz seçili olduğundan emin olun

---

Sorularınız için Omer Demir ile iletişime geçin.
