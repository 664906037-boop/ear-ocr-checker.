# EAR Vehicle Checker — Booking Stable V15

โฟกัสเฉพาะความเสถียรของ BOOKING

เพิ่มจาก V14:
- ให้ File 2 (แบบฟอร์มควบคุมรถ) เป็น reference ที่มีน้ำหนักมากกว่าเฉพาะ Booking
- auto-correct File 1 ตาม File 2 เฉพาะเมื่อความยาวเท่ากัน ต่างกันไม่เกิน 2 ตัว
- File 2 ต้องมีรูปแบบ Booking สมเหตุสมผล: 4-5 ตัวอักษร + 7-9 ตัวเลข
- ความต่างต้องอยู่ในกลุ่ม OCR confusion ที่คาดได้ เช่น I/Z, 6/0, 2/Z, O/0, I/1
- similarity รวมต้อง >= 0.80
- ถ้าไม่เข้าเงื่อนไข ระบบจะไม่บังคับให้ตรง

Container และ Seal logic จาก V14 คงเดิม
Calibration boxes เดิมใช้ต่อได้
