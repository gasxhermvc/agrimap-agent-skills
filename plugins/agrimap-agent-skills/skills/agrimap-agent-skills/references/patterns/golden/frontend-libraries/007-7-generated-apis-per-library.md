# 7. Generated APIs — ต่อ library มีชุดของตัวเอง

ความรู้เรื่อง generator รวมเป็นไฟล์เดียวที่ [../../gencode-api.md](../../gencode-api.md)
(2026-07-16 — main และ libraries ใช้ generator ตัวเดียวกัน ต่างแค่ config/output)

สำหรับ `fe-library` ใช้ flavor นี้:

- คำสั่ง: `npm run gen-api:<lib>` → config `tools/generate-code/services.<lib>.json` ราย lib
- output: `projects/<lib>/src/lib/generated-apis/` + `env-injection.ts` (จาก `output` ใน config)
- แต่ละ lib มี generated-apis **แยกชุดของตัวเอง** แม้ service ชื่อซ้ำกัน — import ให้ตรง lib
- `generatedApiProviders` + `ENVIRONMENT_INJECT` alias ราย lib → การ wiring ฝั่ง consumer ดู
  [008-8-environment-injection-consumer-wiring.md](008-8-environment-injection-consumer-wiring.md)
- กฎเหล็ก, config schema, type mapping, workflow — อ่านจากไฟล์กลาง
