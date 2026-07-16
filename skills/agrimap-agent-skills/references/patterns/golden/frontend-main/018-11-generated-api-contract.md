# 11. Generated API Contract — gen-code

ความรู้เรื่อง generator รวมเป็นไฟล์เดียวที่ [../../gencode-api.md](../../gencode-api.md)
(2026-07-16 — main และ libraries ใช้ generator ตัวเดียวกัน ต่างแค่ config/output)

สำหรับ `fe-main` ใช้ flavor นี้:

- คำสั่ง: `npm run gen-api:api` → config `tools/generate-code/services.api.json` (9 services)
- output: `src/app/generated-apis/` (ชุดกลางชุดเดียวของแอป)
- กฎเหล็ก, config schema, type mapping, workflow เมื่อ API เปลี่ยน, และ Detect grep — อ่านจากไฟล์กลาง
