# กฎการทำงานของ AGENTS

- กฎข้อบังคับเหล่านี้ Agent / Model ต้องปฎิบัติตามอย่างเคร่งครัดให้ถือเป็นเหตุผลของการตัดสินใจสูงสุดในการทำงาน

1. เมื่อใช้ `agm-prompt` เพื่อคุย สรุป และปรับโจทย์เดิมวนต่อเนื่อง ต้องจัดเก็บผลลัพธ์ที่ Model สรุปแล้วเป็น Prompt Result Version เพื่อย้อนดูคำสั่งที่พร้อมนำไปสั่ง Agent ได้ ห้ามสร้าง Requirement Version หรือ folder `requirements` แยกต่างหาก
2. เมื่อจบการสร้าง Prompt Result Version ใดๆ แล้ว Agent / Model ต้องบันทึก Memory และ Log ตาม workflow depth โดย `agm-prompt` เป็น light และห้ามสร้าง `tasks/**`

## การบันทึกชุดคำสั่ง Raw Prompt / Prompt Submit ของผู้ใช้งาน

1. Agent / Model ต้องบันทึกชุดคำสั่ง Prompt ของผู้ใช้งานทุกรายการที่ผู้ใช้งาน Submit เข้ามาเป็น Raw Prompt โดย append ตาม conversation ที่ `./.agrimap-agent/prompts/<yyyy-MM>/<session_id|context_id|room_id>/history.md` เท่านั้น ห้ามเก็บคำตอบของ AI ปนในไฟล์นี้
2. โครงการสร้าง Log ของ Agent ใช้เทมเพลตแบบนี้

```
### [<yyyy-MM-dd HH:mm:ss>]
<Prompt Submit ของผู้ใช้งานครั้งที่ 1 ใน conversation>

### [<yyyy-MM-dd HH:mm:ss>]
<Prompt Submit ของผู้ใช้งานครั้งที่ 2 ใน conversation>
```

## การอัปเดต Prompt Result Version

1. V0 คือ Prompt Submit ของผู้ใช้งานและไม่มี Prompt Result file; เมื่อ Model สรุปคำตอบสำเร็จครั้งแรกให้สร้าง V1 ทันที
2. บันทึก Prompt Result ที่ `./.agrimap-agent/prompts/<yyyy-MM>/<session_id|context_id|room_id>/<context>-vNNN.md` เท่านั้น ทุก workflow artifact ต้องอยู่ใต้ `./.agrimap-agent/` ห้ามใช้ `./agrimap-agent/`
3. เมื่อผู้ใช้งานถามต่อโดยโฟกัส Prompt Result เดิม ให้สร้าง Version ใหม่จาก Version ล่าสุดโดยอัตโนมัติ หากระบุ source file ชัดเจนให้ใช้ไฟล์นั้นหลังตรวจสอบ family; หากไม่แน่ใจให้หยุด `PROMPT_SOURCE_CONFIRM_REQUIRED` และถามผู้ใช้งาน
4. Version ใหม่ต้องเก็บข้อมูลเดิมที่ยัง valid ให้ครบ แล้วผสานข้อมูลเพิ่มเติมหรือการตัดสินใจใหม่เข้าไปโดยไม่ overwrite Version เก่า
5. ตัดหรือเปลี่ยนข้อมูลเดิมได้เฉพาะเมื่อผู้ใช้งานสั่งแก้ เปลี่ยน หรือนำส่วนนั้นออกอย่างชัดเจน
6. Prompt Result หนึ่ง Version เป็นหนึ่งไฟล์ โดยต้องแยกหน้าที่ Main และ Subagent ให้ชัดเจน; ถ้าไม่มี Subagent ให้ระบุว่า Main รับผิดชอบทั้งหมด
