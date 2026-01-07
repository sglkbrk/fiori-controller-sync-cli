# Fiori Controller Sync

SAP UI5 / Fiori projelerinde `*-dbg.js` dosyalarını üretim sürümüyle hizalar, `Component-preload.js` artefaktlarını temizler ve `.map` dosyalarını kaldırır. Bu paket CLI dağıtımı içindir; çekirdek mantık `packages/core` altındadır.

## Özellikler

- `*-dbg.js` → eşleşen `.js` dosyasına içerik kopyalar, debug ve `.map` dosyalarını siler
- `Component-preload.js` dosyasını silip boş olarak yeniden oluşturur, `.map` dosyasını kaldırır
- Otomatik dry-run önizlemesi ve `(y/N)` onay adımı
- İsteğe bağlı `.bak` yedeği (`--backup`)
- Windows/macOS/Linux, CommonJS

## CLI (NPM) Kurulum ve Kullanım

- Global: `npm install -g fiori-controller-sync-cli`
- Geçici (npx): `npx fiori-controller-sync-cli --dry-run ./my-fiori-app`

```
fiori-controller-sync-cli [options] [path]
```

- `path` : Tarama kökü (varsayılan: mevcut dizin)
- `-d, --dry-run` : Planı gösterir, değişiklik yapmaz
- `-b, --backup` : .controller.js için .bak yedeği alır
- `-h, --help` : Yardım metnini gösterir

Çalışma akışı (dry-run olmadan):

1. Otomatik dry-run çıktısı gösterilir.
2. `Proceed with changes...? (y/N)` sorusu gelir.
3. `y/yes` ile onaylanırsa gerçek değişiklikler uygulanır.

Örnekler:

- Varsayılan dizinde: `fiori-controller-sync-cli`
- Dry-run: `fiori-controller-sync-cli --dry-run ./my-fiori-app`
- Yedekli: `fiori-controller-sync-cli --backup ./my-fiori-app`
- Belirli dizin: `fiori-controller-sync-cli "C:\\Projects\\FioriApp"`
