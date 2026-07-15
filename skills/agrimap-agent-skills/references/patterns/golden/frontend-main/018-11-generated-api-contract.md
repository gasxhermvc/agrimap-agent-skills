# 11. Generated API Contract — สร้าง/อัปเดต api contract ด้วย gen-code

ต่อยอดจาก §1 (`generated-apis/ auto-generated จาก /tools — ห้ามแก้มือ`) และ T6 (ต้องแปลง DTO
เป็น domain model) — section นี้บอก **วิธีสร้าง contract จริง** เพื่อ agent ไม่ต้องเดา/เขียน API client เอง

## Entry point (จริงจาก package.json)

```bash
npm run gen-api:api
# = node ./tools/generate-code/gen-api-script.js -n api
#   -n <name> → อ่าน tools/generate-code/services.<name>.json  (แอปหลักใช้ชื่อ "api")
#   -m debug  → print config + timestamp เพิ่ม
```

generator อยู่ใต้ `tools/generate-code/lib/*.js` (openapi → type-renderer → model/api/provider-renderer)
รายละเอียด reverse-engineer อยู่ใน `tools/generate-code/GEN_CODE_SCHEMA.md`

## Config — services.api.json (ของจริง ตัดย่อ)

```jsonc
{
  "prefix": "agmws",           // prefix ของไฟล์/คลาส (agmws-*)
  "useGateway": true,          // path ขึ้นต้น /api → ตัด /api ออกจาก generated URL
  "services": [
    {
      "name": "agmws-data-management",   // ชื่อ folder + base class + suite
      "apiRef": "dataManagement",        // key ต่อกับ environment.api.dataManagement
      "target": "https://.../agmws-data-management/swagger/v1/swagger.json",  // OpenAPI 3 source
      "ignore": [],                      // action/model ที่ไม่ต้อง gen (เช่น /debug/routes)
      "skip": false                      // true = ข้าม service นี้
    }
    // ... 9 services: user-management, initialize, identity, data-management,
    //     file-management, pdpa, layer-management, dynamic-form, dynamic-dashboard
  ]
}
```

## Output ที่ได้ (default: src/app/generated-apis/)

```
src/app/generated-apis/
├─ generated-api-utils.ts               # helper กลาง (convertToCamel, CamelCaseOf)
├─ generated-apis.provider.ts           # generatedApiProviders = [AgmwsXxxApi, ...] (regenerated)
└─ {prefix}-{service}/
   ├─ agmws-{service}-api.ts            # class AgmwsXxxApi — Angular service (HTTP)
   └─ agmws-{service}-models.ts         # DTO ทุกตัว (suffix Dto)
```

Type mapping ที่ generator ใช้: `integer/number→number`, `string→string`,
`string+format:binary→File`, `boolean→boolean`, `object→any`, `array→Array<T>`,
`nullable:true→| null`, unknown→`any` · request body รองรับ `application/json` + `multipart/form-data` ·
response อ่านเฉพาะ `200.application/json.schema`

## Workflow เมื่อ backend API เปลี่ยน (ลำดับที่ถูก)

```
1. ยืนยันว่า swagger ปลายทาง (target) อัปเดตแล้ว
2. npm run gen-api:api            # fetch swagger → เขียนทับ generated-apis/
3. git diff src/app/generated-apis # ตรวจว่า contract เปลี่ยนตรงตามคาด (DTO/method ใหม่/หาย)
4. ตามแก้ facade ที่ใช้ method/DTO ที่เปลี่ยน (compile จะฟ้องจุดที่พัง)
5. convertToCamel + type จาก *.model.ts ก่อนเขียน store (T6) — ไม่เขียน DTO ตรงลง store
6. ng build + ng test
```

## กฎเหล็ก (กัน hallucination + งานพัง)

- **ห้ามเขียน/แก้ไฟล์ใน `generated-apis/` ด้วยมือ** — รอบ gen ถัดไปเขียนทับหมด ถ้า contract ผิด
  ให้แก้ที่ swagger ต้นทางหรือ `services.api.json` (`ignore`/`skip`) แล้ว gen ใหม่
- **ห้ามสร้าง API client / DTO ขึ้นมาเองใน domain** — ถ้าจะเรียก endpoint ใหม่ ต้องมาจาก generator
  (เพิ่ม service ใน config หรือ endpoint ต้องอยู่ใน swagger แล้ว)
- **ชื่อ method ยาวและเดายาก** (มาจาก path+verb ของ swagger) — เปิด `agmws-{service}-api.ts` จริง
  อ่านชื่อก่อนเรียกเสมอ ห้ามเดา (ดู T6 + facade case studies)
- generator **fetch swagger ก่อนลบ output เก่า** — ถ้า fetch fail จะไม่ลบของเดิม (ปลอดภัยระดับหนึ่ง
  แต่แปลว่า output อาจ "ค้าง" เวอร์ชันเก่าถ้า network มีปัญหา — ตรวจ summary ตอน gen เสมอ)

**Detect การละเมิด:** grep `class Agmw` หรือ `interface .*Dto` นอก `src/app/generated-apis/` =
มีคนเขียน API/DTO มือ ผิดกฎ
