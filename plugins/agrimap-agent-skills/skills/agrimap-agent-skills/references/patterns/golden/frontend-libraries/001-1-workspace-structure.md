# 1. Workspace Structure — Angular library monorepo

ที่มา: `standards/libraries/angular/agrimap-platform` (Angular 21 · ng-packagr multi-library workspace)
ต่างจาก `frontend-main` (แอปเดี่ยว) — ที่นี่คือ **โรงงานผลิต `@agrimap/*` package** ที่แอปหลัก (`agmwa-platform-ng`) ติดตั้งกลับมาใช้

```
agrimap-platform/                     # ng workspace (ไม่มี src/ ที่ root)
├─ angular.json                       # ลงทะเบียนทุก project ใต้ "projects": {...}
├─ package.json                       # scripts build:<lib> / publish:<lib> / gen-api:<lib>
├─ .npmrc                             # @agrimap + @atlasx → Nexus ส่วนตัว (atlasx.cdg.co.th)
├─ tools/generate-code/               # generator ของ generated-apis (services.<lib>.json)
├─ .github/                           # agrimap_frontend_*.md — instruction เดิมของทีม
└─ projects/
   ├─ <lib>/                          # 1 library = 1 publishable package
   │  ├─ ng-package.json              # dest: ../../dist/<lib>, entryFile: src/public-api.ts
   │  ├─ package.json                 # name @agrimap/<lib>, version, peerDependencies
   │  └─ src/
   │     ├─ public-api.ts             # ⭐ สัญญาสาธารณะ — ทุกอย่างที่ export = contract
   │     └─ lib/                      # โค้ดภายใน (แก้ได้อิสระถ้าไม่แตะ public surface)
   │        ├─ component/ | forms/    # component
   │        ├─ configs/               # InjectionToken AGRIMAP_<LIB>_CONFIGS
   │        ├─ services/ facades/     # logic (บาง lib เท่านั้น — ดู 006)
   │        ├─ generated-apis/        # ต่อ lib มีชุดของตัวเอง (ดู 007) + env-injection.ts
   │        └─ utils/ models/ ...
   └─ playground/                     # แอป demo (ไม่ publish) — consumer + verify ก่อน release
```

## กฎโครงสร้างที่ต่างจากแอปหลัก

- **ไม่มี `src/` ที่ root** — ทุกอย่างอยู่ใต้ `projects/<lib>/src/lib`
- **`public-api.ts` คือประตูเดียว** — ไฟล์ที่ไม่ได้ถูก re-export จากนี่ ผู้ใช้ import ไม่ได้
- **`playground/` คือ consumer อ้างอิง** — ทุก public component ควรมี demo ที่นี่ (ดู 011)
- **แต่ละ lib กำหนด peerDependencies เอง** — dependency ข้าม lib เป็น peer ไม่ใช่ bundled (ดู 002)
- แอปหลักไม่ได้ import จาก path เหล่านี้ตรง ๆ — มันติดตั้ง `@agrimap/<lib>` จาก Nexus

**Detect ว่ากำลังอยู่ใน context library ไม่ใช่แอป:** เจอ `ng-package.json` + `public-api.ts` +
`projects/<lib>/` = library workspace → ใช้ convention ชุดนี้ ไม่ใช่ของ `frontend-main`
