# EAR Vehicle Checker — Calibrated V9

หน้าตาและ flow เหมือนเว็บเดิม: อัปโหลด 2 ไฟล์ -> อ่าน 3 ค่า -> เปรียบเทียบ -> แจ้งหัวข้อที่ไม่ตรง

สิ่งที่เปลี่ยนคือวิธี OCR:
- ผู้ใช้กำหนดกรอบ 3 ค่าให้ File 1 และ File 2 ครั้งแรก
- ระบบจำกรอบไว้ใน Browser
- ครั้งถัดไป OCR เฉพาะกรอบนั้น
- ขยายภาพ 6 เท่า
- OCR 5 pass (original / contrast / threshold / soft)
- ใช้ voting เลือกค่าที่อ่านซ้ำตรงกันมากที่สุด
- Container แก้ O/0, I/1, S/5, B/8 เฉพาะรูปแบบ container

## ครั้งแรก
1. Upload File 1 EAR
2. กด "กำหนด/ปรับกรอบอ่านข้อมูล 1"
3. ลากกรอบเฉพาะค่าจริงของ Container, Seal, Booking
4. บันทึก
5. Upload File 2
6. ทำแบบเดียวกัน
7. กด "เริ่มอ่านและเปรียบเทียบ"

กรอบจะถูกบันทึกใน localStorage ของ Browser เครื่องนั้น

## Deploy
อัปโหลด 5 ไฟล์ใน ZIP ไป GitHub แล้ว Import ไป Vercel
Framework = Other
ไม่ต้องมี Build command
