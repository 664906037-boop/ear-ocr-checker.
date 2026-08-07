# EAR Vehicle Checker — Seal & Booking Refined V13

โฟกัสรอบนี้:
- ไม่เปลี่ยน Container logic ที่เริ่มทำงานดีแล้ว
- ปรับ SEAL NO และ BOOKING โดยเฉพาะ
- เพิ่ม field-specific pattern scoring
- เพิ่ม OCR confusion groups เช่น P/F, 3/8, 5/6, 0/O, 1/I/L/T
- ใช้ weighted OCR distance แทน edit distance อย่างเดียว
- ถ้าคู่ค่าต่างกันเฉพาะอักขระที่ OCR มักสับสน ระบบสามารถสร้าง consensus code
- ถ้า consensus มีรูปแบบ Seal/Booking ที่ถูกต้อง จะแสดง "ตรงกันหลังแก้ OCR"
- ถ้ายังไม่มั่นใจ จะแสดง "OCR ไม่ชัวร์" แทนการฟ้อง mismatch

ใช้ calibration boxes เดิมได้
