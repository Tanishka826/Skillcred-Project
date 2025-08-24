// AstraVoyage — brand-new structure & names, same features

// ---------- tiny helpers ----------
const $id = (x) => document.getElementById(x);
const log = (s) => {
  const el = $id("log");
  el.hidden = false;
  el.textContent += `\n${new Date().toLocaleTimeString()} • ${s}`;
  el.scrollTop = el.scrollHeight;
};

// Maps & labels
const maps = (q) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
const money = (b) => (b === "high" ? "$$" : "$");

// ---------- City scene background ----------
const scene = $id("scene");
const cityImage = (city) => `https://source.unsplash.com/1600x900/?${encodeURIComponent(city)},city,landmark`;

function setScene(city){
  if(!scene) return;
  const clean = (city || "").trim();
  if(!clean){ scene.style.opacity = .15; scene.style.backgroundImage = ""; scene.style.transform="scale(1.06)"; return; }
  const url = cityImage(clean);
  scene.style.opacity = .18;
  scene.style.transform = "scale(1.065)";
  const img = new Image();
  img.onload = () => {
    scene.style.backgroundImage = `url('${url}')`;
    requestAnimationFrame(()=>{
      scene.style.opacity = .35;
      scene.style.transform = "scale(1.03)";
    });
  };
  img.onerror = () => { scene.style.opacity = .15; };
  img.referrerPolicy = "no-referrer";
  img.src = url;
}

const debounce = (fn, t=450) => {
  let f; return (...a)=>{ clearTimeout(f); f=setTimeout(()=>fn(...a), t); };
};

// ---------- Prompts (renamed & reworded; same intent) ----------
function sysPrompt(){
  return `You are an efficient travel designer. Produce a plan that covers EXACTLY one region per day in the chosen city.

For each day/region:
- Activities: list named places (openable in Google Maps)
- For every item include: region, rough distance, suggested mode (walk/public transit), and best time
- Dining: breakfast, lunch, dinner with the same distance/mode/best-time fields
- Where to stay IN THAT REGION: 1–2 area/property ideas aligned to budget

Finish with a short sequence rationale that minimizes travel.

Constraints:
- Be realistic about time, cost, and opening hours
- Prefer walking for short hops; otherwise suggest public transport
- Mix icons with under-the-radar spots
- Adapt to style (family/luxury/budget/adventure/cultural) if provided
- Ask for missing essentials before proceeding
- Return clean, easy-to-read output.`;
}
function userPrompt(v){
  return `Plan a trip to ${v.city} for ${v.days} days on a ${v.budget || "medium"} budget.
Style: ${v.style}; Pace: ${v.pace}; Diet: ${v.diet || "none"}.
One region per day. For every item include region, distance, mode, and best time. Include dining (B/L/D) and WHERE TO STAY in-region aligned to budget. End with a day-by-day summary to minimize travel.`;
}

// ---------- Local generator (fully refactored names/logic) ----------
const TAGS = {
  balanced: ["landmark", "museum", "park", "market", "neighborhood", "viewpoint", "riverside", "hidden gem"],
  family: ["zoo", "theme park", "interactive museum", "park", "aquarium", "neighborhood", "market", "viewpoint"],
  adventure: ["hiking trail", "bike tour", "water activity", "city viewpoint", "market", "local street food", "sunset spot"],
  luxury: ["iconic landmark", "art museum", "boutique district", "fine dining", "spa", "sky bar", "river cruise"],
  budget: ["free walking tour", "public park", "local market", "street food lane", "neighborhood", "viewpoint"],
  cultural: ["historic district", "temple or church", "national museum", "craft market", "heritage walk", "traditional performance"],
};

const DEFAULT_AREAS = [
  "Canal Quarter","Old Town","Riverside","Financial Mile","Student Belt",
  "Citadel Ward","Waterfront","Arts Mile","Grand Bazaar","Botanic District"
];

