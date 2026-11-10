const STAGES=[
  {n:"New Enquiry",c:"#6366f1"},{n:"Contacted",c:"#0ea5e9"},{n:"Site Visit",c:"#f59e0b"},
  {n:"Negotiation",c:"#a855f7"},{n:"Closed",c:"#16a34a"}
];
const KEY="re_leads_v2", VKEY="re_view";
const $=id=>document.getElementById(id);
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const uid=()=>Date.now()+Math.floor(Math.random()*1000);

/* ---------- dates (local time) ---------- */
const iso=d=>d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");
const today=()=>iso(new Date());
const addDays=n=>{const d=new Date();d.setDate(d.getDate()+n);return iso(d)};
const fmt=s=>new Date(s+"T00:00:00").toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"numeric"});
const fmtShort=s=>new Date(s+"T00:00:00").toLocaleDateString("en-IN",{day:"numeric",month:"short"});

/* ---------- data ---------- */
function load(){
  try{const d=JSON.parse(localStorage.getItem(KEY));if(Array.isArray(d))return d}catch(e){}
  return [
    {id:1,name:"Rahul Sharma",type:"Buyer",phone:"9876543210",email:"rahul@mail.com",propType:"Apartment / Flat",location:"Jalandhar, Sector 12",budget:"₹70–80 lakh",notes:"3 BHK, near a school, ready to move.",stage:"Site Visit",priority:"High",
     followups:[{id:11,date:addDays(-2),mode:"Call",note:"Shared 3 matching listings",done:true},{id:12,date:addDays(0),mode:"Site visit",note:"Visit Sector 12 flat with family",done:false}]},
    {id:2,name:"Meena Kapoor",type:"Seller",phone:"9811122233",email:"",propType:"Independent House / Villa",location:"Phagwara",budget:"₹1.4 crore",notes:"200 sq yd house, wants quick sale.",stage:"Contacted",priority:"Medium",
     followups:[{id:21,date:addDays(1),mode:"Meeting",note:"Property valuation discussion",done:false}]},
    {id:3,name:"Amit Verma",type:"Buyer",phone:"9900112233",email:"amit@mail.com",propType:"Apartment / Flat",location:"Ludhiana",budget:"₹45 lakh",notes:"2 BHK, first-time buyer.",stage:"New Enquiry",priority:"Low",followups:[]},
    {id:4,name:"Sunita Rao",type:"Buyer",phone:"9922334455",email:"",propType:"Commercial Shop",location:"Main market",budget:"Up to ₹1.2 crore",notes:"Ground floor, corner shop preferred.",stage:"Negotiation",priority:"High",
     followups:[{id:41,date:addDays(-1),mode:"WhatsApp",note:"Ask owner for revised price",done:false}]},
    {id:5,name:"Karan Singh",type:"Seller",phone:"9877001122",email:"",propType:"Plot / Land",location:"Kapurthala Road",budget:"₹85 lakh",notes:"1 kanal plot.",stage:"Closed",priority:"Low",
     followups:[{id:51,date:addDays(-6),mode:"Call",note:"Deal closed, documents signed",done:true}]}
  ];
}
let leads=load(), curId=null, confirmFn=null;
const save=()=>{try{localStorage.setItem(KEY,JSON.stringify(leads))}catch(e){toast("Could not save – browser storage is unavailable")}};
const byId=id=>leads.find(l=>l.id===id);

/* ---------- helpers ---------- */
const initials=n=>n.trim().split(/\s+/).slice(0,2).map(w=>w[0]).join("").toUpperCase();
const interestText=l=>[l.propType,l.location,l.budget].filter(Boolean).join(" · ")||"—";
const pending=l=>l.followups.filter(f=>!f.done).sort((a,b)=>a.date.localeCompare(b.date));
const nextFu=l=>pending(l)[0];
const isDue=l=>l.stage!=="Closed"&&pending(l).some(f=>f.date<=today());
const nd=l=>(nextFu(l)||{date:"9999"}).date, PR={High:0,Medium:1,Low:2};
const sorters={fu:(a,b)=>nd(a).localeCompare(nd(b)),pri:(a,b)=>PR[a.priority]-PR[b.priority],name:(a,b)=>a.name.localeCompare(b.name),new:(a,b)=>b.id-a.id};
const wa=p=>{const d=String(p).replace(/\D/g,"");return "https://wa.me/"+(d.length===10?"91"+d:d)};
let dueOnly=false;
function toggleDue(){dueOnly=!dueOnly;render()}
const THKEY="re_theme";
const isDark=()=>{const t=document.documentElement.dataset.theme;return t?t==="dark":matchMedia("(prefers-color-scheme:dark)").matches};
const paintTheme=()=>{$("themeBtn").textContent=isDark()?"☀️":"🌙"};
function toggleTheme(){const t=isDark()?"light":"dark";document.documentElement.dataset.theme=t;try{localStorage.setItem(THKEY,t)}catch(e){}paintTheme()}
function fuState(f){const t=today();return f.date<t?"overdue":f.date===t?"today":"upcoming"}
function nextChip(l){
  if(l.stage==="Closed")return '<span class="chip">Closed</span>';
  const f=nextFu(l);
  if(!f)return '<span class="chip">No follow-up</span>';
  const s=fuState(f);
  const label=s==="today"?"Today":s==="overdue"?"Overdue · "+fmtShort(f.date):fmtShort(f.date);
  return `<span class="chip ${s}">${label}</span>`;
}
const stageOpts=sel=>STAGES.map(s=>`<option${s.n===sel?" selected":""}>${s.n}</option>`).join("");

