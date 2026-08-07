# EAR Vehicle Checker — Fast Learned Scan V20

V20 เน้นสองเรื่องพร้อมกัน:
1. อ่านเร็วขึ้น
2. จำทั้งตำแหน่งและรูปแบบของข้อมูล

## สิ่งที่ระบบจำ

### CONTAINER NUMBER
- ตำแหน่งโดยประมาณจาก Calibration
- รูปแบบ 4 ตัวอักษร + 7 ตัวเลข
- ตรวจ ISO 6346 check digit

### SEAL NO
- ตำแหน่งโดยประมาณ
- รูปแบบ prefix ตัวอักษร + เลข
- pattern ที่พบจริง เช่น THBP49717

### BOOKING
- ตำแหน่งโดยประมาณ
- รูปแบบ 4-5 ตัวอักษร + 7-9 ตัวเลข
- pattern ที่พบจริง เช่น SGZG06748700 / BSGZC26001315

## Fast Scan Pipeline

Stage 1:
อ่านเฉพาะตำแหน่งที่จำไว้ 3 pass:
- sharpen
- contrast
- threshold

ถ้าค่าที่อ่านได้ตรง pattern -> จบทันที

Stage 2:
ถ้ายังไม่มั่นใจ ค้นหาเฉพาะ:
- ซ้าย
- ขวา
- บน
- ล่าง

Stage 3:
เฉพาะภาพยากจริง ๆ จึงค้นหา:
- expanded ROI
- wide left
- wide right

ดังนั้นภาพปกติควรเร็วกว่า V19 มาก เพราะไม่ต้อง OCR หลายตำแหน่งทุกครั้ง

## Workflow
Calibration ครั้งแรกเหมือนเดิม
หลังจากนั้น:
Upload 2 files -> Check -> Compare -> Print เมื่อผ่าน
