# 4. Versioning & Publish Workflow

## กติกา version (ข้อตกลงปัจจุบัน — 2026-07-16)

ยังไม่ขยับเป็นข้อตกลงถาวรของทีม ใช้ชั่วคราวดังนี้:

| ช่วง | รูปแบบ | ความหมาย |
|---|---|---|
| dev | `0.0.1 → 0.0.N` | ระหว่างพัฒนา — เพิ่ม patch ท้ายทุกครั้งที่ publish |
| prod | `1.0.0 → 1.0.N` | ปล่อยจริง — เริ่ม `1.0.0` แล้วเพิ่ม patch ท้าย |

> ทุก lib ตอนนี้ยังอยู่ช่วง dev (`0.0.x`) — bump ที่ตำแหน่ง patch (ตัวท้าย) เท่านั้น
> ยังไม่ต้องตัดสิน minor/major จนกว่าทีมจะตกลง semver เต็มรูปแบบ

## ขั้นตอน publish (จาก package.json scripts จริง)

```bash
# 1. build เข้า dist/<lib>
ng build <lib> --configuration production          # = npm run build:<lib>

# 2. publish จาก dist ที่ build แล้ว (รวมใน script publish:<lib>)
npm publish ./dist/<lib>                            # → Nexus @agrimap registry (.npmrc)

# ย่อในคำสั่งเดียว:
npm run publish:<lib>    # เช่น publish:ui-kit, publish:map-core, publish:auth-client
```

`.npmrc` ชี้ scope ไป Nexus ส่วนตัว:
```
@agrimap:registry = https://atlasx.cdg.co.th/nexus/repository/npm-private/
@atlasx:registry  = https://atlasx.cdg.co.th/nexus/repository/npm-private/
```

## ลำดับที่ถูกต้องเมื่อ bump lib ที่มี consumer เป็น lib อื่น

```
1. แก้ + bump version ใน projects/<lib>/package.json
2. ตรวจ consumer ที่ pin exact (ดู 002 — auth-client → ui-kit 0.0.75)
   → ถ้ามี ต้อง bump ค่า peer ใน package.json ของ consumer ด้วย
3. npm run publish:<lib>
4. ตามไป bump "@agrimap/<lib>": "^0.0.N" ใน apps/web/agmwa-platform-ng/package.json
5. verify ด้วย playground demo ก่อน (ดู 011) — อย่ารอไปเจอ error ที่แอปหลัก
```

## กฎกัน "publish แล้วงานพัง"

- **build production ต้องผ่านก่อน publish เสมอ** — `ng build <lib> --configuration production`
  เป็นด่านจับ breaking change ของ public API (type ไม่ตรง / symbol หาย)
- **อย่า publish โดยไม่ bump version** — Nexus ปฏิเสธ version ซ้ำ และ consumer จะไม่เห็นของใหม่
- **bump lib ที่ถูก pin exact โดยไม่ตามแก้ consumer = พังทันที** (ดู 002 ข้อ 1)
- งาน refactor ล้วน (public API เดิม) ก็ยัง **ต้อง bump patch + republish** ถ้าอยากให้ของใหม่ถึงแอป —
  เพราะแอปดึงจาก Nexus ไม่ใช่จาก source