const rng = (min,max)=> +(Math.random()*(max-min)+min).toFixed(1);
const modeFor = (km)=> km<=1.6 ? "Walking" : "Public transport";
const pickN = (arr,n)=> {
  const bag=[...arr]; const out=[];
  while(out.length<n){ const i=Math.floor(Math.random()*bag.length) || 0; out.push(bag.splice(i,1)[0] ?? arr[out.length%arr.length]); }
  return out;
};
const slotTimes = (pace) =>
  pace==="packed" ? ["Morning","Midday","Afternoon","Evening"] :
  pace==="relaxed"? ["Late Morning","Afternoon","Evening"] : ["Morning","Afternoon","Evening"];

const whenFor = (slot)=>{
  const s = slot.toLowerCase();
  if(s.includes("late") || s==="midday") return "midday (12–2pm)";
  if(s.includes("morning")) return "morning (8–11am)";
  if(s.includes("afternoon")) return "afternoon (1–4pm)";
  if(s.includes("evening")) return "evening (5–8pm)";
  return "anytime";
};
const mealWhen = (t)=> t==="Breakfast" ? "morning (8–10am)" : t==="Lunch" ? "midday (12–2pm)" : "evening (7–9pm)";

const mealQuery = (meal, city, budget, diet)=>{
  let q = `${meal} restaurants ${city}`;
  if(diet) q = `${diet} ${q}`;
  if(budget) q = `${budget} ${q}`;
  return q;
};

function chooseAreas(city, days){
  // deterministic-ish mix but different than original
  const spread = pickN(DEFAULT_AREAS, Math.min(6, Math.max(3, +days || 3)));
  return spread;
}

function buildLocalPlan(v){
  const tags = TAGS[v.style] || TAGS.balanced;
  const d = Math.max(1, Math.min(30, parseInt(v.days||"1",10)));
  const plan = [];
  const areas = chooseAreas(v.city, d);
  const dayAreas = Array.from({length:d},(_,i)=> areas[i % areas.length]);
  const slots = slotTimes(v.pace);

  for(let day=1; day<=d; day++){
    const region = dayAreas[day-1];
    const chosen = pickN(tags, slots.length);

    const items = slots.map((slot, i)=>{
      const label = chosen[i];
      const q = `${label} in ${v.city}`;
      const km = rng(0.4, 3.6);
      return {
        slot, title: label.replace(/^\w/, c=>c.toUpperCase()),
        link: maps(q), distanceKm: km, mode: modeFor(km),
        bestTime: whenFor(slot), region
      };
    });

    const meals = ["Breakfast","Lunch","Dinner"].map((type)=>{
      const km = rng(0.2, 2.2);
      return {
        type, link: maps(mealQuery(type.toLowerCase(), v.city, money(v.budget), v.diet)),
        distanceKm: km, mode: modeFor(km), bestTime: mealWhen(type), region
      };
    });

    const summary = `Day ${day} focuses on ${region.toLowerCase()} with ${items.map(i=>i.title.toLowerCase()).join(", ")} and ${v.budget} budget meals${v.diet?` (${v.diet})`:''}.`;
    plan.push({ day, region, items, meals, summary });
  }
  return plan;
}

function render(plan, meta){
  const mount = $id("output");
  if(!plan?.length){ mount.innerHTML = `<div class="placeholder"><p>No plan.</p></div>`; return; }

  const html = plan.map(d=>{
    const stayType = meta.budget==="low" ? "hostel / guesthouse" : meta.budget==="high" ? "5-star luxury hotel" : "boutique 3–4★";
    const stayLink = maps(`${stayType} ${meta.city} ${d.region}`);

    const items = d.items.map(i=>(
      `<li><span class="pill">${i.slot}</span>
        <a href="${i.link}" target="_blank" rel="noopener">${i.title}</a>
        <span class="meta">• region: ${i.region} • ~${i.distanceKm} km • ${i.mode} • best: ${i.bestTime}</span>
      </li>`
    )).join("");

    const eats = d.meals.map(m=>(
      `<li><span class="pill">${m.type}</span>
        <a href="${m.link}" target="_blank" rel="noopener">Open ${m.type} options near ${meta.city}</a>
        <span class="meta">• region: ${m.region} • ~${m.distanceKm} km • ${m.mode} • best: ${m.bestTime}</span>
      </li>`
    )).join("");

    return `
      <article class="tripday">
        <header class="tripday__head">
          <span class="badge">Day ${d.day}</span>
          <h3 class="tripday__title">Region: ${d.region}</h3>
        </header>

        <h4 class="meta">Highlights</h4>
        <ul class="bucket">${items}</ul>

        <h4 class="meta" style="margin-top:10px">Dining</h4>
        <ul class="bucket">${eats}</ul>

        <h4 class="meta" style="margin-top:10px">Where to stay</h4>
        <ul class="bucket">
          <li><span class="pill">Stay</span>
            <a href="${stayLink}" target="_blank" rel="noopener">${stayType} in ${d.region}</a>
            <span class="meta">• budget: ${meta.budget || "medium"}</span>
          </li>
        </ul>

        <p class="meta" style="margin-top:8px"><strong>Summary:</strong> ${d.summary}</p>
      </article>
    `;
  }).join("");

  mount.innerHTML = html;
}

