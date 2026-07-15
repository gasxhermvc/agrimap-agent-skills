# 6. Facade Patterns in Library — และเมื่อไร "ไม่ต้องมี facade"

⚠️ **ข้อเท็จจริงที่สำคัญที่สุดของทั้ง collection:** ใน 11 library **ส่วนใหญ่ไม่มี facade เลย**
อย่าบังคับ pattern facade/store ใส่ทุก component — จะได้ layer เปล่า ๆ ที่ผิดเจตนา

| lib | comp | facade | รูปแบบ |
|---|---|---|---|
| `ui-kit` | 33 | **0** | presentational ล้วน (form control, chart, modal) |
| `map-core` | 16 | **0** | tool component + service |
| `auth-client` | 15 | **0** | feature + service + `provideAuthClient()` |
| `identity` / `map-viewer` / `map-layout` / `attribute-table` | 3–5 | **0** | presentational / service |
| `agrimap-component` | 25 | 17 | component-scoped facade |
| `dynamic-dashboard` | 10 | 1 | facade + store |
| `dynamic-lut` | 0 | 1 | root facade + service + store |

> สอดคล้องกับ `conflict-resolution.md`: baseline คือ `UI → Facade → Store/API` แต่เป็น
> **pattern ที่ขึ้นกับความซับซ้อน ไม่ใช่ข้อบังคับให้สร้างทุก layer ทุก component**
> component ที่แค่รับ `input()` แล้ว render (เช่น ui-kit) — **ไม่ต้องมี facade/store**

## เกณฑ์ตัดสินว่าต้องมี facade ไหม

- component มี **shared state / async orchestration / เรียก generated API** → มี facade
- component แค่ **แสดงผลจาก input + emit output** (presentational) → **ไม่มี** facade, ไม่มี store
- ต้องการ lookup/utility แบบ singleton ทั้งแอป → root service (+ facade บาง ๆ) แบบ dynamic-lut

---

## Variant A — Root singleton facade + service layer (dynamic-lut)

lib ที่ให้บริการ shared ทั้งแอป: `providedIn: 'root'` ทั้ง facade/store/service
**async อยู่ที่ `service` ไม่ใช่ store** (store ยัง pure ตาม R3)

```typescript
// dynamic-lut.store.ts — pure state (เหมือน R3 ของแอป)
@Injectable({ providedIn: 'root' })
export class DynamicLutStore {
  private state = signal<DynamicLutState>({ loading: false, lut: {} });
  readonly loading = computed(() => this.state().loading);
  readonly lut = computed(() => this.state().lut);
  setLut(lut: Record<string, LutOption[]>): void {
    this.state.update((s) => ({ ...s, lut: { ...lut } }));
  }
}

// dynamic-lut.service.ts — ⭐ async/HTTP อยู่ที่นี่ (inject generated API ได้)
@Injectable({ providedIn: 'root' })
export class DynamicLutService {
  private readonly initializeApi = inject(AgmwsInitializeApi);
  async load(): Promise<void> { /* lastValueFrom(queryLUT) → this.lut */ }
}

// dynamic-lut.facade.ts — orchestrate service + store, expose ทั้ง Promise และ Observable
@Injectable({ providedIn: 'root' })
export class DynamicLutFacade {
  private readonly lutService = inject(DynamicLutService);
  private readonly store = inject(DynamicLutStore);
  readonly loading = this.store.loading;
  readonly lut = this.store.lut;

  async load(lutInit?: string[]): Promise<void> {
    this.store.setLoading(true);
    try { await this.lutService.load(); this.store.setLut(this.lutService.lut); }
    finally { this.store.setLoading(false); }
  }
  load$(lutInit?: string[]): Observable<void> { return from(this.load(lutInit)); }
}
```

จุดสังเกต: facade คู่ `load()` (Promise) กับ `load$()` (Observable) เพื่อรองรับ consumer
ทั้งสองสไตล์ — นี่คือ **public API** ของ lib (ถูก export) อย่าเปลี่ยน signature

## Variant B — Component-scoped facade + provider array (import-layer)

facade ที่ผูกกับ component ตัวเดียว: `@Injectable()` (ไม่ใส่ `providedIn`) แล้วลงทะเบียนผ่าน
`Provider[]` ใน `component providers:` — pattern เดียวกับแอปหลัก

```typescript
// import-layer.facade.provider.ts
export const ImportLayerProvider: Provider[] = [ImportLayerFacade, ImportLayerStore]

// import-layer.facade.ts
@Injectable()                                     // ← ไม่มี providedIn (scope = component)
export class ImportLayerFacade {
  private readonly store = inject(ImportLayerStore)
  private readonly dataManagementApi = inject(AgmwsDataManagementApi)  // generated ของ lib นี้
  private readonly destroyRef = inject(DestroyRef)
  readonly loading = this.store.loading                                // re-export selectors
  readonly myContentItems = this.store.myContentItems
  // use cases: pipe + tap/catchError/finalize + takeUntilDestroyed(this.destroyRef)
}
```

## กฎที่ยังบังคับเหมือนแอป (ข้ามมาจาก R1–R5)

- store ยัง **pure + synchronous** — async ไปอยู่ service (Variant A) หรือ facade (Variant B)
- subscription lifecycle-safe: `takeUntilDestroyed(this.destroyRef)` (import-layer มี `destroyRef.onDestroy`
  จัดการ manual subscription หลายตัว — legacy pattern, ของใหม่เลี่ยงไปใช้ `takeUntilDestroyed`)
- component เรียกผ่าน facade selectors (signal) — ไม่ subscribe รับ data เอง
