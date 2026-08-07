# EAR Vehicle Checker — Reference OCR V17

## เป้าหมาย
ใช้งานจริงตาม workflow:
1. Upload ใบ EAR
2. Upload แบบฟอร์มควบคุมรถ
3. ระบบอ่านข้อมูล 2 ก่อนเป็น reference
4. ระบบค้นหา 3 ค่าเดียวกันใน EAR
5. Compare:
   - CONTAINER NUMBER
   - SEAL NO
   - BOOKING
6. ถ้าทั้ง 3 ผ่าน เปิดปุ่ม Print
7. Print จะพิมพ์ "ไฟล์ข้อมูล 2 ตัวจริง" ไม่สร้างฟอร์มใหม่ จึงเหมือนเอกสารข้อมูล 2

## เหตุผลที่ V17 เปลี่ยนวิธี OCR
เวอร์ชันเก่า OCR File 1 และ File 2 แบบอิสระ ทำให้ OCR error ของสองฝั่งไม่เหมือนกัน
V17 ใช้ File 2 ที่คมชัดกว่าเป็น reference แล้วตรวจว่า EAR มีค่าที่สอดคล้องกับ reference หรือไม่

## Deploy
อัปโหลด:
- index.html
- app.js
- styles.css
- vercel.json
- README.md
ขึ้น GitHub แล้ว Commit
Vercel ใช้ Framework Preset = Other
