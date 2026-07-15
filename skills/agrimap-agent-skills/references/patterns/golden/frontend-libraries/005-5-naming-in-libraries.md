# 5. Naming in Libraries — ต่างจาก frontend-main

⚠️ **ความต่างที่ทำให้ agent hallucinate ข้าม context บ่อยที่สุด** — อย่าเอา naming ของแอป
(`xxx.component.ts` / `XxxComponent`) มายัดใส่ library

## N-lib-1 — ไฟล์ component ไม่มี suffix `.component`

| | frontend-main (แอป) | frontend-libraries |
|---|---|---|
| ไฟล์ | `text-box.component.ts` | **`text-box.ts`** |
| template | `text-box.component.html` | **`text-box.html`** |
| style | `text-box.component.scss` | **`text-box.scss`** (บาง lib ใช้ `.css`) |
| spec | `text-box.component.spec.ts` | **`text-box.spec.ts`** |
| class | `TextBoxComponent` | **`TextBox`** (ไม่มี suffix) |

นี่คือสไตล์ Angular 20+ (standalone, no-suffix) ที่ library workspace รับมาใช้เต็มตัว

```typescript
// ✅ ของจริง ui-kit/src/lib/forms/text-box/text-box.ts
@Component({
  selector: 'agrimap-text-box',              // selector ยังเป็น agrimap- เหมือนแอป
  imports: [FloatLabelModule, InputTextModule, ReactiveFormsModule],
  templateUrl: './text-box.html',
  styleUrl: './text-box.scss',
})
export class TextBox { /* ... */ }            // ← ไม่มี "Component"
```

## N-lib-2 — facade / store / provider

```typescript
// ของจริง agrimap-component/.../import-layer/
export class ImportLayerFacade { }           // import-layer.facade.ts
export class ImportLayerStore { }            // import-layer.facade.store.ts  ⚠️ ดูด้านล่าง
export const ImportLayerProvider: Provider[] = [ImportLayerFacade, ImportLayerStore]

// ของจริง dynamic-lut/
export class DynamicLutFacade { }            // dynamic-lut.facade.ts
export class DynamicLutStore { }             // dynamic-lut.store.ts
export class DynamicLutService { }           // dynamic-lut.service.ts (layer async — ดู 006)
```

## N-lib-3 — selector: `agrimap-` เหมือนเดิม

ตรวจแล้วทุก lib ใช้ prefix `agrimap-` (`agrimap-text-box`, `agrimap-print`, `agrimap-profile`, ...)
กฎเดียวกับแอป — อันนี้ **ไม่ต่าง** ห้ามใช้ `app-`

## ความไม่สม่ำเสมอที่มีอยู่ (legacy — อย่าเลียนแบบ / อย่าไล่แก้ในงานอื่น)

| จุด | สภาพ | ทำอย่างไร |
|---|---|---|
| store ใน agrimap-component | ไฟล์ชื่อ `import-layer.facade.store.ts` (มี `.facade` คั่น) | รูปแบบมาตรฐานคือ `xxx.store.ts` (แบบ dynamic-lut) — ของใหม่ใช้แบบนั้น ของเก่าไม่ต้องแก้ |
| `menu-app.component.ts` | ยังมี suffix `.component` เดิม (`export * ...menu-app.component`) | legacy — component ใหม่ห้ามใส่ `.component` |
| `.css` vs `.scss` | ปนกัน (add-layer ใช้ `.css`, import-layer/layer-config ใช้ `.scss`) | ของใหม่ใช้ `.scss` |
| semicolon style | dynamic-lut ใส่ `;`, import-layer ไม่ใส่ | ตามไฟล์ข้างเคียงในโฟลเดอร์เดียวกัน — prettier เป็นตัวตัดสิน |

**หลัก:** ในงาน refactor อย่า "จัดระเบียบ" naming legacy ที่อยู่ใน `public-api.ts` เพราะ
เปลี่ยนชื่อ class/ไฟล์ที่ export = breaking change (ดู 003) — จัดได้เฉพาะ symbol ภายในที่ไม่ถูก export