function toast(msg,undo){
  const t=$("toast");t.textContent=msg;
  if(undo){const b=document.createElement("button");b.className="tundo";b.textContent="Undo";b.onclick=()=>{undo();t.classList.remove("show")};t.append(b)}
  t.classList.add("show");
  clearTimeout(toast.h);toast.h=setTimeout(()=>t.classList.remove("show"),undo?5000:2200);
}

/* ---------- filtering / search ---------- */
function filtered(){
  const q=$("q").value.trim().toLowerCase(),s=$("fStage").value,p=$("fPri").value;
  const o=$("fSort").value;
  return leads.filter(l=>(!s||l.stage===s)&&(!p||l.priority===p)&&(!dueOnly||isDue(l))&&
    (!q||[l.name,l.phone,l.email,l.propType,l.location,l.budget,l.notes,l.type].join(" ").toLowerCase().includes(q))).sort(sorters[o]||(()=>0));
}
function clearSearch(){$("q").value="";render();$("q").focus()}

/* ---------- render ---------- */
function render(){
  const list=filtered();
  const due=leads.filter(isDue).length;
  $("stats").innerHTML=[
    ["Total Leads",leads.length,"#1d4ed8"],
    ["High Priority",leads.filter(l=>l.priority==="High").length,"#dc2626"],
    ["Follow-ups due",due,"#d98a06","toggleDue()"],
    ["In Negotiation",leads.filter(l=>l.stage==="Negotiation").length,"#a855f7"],
    ["Closed",leads.filter(l=>l.stage==="Closed").length,"#16a34a"],["Closed rate",leads.length?Math.round(leads.filter(l=>l.stage==="Closed").length/leads.length*100)+"%":"—","#0d9488"]
  ].map(([k,v,c,f])=>`<div class="stat${f?" click":""}" style="--c:${c}"${f?` onclick="${f}" role="button" tabindex="0" aria-pressed="${dueOnly}"`:""}><b>${v}</b><span>${k}</span></div>`).join("");

  $("qClear").style.display=$("q").value?"block":"none";
  $("fDue").classList.toggle("on",dueOnly);$("fDue").setAttribute("aria-pressed",dueOnly);
  $("count").textContent=`Showing ${list.length} of ${leads.length} leads`;

  $("pipeline").innerHTML=STAGES.map(st=>{
    const items=list.filter(l=>l.stage===st.n);
    return `<div class="col" style="--c:${st.c}" ondragover="event.preventDefault();this.classList.add('over')" ondragleave="this.classList.remove('over')" ondrop="drop(event,'${st.n}')">
      <h3>${st.n}<span>${items.length}</span></h3>
      ${items.length?items.map(cardHtml).join(""):'<div class="none">No leads</div>'}
    </div>`}).join("");

  $("rows").innerHTML=list.map(l=>`<tr onclick="openDetail(${l.id})">
    <td data-l="Lead"><div class="who"><span class="av">${esc(initials(l.name))}</span><div><b>${esc(l.name)}</b><small>${l.type}</small></div></div></td>
    <td data-l="Phone">${esc(l.phone)}</td>
    <td data-l="Property Interest" style="max-width:280px">${esc(interestText(l))}</td>
    <td data-l="Lead Stage"><span class="badge stage">${l.stage}</span></td>
    <td data-l="Priority"><span class="badge ${l.priority}">${l.priority}</span></td>
    <td data-l="Next Follow-up">${nextChip(l)}</td></tr>`).join("");
  $("empty").style.display=list.length?"none":"block";
}
function cardHtml(l){
  return `<div class="card ${l.priority}" draggable="true" ondragstart="dragStart(event,${l.id})" ondragend="this.classList.remove('dragging')" onclick="openDetail(${l.id})">
    <div class="c-top"><span class="av">${esc(initials(l.name))}</span><div><b>${esc(l.name)}</b><small>${l.type}</small></div><span class="badge ${l.priority}">${l.priority}</span></div>
    <div class="c-int">${esc(interestText(l))}</div>
    ${(f=>f?`<div class="c-note" title="${esc(f.note)}">↳ ${esc(f.note)}</div>`:"")(l.stage!=="Closed"&&nextFu(l))}
    <div class="c-bot">${nextChip(l)}
      <select class="mv" aria-label="Move ${esc(l.name)} to another stage" onclick="event.stopPropagation()" onchange="moveStage(${l.id},this.value)">${stageOpts(l.stage)}</select></div>
  </div>`;
}