// ---------- AI path ----------
async function runAI(v){
  const endpoint = $id("aiEndpoint").value.trim();
  const model = $id("aiModel").value.trim();
  const key = $id("aiKey").value.trim();
  const maxTokens = parseInt($id("maxTokens").value || "900", 10);

  if(!endpoint || !model || !key){
    alert("To use AI, set endpoint, model, and key — or turn off ‘Use AI’."); 
    throw new Error("Missing AI credentials");
  }

  const payload = {
    model,
    messages: [
      { role:"system", content: sysPrompt() },
      { role:"user", content: userPrompt(v) },
    ],
    temperature: 0.8,
    max_tokens: maxTokens
  };

  log("Calling AI endpoint…");
  const res = await fetch(endpoint, {
    method:"POST",
    headers: { "Content-Type":"application/json", Authorization: "Bearer " + key },
    body: JSON.stringify(payload)
  });

  if(!res.ok){
    const t = await res.text();
    throw new Error(`AI error ${res.status}: ${t}`);
  }

  const data = await res.json();
  const text = data?.choices?.[0]?.message?.content || data?.choices?.[0]?.text || JSON.stringify(data);
  $id("output").innerText = (text || "").trim();
  log("AI response rendered.");
}

// ---------- Events ----------
$id("generate").addEventListener("click", async () => {
  const v = {
    city: $id("city").value.trim(),
    days: $id("days").value.trim(),
    budget: $id("budget").value || "medium",
    style: $id("style").value || "balanced",
    diet: $id("diet").value.trim(),
    pace: $id("pace").value || "moderate",
  };

  if(!v.city){ alert("Enter a destination."); return; }
  if(!v.days){ alert("Enter number of days."); return; }

  setScene(v.city);

  try{
    if($id("useAI").checked){
      await runAI(v);
    }else{
      const plan = buildLocalPlan(v);
      render(plan, v);
      log("Local plan generated.");
    }
  }catch(err){
    console.error(err); log(err.message); alert(err.message);
  }
});

$id("copyPrompt").addEventListener("click", ()=>{
  const v = {
    city: $id("city").value.trim() || "<City>",
    days: $id("days").value.trim() || "<Days>",
    budget: $id("budget").value || "medium",
    style: $id("style").value || "balanced",
    diet: $id("diet").value.trim() || "none",
    pace: $id("pace").value || "moderate",
  };
  const prompt = `SYSTEM:\n${sysPrompt()}\n\nUSER:\n${userPrompt(v)}`;
  navigator.clipboard.writeText(prompt).then(()=>{
    log("Prompt copied to clipboard.");
    alert("AI prompt copied. Paste it into your model or backend.");
  });
});

$id("clear").addEventListener("click", ()=>{
  ["city","days","diet","aiKey","aiEndpoint","aiModel"].forEach(id=>($id(id).value=""));
  $id("budget").value="";
  $id("style").value="balanced";
  $id("pace").value="moderate";
  $id("output").innerHTML = `<div class="placeholder"><div class="pulse"></div><p>Cleared. Add details and create again.</p></div>`;
  $id("log").textContent=""; $id("log").hidden = true;
  setScene("");
});

// live city background
$id("city").addEventListener("input", debounce(()=> setScene($id("city").value.trim()), 500));
