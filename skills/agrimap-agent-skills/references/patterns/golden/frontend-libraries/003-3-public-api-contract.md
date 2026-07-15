# 3. Public API Contract — หัวใจของ "refactor ไม่กระทบงาน"

`public-api.ts` ของแต่ละ lib คือ **frozen contract** — ทุกสิ่งที่ re-export จากนี่คือสิ่งที่
consumer (แอปหลัก + lib อื่น) พึ่งพาได้ กฎเดียวที่กันงานพังคือ:

> **แก้ภายใน `lib/` ได้อิสระ · แก้สิ่งที่ปรากฏใน `public-api.ts` = breaking change ต้อง bump + ตามแก้ consumer**

## ตัวอย่างจริง — dynamic-lut/src/public-api.ts

```typescript
export * from './lib/interfaces/lut-option.model';
export * from './lib/services/dynamic-lut.service';
export * from './lib/facades/dynamic-lut.facade';
export * from './lib/facades/dynamic-lut.store';          // ⚠️ store ก็ถูก export ออกไป
export * from './lib/generated-apis/agmws-initialize/agmws-agmws-initialize-api';
export * from './lib/generated-apis/agmws-initialize/agmws-agmws-initialize-models';
export * from './lib/generated-apis/generated-apis.provider';
export { ENVIRONMENT_INJECT as ENVIRONMENT_INJECT_DYNAMIC_LUT } from './lib/generated-apis/env-injection';
```

## สิ่งที่ contract นี้บอก agent

- **แม้แต่ `store` และ generated API ก็เป็น public** ในบาง lib — เปลี่ยนชื่อ method / signature
  ของ `DynamicLutStore.getLutEntry()` = พังทุกที่ที่ import มัน ไม่ใช่แค่ภายใน lib
- **การ re-export ด้วย alias** (`ENVIRONMENT_INJECT` → `ENVIRONMENT_INJECT_DYNAMIC_LUT`)
  คือชื่อที่ consumer เห็น — ห้ามเปลี่ยน alias โดยไม่ตามแก้ทุก consumer (ดู 008)
- **`export *` = ทุก symbol ที่ export จากไฟล์นั้นหลุดออกไปหมด** เพิ่ม `export` ในไฟล์ที่ถูก
  `export *` = เพิ่ม public surface โดยไม่ตั้งใจ ต้องระวัง

## Checklist ก่อนแก้โค้ดใน library

1. symbol ที่จะแก้อยู่ใน `public-api.ts` (ตรง หรือผ่าน `export *`) หรือไม่?
   - **ไม่อยู่** → refactor ได้อิสระ (rename, split, ย้ายไฟล์) ตราบใดที่ build ผ่าน
   - **อยู่** → เป็น breaking change: bump version + หา consumer ทุกตัว + แก้ให้ครบใน commit เดียว
2. หา consumer: `grep -rn "<Symbol>" projects/ apps/` (ทั้ง playground และแอปหลัก)
3. เปลี่ยนพฤติกรรม (ไม่ใช่แค่โครงสร้าง)? → นั่นคือ logic change ไม่ใช่ refactor — ต้องมี demo/spec ยืนยัน

## กฎทองของการ refactor library

- **refactor = เปลี่ยนโครงสร้างภายในโดย public API + พฤติกรรมเดิมไม่ขยับ** ถ้า `public-api.ts`
  ไม่เปลี่ยนและ playground demo ยังทำงานเหมือนเดิม = ปลอดภัย
- ถ้าจำเป็นต้องเปลี่ยน public API จริง ๆ ให้ทำเป็น **additive** ก่อน (เพิ่มของใหม่ deprecate ของเก่า)
  แล้วค่อยลบใน major รอบถัดไป — อย่าลบ/เปลี่ยน signature ทันทีในงาน refactor