/* ---------- views ---------- */
function setView(v){
  $("viewPipe").style.display=v==="pipe"?"":"none";
  $("viewList").style.display=v==="list"?"":"none";
  $("tabPipe").classList.toggle("on",v==="pipe");$("tabList").classList.toggle("on",v==="list");
  $("tabPipe").setAttribute("aria-selected",v==="pipe");$("tabList").setAttribute("aria-selected",v==="list");
  try{localStorage.setItem(VKEY,v)}catch(e){}
}

/* ---------- pipeline moves ---------- */
function dragStart(e,id){e.dataTransfer.setData("text/plain",id);e.currentTarget.classList.add("dragging")}
function drop(e,stage){
  e.preventDefault();e.currentTarget.classList.remove("over");
  moveStage(+e.dataTransfer.getData("text/plain"),stage);
}
function moveStage(id,stage){
  const l=byId(id);if(!l||l.stage===stage)return render();
  l.stage=stage;save();render();toast(`${l.name} moved to ${stage}`);
  if(curId===id)renderDetail();
}

/* ---------- modals ---------- */
function closeAll(){document.querySelectorAll(".overlay").forEach(o=>o.classList.remove("show"));curId=null}
function closeConfirm(){$("confOv").classList.remove("show")}
document.addEventListener("keydown",e=>{
  if(e.key==="Escape"){$("confOv").classList.contains("show")?closeConfirm():closeAll();return}
  if(e.key==="Enter"&&e.target.classList.contains("click"))return e.target.click();
  if(/^(INPUT|SELECT|TEXTAREA|BUTTON)$/.test(e.target.tagName)||e.ctrlKey||e.metaKey||e.altKey||document.querySelector(".overlay.show"))return;
  if(e.key==="/"){e.preventDefault();$("q").focus()}else if(e.key==="n"){e.preventDefault();openForm()}
});
document.querySelectorAll(".overlay").forEach(o=>o.addEventListener("mousedown",e=>{
  if(e.target===o){o.id==="confOv"?closeConfirm():closeAll()}}));

function openForm(l){
  $("leadForm").reset();$("id").value="";
  $("formTitle").textContent=l?"Edit Lead":"Add Lead";
  if(l){["name","type","phone","email","propType","location","budget","notes","stage","priority"].forEach(k=>$(k).value=l[k]||"");$("id").value=l.id}
  else $("stage").value=STAGES[0].n;
  closeAll();$("formOv").classList.add("show");$("name").focus();
}
function saveLead(e){
  e.preventDefault();
  const o={};["name","type","phone","email","propType","location","budget","notes","stage","priority"].forEach(k=>o[k]=$(k).value.trim());
  if($("id").value){Object.assign(byId(+$("id").value),o);toast("Lead updated")}
  else{leads.push({id:uid(),followups:[],...o});toast("Lead added")}
  save();closeAll();render();
}
function askDelete(){
  const l=byId(curId);if(!l)return;
  $("confMsg").textContent=`“${l.name}” and all follow-up records will be removed.`;
  $("confYes").onclick=()=>{const i=leads.indexOf(l);leads=leads.filter(x=>x.id!==l.id);save();closeConfirm();closeAll();render();toast("Lead deleted",()=>{leads.splice(i,0,l);save();render()})};
  $("confOv").classList.add("show");
}

