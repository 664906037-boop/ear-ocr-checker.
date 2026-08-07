# EAR Vehicle Checker — Auto Compare V16.2

แก้ปัญหา V16/V16.1 อ่านถอยหลัง

## สาเหตุ
V15 อ่านดีเพราะผู้ใช้จูน Calibration ROI เอง
V16 พยายามฝังกรอบประมาณการอัตโนมัติ ทำให้บางภาพ Crop ผิดตำแหน่งและ OCR ผิด

Calibration ที่เก็บใน localStorage จะอยู่เฉพาะโดเมนเดิม
ถ้าเปลี่ยน Vercel project / preview URL / domain จะไม่เห็น Calibration เดิม

## วิธีทำงาน V16.2
- ไม่มีการใช้กรอบเดาสุ่มอีก
- ครั้งแรกของเว็บไซต์/Browser:
  1. Upload EAR
  2. กดตั้งค่ากรอบข้อมูล 1
  3. ลากเฉพาะค่า Container / Seal / Booking
  4. Save
  5. Upload Vehicle Control Form
  6. ตั้งค่ากรอบข้อมูล 2
  7. Save
- หลังจากนั้นระบบจำกรอบใน Browser
- การใช้งานประจำ: Upload 2 ไฟล์ -> เริ่มอ่านและเปรียบเทียบ

## สำคัญ
ใช้ Production URL เดิมของ Vercel ทุกครั้ง เช่น project-name.vercel.app
หลีกเลี่ยงการใช้งานผ่าน Preview Deployment URL ที่เปลี่ยนชื่อทุก commit เพราะ localStorage แยกตาม domain

OCR Engine ใช้ logic V15:
- Container ISO validation
- Seal OCR consensus
- Booking reference-aware correction
