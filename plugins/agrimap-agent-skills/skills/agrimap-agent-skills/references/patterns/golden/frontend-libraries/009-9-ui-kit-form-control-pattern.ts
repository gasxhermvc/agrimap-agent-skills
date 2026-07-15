// 9. UI-Kit Form Control Pattern — ControlContainer + controlName
//
// ⭐ pattern หลักของ ui-kit form control (text-box, select, password, ...)
// ต่างจาก component ในแอป: ไม่ผูก facade/signal state — เป็น presentational wrapper
// ที่ "ยืม" FormControl จาก parent FormGroup ผ่าน ControlContainer
//
// consumer ใช้แบบนี้ (playground textbox-demo — ของจริง):
//   <form [formGroup]="form">
//     <agrimap-text-box controlName="textBox2" label="ชื่อ" />
//   </form>
// โดย form = new FormGroup({ textBox2: new FormControl(null, [Validators.required]) })

import { Component, inject, input, output } from '@angular/core'
import { ControlContainer, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms'
import { InputTextModule } from 'primeng/inputtext'

@Component({
  selector: 'agrimap-text-box', // prefix agrimap- เหมือนแอป
  imports: [InputTextModule, ReactiveFormsModule],
  templateUrl: './text-box.html',
  styleUrl: './text-box.scss',
})
export class TextBox {
  // ⭐ ยืม FormGroup จาก parent — skipSelf + optional กัน error เมื่อใช้เดี่ยว ๆ
  private readonly controlContainer = inject(ControlContainer, { optional: true, skipSelf: true })

  // input: ชื่อ control ใน parent FormGroup + prop การแสดงผล (signal input, generic เสมอ)
  readonly controlName = input<string>('')
  readonly label = input<string>()
  readonly placeholder = input<string | null | undefined>()
  readonly maxLength = input<number | null | undefined>()
  readonly readOnly = input<boolean | null | undefined>()

  // ⚠️ output ใน ui-kit ใช้ชื่อ native event (input/change/focus/blur) — ขัด N4 ของแอป
  //    (แอปห้าม prefix on / ให้ใช้ past-tense) — อันนี้เป็น legacy convention ของ ui-kit
  //    อย่าเลียนแบบใน component แอป และอย่าไล่ rename (เป็น public API — ดู 003)
  input = output<Event>()
  change = output<Event>()
  focus = output<Event>()
  blur = output<Event>()

  // อ่าน FormGroup/FormControl ผ่าน getter — ไม่เก็บสำเนา state
  get form(): FormGroup | null {
    return (this.controlContainer?.control ?? null) as FormGroup | null
  }
  get control(): FormControl | null {
    return (this.form?.get(this.controlName()) ?? null) as FormControl | null
  }

  // validation state อ่านจาก control ตรง ๆ (ไม่ทำ signal เงา)
  get isInvalid(): boolean {
    if (!this.control) return false
    return !!this.control.invalid && (!!this.control.touched || !!this.control.dirty)
  }
  get isRequired(): boolean {
    return !!this.control?.hasValidator(Validators.required)
  }

  onInputEmit(event: Event): void {
    event.stopPropagation()
    this.input.emit(event)
  }
}

// กฎของ pattern นี้:
// - ไม่มี facade/store — เป็น pure presentational (ดู 006: ส่วนใหญ่ของ ui-kit ไม่มี layer)
// - validation/value เป็นของ parent FormGroup — component แค่ render + emit ไม่ถือ state
// - getter (form/control/isInvalid) อ่านสด ๆ ทุกครั้ง — ปลอดภัยเพราะ template ผูกกับ
//   FormControl status ที่ Angular track ให้เอง
// - refactor ได้อิสระ "ภายใน" แต่ input names (controlName/label/...) + output names +
//   selector = public API (ดู 003) เปลี่ยน = พังทุก consumer + ทุก demo
