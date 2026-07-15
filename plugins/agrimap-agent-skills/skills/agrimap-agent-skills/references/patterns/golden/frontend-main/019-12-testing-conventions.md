# 12. Testing Conventions — test ที่ "ต้องเขียนแน่ ๆ"

เป้าหมาย: ให้ agent ทุกค่ายเขียน test **รูปแบบเดียวกัน** — deterministic, เกรดได้, กัน
"เขียนคนละทรง" เอกสารนี้แยกชัดว่าอะไร *มีอยู่แล้ว* กับอะไร *บังคับต้องเขียนเพิ่ม*

## Toolchain ของแอป (ต่างจาก library — ห้ามสลับ)

| | frontend-main (แอป) | frontend-libraries |
|---|---|---|
| runner | **Karma + Jasmine** (`ng test`) | Karma + Jasmine (`ng test <lib>`) |
| sync ใน setup | **`fixture.detectChanges()`** | `await fixture.whenStable()` |

> อย่าเอา `whenStable()` ของ library มาใช้ในแอป และอย่าเอา `detectChanges()` มาใช้ใน library —
> ตามไฟล์ข้างเคียงในโปรเจกต์ที่กำลังทำงาน

## สถานะปัจจุบัน (ข้อเท็จจริง — เป็นจุดที่ต้องปิด)

- component spec: **85 ไฟล์ แต่เป็น smoke test (`should create`) ล้วน** — แม้ไฟล์ใหญ่ก็มี `it` เดียว
- facade / store / service spec: **0 ไฟล์** ← ชั้นที่มี logic จริงกลับไม่มีเทสเลย
- **นี่คือช่องโหว่ที่ convention นี้บังคับปิด:** logic อยู่ที่ facade/store → ต้องมีเทสที่นั่น

---

## ระดับ 1 — Component smoke test (มีอยู่แล้ว · คงรูปนี้)

auto-generate มากับ component ใหม่ทุกตัว — **ห้ามลบ** ให้คงเป็น baseline

```typescript
import { ComponentFixture, TestBed } from '@angular/core/testing'

import { ExampleComponent } from './example.component'

describe('ExampleComponent', () => {
  let component: ExampleComponent
  let fixture: ComponentFixture<ExampleComponent>

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ExampleComponent],       // standalone → imports ตรง ๆ
    }).compileComponents()

    fixture = TestBed.createComponent(ExampleComponent)
    component = fixture.componentInstance
    fixture.detectChanges()              // ⭐ แอปใช้ detectChanges (ไม่ใช่ whenStable)
  })

  it('should create', () => {
    expect(component).toBeTruthy()
  })
})
```

- `describe` = ชื่อคลาสจริง · standalone component เข้า `imports` · ห้าม `declarations`/NgModule

---

## ระดับ 2 — Store test (บังคับ เมื่อสร้าง/แก้ store)

store เป็น pure + synchronous (R3) → เทสง่ายสุด **ไม่ต้อง TestBed** สร้าง instance ตรง ๆ
ทุก mutator ที่เพิ่ม/แก้ **ต้องมี test คู่** ยืนยัน "เรียกแล้ว selector เปลี่ยนตามที่ควร"

```typescript
import { ExampleStore } from './example.store'

describe('ExampleStore', () => {
  let store: ExampleStore

  beforeEach(() => {
    store = new ExampleStore()           // pure — new ตรง ๆ ไม่ต้อง inject
  })

  it('เริ่มต้น items ว่าง ไม่ loading', () => {
    expect(store.items()).toEqual([])
    expect(store.loading()).toBeFalse()
  })

  it('setItems → items เปลี่ยน + loading = false', () => {
    store.startLoad()
    store.setItems([{ id: 1, name: 'a' }])
    expect(store.items().length).toBe(1)
    expect(store.loading()).toBeFalse()
  })

  it('setError → error มีค่า + loading = false', () => {
    store.setError('พัง')
    expect(store.error()).toBe('พัง')
    expect(store.loading()).toBeFalse()
  })
})
```

