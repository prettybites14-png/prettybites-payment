Pretty Bites (HTML Version) - بدون Supabase

✅ يشتغل مباشرة على Live Server / أي استضافة static
✅ الأدمن + المنتجات + الكروت + الإعدادات كلها LocalStorage
✅ الطلبات تظهر في شاشة المطبخ (على نفس الجهاز) وتفتح واتساب فاتورة

تشغيل:
- افتح المجلد في VS Code
- اضغط Live Server على index.html
- أو افتح index.html بالمتصفح مباشرة

الأدمن:
- من الصفحة الرئيسية زر Admin
- الرقم السري الافتراضي: 2323
- يمكن تغييره من Admin → تغيير الباسورد

ملاحظة:
هذا إصدار محلي (LocalStorage). إذا فتحت الموقع على جهاز آخر أو متصفح آخر لن يرى نفس البيانات.


WEEKLY MEAL PLAN:
- Front page includes Weekly Meal Plan in English.
- Admin pages added: admin/weekly-meals.html and admin/weekly-orders.html
- Run SUPABASE_WEEKLY_ORDERS_SETUP.sql in Supabase SQL Editor to save weekly orders in the database.
- Weekly plan settings are saved inside pb_settings, so no extra table is needed for the menu itself.