/* ---------- lead profile ---------- */
function openDetail(id){curId=id;renderDetail();$("detOv").classList.add("show")}
function renderDetail(){
  const l=byId(curId);if(!l)return;
  const fus=[...l.followups].sort((a,b)=>(a.done-b.done)||a.date.localeCompare(b.date));
  $("detBody").innerHTML=`
    <div class="d-head"><span class="av lg">${esc(initials(l.name))}</span>
      <div><h2>${esc(l.name)}</h2><div class="tags"><span class="badge stage">${l.type}</span><span class="badge ${l.priority}">${l.priority} priority</span></div></div></div>
    <div class="contact">
      <a href="tel:${esc(l.phone)}">📞 ${esc(l.phone)}</a><a href="${wa(l.phone)}" target="_blank" rel="noopener">💬 WhatsApp</a>${l.email?`<a href="mailto:${esc(l.email)}">✉️ ${esc(l.email)}</a>`:""}
    </div>
    <div class="info">
      <div><small>Lead stage</small><select onchange="moveStage(${l.id},this.value)" aria-label="Lead stage">${stageOpts(l.stage)}</select></div>
      <div><small>Priority</small><select onchange="setPriority(${l.id},this.value)" aria-label="Priority">${["High","Medium","Low"].map(p=>`<option${p===l.priority?" selected":""}>${p}</option>`).join("")}</select></div>
      <div><small>Property interest</small>${esc(l.propType||"—")}</div>
      <div><small>Location</small>${esc(l.location||"—")}</div>
      <div><small>Budget</small>${esc(l.budget||"—")}</div>
      <div><small>Next follow-up</small>${nextChip(l)}</div>
      <div class="full"><small>Requirements / notes</small>${esc(l.notes||"—")}</div>
    </div>
    <div class="sec"><b>Follow-up Records</b><span class="chip">${l.followups.length} total</span></div>
    ${fus.length?fus.map(f=>{
      const s=f.done?"":fuState(f);
      return `<div class="fu ${f.done?"done":""}">
        <input type="checkbox" ${f.done?"checked":""} onchange="toggleFu(${l.id},${f.id})" aria-label="Mark follow-up done">
        <div class="body"><div class="meta"><b style="color:var(--ink)">${fmt(f.date)}</b><span>${esc(f.mode)}</span>${f.done?'<span class="chip upcoming">Done</span>':`<span class="chip ${s}">${s==="today"?"Today":s==="overdue"?"Overdue":"Upcoming"}</span>`}</div>
        <div class="note">${esc(f.note)}</div></div>
        <button class="del" onclick="delFu(${l.id},${f.id})" aria-label="Delete follow-up">✕</button></div>`}).join("")
      :'<div class="empty" style="padding:14px">No follow-ups recorded yet.</div>'}
    <form class="fu-form" onsubmit="addFu(event)">
      <div><label for="fuDate">Date</label><input type="date" id="fuDate" required value="${today()}"></div>
      <div><label for="fuMode">Mode</label><select id="fuMode"><option>Call</option><option>WhatsApp</option><option>Email</option><option>Site visit</option><option>Meeting</option></select></div>
      <div class="full"><label for="fuNote">Note</label><input id="fuNote" required maxlength="160" placeholder="What was discussed / what is next?"></div>
      <div class="full" style="text-align:right"><button class="btn">Add Follow-up</button></div>
    </form>
    <div class="actions"><button class="btn-danger" onclick="askDelete()">Delete Lead</button><button class="btn-o" onclick="openForm(byId(curId))">Edit Lead</button></div>`;
}
function setPriority(id,p){byId(id).priority=p;save();render();renderDetail();toast("Priority set to "+p)}
function addFu(e){
  e.preventDefault();const l=byId(curId);
  l.followups.push({id:uid(),date:$("fuDate").value,mode:$("fuMode").value,note:$("fuNote").value.trim(),done:false});
  save();render();renderDetail();toast("Follow-up added");
}
function toggleFu(lid,fid){const f=byId(lid).followups.find(x=>x.id===fid);f.done=!f.done;save();render();renderDetail()}
function delFu(lid,fid){const l=byId(lid);l.followups=l.followups.filter(x=>x.id!==fid);save();render();renderDetail();toast("Follow-up removed")}

/* ---------- init ---------- */
$("fStage").innerHTML='<option value="">All stages</option>'+stageOpts("");
$("stage").innerHTML=stageOpts("");
render();
try{const t=localStorage.getItem(THKEY);if(t)document.documentElement.dataset.theme=t}catch(e){}
paintTheme();
try{setView(localStorage.getItem(VKEY)||"pipe")}catch(e){}