**ต้องครอบ:** ค่าเริ่มต้น + mutator ทุกตัว + selector ที่ derive (computed) ที่ไม่ใช่ pass-through

---

## ระดับ 3 — Facade test (บังคับ เมื่อสร้าง/แก้ use case)

facade คือ orchestrator (R2) → mock **ที่ระดับ generated API** (ไม่ mock store) แล้ว assert
ผลที่ไหลเข้า store selector + เส้น error ทุก use case ที่ยิง API **ต้องมี test ทั้ง success และ error**

```typescript
import { TestBed } from '@angular/core/testing'
import { of, throwError } from 'rxjs'
import { ExampleFacade } from './example.facade'
import { ExampleStore } from './example.store'
import { AgmwsExampleApi } from '../../generated-apis/...'
import { AppService } from '../../core/services/app.service'

describe('ExampleFacade', () => {
  let facade: ExampleFacade
  let api: jasmine.SpyObj<AgmwsExampleApi>
  let appService: jasmine.SpyObj<AppService>

  beforeEach(() => {
    api = jasmine.createSpyObj<AgmwsExampleApi>('AgmwsExampleApi', ['getItems'])
    appService = jasmine.createSpyObj<AppService>('AppService', ['showError'])
    TestBed.configureTestingModule({
      providers: [
        ExampleFacade,
        ExampleStore,                                 // store จริง (pure ปลอดภัย)
        { provide: AgmwsExampleApi, useValue: api },  // mock เฉพาะ API
        { provide: AppService, useValue: appService },
      ],
    })
    facade = TestBed.inject(ExampleFacade)
  })

  it('load() สำเร็จ → items เข้ามาใน selector', () => {
    api.getItems.and.returnValue(of({ data: [{ id: 1, name: 'a' }] } as any))
    facade.load()
    expect(facade.items().length).toBe(1)
    expect(facade.loading()).toBeFalse()
  })

  it('load() error → showError ถูกเรียก + selector ไม่พัง', () => {
    api.getItems.and.returnValue(throwError(() => ({ error: { message: 'x' } })))
    facade.load()
    expect(appService.showError).toHaveBeenCalled()
    expect(facade.items()).toEqual([])
  })
})
```

**ต้องครอบต่อ use case:** (ก) success → store selector ได้ค่า (ข) error → error handling
(showError/setError) ถูกเรียก และ state ไม่ค้าง · use case ที่คืน `Observable<boolean>`
(ดู case studies) → assert ค่าที่ emit (`true`/`false`) ด้วย

---

## กติกาบังคับ (checklist ก่อนถือว่างานเสร็จ)

| แตะอะไร | ต้องมี test |
|---|---|
| สร้าง component | smoke test (ระดับ 1) เป็นอย่างน้อย — ห้ามลบของ auto-gen |
| สร้าง/แก้ **store mutator** | store test (ระดับ 2) ครอบ mutator นั้น |
| สร้าง/แก้ **facade use case** | facade test (ระดับ 3) ทั้ง success + error |
| แก้ util ที่มี logic (converter, validator) | unit test ตรง ๆ ของ function นั้น |

- รัน `ng test` (หรือ `ng test --watch=false --browsers=ChromeHeadless` ใน CI) ให้ผ่านก่อนปิดงาน
- **mock ที่ขอบเสมอ** (generated API, AppService) — store จริงเพราะ pure · อย่า mock ทุกอย่างจน test
  ไม่ได้ทดสอบอะไร
- test ต้อง deterministic: ไม่พึ่งเวลา/network จริง (store sync, facade mock API ด้วย `of()`/`throwError()`)

> หมายเหตุ: convention ระดับ 2–3 เป็น **มาตรฐานที่เพิ่งบังคับ (2026-07-16)** โค้ดเดิมยังเป็น
> smoke-only — งานใหม่/งานที่แตะ facade-store ต้องทำตามนี้ ไม่ต้องไล่ย้อนเขียนของเก่าทั้งหมด
> (ดู conflict-resolution.md — assertion depth ที่ลึกกว่านี้ยังเปิดให้ owner กำหนดเพิ่ม)
