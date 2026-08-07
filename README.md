# EAR Vehicle Checker — Conservative Scan V22

V22 แก้ regression จาก V21 โดยกลับมาใช้แนวทางของ V20 ที่เร็วและเสถียร แล้วเพิ่มความแม่นแบบ conservative

## หลักสำคัญ

1. อ่านตำแหน่งเดิมก่อน
2. ถ้าค่ามีรูปแบบถูกต้อง + confidence พอ -> LOCK ผลทันที
3. ไม่ให้ OCR จากตำแหน่งรอบข้างมาแทนค่าที่ดีอยู่แล้ว
4. สแกนซ้าย/ขวา/บน/ล่าง/ขยาย เฉพาะ field ที่อ่านไม่มั่นใจ
5. Candidate จากตำแหน่งเดิมได้คะแนนสูงกว่า fallback
6. ถ้าสองฝั่งอ่านได้แข็งแรงทั้งคู่แต่ค่าต่างกัน ระบบจะไม่ auto-correct ให้เหมือนกัน

## Validation
- Container: ISO 6346
- Seal: THxx + digits / 4 letters + digits
- Booking: SGZG... / BSGZC... / 4-5 letters + digits

## Workflow
Calibration ครั้งแรก -> ใช้งานประจำ Upload 2 files -> Compare -> Print เมื่อผ่าน
