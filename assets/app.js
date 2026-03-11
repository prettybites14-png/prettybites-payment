// =========================
// Supabase Storage Helpers (Admin Upload)
// =========================
window.PB_STORAGE_BUCKET = window.PB_STORAGE_BUCKET || "pb-images";

function pbGetSupabaseHeaders(extra){
  const h = {
    "apikey": window.SUPABASE_ANON_KEY,
    "Authorization": "Bearer " + window.SUPABASE_ANON_KEY
  };
  // Admin-key header so RLS policies for storage can allow writes
  if(window.PB_ADMIN_KEY) h["x-admin-key"] = window.PB_ADMIN_KEY;
  return Object.assign(h, extra||{});
}

function pbPublicUrl(bucket, path){
  return `${window.SUPABASE_URL}/storage/v1/object/public/${bucket}/${path}`;
}

function pbSafeName(name){
  return String(name||"image")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g,"-")
    .replace(/-+/g,"-")
    .replace(/^-|-$/g,"");
}

async function pbUploadImageToSupabase(file, folder){
  if(!file) throw new Error("No file");
  const ext = (file.name && file.name.includes(".")) ? file.name.split(".").pop().toLowerCase() : "png";
  const rawBase = pbSafeName(file.name || "image");
  const base = rawBase.replace(/\.[a-z0-9]+$/i, "") || "image";
  const id = (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : (Date.now()+"-"+Math.random().toString(16).slice(2));
  const path = `${folder}/${id}-${base}.${ext}`;

  const url = `${window.SUPABASE_URL}/storage/v1/object/${window.PB_STORAGE_BUCKET}/${path}`;
  const ctrl = window.AbortController ? new AbortController() : null;
  const timer = ctrl ? setTimeout(()=>ctrl.abort(), 20000) : null;

  let res;
  try{
    res = await fetch(url, {
      method: "POST",
      headers: pbGetSupabaseHeaders({
        "Content-Type": file.type || "application/octet-stream",
        "x-upsert": "true"
      }),
      body: file,
      signal: ctrl ? ctrl.signal : undefined
    });
  }catch(err){
    if(timer) clearTimeout(timer);
    throw new Error("تعذر رفع الصورة إلى Supabase. تأكد من الاتصال والـ policies.");
  }
  if(timer) clearTimeout(timer);

  if(!res.ok){
    const t = await res.text().catch(()=> "");
    throw new Error("فشل رفع الصورة إلى Supabase: " + res.status + " " + t);
  }
  return pbPublicUrl(window.PB_STORAGE_BUCKET, path);
}

/* Pretty Bites - HTML version (LocalStorage admin) */
const LS = {
  settings: "pb_settings_v1",
  cards: "pb_cards_v1",
  products: "pb_products_v1",
  orders: "pb_orders_v1",
  adminOk: "pb_admin_ok_v1",
};

function uid() {
  // Use real UUIDs (required when inserting into Supabase UUID columns)
  if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
  // Fallback (not a UUID) - should rarely be used
  return Math.random().toString(16).slice(2) + "-" + Date.now().toString(16);
}

const DEFAULTS = {
  settings: {
    storeName: "Pretty Bites",
    whatsappPhone: "12263453432",
    adminPassword: "2323",
    adminKey: "PB-ADMIN-2323",
    theme: {
      pageBg: "#0b0f1a",
      cardOverlay: "rgba(0,0,0,.25)",
      gradientText: ["#ff3d8d","#ffb703","#00d4ff"],
      textColor: "#ffffff",
      radius: 18,
      fontSizeBase: 16
    }
  },
  cards: [
    { id: uid(), title: "الحلويات", subtitle: "", image: "https://images.unsplash.com/photo-1542826438-bd32f43d626f?auto=format&fit=crop&w=1200&q=60", slug: "sweets", enabled: true, sort: 1 },
    { id: uid(), title: "المطعم", subtitle: "", image: "https://images.unsplash.com/photo-1529692236671-f1f6cf9683ba?auto=format&fit=crop&w=1200&q=60", slug: "restaurant", enabled: true, sort: 2 },
  ],
  products: [
    { id: uid(), slug: "sweets", name: "كنافة نابلسية", price: 12.00, image: "https://images.unsplash.com/photo-1621996346565-e3dbc646d1cb?auto=format&fit=crop&w=1200&q=60", enabled: true, available: true },
    { id: uid(), slug: "sweets", name: "قطايف", price: 10.00, image: "https://images.unsplash.com/photo-1600959907703-125ba1374a12?auto=format&fit=crop&w=1200&q=60", enabled: true, available: true },
    { id: uid(), slug: "restaurant", name: "شاورما", price: 9.50, image: "https://images.unsplash.com/photo-1625943553852-781c6dd46faa?auto=format&fit=crop&w=1200&q=60", enabled: true, available: true },
  ],
  orders: []
};

function load(key, fallback){
  try{
    const raw = localStorage.getItem(key);
    if(!raw) return fallback;
    return JSON.parse(raw);
  }catch(e){
    return fallback;
  }
}
function save(key, value){
  localStorage.setItem(key, JSON.stringify(value));
}

function ensureData(){
  const s = load(LS.settings, null);
  if(!s) save(LS.settings, DEFAULTS.settings);

  const c = load(LS.cards, null);
  if(!c) save(LS.cards, DEFAULTS.cards);

  const p = load(LS.products, null);
  if(!p) save(LS.products, DEFAULTS.products);

  const o = load(LS.orders, null);
  if(!o) save(LS.orders, DEFAULTS.orders);
}

function getSettings(){ ensureData(); return load(LS.settings, DEFAULTS.settings); }
function setSettings(next){ save(LS.settings, next); pbNotifyCatalogChanged("settings"); pbPushSettingsToSupabase(next).catch(console.warn); }

function getCards(){ ensureData(); return load(LS.cards, DEFAULTS.cards); }
function setCards(next){ save(LS.cards, next); pbNotifyCatalogChanged("cards"); pbPushCardsToSupabase(next).catch(console.warn); }

function normalizeProducts(list){
  return (list||[]).map(p=>{
    const enabled = (typeof p.enabled==="boolean") ? p.enabled : (typeof p.active==="boolean" ? p.active : true);
    const available = (typeof p.available==="boolean") ? p.available : true;
    return {...p, enabled, available};
  });
}
function getProducts(){ ensureData(); return normalizeProducts(load(LS.products, DEFAULTS.products)); }
function setProducts(next){ save(LS.products, next); pbNotifyCatalogChanged("products"); pbPushProductsToSupabase(next).catch(console.warn); }

function getOrders(){ ensureData(); return load(LS.orders, DEFAULTS.orders); }
function setOrders(next){ save(LS.orders, next); }

function money(x){ return "$" + Number(x || 0).toFixed(2); }

function applyTheme(){
  const s = getSettings();
  const t = s.theme || {};
  document.documentElement.style.setProperty("--page-bg", t.pageBg || "#0b0f1a");
  document.documentElement.style.setProperty("--card-overlay", t.cardOverlay || "rgba(0,0,0,.25)");
  document.documentElement.style.setProperty("--g1", (t.gradientText||["#ff3d8d"])[0] || "#ff3d8d");
  document.documentElement.style.setProperty("--g2", (t.gradientText||["#ff3d8d","#ffb703"])[1] || "#ffb703");
  document.documentElement.style.setProperty("--g3", (t.gradientText||["#ff3d8d","#ffb703","#00d4ff"])[2] || "#00d4ff");
  document.documentElement.style.setProperty("--text", t.textColor || "#ffffff");
  document.documentElement.style.setProperty("--radius", (t.radius ?? 18) + "px");
  document.documentElement.style.setProperty("--fs", (t.fontSizeBase ?? 16) + "px");
  const nameEl = document.querySelector("[data-store-name]");
  if(nameEl) nameEl.textContent = s.storeName || "Pretty Bites";
}

function qs(k){
  const u = new URL(location.href);
  return u.searchParams.get(k);
}

function nav(url){ location.href = url; }

function toast(msg){
  const t = document.getElementById("toast");
  if(!t) return alert(msg);
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(window.__toastT);
  window.__toastT = setTimeout(()=>t.classList.remove("show"), 1800);
}

// Cart
const CART_KEY = "pb_cart_v1";
function getCart(){ return load(CART_KEY, []); }
function setCart(items){ save(CART_KEY, items); updateCartBadge(); }
function updateCartBadge(){
  const items = getCart();
  const count = items.reduce((s,it)=>s+(it.qty||0),0);
  const el = document.querySelector("[data-cart-badge]");
  if(el) el.textContent = count;
}
function addToCart(prod, qty){
  const items = getCart();
  const i = items.findIndex(x=>x.id===prod.id);
  if(i>=0) items[i].qty += qty;
  else items.push({ id: prod.id, name: prod.name, price: prod.price, image: prod.image, qty });
  setCart(items);
  toast("Added to cart ✅");
}
function incCart(id){
  const items = getCart();
  const it = items.find(x=>x.id===id);
  if(it) it.qty += 1;
  setCart(items);
}
function decCart(id){
  const items = getCart();
  const it = items.find(x=>x.id===id);
  if(it) it.qty = Math.max(1, it.qty-1);
  setCart(items);
}
function removeCart(id){
  const items = getCart().filter(x=>x.id!==id);
  setCart(items);
}
function clearCart(){ setCart([]); }


// =========================
// Supabase Catalog Sync (settings/cards/products)
// Local cache + Supabase source of truth
// Supports both legacy pb_* tables and generic products/categories/settings tables
// =========================
function pbRestUrl(table, query){
  return `${window.SUPABASE_URL}/rest/v1/${table}${query||""}`;
}

async function pbRestSelect(table, query){
  const res = await fetch(pbRestUrl(table, query), {
    headers: pbGetSupabaseHeaders({
      "Accept": "application/json"
    })
  });
  if(!res.ok) throw new Error(`SELECT ${table} failed: ${res.status}`);
  return await res.json();
}

async function pbRestUpsert(table, rows){
  const res = await fetch(pbRestUrl(table, ""), {
    method: "POST",
    headers: pbGetSupabaseHeaders({
      "Content-Type": "application/json",
      "Prefer": "resolution=merge-duplicates,return=representation"
    }),
    body: JSON.stringify(rows)
  });
  if(!res.ok){
    const t = await res.text().catch(()=> "");
    throw new Error(`UPSERT ${table} failed: ${res.status} ${t}`);
  }
  return await res.json().catch(()=>[]);
}

async function pbRestDeleteWhere(table, query){
  const res = await fetch(pbRestUrl(table, query), {
    method: "DELETE",
    headers: pbGetSupabaseHeaders({
      "Prefer": "return=minimal"
    })
  });
  if(!res.ok){
    const t = await res.text().catch(()=> "");
    throw new Error(`DELETE ${table} failed: ${res.status} ${t}`);
  }
  return true;
}

const PB_TABLE_CACHE = { settings:null, cards:null, products:null };

const PB_TABLE_OPTIONS = {
  settings: [
    { table: "pb_settings", select: "?select=data&id=eq.1", kind: "pb" },
    { table: "settings", select: "?select=*", kind: "generic" }
  ],
  cards: [
    { table: "pb_cards", select: "?select=id,title,subtitle,image,slug,enabled,sort&order=sort.asc", kind: "pb" },
    { table: "categories", select: "?select=*&order=sort.asc.nullslast,name.asc.nullslast,title.asc.nullslast", kind: "generic" }
  ],
  products: [
    { table: "pb_products", select: "?select=id,slug,name,price,desc,image,enabled,available&order=created_at.desc", kind: "pb" },
    { table: "products", select: "?select=*&order=name.asc", kind: "generic" }
  ]
};

async function pbDetectTable(type){
  if(PB_TABLE_CACHE[type]) return PB_TABLE_CACHE[type];
  const opts = PB_TABLE_OPTIONS[type] || [];
  for(const opt of opts){
    try{
      await pbRestSelect(opt.table, opt.select);
      PB_TABLE_CACHE[type] = opt;
      return opt;
    }catch(e){
      console.warn(`Table candidate failed for ${type}: ${opt.table}`, e);
    }
  }
  return null;
}

function pbNormalizeBool(v, fallback){
  return (typeof v === "boolean") ? v : fallback;
}

function pbMapSettingsRow(row, kind){
  if(kind === "pb") return (row && row.data) ? row.data : null;
  if(!row) return null;
  const base = getSettings();
  return {
    ...base,
    ...(row.data||{}),
    storeName: row.store_name || row.storeName || (row.data && row.data.storeName) || base.storeName,
    whatsappPhone: row.whatsapp_phone || row.whatsappPhone || (row.data && row.data.whatsappPhone) || base.whatsappPhone,
    adminPassword: row.admin_password || row.adminPassword || (row.data && row.data.adminPassword) || base.adminPassword,
    adminKey: row.admin_key || row.adminKey || (row.data && row.data.adminKey) || base.adminKey,
    heroImage: row.hero_image || row.heroImage || (row.data && row.data.heroImage) || base.heroImage,
    theme: row.theme || (row.data && row.data.theme) || base.theme
  };
}

function pbMapCardRow(row, kind){
  if(kind === "pb"){
    return {
      id: row.id || uid(),
      title: row.title || "",
      subtitle: row.subtitle || "",
      image: row.image || "",
      slug: row.slug || "",
      enabled: pbNormalizeBool(row.enabled, true),
      sort: Number(row.sort || 0)
    };
  }
  return {
    id: row.id || uid(),
    title: row.title || row.name || "",
    subtitle: row.subtitle || row.description || "",
    image: row.image || row.image_url || "",
    slug: row.slug || row.category_slug || row.handle || "",
    enabled: pbNormalizeBool(row.enabled, pbNormalizeBool(row.active, true)),
    sort: Number(row.sort || 0)
  };
}

function pbMapProductRow(row, kind){
  if(kind === "pb"){
    return {
      id: row.id || uid(),
      slug: row.slug || "",
      name: row.name || "",
      price: Number(row.price || 0),
      desc: row.desc || "",
      image: row.image || "",
      enabled: pbNormalizeBool(row.enabled, true),
      available: pbNormalizeBool(row.available, true)
    };
  }
  return {
    id: row.id || uid(),
    slug: row.slug || row.category_slug || "",
    name: row.name || row.title || "",
    price: Number(row.price || 0),
    desc: row.desc || row.description || "",
    image: row.image || row.image_url || "",
    enabled: pbNormalizeBool(row.enabled, pbNormalizeBool(row.active, true)),
    available: pbNormalizeBool(row.available, true)
  };
}

async function pbSyncSettingsFromSupabase(){
  try{
    const detected = await pbDetectTable("settings");
    if(!detected) return getSettings();
    const rows = await pbRestSelect(detected.table, detected.select);
    const mapped = pbMapSettingsRow(rows && rows[0], detected.kind);
    if(mapped){
      save(LS.settings, mapped);
      return mapped;
    }
  }catch(e){ console.warn(e); }
  return getSettings();
}

async function pbSyncCardsFromSupabase(){
  try{
    const detected = await pbDetectTable("cards");
    if(!detected) return getCards();
    const rows = await pbRestSelect(detected.table, detected.select);
    if(Array.isArray(rows)){
      const mapped = rows.map(r=>pbMapCardRow(r, detected.kind)).filter(r=>r.slug);
      save(LS.cards, mapped);
      return mapped;
    }
  }catch(e){ console.warn(e); }
  return getCards();
}

async function pbSyncProductsFromSupabase(){
  try{
    const detected = await pbDetectTable("products");
    if(!detected) return getProducts();
    const rows = await pbRestSelect(detected.table, detected.select);
    if(Array.isArray(rows)){
      const mapped = rows.map(r=>pbMapProductRow(r, detected.kind)).filter(r=>r.name);
      save(LS.products, mapped);
      return mapped;
    }
  }catch(e){ console.warn(e); }
  return getProducts();
}

async function pbSyncCatalogFromSupabase(){
  await Promise.all([
    pbSyncSettingsFromSupabase(),
    pbSyncCardsFromSupabase(),
    pbSyncProductsFromSupabase()
  ]);
  return true;
}

async function pbPushSettingsToSupabase(settings){
  const detected = await pbDetectTable("settings");
  if(!detected) throw new Error("No settings table found");
  if(detected.kind === "pb"){
    const row = { id: 1, data: settings, admin_key: window.PB_ADMIN_KEY || "PB-ADMIN-2323" };
    return await pbRestUpsert(detected.table, [row]);
  }
  const row = {
    id: 1,
    data: settings,
    store_name: settings.storeName || "",
    whatsapp_phone: settings.whatsappPhone || "",
    admin_password: settings.adminPassword || "",
    admin_key: window.PB_ADMIN_KEY || "PB-ADMIN-2323",
    hero_image: settings.heroImage || "",
    theme: settings.theme || {}
  };
  return await pbRestUpsert(detected.table, [row]);
}

async function pbPushCardsToSupabase(cards){
  const detected = await pbDetectTable("cards");
  if(!detected) throw new Error("No categories/cards table found");
  if(detected.kind === "pb"){
    await pbRestDeleteWhere(detected.table, "?admin_key=eq." + encodeURIComponent(window.PB_ADMIN_KEY || "PB-ADMIN-2323"));
  }
  const rows = (cards||[]).map(c => {
    if(detected.kind === "pb"){
      return {
        id: c.id || uid(),
        title: c.title || "",
        subtitle: c.subtitle || "",
        image: c.image || "",
        slug: c.slug || "",
        enabled: !!c.enabled,
        sort: Number(c.sort||0),
        admin_key: window.PB_ADMIN_KEY || "PB-ADMIN-2323"
      };
    }
    return {
      id: c.id || uid(),
      name: c.title || "",
      slug: c.slug || "",
      image_url: c.image || ""
    };
  });
  if(rows.length) await pbRestUpsert(detected.table, rows);
  return true;
}

async function pbPushProductsToSupabase(products){
  const detected = await pbDetectTable("products");
  if(!detected) throw new Error("No products table found");
  if(detected.kind === "pb"){
    await pbRestDeleteWhere(detected.table, "?admin_key=eq." + encodeURIComponent(window.PB_ADMIN_KEY || "PB-ADMIN-2323"));
  }
  const rows = (products||[]).map(p => {
    if(detected.kind === "pb"){
      return {
        id: p.id || uid(),
        slug: p.slug || "",
        name: p.name || "",
        price: Number(p.price||0),
        desc: p.desc || "",
        image: p.image || "",
        enabled: !!p.enabled,
        available: (typeof p.available === "boolean" ? p.available : true),
        admin_key: window.PB_ADMIN_KEY || "PB-ADMIN-2323"
      };
    }
    return {
      id: p.id || uid(),
      category_slug: p.slug || "",
      name: p.name || "",
      price: Number(p.price||0),
      image_url: p.image || ""
    };
  });
  if(rows.length) await pbRestUpsert(detected.table, rows);
  return true;
}


function cartSubtotal(){
  return getCart().reduce((s,it)=>s + (it.price*it.qty),0);
}

// WhatsApp invoice
function openWhatsAppInvoice(order){
  const s = getSettings();
  const storePhone = String((s.whatsappPhone||"12263453432")).replace(/\D/g,"");
  const storeName = s.storeName || "Pretty Bites";

  const products = order.items.map(p => `${p.name} ×${p.qty}`).join("\n");

  const msg =
`🧁 ${storeName}

طلب جديد (#${order.orderNo})

الاسم: ${order.customerName}
الهاتف: ${order.customerPhone}

Order Type: ${order.deliveryType === "delivery" ? "Delivery" : "Pickup"}
Address: ${order.deliveryType === "delivery" ? (order.address || "-") : "-"}

Day: ${order.day || "-"}
Time: ${order.time || "-"}

Items:
${products}

Subtotal: ${money(order.subtotal)}
Delivery: ${money(order.deliveryFee)}
Total: ${money(order.total)}

Notes:
${order.notes || "-"}

Thank you for your order from ${storeName}`;

  const url = `https://wa.me/${storePhone}?text=${encodeURIComponent(msg)}`;
  window.open(url, "_blank");
}

// Admin auth
function adminIsOk(){ return localStorage.getItem(LS.adminOk)==="1"; }
function adminLogin(pass){
  const s = getSettings();
  if(pass === (s.adminPassword||"2323")){
    localStorage.setItem(LS.adminOk,"1");
    return true;
  }
  return false;
}
function adminLogout(){ localStorage.removeItem(LS.adminOk); }

// Orders (local)
function createOrder(payload){
  const orders = getOrders();
  const no = String(Date.now()).slice(-6);
  const order = {
    id: uid(),
    orderNo: no,
    createdAt: new Date().toISOString(),
    status: "new",
    ...payload
  };
  orders.unshift(order);
  setOrders(orders);
  return order;
}

function ring(){
  try{
    // Strong bell using WebAudio
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const gain = ctx.createGain();
    gain.gain.value = 0.75; // loud
    gain.connect(ctx.destination);

    const tone=(freq, t, dur=0.14)=>{
      const o = ctx.createOscillator();
      o.type = "square";
      o.frequency.value = freq;
      o.connect(gain);
      o.start(ctx.currentTime + t);
      o.stop(ctx.currentTime + t + dur);
    };

    // Loud repeating bell pattern (6 beeps)
    tone(900, 0.00);  tone(1200, 0.18);
    tone(900, 0.36);  tone(1200, 0.54);
    tone(900, 0.72);  tone(1200, 0.90);

    setTimeout(()=>{ try{ ctx.close(); }catch(e){} }, 1600);

    // Speak
    speakNewOrder();

  }catch(e){}
}

function speakNewOrder(){
  try{
    const u = new SpeechSynthesisUtterance("New order");
    u.lang = "en-US";
    u.volume = 1;
    u.rate = 1;
    u.pitch = 1.05;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
  }catch(e){}
}


// =========================
// Live Sync (safe auto-refresh without page reload)
// =========================
function pbCatalogStamp(){
  try{
    return JSON.stringify({
      settings: load(LS.settings, null),
      cards: load(LS.cards, null),
      products: load(LS.products, null)
    });
  }catch(e){
    return String(Date.now());
  }
}

window.__pbCatalogStamp = window.__pbCatalogStamp || pbCatalogStamp();
window.__pbLiveSyncListeners = window.__pbLiveSyncListeners || [];
window.__pbLiveSyncStarted = window.__pbLiveSyncStarted || false;
window.__pbBroadcast = window.__pbBroadcast || ("BroadcastChannel" in window ? new BroadcastChannel("pb-live-sync") : null);

function pbNotifyCatalogChanged(source){
  try{ localStorage.setItem("pb_live_ping_v1", JSON.stringify({ t: Date.now(), source: source || "local" })); }catch(e){}
  try{ if(window.__pbBroadcast) window.__pbBroadcast.postMessage({ t: Date.now(), source: source || "local" }); }catch(e){}
}

function pbAddLiveSyncListener(fn){
  if(typeof fn !== "function") return;
  window.__pbLiveSyncListeners.push(fn);
}

async function pbRunLiveSyncListeners(){
  const list = window.__pbLiveSyncListeners || [];
  for(const fn of list){
    try{ await fn(); }catch(e){ console.warn("Live sync render failed", e); }
  }
}

async function pbRefreshCatalogIfChanged(){
  const before = window.__pbCatalogStamp || pbCatalogStamp();
  await pbSyncCatalogFromSupabase();
  const after = pbCatalogStamp();
  window.__pbCatalogStamp = after;
  if(after !== before){
    await pbRunLiveSyncListeners();
    try{ applyTheme(); }catch(e){}
  }
}

function pbEnableRealtime(refreshFn){
  if(typeof refreshFn === "function") pbAddLiveSyncListener(refreshFn);
  if(window.__pbLiveSyncStarted) return;
  window.__pbLiveSyncStarted = true;

  let busy = false;
  const run = async ()=>{
    if(busy) return;
    if(document.hidden) return;
    busy = true;
    try{ await pbRefreshCatalogIfChanged(); }catch(e){ console.warn("Live sync failed", e); }
    busy = false;
  };

  window.addEventListener("focus", run);
  document.addEventListener("visibilitychange", ()=>{ if(!document.hidden) run(); });
  window.addEventListener("storage", (e)=>{
    if(e && e.key === "pb_live_ping_v1") run();
  });
  try{
    if(window.__pbBroadcast){
      window.__pbBroadcast.onmessage = ()=> run();
    }
  }catch(e){}

  setInterval(run, 2000);
  setTimeout(run, 600);
}


// =========================
// Weekly Meal Plan (settings + orders)
// =========================
const PB_WEEKLY_DEFAULT = {
  enabled: true,
  title: "Weekly Meal Plan",
  subtitle: "5 Meals Per Week",
  description: "Fresh meals from Monday to Friday.",
  packagePrice: 65,
  deliveryFeePerDay: 5,
  pickupEnabled: true,
  deliveryEnabled: true,
  notice: "Orders close every Sunday at 8:00 PM.",
  image: "https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=1200&q=60",
  days: [
    { key:"monday", label:"Monday", meal:"Chicken Rice Bowl", desc:"Fresh grilled chicken with seasoned rice.", image:"https://images.unsplash.com/photo-1512058564366-18510be2db19?auto=format&fit=crop&w=1200&q=60" },
    { key:"tuesday", label:"Tuesday", meal:"Creamy Pasta", desc:"Rich creamy pasta with herbs and parmesan.", image:"https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?auto=format&fit=crop&w=1200&q=60" },
    { key:"wednesday", label:"Wednesday", meal:"Beef & Vegetables", desc:"Tender beef strips with roasted vegetables.", image:"https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=1200&q=60" },
    { key:"thursday", label:"Thursday", meal:"Shawarma Plate", desc:"Chicken shawarma with rice, salad, and garlic sauce.", image:"https://images.unsplash.com/photo-1529006557810-274b9b2fc783?auto=format&fit=crop&w=1200&q=60" },
    { key:"friday", label:"Friday", meal:"Grilled Fish", desc:"Fresh fish fillet with lemon and garden vegetables.", image:"https://images.unsplash.com/photo-1559847844-5315695dadae?auto=format&fit=crop&w=1200&q=60" }
  ]
};

function pbDeepClone(obj){ return JSON.parse(JSON.stringify(obj)); }
function getWeeklyConfig(){
  const s = getSettings();
  const w = (s && s.weeklyPlan) ? s.weeklyPlan : {};
  const out = Object.assign({}, pbDeepClone(PB_WEEKLY_DEFAULT), w || {});
  const defaultDays = PB_WEEKLY_DEFAULT.days;
  const inDays = Array.isArray(w.days) ? w.days : [];
  out.days = defaultDays.map((d, i)=> Object.assign({}, d, inDays[i] || {}));
  return out;
}
function setWeeklyConfig(next){
  const s = getSettings();
  s.weeklyPlan = next;
  setSettings(s);
}
function pbWeeklyDeliveryTotal(cfg){
  cfg = cfg || getWeeklyConfig();
  const count = Array.isArray(cfg.days) ? cfg.days.length : 5;
  return Number(cfg.deliveryFeePerDay || 0) * count;
}
function pbWeeklyGrandTotal(type, cfg){
  cfg = cfg || getWeeklyConfig();
  const base = Number(cfg.packagePrice || 0);
  const delivery = type === 'delivery' ? pbWeeklyDeliveryTotal(cfg) : 0;
  return base + delivery;
}
async function pbWeeklyOrdersSelect(){
  const q = '?select=id,status,full_name,phone,fulfillment_type,preferred_time,weekly_price,delivery_total,customer_name,customer_phone,delivery_type,address,delivery_time,notes,total,package_price,delivery_fee_per_day,delivery_days,created_at,data&order=created_at.desc';
  return await pbRestSelect('pb_weekly_orders', q);
}
async function pbPushWeeklyOrder(order){
  const row = {
    id: order.id || uid(),
    status: order.status || 'new',
    // New schema used by the site
    customer_name: order.customerName || '',
    customer_phone: order.customerPhone || '',
    delivery_type: order.deliveryType || 'pickup',
    address: order.address || '',
    delivery_time: order.deliveryTime || '',
    package_price: Number(order.packagePrice || 0),
    delivery_fee_per_day: Number(order.deliveryFeePerDay || 0),
    delivery_days: Number(order.deliveryDays || 5),
    total: Number(order.total || 0),
    // Legacy schema already present in some Supabase projects
    full_name: order.customerName || '',
    phone: order.customerPhone || '',
    fulfillment_type: order.deliveryType || 'pickup',
    preferred_time: order.deliveryTime || '',
    weekly_price: Number(order.packagePrice || 0),
    delivery_total: Number(order.deliveryFeePerDay || 0) * Number(order.deliveryDays || 5),
    notes: order.notes || '',
    created_at: order.createdAt || new Date().toISOString(),
    data: order
  };
  return await pbRestUpsert('pb_weekly_orders', [row]);
}
async function pbFetchWeeklyOrders(){
  try{ return await pbWeeklyOrdersSelect(); }catch(e){ console.warn(e); return load('pb_weekly_orders_v1', []); }
}
async function pbCreateWeeklyOrder(payload){
  const order = Object.assign({ id: uid(), status: 'new', createdAt: new Date().toISOString() }, payload || {});
  const local = load('pb_weekly_orders_v1', []);
  local.unshift(order);
  save('pb_weekly_orders_v1', local);
  try{ await pbPushWeeklyOrder(order); }catch(e){ console.warn('Weekly order sync failed', e); }
  return order;
}
async function pbUpdateWeeklyOrderStatus(id, status){
  try{ await pbRestUpsert('pb_weekly_orders', [{ id, status, admin_key: window.PB_ADMIN_KEY || getSettings().adminKey || 'PB-ADMIN-2323' }]); }catch(e){ console.warn(e); }
  const local = load('pb_weekly_orders_v1', []);
  const found = local.find(x=>x.id===id);
  if(found){ found.status = status; save('pb_weekly_orders_v1', local); }
}

async function pbDeleteWeeklyOrder(id){
  try{
    await pbRestDeleteWhere('pb_weekly_orders', `?id=eq.${encodeURIComponent(id)}`);
  }catch(e){ console.warn(e); }
  const local = load('pb_weekly_orders_v1', []);
  save('pb_weekly_orders_v1', local.filter(x=>x.id!==id));
  return true;
}
