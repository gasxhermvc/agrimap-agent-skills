// 10. form-ctrl — config-driven form (CVA + Validator)
//
// ui-kit/forms/form-ctrl คือ "ตัวสร้างฟอร์มจาก config" ที่รวม form control ทุกตัวของ ui-kit
// เป็น ControlValueAccessor + Validator เต็มรูปแบบ — ต่างจาก text-box (ตัวเดียว, ยืม FormGroup)
// นี่คือตัวที่แอปหลักเรียกผ่าน frmCtrl()?.formGroup (ดู Data Warehouse ใน frontend-main)
//
// ⚠️ นี่เป็น component ที่ซับซ้อนที่สุดใน ui-kit และเป็น public API หลัก —
//    refactor ต้องรักษา CVA/Validator contract + formGroup + output signature ไว้ทั้งหมด

import {
  Component, OnChanges, AfterViewInit, input, output, model, signal,
  viewChildren, contentChildren, forwardRef, OutputEmitterRef,
} from '@angular/core'
import {
  FormGroup, FormsModule, ReactiveFormsModule, ValidationErrors, AbstractControl,
  NG_VALUE_ACCESSOR, NG_VALIDATORS, ControlValueAccessor, Validator,
} from '@angular/forms'
import { CustomContainerDirective } from './custom-container.directive'
import { CustomTemplateDirective } from './custom-template.directive'
import { FormConfig, FormManageButton, CtrlType, StatusControl } from './form-ctrl.model'

@Component({
  selector: 'agrimap-form-ctrl',
  imports: [
    FormsModule, ReactiveFormsModule, CustomContainerDirective,
    // ↓ import form control ทุกตัวของ ui-kit เข้ามา render ตาม config
    // TextBox, Password, Radio, Checkbox, Select, Autocomplete, IdCardBox,
    // PhoneNumberBox, Textarea, RadioGroup, CheckboxGroup, TreeCheckbox,
    // Datetime, MultiSelect, InputNumber, ColorPicker, Slider,
  ],
  templateUrl: './form-ctrl.html',
  styleUrl: './form-ctrl.scss',
  providers: [
    // ⭐ ลงทะเบียนตัวเองเป็น CVA + Validator ให้ Angular Forms รู้จัก
    { provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => FormCtrl), multi: true },
    { provide: NG_VALIDATORS, useExisting: forwardRef(() => FormCtrl), multi: true },
  ],
})
export class FormCtrl implements OnChanges, AfterViewInit, ControlValueAccessor, Validator {
  // custom template ที่ consumer ยัดเข้ามาได้ (contentChildren) + slot ภายใน (viewChildren)
  containerRefs = viewChildren(CustomContainerDirective)
  templateRefs = contentChildren(CustomTemplateDirective)

  private value = signal<any>(undefined)
  formGroup: FormGroup = new FormGroup({}) // ⭐ FormGroup ที่ consumer อ่านผ่าน frmCtrl()?.formGroup
  ctrlType = CtrlType

  // component API (public) — สร้างฟอร์มจาก config array
  readonly formManageButton = input<FormManageButton>({})
  readonly formConfig = model<FormConfig[]>([]) // model() = two-way, consumer แก้ config ได้
  readonly isVertical = input<boolean>(true)
  readonly showRequire = input<boolean>(true)
  readonly formValue = output<OutputEmitterRef<any>>()

  // ControlValueAccessor: writeValue / registerOnChange / registerOnTouched / setDisabledState
  // Validator: validate(control): ValidationErrors | null
  // (implementation เต็มอยู่ในไฟล์จริง — จุดสำคัญคือ contract 6 method นี้ห้ามหาย)
  writeValue(value: any): void { this.value.set(value) }
  registerOnChange(fn: (v: any) => void): void { /* ... */ }
  registerOnTouched(fn: () => void): void { /* ... */ }
  validate(control: AbstractControl): ValidationErrors | null { return null }
}

// จุดที่ต้องระวังตอน refactor form-ctrl:
// - CVA/Validator 6 method + provider NG_VALUE_ACCESSOR/NG_VALIDATORS = contract ที่ Angular
//   Forms พึ่งพา ลบ/เปลี่ยน signature = ฟอร์มทุกที่ที่ใช้พัง
// - `formGroup` เป็น public property ที่ consumer (แอปหลัก) อ่านตรง — ห้าม rename/ทำ private
// - `formConfig` เป็น model() (two-way) ไม่ใช่ input ธรรมดา — เปลี่ยนเป็น input = breaking
// - พบ `(window as any).fc = this` ใน constructor = debug hook เดิม (legacy) ควรลบตอนแตะไฟล์นี้
//   แต่ให้ยืนยันว่าไม่มีใครพึ่ง window.fc ก่อน (grep) — ถ้าไม่มี = dead code ปลอดภัยที่จะลบ
