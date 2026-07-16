# Generated API Contract — gen-code (ใช้ร่วมกันทั้ง fe-main และ fe-library)

generator ตัวเดียวกันทั้งสอง workspace: `tools/generate-code/gen-api-script.js`
(pipeline อยู่ใต้ `lib/*.js`; reverse-engineer ฉบับเต็มอยู่ที่ `tools/generate-code/GEN_CODE_SCHEMA.md`
ของ workspace นั้น ๆ) — ต่างกันแค่ config ที่เลือกและตำแหน่ง output

## Entry point ต่อ workspace

| workspace | คำสั่ง | config | output |
|---|---|---|---|
| แอปหลัก (`agmwa-platform-ng`) | `npm run gen-api:api` | `tools/generate-code/services.api.json` | `src/app/generated-apis/` |
| library workspace (`agrimap-platform`) | `npm run gen-api:<lib>` (เช่น `gen-api:dynamic-lut`) | `tools/generate-code/services.<lib>.json` | `projects/<lib>/src/lib/generated-apis/` + `env-injection.ts` (เมื่อ config มี `output`) |

## Config schema (เหมือนกันทุก workspace)

```jsonc
{
  "prefix": "agmws",           // prefix ของไฟล์/คลาส (agmws-*)
  "useGateway": true,          // path ขึ้นต้น /api → ตัด /api ออกจาก generated URL
  "output": "...",             // (library เท่านั้น) custom path → generator สร้าง env-injection.ts เพิ่ม
  "services": [{
    "name": "agmws-data-management",   // ชื่อ folder + base class + suite
    "apiRef": "dataManagement",        // key ต่อกับ environment.api.<apiRef>
    "target": "https://.../swagger/v1/swagger.json",  // OpenAPI 3 source
    "ignore": [],                      // action/model ที่ไม่ gen (เช่น /debug/routes)
    "skip": false
  }]
}
```

## Output ที่ได้

```
<output>/
├─ generated-api-utils.ts               # convertToCamel, CamelCaseOf
├─ generated-apis.provider.ts           # generatedApiProviders = [AgmwsXxxApi, ...]
├─ env-injection.ts                     # (library เท่านั้น) InjectionToken ENVIRONMENT
└─ agmws-<service>/
   ├─ agmws-agmws-<service>-api.ts      # class AgmwsXxxApi — Angular HTTP client
   └─ agmws-agmws-<service>-models.ts   # DTO ทุกตัว (suffix Dto)
```

Type mapping: `integer/number→number` · `string→string` · `string+format:binary→File` ·
`boolean→boolean` · `object→any` · `array→Array<T>` · `nullable:true→| null` · unknown→`any`
· request body รองรับ `application/json` + `multipart/form-data` · response อ่านเฉพาะ
`200.application/json.schema` · generator **fetch swagger ก่อนลบ output เก่า** — fetch fail = ของเดิมคงอยู่

## Workflow เมื่อ backend API เปลี่ยน

```
1. ยืนยัน swagger ปลายทาง (target) อัปเดตแล้ว
2. รัน gen ตาม workspace (ตารางบน)
3. git diff generated-apis — ตรวจว่า contract เปลี่ยนตรงตามคาด
4. ตามแก้ facade/service ที่ใช้ method/DTO ที่เปลี่ยน (compile ฟ้องจุดพัง)
5. convertToCamel + type จาก *.model.ts ก่อนเขียน store/state (T6)
6. build + test — ฝั่ง library: bump patch + republish จึงจะถึง consumer (ดู frontend-libraries 004)
```

## กฎเหล็ก (ทุก workspace ทุกบทบาท)

- **ห้ามแก้ไฟล์ generated ด้วยมือ** — gen รอบถัดไปเขียนทับหมด แก้ที่ swagger หรือ config แล้ว gen ใหม่
- **ห้ามเขียน API client / DTO เอง** — endpoint ใหม่ต้องมาจาก generator เท่านั้น
- **ชื่อ method เดาไม่ได้** (มาจาก path+verb ของ swagger) — เปิด `agmws-*-api.ts` จริงอ่านก่อนเรียกเสมอ
- generated-apis ของแต่ละ lib **แยกชุดกัน** แม้ service ชื่อซ้ำ (`agmws-data-management` มีทั้งใน
  agrimap-component / dynamic-dashboard / map-core / map-layout คนละชุด) — import ให้ตรง lib ที่ทำงาน
- **Detect:** `grep "class Agmw\|interface .*Dto"` นอกโฟลเดอร์ `generated-apis/` = violation (เขียน API มือ)
