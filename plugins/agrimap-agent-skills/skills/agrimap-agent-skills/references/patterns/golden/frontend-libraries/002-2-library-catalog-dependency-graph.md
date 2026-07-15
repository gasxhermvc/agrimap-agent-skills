# 2. Library Catalog & Dependency Graph

11 publishable libraries + 1 playground. **จำนวน component/facade ต่อ lib บอก "รูปแบบ" ของมัน** —
สำคัญมากเพราะบอกว่า lib ไหนใช้ facade/store lib ไหนเป็น presentational ล้วน (ดู 006)

| Library (`@agrimap/*`) | ver (dev) | บทบาท | comp | facade | store | peer เด่น |
|---|---|---|---|---|---|---|
| `ui-kit` | 0.0.80 | form control + chart + modal (presentational) | 33 | 0 | 0 | chart.js |
| `map-core` | 0.0.60 | เครื่องมือแผนที่ (buffer, clip, print, identify) | 16 | 0 | 0 | @arcgis/core, primeng, jspdf, jszip |
| `agrimap-component` | 0.0.67 | business component (request form, layer-config, import-layer) | 25 | 17 | 1 | — |
| `auth-client` | 0.0.49 | login/pin/profile/consent flow | 15 | 0 | 0 | ui-kit **0.0.75 (exact!)**, dynamic-lut, @angular/router |
| `dynamic-dashboard` | 0.0.52 | dashboard widget (map/table/text/filter) | 10 | 1 | 1 | — |
| `identity` | 0.0.66 | identity page + guard/interceptor | 4 | 0 | 0 | — |
| `map-viewer` | 0.0.37 | map viewer + layer panel | 5 | 0 | 0 | — |
| `map-layout` | 0.0.4 | arcgis layout map | 3 | 0 | 0 | — |
| `dynamic-lut` | 0.0.8 | lookup table service (facade+store+service) | 0 | 1 | 1 | — |
| `attribute-table` | 0.0.10 | ตารางแสดง attribute | 1 | 0 | 0 | — |
| `map-core-utils` | — | utility ล้วน (detect, url) | 0 | 0 | 0 | — |
| `playground` | — | demo app (ไม่ publish) | — | — | — | ใช้ทุก lib |

## Dependency graph (peer ระหว่าง lib)

```
auth-client ──► ui-kit (0.0.75 exact)   ⚠️
            └─► dynamic-lut
map-core ──► ui-kit (*)
         └─► dynamic-lut (*)
agrimap-component, dynamic-dashboard, map-viewer, map-layout ──► (generated-apis ของตัวเอง)
```

## ⚠️ กับดักที่ทำให้ refactor พังข้าม lib

1. **`auth-client` pin `@agrimap/ui-kit: "0.0.75"` แบบ exact** (ตัวอื่น pin `*` หรือ `^`)
   → เวลา bump `ui-kit` ต้องไปแก้ค่านี้ใน `auth-client/package.json` ด้วย ไม่งั้น consumer
   ได้ ui-kit สองเวอร์ชันตีกัน หรือ npm resolve ไม่ผ่าน
2. **peer เป็น `*` (map-core → ui-kit/dynamic-lut)** → ไม่ล็อกเวอร์ชัน ต้องพึ่ง consumer
   ติดตั้งเวอร์ชันที่เข้ากันเอง — เปลี่ยน public API ของ ui-kit กระทบ map-core เงียบ ๆ
3. **แอปหลักติดตั้งทุก lib พร้อมกัน** (`agmwa-platform-ng/package.json` มี `@agrimap/*` ครบ 10 ตัว)
   → เวอร์ชันของ lib ที่ผูกกันต้อง align กันทั้งชุด ก่อน bump ตัวใดตัวหนึ่งต้องเช็ค peer ของตัวอื่น

**ก่อน bump/refactor lib ใด ๆ:** grep `"@agrimap/<lib>"` ทั่ว `projects/*/package.json` +
`apps/web/agmwa-platform-ng/package.json` เพื่อหา consumer ที่ pin exact ไว้
