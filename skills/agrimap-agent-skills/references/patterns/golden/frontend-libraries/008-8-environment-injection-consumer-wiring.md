# 8. Environment Injection & Consumer Wiring

library ไม่รู้จัก environment ของแอป — มันรับผ่าน **InjectionToken** ที่ consumer เป็นคน provide
มีสองสิ่งที่ต้อง provide ต่อ lib: `ENVIRONMENT_INJECT_<LIB>` (env/api urls) และ
`AGRIMAP_<LIB>_CONFIGS` (config เช่น baseHref)

## ฝั่ง library — นิยาม token + re-export ด้วย alias

```typescript
// generated-apis/env-injection.ts (ทุก lib เหมือนกัน)
import { InjectionToken } from '@angular/core';
export const ENVIRONMENT_INJECT = new InjectionToken<any>('ENVIRONMENT');

// public-api.ts — re-export เป็นชื่อเฉพาะ lib กัน token ชนกันเมื่อหลาย lib อยู่ในแอปเดียว
export { ENVIRONMENT_INJECT as ENVIRONMENT_INJECT_DYNAMIC_LUT } from './lib/generated-apis/env-injection';
```

alias ต่อ lib (ชื่อจริงที่ consumer เห็น — **เป็น public API ห้ามเปลี่ยนพร่ำเพรื่อ**):

| lib | env alias | configs token |
|---|---|---|
| identity | `ENVIRONMENT_INJECT_IDENTITY` | `AGRIMAP_IDENTITY_CONFIGS` |
| agrimap-component | `AGRIMAP_COMPONENT_ENVIRONMENT_INJECT` | `AGRIMAP_COMPONENT_CONFIGS` |
| dynamic-dashboard | `DYNAMIC_DASHBOARD_ENVIRONMENT_INJECT` | — |
| dynamic-lut | `ENVIRONMENT_INJECT_DYNAMIC_LUT` | — |
| map-layout | `ENVIRONMENT_INJECT_MAP_LAYOUT` | — |
| map-core | `ENVIRONMENT_INJECT_MAP_CORE` | `AGRIMAP_MAP_CORE_CONFIGS` |
| ui-kit | — | `AGRIMAP_UI_KIT_CONFIGS` |

⚠️ ชื่อ alias **ไม่สม่ำเสมอ** — บ้าง `ENVIRONMENT_INJECT_<LIB>` บ้าง `<LIB>_ENVIRONMENT_INJECT`
อ่านจาก `public-api.ts` จริงของ lib นั้นเสมอ อย่าเดารูปแบบ

```typescript
// configs/uikit-injection.ts — configs token (แยกจาก env)
export const AGRIMAP_UI_KIT_CONFIGS = new InjectionToken<UIKitConfigs>('UI_KIT_CONFIGS');
```

## ฝั่ง consumer — สองสไตล์การ provide

### สไตล์ 1 — provide token ตรง ๆ ใน app.config (playground/แอปหลัก)

```typescript
// playground app.config.ts (ของจริง)
const agrimapInjection: Provider[] = [
  { provide: AGRIMAP_COMPONENT_CONFIGS, useValue: { baseHref: '' } },
  { provide: AGRIMAP_COMPONENT_ENVIRONMENT_INJECT,
    useValue: { api: { dataManagement: environment.api.dataManagement, /* ... */ } } },
  { provide: ENVIRONMENT_INJECT_DYNAMIC_LUT, useFactory: () => environment },   // useFactory ก็ได้
];
export const appConfig: ApplicationConfig = { providers: [ ...agrimapInjection, /* ... */ ] };
```

### สไตล์ 2 — `provideXxx()` helper ที่ lib ให้มา (EnvironmentProviders)

```typescript
// auth-client, map-viewer, attribute-table ให้ helper แทนการ provide token เอง
provideAuthClient(environment, { provideCallbackRoute: true })    // คืน EnvironmentProviders
// ภายในทำ makeEnvironmentProviders([{ provide: ENVIRONMENT_INJECT_AUTH_CLIENT, useValue: environment }, ...])
```

## ผลต่อการ refactor

- lib ที่มี `provideXxx()` — **helper คือ public API หลัก** อย่าเปลี่ยน signature/พฤติกรรม default
  (`provideCallbackRoute ?? true`, `provideRequireAuthRoute ?? false`) โดยไม่ตามแก้ consumer
- ถ้าเพิ่ม dependency ใหม่ที่ต้องการ env/config ใหม่ → เพิ่มเป็น optional ก่อน (มี default) ไม่งั้น
  consumer เดิมที่ไม่ได้ provide จะพังตอน runtime
- **ห้ามเปลี่ยนชื่อ alias token** ใน `public-api.ts` — grep ชื่อ token ทั่ว `projects/playground`
  และ `apps/web/agmwa-platform-ng` ก่อนแตะ
