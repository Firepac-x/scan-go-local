export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const cors = {
      "Access-Control-Allow-Origin": env.CORS_ORIGIN || "*",
      "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization"
    };
    if (request.method === "OPTIONS") return new Response(null, { headers: cors });

    try {
      if (url.pathname === "/api/claim" && request.method === "GET") return await claimFromStripe(url, env, cors);
      if (url.pathname === "/api/validate" && request.method === "POST") return await validateCode(request, env, cors);
      if (url.pathname === "/api/page/save" && request.method === "POST") return await savePage(request, env, cors);
      if (url.pathname === "/api/page/get" && request.method === "GET") return await getPage(url, env, cors);
      if (url.pathname === "/api/dev/newcode" && request.method === "GET") return await devNewCode(url, env, cors);
      return json({ ok:false, error:"Not found" }, cors, 404);
    } catch (e) {
      return json({ ok:false, error: e.message || String(e) }, cors, 500);
    }
  }
};

function json(body, headers, status=200){ return new Response(JSON.stringify(body), { status, headers: { "content-type":"application/json; charset=utf-8", ...headers } }); }
function makeCode(){ function b(){ return Math.random().toString(36).slice(2,6).toUpperCase(); } return `${b()}-${b()}-${b()}`; }

async function claimFromStripe(url, env, cors){
  const session_id = url.searchParams.get("session_id");
  if(!session_id) return json({ ok:false, error:"session_id manquant" }, cors, 400);
  const key = env.STRIPE_SECRET_KEY; if(!key) return json({ ok:false, error:"STRIPE_SECRET_KEY manquant" }, cors, 500);
  const r = await fetch("https://api.stripe.com/v1/checkout/sessions/" + encodeURIComponent(session_id), { headers:{ "Authorization":"Bearer "+key } });
  if(!r.ok){ return json({ ok:false, error:"Stripe session invalide" }, cors, 400); }
  const s = await r.json();
  if(!(s && (s.payment_status === "paid" || s.status === "complete"))) return json({ ok:false, error:"Paiement non validé" }, cors, 400);
  const code = makeCode();
  await env.ACTIVATION.put("code:"+code, JSON.stringify({ code, status:"new", slug:null, createdAt:Date.now(), session_id }));
  return json({ ok:true, code }, cors);
}
async function validateCode(request, env, cors){
  const b = await request.json().catch(()=>({}));
  const code = (b.code||"").toUpperCase().trim();
  if(!/^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(code)) return json({ ok:false, error:"Format invalide" }, cors, 400);
  const rec = await env.ACTIVATION.get("code:"+code); if(!rec) return json({ ok:false, error:"Introuvable" }, cors, 404);
  const j = JSON.parse(rec); return json({ ok:true, status:j.status, slug:j.slug||null }, cors);
}
async function savePage(request, env, cors){
  const b = await request.json().catch(()=>({}));
  const code = (b.code||"").toUpperCase().trim();
  const data = b.data || {}; let slug = (b.slug || data.slug || "").toLowerCase().trim();
  if(!/^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(code)) return json({ ok:false, error:"Code invalide" }, cors, 400);
  const recStr = await env.ACTIVATION.get("code:"+code); if(!recStr) return json({ ok:false, error:"Code introuvable" }, cors, 404);
  const rec = JSON.parse(recStr);
  if(!slug){ slug = (data.name||"page").toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,''); if(!slug) slug="page"; let i=0; while(await env.PAGES.get("page:"+slug)){ i++; slug = slug+"-"+i; } }
  else { if(rec.status==="claimed" && rec.slug && rec.slug!==slug) return json({ ok:false, error:"Code lié à un autre slug" }, cors, 403); }
  const page = { slug, name:data.name||"", headline:data.headline||"", desc:data.desc||"", address:data.address||"", photo:data.photo||"", accent:data.accent||"#0f6",
    amounts:data.amounts||"2,5,10", pay:data.pay||"", phone:data.phone||"", wa:data.wa||"", email:data.email||"", site:data.site||"", maps:data.maps||"", hours:data.hours||"", ig:data.ig||"", fb:data.fb||"", yt:data.yt||"", thanks:data.thanks||"", contact:data.contact||"", updatedAt:Date.now() };
  await env.PAGES.put("page:"+slug, JSON.stringify(page));
  if(rec.status!=="claimed"){ rec.status="claimed"; rec.slug=slug; rec.usedAt=Date.now(); await env.ACTIVATION.put("code:"+code, JSON.stringify(rec)); }
  return json({ ok:true, slug }, cors);
}
async function getPage(url, env, cors){
  const slug = (url.searchParams.get("slug")||"").toLowerCase().trim();
  if(!slug) return json({ ok:false, error:"slug manquant" }, cors, 400);
  const rec = await env.PAGES.get("page:"+slug); if(!rec) return json({ ok:false, error:"introuvable" }, cors, 404);
  return json({ ok:true, data: JSON.parse(rec) }, cors);
}
async function devNewCode(url, env, cors){
  const key = url.searchParams.get("key") || "";
  if(!env.ADMIN_KEY || key !== env.ADMIN_KEY) return json({ ok:false, error:"Forbidden" }, cors, 403);
  const code = makeCode();
  await env.ACTIVATION.put("code:"+code, JSON.stringify({ code, status:"new", slug:null, createdAt:Date.now() }));
  return json({ ok:true, code }, cors);
}
