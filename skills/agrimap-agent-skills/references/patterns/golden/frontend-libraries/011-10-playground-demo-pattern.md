# 10. Playground Demo Pattern — consumer อ้างอิง + ด่าน verify

`projects/playground` เป็นแอป Angular ปกติ (ไม่ publish) ที่ **import `@agrimap/*` เหมือน consumer
ภายนอก** — ทำหน้าที่ 2 อย่าง: (ก) ตัวอย่างวิธีใช้ public API (ข) ที่ทดสอบด้วยตาก่อน publish

## โครงสร้าง demo (จับคู่กับ lib)

```
playground/src/app/features/
├─ ui-kit/forms/textbox-demo/     ← 1 demo ต่อ 1 public component
├─ ui-kit/chart/bar-chart-demo/
├─ agrimap-component-demo/import-layer-demo/
├─ map/map-core-demo/  map/map-viewer-demo/
├─ dynamic-dashboard-demo/
└─ auth-client/  identity/  ...
```

demo ครอบคลุมเกือบทุก public component: forms (textbox, select, multi-select, datetime, ...),
chart, modal, table, map tools, request form ฯลฯ

## ตัวอย่าง demo จริง — textbox-demo.ts

```typescript
import { TextBox } from '@agrimap/ui-kit'            // ⭐ import จาก package name ไม่ใช่ relative path

@Component({
  selector: 'agrimap-textbox-demo',
  imports: [KeyValuePipe, TextBox, ReactiveFormsModule],
  templateUrl: './textbox-demo.html',
  styleUrl: './textbox-demo.scss',
})
export class TextboxDemo {
  form = new FormGroup({
    textBox1: new FormControl<string | null>(null),
    textBox2: new FormControl<string | null>(null, { validators: [Validators.required] }),
    textBox6: new FormControl<string | null>({ value: null, disabled: true }),
  })
  markAllTouched(): void { this.form.markAllAsTouched() }
}
```

จุดสังเกต: demo ใช้ผ่าน `@agrimap/ui-kit` (import แบบ consumer จริง) — ยืนยันว่า `public-api.ts`
export `TextBox` ออกมาถูกต้อง ถ้า refactor แล้ว demo import ไม่ได้ = public API พัง

## บทบาทในการกัน "refactor กระทบ logic"

- **demo = spec เชิงพฤติกรรมด้วยตา** — refactor lib แล้วรัน playground: ถ้า demo ทำงานเหมือนเดิม
  ทุกหน้า = พฤติกรรมไม่ขยับ (ดู 003 นิยาม refactor)
- **เพิ่ม public component ใหม่ → ต้องเพิ่ม demo** ให้ครบ เป็นทั้งเอกสารและตัวจับ regression
- verify loop ที่แนะนำก่อน publish:
  ```bash
  ng build <lib> --configuration production   # 1. public API/type ผ่าน
  ng serve playground                         # 2. เปิด demo ของ lib นั้น ดูว่าทำงานเหมือนเดิม
  ng test <lib>                               # 3. spec ผ่าน (ดู 012)
  ```
- **อย่า publish โดยไม่เปิด playground demo ของ lib ที่แก้** — เป็นด่านสุดท้ายก่อนของถึงแอปหลัก

## เมื่อ demo ทำงานผิดหลัง refactor

= สัญญาณว่าไม่ใช่ refactor แล้ว แต่เป็น logic change (ตั้งใจหรือไม่ก็ตาม) — หยุด ตรวจ diff
เทียบพฤติกรรมเดิม ก่อนไปต่อ
