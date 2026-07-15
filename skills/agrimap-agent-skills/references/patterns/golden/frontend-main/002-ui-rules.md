UI Layer (features/ + shared/)
   │  inject Facade อย่างเดียว + ใช้ Provider ประกาศใน component
   ▼
Facade Layer (xxx.facade.ts)
   │  ├─ อ่าน/เขียน state ผ่าน Store
   │  ├─ เรียก Generated API (AgmwsXxxApi) โดยตรง
   │  └─ ใช้ core services (AppService ฯลฯ) + utils (convertToCamel)
   ▼
Store (xxx.store.ts)          Generated APIs (agmws-*)
   │  signal + computed          HTTP → backend
   ▼
State (Angular signal ภายใน store, expose เป็น computed selectors)