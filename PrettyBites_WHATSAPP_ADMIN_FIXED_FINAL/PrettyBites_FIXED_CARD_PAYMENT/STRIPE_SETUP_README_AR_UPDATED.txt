اعدادات Netlify المطلوبة:

1) افتح Netlify > Project configuration > Environment variables
2) اضف هذه المتغيرات بالضبط:

STRIPE_SECRET_KEY = sk_test_xxxxx
STRIPE_PUBLISHABLE_KEY = pk_test_xxxxx
SITE_URL = https://prettybites.ca

مهم:
- STRIPE_SECRET_KEY يجب ان يبدأ بـ sk_
- STRIPE_PUBLISHABLE_KEY يجب ان يبدأ بـ pk_
- بعد الحفظ اعمل: Deploys > Trigger deploy > Clear cache and deploy site

للفحص:
افتح هذا الرابط بعد النشر:
/.netlify/functions/debug-stripe-env

يجب ان ترى:
- hasSecret: true
- secretPrefix: "sk_"
- hasPublishable: true
- publishablePrefix: "pk_"
- ok: true
