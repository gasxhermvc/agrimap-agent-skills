# 7. Generated APIs — ต่อ library มีชุดของตัวเอง

ต่างจากแอปหลัก (ที่มี `generated-apis/` กลางชุดเดียว) — **แต่ละ lib ฝัง generated-apis ของตัวเอง**
ใต้ `projects/<lib>/src/lib/generated-apis/` และ gen แยกด้วย config ราย lib

## โครงสร้าง (dynamic-lut เป็นตัวอย่างเล็กสุด)

```
projects/<lib>/src/lib/generated-apis/
├─ agmws-<service>/
│  ├─ agmws-agmws-<service>-api.ts        # class AgmwsXxxApi — HTTP client
│  └─ agmws-agmws-<service>-models.ts     # DTO (suffix Dto)
├─ env-injection.ts                        # InjectionToken ENVIRONMENT (ดู 008)
├─ generated-api-utils.ts
└─ generated-apis.provider.ts             # generatedApiProviders = [AgmwsXxxApi, ...]
```

lib ใหญ่ (agrimap-component) มีหลาย service ในชุดเดียว: `agmws-ckan`, `agmws-data-management`,
`agmws-dynamic-dashboard`, `agmws-initialize`, `agmws-pro`, `agmws-user-management`

## การ generate (ห้ามแก้มือ)

```bash
node ./tools/generate-code/gen-api-script.js -n <lib>    # = npm run gen-api:<lib>
# config: tools/generate-code/services.<lib>.json  (กำหนดว่า lib นี้ gen service ใดบ้าง)
```

- ทุกไฟล์ใน `generated-apis/` เป็น **auto-generated — ห้ามแก้ด้วยมือ** ถ้า spec เปลี่ยนให้ gen ใหม่
- ถ้า API เปลี่ยน: แก้ backend spec → `npm run gen-api:<lib>` → build → bump → publish
- **`generated-api-utils.ts` มี `convertToCamel` / `CamelCaseOf`** (import-layer ใช้:
  `import { CamelCaseOf, convertToCamel } from '../../utils'`) — DTO ต้องแปลงเป็น domain model
  ก่อนเขียน store เหมือน T6 ของแอป

## generatedApiProviders

```typescript
// generated-apis.provider.ts (dynamic-lut)
import { AgmwsInitializeApi } from './agmws-initialize/agmws-agmws-initialize-api'
export const generatedApiProviders = [ AgmwsInitializeApi ]
```

facade/service ใน lib inject `AgmwsXxxApi` ตรง (ผ่าน DI) — provider array นี้ให้ consumer
หรือ lib เอา provide เข้า injector

## กฎกัน hallucination กับ generated API

- **ชื่อ method ของ generated API ยาวและเดายาก** (เช่น `getBootstrapDynamicLut`,
  `getContentManageContentsContentIdMapService`) — **ต้องเปิดไฟล์ `agmws-*-api.ts` จริงอ่านชื่อ
  ก่อนเขียนเสมอ ห้ามเดาจากความจำ**
- generated API ของ lib นี้ **ไม่ใช่ตัวเดียวกับ** ของแอปหลักหรือ lib อื่น แม้ service ชื่อซ้ำ
  (`agmws-data-management` มีทั้งใน agrimap-component, dynamic-dashboard, map-core, map-layout
  แยกกันคนละชุด) — import ให้ตรง lib ที่กำลังทำงาน
- อย่าแก้ generated file เพื่อ "fix" อะไร — มันจะถูกเขียนทับตอน gen รอบหน้า
