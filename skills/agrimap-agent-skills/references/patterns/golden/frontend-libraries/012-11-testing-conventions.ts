// 11. Testing Conventions (library)
//
// ตอบ backlog "unit-test conventions" ใน conflict-resolution.md ด้วยหลักฐานจริงจาก workspace
// ทุก component/demo มีไฟล์ .spec.ts คู่กัน (text-box.spec.ts, textbox-demo.spec.ts, ...)
// รันด้วย: ng test <lib>   (แต่ละ project มี architect.test ใน angular.json)

// ---------- baseline spec (ของจริง ui-kit/forms/text-box/text-box.spec.ts) ----------
import { ComponentFixture, TestBed } from '@angular/core/testing'
import { TextBox } from './text-box' // ← import จาก relative path ภายใน lib (ไม่ใช่ @agrimap/*)

describe('TextBox', () => {
  let component: TextBox
  let fixture: ComponentFixture<TextBox>

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TextBox], // standalone component → ใส่ใน imports ตรง ๆ
    }).compileComponents()

    fixture = TestBed.createComponent(TextBox)
    component = fixture.componentInstance
    await fixture.whenStable() // ⭐ ใช้ whenStable() ไม่ใช่ detectChanges() (zoneless-ready)
  })

  it('should create', () => {
    expect(component).toBeTruthy()
  })
})

// ---------- convention ----------
// - naming: describe ใช้ชื่อ class จริง (no-suffix) — describe('TextBox') ไม่ใช่ 'TextBoxComponent'
// - standalone: component เข้า `imports: [...]` ตรง (ไม่มี declarations/NgModule)
// - async setup: `await fixture.whenStable()` (ไม่ใช้ fixture.detectChanges()) — เข้ากับ signal/zoneless
// - import ในสเปกใช้ relative path ('./text-box') — ทดสอบ source ก่อน build ไม่ใช่ package ที่ publish
// - baseline ปัจจุบันคือ smoke test ('should create') เป็นอย่างน้อยทุกตัว
//
// ---------- สิ่งที่ควรเพิ่มเมื่อเขียน spec ใหม่ (ยังเป็น backlog ของทีม) ----------
// - form control: assert isInvalid/isRequired เทียบกับ FormControl ที่ set validators (ดู 009)
// - facade/store: assert selector หลัง mutator (store pure → เทสได้ตรง ๆ ไม่ต้อง mock เวลา)
// - generated API ที่ facade เรียก: provide mock ของ AgmwsXxxApi ผ่าน TestBed providers
//   (mock ที่ระดับ API เพราะ facade คือ orchestrator — ดู 006)
//
// ⚠️ ก่อนตั้ง assertion pattern เป็นมาตรฐานทีม = owner decision (conflict-resolution backlog
//    "FE/BE/SQL: unit-test conventions") — ตอนนี้บันทึกเป็น baseline ที่พบจริงเท่านั้น
