// Общий скрипт для всех страниц сайта. Каждый блок проверяет, есть ли его элементы на странице.
const $ = id => document.getElementById(id);
const TH_TODAY = new Date(Date.now() + 7 * 3600e3).toISOString().slice(0, 10); // дата по времени Таиланда (UTC+7)
const plural = (n, a, b, c) => { n = Math.abs(n) % 100; const m = n % 10; return n > 10 && n < 20 ? c : m === 1 ? a : m >= 2 && m <= 4 ? b : c; };

// Живой обратный отсчёт до вылета (Иркутск, UTC+8); в поездке — «день N из 13»
(function () {
  const el = $("countdown");
  if (!el) return;
  const start = new Date("2026-10-20T17:30:00+08:00"), end = new Date("2026-11-01T18:50:00+08:00");
  const pad = n => String(n).padStart(2, "0");
  function tick() {
    const now = new Date();
    if (now < start) {
      let t = Math.floor((start - now) / 1000);
      const d = Math.floor(t / 86400); t %= 86400;
      const h = Math.floor(t / 3600); t %= 3600;
      const m = Math.floor(t / 60), sec = t % 60;
      el.innerHTML = `<span class="cd-l">✈ До вылета</span><span class="cd">` +
        `<b>${d}</b><i>${plural(d, "день", "дня", "дней")}</i>` +
        `<b>${pad(h)}</b><i>${plural(h, "час", "часа", "часов")}</i><b>${pad(m)}</b><i>мин</i><b>${pad(sec)}</b><i>сек</i></span>`;
    } else if (now < end) {
      const day = Math.min(13, Math.max(1, Math.round((Date.parse(TH_TODAY) - Date.parse("2026-10-20")) / 864e5) + 1));
      el.innerHTML = `<span class="cd-l">🏝 Мы в отпуске</span><span class="cd"><b>${day}</b><i>день из 13</i></span>`;
    } else el.innerHTML = `<span class="cd-l">🏠 Отпуск позади — с возвращением!</span>`;
  }
  tick(); setInterval(tick, 1000);
})();

// План: подсветка сегодняшнего дня, прошедшие — бледнее
document.querySelectorAll(".day[data-date]").forEach(d => {
  if (d.dataset.date === TH_TODAY) { d.classList.add("is-today"); d.open = true; }
  else if (d.dataset.date < TH_TODAY) d.classList.add("past");
});

// Главная: карточка «Сегодня» — сегодняшний день, до поездки — первый, после — последний
(function () {
  const box = $("today"), src = $("alldays");
  if (!box || !src) return;
  const days = [...src.querySelectorAll(".day")];
  const pick = days.find(d => d.dataset.date === TH_TODAY) || (TH_TODAY < days[0].dataset.date ? days[0] : days[days.length - 1]);
  const card = pick.cloneNode(true);
  card.open = true; card.classList.remove("past"); card.removeAttribute("id");
  $("today-title").textContent = pick.dataset.date === TH_TODAY ? "Сегодня" : (TH_TODAY < pick.dataset.date ? "Первый день поездки" : "Последний день");
  box.appendChild(card);
})();

// Сворачиваемые блоки: ссылка на якорь внутри <details> открывает его
function openAnchor(id) {
  const el = $(id);
  if (!el) return;
  if (el.tagName === "DETAILS") el.open = true;
  const det = el.closest("details"); if (det) det.open = true;
  if (el.classList.contains("is-place")) {
    resetFilter();
    el.classList.remove("flash"); void el.offsetWidth; el.classList.add("flash");
  }
}
// Закреплённое меню разделов: высота шапки, подсветка текущего раздела
const topbar = document.querySelector(".topbar");
const setTb = () => document.documentElement.style.setProperty("--tb", (topbar ? topbar.offsetHeight : 0) + "px");
setTb(); window.addEventListener("resize", setTb);
// Шапка прячется при прокрутке вниз и появляется при прокрутке вверх
let topHidden = false, topLock = 0, lastY = window.scrollY;
function setTopHidden(h) { topHidden = h && !!topbar; document.body.classList.toggle("top-hidden", topHidden); }
const tbH = () => (topbar && !topHidden ? topbar.offsetHeight : 0);
window.addEventListener("scroll", () => {
  const y = window.scrollY, dy = y - lastY;
  if (Date.now() < topLock) { lastY = y; return; }
  if (y < 60) setTopHidden(false);
  else if (dy > 6) setTopHidden(true);
  else if (dy < -35) setTopHidden(false);
  if (dy > 6 || dy < -35 || y < 60) lastY = y;
}, { passive: true });
function topGap(el) {
  let g = tbH() + 10;
  const sn = (el.closest("section") && el.closest("section").querySelector(".subnav")) || document.querySelector(".pagenav");
  if (sn && !topHidden && sn !== el && !sn.contains(el)) g += sn.offsetHeight;
  return g;
}
document.querySelectorAll(".subnav").forEach(sn => {
  const links = [...sn.querySelectorAll('a[href^="#"]')];
  const tgts = links.map(a => $(a.getAttribute("href").slice(1)));
  let cur = -1;
  const spy = () => {
    const line = tbH() + (topHidden ? 0 : sn.offsetHeight) + Math.min(160, innerHeight * .2);
    let i = -1;
    let best = -Infinity;
    tgts.forEach((t, k) => { const y = t && t.getBoundingClientRect().top; if (t && y <= line && y > best) { best = y; i = k; } });
    if (i === cur) return;
    cur = i;
    links.forEach((a, k) => a.classList.toggle("on", k === i));
    if (i >= 0) sn.scrollTo({ left: links[i].offsetLeft - 14, behavior: "smooth" });
  };
  window.addEventListener("scroll", spy, { passive: true }); spy();
});

let map_ = null;
// Переход к якорю на этой странице — мгновенно и точно (с поправкой на догрузку картинок)
function jumpTo(id) {
  const el = $(id);
  if (!el) return;
  if (window.cardSheet) { if (el.classList.contains("sc")) { window.cardSheet.scrollTo(el); window.cardSheet.open(el); return; } window.cardSheet.close(); }
  openAnchor(id);
  topLock = Date.now() + 700;
  setTopHidden(el.getBoundingClientRect().top > 150);
  const y = () => el.getBoundingClientRect().top + window.scrollY - topGap(el);
  window.scrollTo(0, y());
  setTimeout(() => window.scrollTo(0, y()), 350);
  history.replaceState(null, "", "#" + id);
}
document.addEventListener("click", e => {
  const a = e.target.closest("a[href]");
  if (!a || a.target === "_blank") return;
  const h = a.getAttribute("href"), here = location.pathname.split("/").pop() || "index.html";
  let id = null;
  if (h.startsWith("#") && h.length > 1) id = h.slice(1);
  else if (h.startsWith(here + "#")) id = h.slice(here.length + 1);   // ссылка на эту же страницу
  if (!id) return;
  e.preventDefault();
  if (typeof map_ !== "undefined" && map_) map_.closePopup();
  jumpTo(id);
});
if (location.hash) setTimeout(() => jumpTo(decodeURIComponent(location.hash.slice(1))), 60);
window.addEventListener("hashchange", () => location.hash && jumpTo(decodeURIComponent(location.hash.slice(1))));

// Фильтр мест
const pf = $("pfilter");
function applyFilter(f) {
  if (!pf) return;
  pf.querySelectorAll("button").forEach(b => b.classList.toggle("on", b.dataset.f === f));
  document.querySelectorAll(".is-place").forEach(c => c.classList.toggle("hide", f !== "all" && !c.dataset.tags.split(" ").includes(f)));
}
function resetFilter() { applyFilter("all"); }
if (pf) pf.addEventListener("click", e => { const b = e.target.closest("button"); if (b) applyFilter(b.dataset.f); });

// Карта: Leaflet грузим, только когда до карты почти доскроллили
(function () {
  const box = $("leaflet");
  if (!box) return;
  const ob = new IntersectionObserver(es => {
    if (!es[0].isIntersecting) return;
    ob.disconnect();
    const sc = document.createElement("script");
    sc.src = "vendor/leaflet.js"; sc.onload = initMap; document.body.appendChild(sc);
  }, { rootMargin: "600px" });
  ob.observe(box);
})();
function initMap() {
  const ICON = { hotel: "🏨", place: "🏝", beach: "🏖", food: "🍽", shop: "🛍", super: "🛒", massage: "💆", hospital: "🏥" };
  const LABEL = { hotel: "Отель", place: "Место", beach: "Пляж", food: "Еда", shop: "ТЦ / рынок", super: "Супермаркет", massage: "Массаж", hospital: "Больница" };
  const hotel = MARKERS.find(m => m.cat === "hotel");
  const km = (a, b) => { const R = 6371, r = x => x * Math.PI / 180, dl = r(b.lat - a.lat), dn = r(b.lon - a.lon);
    const h = Math.sin(dl / 2) ** 2 + Math.cos(r(a.lat)) * Math.cos(r(b.lat)) * Math.sin(dn / 2) ** 2; return 2 * R * Math.asin(Math.sqrt(h)); };
  const map = L.map("leaflet", { scrollWheelZoom: false });
  map_ = map;
  map.attributionControl.setPrefix('<a href="https://leafletjs.com" target="_blank">Leaflet</a>');
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, attribution: "© OpenStreetMap" }).addTo(map);
  const layers = {};
  MARKERS.forEach(m => {
    const icon = L.divIcon({ className: "", html: `<div class="pin c-${m.cat}">${ICON[m.cat]}</div>`, iconSize: [34, 34], iconAnchor: [17, 17], popupAnchor: [0, -14] });
    const dist = m.cat === "hotel" ? "" : ` · ${km(hotel, m).toFixed(1).replace(".", ",")} км от отеля`;
    const route = "https://www.google.com/maps/dir/?api=1&travelmode=driving&destination=" + m.lat + "," + m.lon;
    const more = m.anchor ? `<a class="pbtn" href="${m.page}#${m.anchor}">ℹ Подробнее</a>` : "";
    const html = `${m.img ? `<img src="${m.img}" alt="">` : ""}<div class="pcat">${ICON[m.cat]} ${LABEL[m.cat]}${dist}</div><b>${m.name}</b><p>${m.desc || ""}</p>
      <div class="pbtns"><a class="pbtn" href="${route}" target="_blank">🚗 Маршрут</a><a class="pbtn" href="${m.gmap}" target="_blank">📍 Google</a>${more}</div>`;
    (layers[m.cat] = layers[m.cat] || L.layerGroup().addTo(map));
    L.marker([m.lat, m.lon], { icon }).bindPopup(html, { maxWidth: 260 }).addTo(layers[m.cat]);
  });
  const fitAll = () => {
    const pts = MARKERS.filter(m => map.hasLayer(layers[m.cat])).map(m => [m.lat, m.lon]);
    if (pts.length) map.fitBounds(pts, { padding: [24, 24], maxZoom: 15 });
  };
  fitAll();
  document.querySelectorAll("#mapchips button").forEach(b => b.onclick = () => {
    b.classList.toggle("on");
    const l = layers[b.dataset.cat]; if (!l) return;
    b.classList.contains("on") ? l.addTo(map) : map.removeLayer(l);
  });
  $("fitall").onclick = fitAll;
  $("tohotel").onclick = () => map.setView([hotel.lat, hotel.lon], 15);
  let me = null;
  let userLoc = false;
  $("locate").onclick = () => { userLoc = true; map.locate({ setView: true, maxZoom: 15 }); };
  // «Рядом»: аптеки, 7-Eleven, банкоматы, туалеты, клиники (OpenStreetMap)
  const NI = { pharmacy: ["💊", "Аптека", "#e05a5a"], store: ["🏪", "Магазин", "#2e9e5b"], atm: ["🏧", "Банкомат", "#3b6fd1"], toilet: ["🚻", "Туалет", "#8a5cc7"], clinic: ["🩺", "Клиника", "#d07a1c"] };
  const hrs = h => h.replace("24/7", "круглосуточно").replace(/Mo-Su/g, "ежедневно");
  let near = null, from = { lat: hotel.lat, lon: hotel.lon, me: false };
  const nlayers = {};
  const fmtD = k => k < 1 ? Math.round(k * 1000 / 10) * 10 + " м" : k.toFixed(1).replace(".", ",") + " км";
  const routeTo = p => "https://www.google.com/maps/dir/?api=1&travelmode=" + (km(from, p) < 1.2 ? "walking" : "driving") + "&destination=" + p.lat + "," + p.lon;
  const pname = (c, p) => p.name && !/^(Pharmacy|Toilet|ATM)$/.test(p.name) ? p.name : NI[c][1];
  function nearestBox() {
    const box = $("nearest");
    if (!near || !box) return;
    box.innerHTML = `<b>${from.me ? "📍 Ближайшие к вам" : "🏨 Ближайшие к отелю"}</b>` + Object.keys(NI).map(c => {
      const p = (near[c] || []).map(x => [km(from, x), x]).sort((a, b) => a[0] - b[0])[0];
      return p ? `<div class="nrow"><span>${NI[c][0]} ${pname(c, p[1])}${p[1].hours ? ` <i>${hrs(p[1].hours)}</i>` : ""}</span><a href="${routeTo(p[1])}" target="_blank" rel="noopener">${fmtD(p[0])} →</a></div>` : "";
    }).join("") + (from.me ? "" : `<p class="meta">Нажмите 📍 на карте, чтобы посчитать от того места, где вы сейчас.</p>`);
    box.hidden = false;
  }
  fetch("nearby.json").then(r => r.json()).then(d => {
    near = d; nearestBox();
    const q = new URLSearchParams(location.search).get("near");  // с главной: «Рядом: аптека» и т.п.
    const b = q && document.querySelector(`#nearchips [data-near="${q}"]`);
    if (b) { b.click(); map.locate({ setView: true, maxZoom: 16 }); }
  }).catch(() => {});
  document.querySelectorAll("#nearchips button").forEach(b => b.onclick = () => {
    if (!near) return;
    const c = b.dataset.near;
    if (!nlayers[c]) {
      nlayers[c] = L.layerGroup();
      near[c].forEach(p => L.circleMarker([p.lat, p.lon], { radius: 7, color: "#fff", weight: 2, fillColor: NI[c][2], fillOpacity: 1 })
        .bindPopup(() => `<div class="pcat">${NI[c][0]} ${NI[c][1]} · ${fmtD(km(from, p))} ${from.me ? "от вас" : "от отеля"}</div><b>${pname(c, p)}</b>${p.hours ? `<p>🕘 ${hrs(p.hours)}</p>` : ""}<div class="pbtns"><a class="pbtn" href="${routeTo(p)}" target="_blank">🧭 Маршрут</a></div>`, { maxWidth: 240 })
        .addTo(nlayers[c]));
    }
    b.classList.toggle("on");
    if (b.classList.contains("on")) { nlayers[c].addTo(map); if (map.getZoom() < 14) map.setView([from.lat, from.lon], 15); }
    else map.removeLayer(nlayers[c]);
  });
  map.on("locationfound", e => { from = { lat: e.latlng.lat, lon: e.latlng.lng, me: true }; nearestBox(); });
  map.on("locationfound", e => { if (me) map.removeLayer(me); me = L.circleMarker(e.latlng, { radius: 9, color: "#fff", weight: 3, fillColor: "#1a73e8", fillOpacity: 1 }).addTo(map).bindPopup("Вы здесь").openPopup(); });
  map.on("locationerror", () => userLoc && alert("Не удалось определить местоположение — разрешите доступ к геопозиции в браузере."));
}

// Чек-лист с сохранением в localStorage
(function () {
  const boxes = [...document.querySelectorAll(".chk input")], bar = $("pbar");
  if (!boxes.length) return;
  const upd = () => bar && (bar.style.width = (100 * boxes.filter(b => b.checked).length / boxes.length) + "%");
  boxes.forEach(b => {
    b.checked = localStorage.getItem("trip-" + b.dataset.k) === "1";
    b.addEventListener("change", () => { localStorage.setItem("trip-" + b.dataset.k, b.checked ? "1" : "0"); upd(); });
  });
  upd();
})();

// Дни: раскрыть/свернуть все
if ($("openall")) $("openall").onclick = () => document.querySelectorAll("main details.day").forEach(d => (d.open = true));
if ($("closeall")) $("closeall").onclick = () => document.querySelectorAll("main details.day").forEach(d => (d.open = false));
// Клик по фото в заголовке дня открывает фото, а не сворачивает день
document.addEventListener("click", e => { if (e.target.closest("details.day summary img")) e.preventDefault(); }, true);

// Внешние ссылки — в новой вкладке
document.querySelectorAll('a[href^="http"]').forEach(a => { a.target = "_blank"; a.rel = "noopener"; });

// Лайтбокс: фото на весь экран, листание внутри группы
(function () {
  const lb = $("lightbox");
  if (!lb) return;
  const im = lb.querySelector("img"), cap = lb.querySelector(".cap");
  let group = [], idx = 0;
  function show(i) { idx = (i + group.length) % group.length; im.src = group[idx].dataset.full || group[idx].src; cap.textContent = group[idx].dataset.cap || ""; }
  document.addEventListener("click", e => {
    const t = e.target.closest("img.lb");
    if (!t || e.target.closest("button")) return;
    group = [...document.querySelectorAll(`img.lb[data-group="${t.dataset.group}"]`)].filter(x => x.offsetParent);
    show(Math.max(0, group.indexOf(t))); lb.hidden = false; document.body.style.overflow = "hidden";
  });
  const close = () => { lb.hidden = true; document.body.style.overflow = ""; };
  lb.querySelector(".close").onclick = close;
  lb.querySelector(".prev").onclick = e => { e.stopPropagation(); show(idx - 1); };
  lb.querySelector(".next").onclick = e => { e.stopPropagation(); show(idx + 1); };
  lb.addEventListener("click", e => { if (e.target === lb) close(); });
  document.addEventListener("keydown", e => {
    if (lb.hidden) return;
    if (e.key === "Escape") close(); if (e.key === "ArrowLeft") show(idx - 1); if (e.key === "ArrowRight") show(idx + 1);
  });
  let x0 = null;
  lb.addEventListener("touchstart", e => (x0 = e.touches[0].clientX), { passive: true });
  lb.addEventListener("touchend", e => {
    if (x0 === null) return;
    const dx = e.changedTouches[0].clientX - x0; x0 = null;
    if (Math.abs(dx) > 50) show(idx + (dx < 0 ? 1 : -1));
  });
})();

// Разговорник: тайская фраза крупно на весь экран
(function () {
  const bt = $("bigtext");
  if (!bt) return;
  document.addEventListener("click", e => {
    const b = e.target.closest("button.thai");
    if (!b) return;
    bt.querySelector(".bt").textContent = b.textContent;
    bt.querySelector(".br").textContent = b.dataset.ru || "";
    bt.hidden = false;
  });
  bt.addEventListener("click", () => (bt.hidden = true));
})();

// Меню «Ещё»
(function () {
  const sheet = $("more");
  if (!sheet) return;
  document.querySelectorAll("[data-more]").forEach(b => (b.onclick = e => { e.preventDefault(); sheet.hidden = false; }));
  sheet.addEventListener("click", e => {
    const a = e.target.closest("a");
    if (e.target === sheet || e.target.closest(".mclose") || a) sheet.hidden = true;
    if (a && a.getAttribute("href").includes("#")) {
      const [pg, id] = a.getAttribute("href").split("#");
      const here = location.pathname.split("/").pop() || "index.html";
      if ((pg || here) === here && id) { e.preventDefault(); jumpTo(id); }
    }
  });
})();

// Калькулятор валют: курс с open.er-api.com (запасной — jsDelivr), кэш 12 часов, офлайн — последний сохранённый
(function () {
  const box = $("fx");
  if (!box) return;
  const thb = $("fx-thb"), rub = $("fx-rub"), usd = $("fx-usd"), info = $("fx-rate");
  let rate = JSON.parse(localStorage.getItem("trip-fx") || "null") || { rub: 2.49, usd: 0.0298, date: "примерный курс", ts: 0 };
  const num = el => parseFloat(String(el.value).replace(",", "."));
  const fmt = (v, d) => (isFinite(v) && v !== 0 ? (+v).toFixed(d).replace(/\.0+$/, "").replace(".", ",") : "");
  const fromThb = () => { rub.value = fmt(num(thb) * rate.rub, 0); usd.value = fmt(num(thb) * rate.usd, 2); };
  const show = () => (info.textContent = `1 ฿ = ${rate.rub.toFixed(2).replace(".", ",")} ₽ = ${rate.usd.toFixed(4).replace(".", ",")} $ · 100 ₽ ≈ ${(100 / rate.rub).toFixed(0)} ฿ · курс: ${rate.date}`);
  thb.oninput = fromThb;
  rub.oninput = () => { thb.value = fmt(num(rub) / rate.rub, 0); usd.value = fmt(num(rub) / rate.rub * rate.usd, 2); };
  usd.oninput = () => { thb.value = fmt(num(usd) / rate.usd, 0); rub.value = fmt(num(usd) / rate.usd * rate.rub, 0); };
  box.querySelectorAll(".fxq button").forEach(b => (b.onclick = () => { thb.value = b.dataset.v; fromThb(); }));
  async function load() {
    if (Date.now() - rate.ts < 12 * 3600e3) return;
    try {
      const r = await (await fetch("https://open.er-api.com/v6/latest/THB")).json();
      rate = { rub: r.rates.RUB, usd: r.rates.USD, date: new Date(r.time_last_update_unix * 1000).toLocaleDateString("ru-RU"), ts: Date.now() };
    } catch (e) {
      try {
        const r = await (await fetch("https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/thb.json")).json();
        rate = { rub: r.thb.rub, usd: r.thb.usd, date: r.date, ts: Date.now() };
      } catch (e2) { return; }
    }
    localStorage.setItem("trip-fx", JSON.stringify(rate));
  }
  const open = async e => {
    if (e) e.preventDefault();
    const sheet = $("more"); if (sheet) sheet.hidden = true;
    box.hidden = false; show(); fromThb(); await load(); show(); fromThb();
  };
  document.querySelectorAll("[data-fx]").forEach(b => (b.onclick = open));
  box.querySelector(".fxclose").onclick = () => (box.hidden = true);
  box.addEventListener("click", e => { if (e.target === box) box.hidden = true; });
})();

// Цены: нажмите на «1490 бат» — подсказка с рублями и долларами
(function () {
  const root = document.querySelector("main");
  if (!root) return;
  const N = "(\\d{1,3}(?:[ \\u00a0]\\d{3})+|\\d+)";
  const re = new RegExp(`${N}(?:\\s*[–-]\\s*${N})?(\\s*(?:тыс\\.\\s*)?)(?:\\s*)(бат|฿|THB)`, "g");
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode: n => (n.parentElement.closest("script,style,textarea,button,input,.price,#fx,.sc > .t") || !re.test(n.nodeValue)) ? NodeFilter.FILTER_REJECT : (re.lastIndex = 0, NodeFilter.FILTER_ACCEPT)
  });
  const nodes = []; while (walker.nextNode()) nodes.push(walker.currentNode);
  const num = x => +String(x).replace(/[ \u00a0]/g, "");
  nodes.forEach(n => {
    const frag = document.createDocumentFragment(); let last = 0; const t = n.nodeValue; re.lastIndex = 0; let m;
    while ((m = re.exec(t))) {
      frag.append(t.slice(last, m.index));
      const k = /тыс/.test(m[3]) ? 1000 : 1;
      const sp = document.createElement("span"); sp.className = "price"; sp.textContent = m[0];
      sp.dataset.a = num(m[1]) * k; if (m[2]) sp.dataset.b = num(m[2]) * k;
      frag.append(sp); last = m.index + m[0].length;
    }
    frag.append(t.slice(last)); n.replaceWith(frag);
  });
  // В блоках с ценами (class="thb") числа без слова «бат» — тоже цены, кроме минут, часов, км, отзывов и т. п.
  const NUM = "(\\d{1,3}(?:[ \\u00a0]\\d{3})+|(?!(?:19|20)\\d\\d(?!\\d))\\d{2,5})";  // годы 19xx/20xx — не цены
  const reZone = new RegExp(`(?<![\\d.,:A-Za-zА-Яа-яЁё])(?<![A-Za-z]\\s)(?<!(?:полиция|полиции|скорая|скорой|тел\\.|номер)\\s)${NUM}(?:\\s*[–-]\\s*${NUM})?(?![\\d.,:]?\\d)(?!\\s*[–-]\\s*\\d)(?!\\s*(?:ч\\b|час|мин|км|м\\b|%|шт|г\\b|мл|кг|лет|этаж|отзыв|°|см|\\+? ?отз))`, "g");
  document.querySelectorAll(".thb").forEach(zone => {
    const w = document.createTreeWalker(zone, NodeFilter.SHOW_TEXT, { acceptNode: n => n.parentElement.closest(".price,b") ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT });
    const list = []; while (w.nextNode()) list.push(w.currentNode);
    list.forEach(n => {
      const t = n.nodeValue; reZone.lastIndex = 0; if (!reZone.test(t)) return;
      const frag = document.createDocumentFragment(); let last = 0, m; reZone.lastIndex = 0;
      while ((m = reZone.exec(t))) {
        const a = num(m[1]); if (a < 20) continue;
        frag.append(t.slice(last, m.index));
        const sp = document.createElement("span"); sp.className = "price"; sp.textContent = m[0];
        sp.dataset.a = a; if (m[2]) sp.dataset.b = num(m[2]);
        frag.append(sp); last = m.index + m[0].length;
      }
      frag.append(t.slice(last)); n.replaceWith(frag);
    });
  });
  const tip = document.createElement("div"); tip.className = "pricetip"; tip.hidden = true; document.body.append(tip);
  const rate = () => JSON.parse(localStorage.getItem("trip-fx") || "null") || { rub: 2.49, usd: 0.0298 };
  const fmt = v => Math.round(v).toLocaleString("ru-RU");
  document.addEventListener("click", e => {
    const p = e.target.closest(".price");
    if (!p) { tip.hidden = true; return; }
    const r = rate(), a = +p.dataset.a, b = p.dataset.b ? +p.dataset.b : null;
    const rub = b ? `${fmt(a * r.rub)}–${fmt(b * r.rub)} ₽` : `${fmt(a * r.rub)} ₽`;
    const fu = v => (v < 10 ? v.toFixed(1) : v.toFixed(0)).replace(".", ",");
    const usd = b ? `$${fu(a * r.usd)}–${fu(b * r.usd)}` : `$${fu(a * r.usd)}`;
    tip.innerHTML = `≈ <b>${rub}</b> · ${usd}`;
    tip.hidden = false;
    const rc = p.getBoundingClientRect();
    tip.style.left = Math.max(8, Math.min(window.innerWidth - tip.offsetWidth - 8, rc.left + rc.width / 2 - tip.offsetWidth / 2)) + "px";
    tip.style.top = (rc.top + window.scrollY - tip.offsetHeight - 8) + "px";
  });
  let y0 = 0;
  document.addEventListener("click", () => (y0 = window.scrollY), true);
  window.addEventListener("scroll", () => { if (Math.abs(window.scrollY - y0) > 40) tip.hidden = true; }, { passive: true });
  // обновить курс в фоне, если он старый
  const r0 = JSON.parse(localStorage.getItem("trip-fx") || "null");
  if (!r0 || Date.now() - r0.ts > 12 * 3600e3)
    fetch("https://open.er-api.com/v6/latest/THB").then(r => r.json()).then(r => localStorage.setItem("trip-fx", JSON.stringify({
      rub: r.rates.RUB, usd: r.rates.USD, date: new Date(r.time_last_update_unix * 1000).toLocaleDateString("ru-RU"), ts: Date.now() }))).catch(() => {});
})();

// Поиск по сайту с подсказками
(function () {
  let data = null, box, inp, list;
  const norm = s => s.toLowerCase().replace(/ё/g, "е").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^\p{L}\p{N}฀-๿]+/gu, " ").trim();
  const esc = s => s.replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  function open() {
    if (!box) {
      box = document.createElement("div");
      box.id = "search";
      box.innerHTML = '<div class="sbar"><input type="search" placeholder="Блюдо, место, фраза…" autocomplete="off" enterkeyhint="search"><button class="sclose" aria-label="Закрыть">✕</button></div><div class="sres"></div>';
      document.body.appendChild(box);
      inp = box.querySelector("input"); list = box.querySelector(".sres");
      box.querySelector(".sclose").onclick = close;
      inp.addEventListener("input", run);
      inp.addEventListener("keydown", e => { if (e.key === "Enter") { const a = list.querySelector("a"); if (a) a.click(); } if (e.key === "Escape") close(); });
      list.addEventListener("click", e => { const a = e.target.closest("a"); if (a) go(a, e); });
    }
    box.hidden = false; document.body.classList.add("noscroll");
    inp.value = ""; hint(); inp.focus();
    if (!data) fetch("search.json").then(r => r.json()).catch(() => { list.innerHTML = '<p class="shint">Поиск недоступен без интернета. Нажмите «Скачать всё» на главной, когда будет связь.</p>'; return null; }).then(d => {
      if (!d) return;
      data = d.map(r => ({ ...r, nt: norm(r.t), na: norm(r.a), nx: norm(r.x), ct: norm(r.t + " " + r.a).replace(/ /g, "") }));
      run();
    });
  }
  function close() { if (box) box.hidden = true; document.body.classList.remove("noscroll"); }
  function hint() {
    list.innerHTML = '<p class="shint">Например: <a data-q="пад тай">пад тай</a> <a data-q="tom yum">tom yum</a> <a data-q="креветки">креветки</a> <a data-q="аптека">аптека</a> <a data-q="не остро">не остро</a> <a data-q="Big C">Big C</a></p>';
    list.querySelectorAll("[data-q]").forEach(a => (a.onclick = e => { e.preventDefault(); e.stopPropagation(); inp.value = a.dataset.q; run(); }));
  }
  function run() {
    const q = norm(inp.value);
    if (!q) return hint();
    if (!data) { list.innerHTML = '<p class="shint">Загружаю…</p>'; return; }
    const stem = w => w.length >= 5 ? w.replace(/[аеиоуыэюяйь]+$/, "") : w;
    const ws = q.split(" ").map(stem), cq = q.replace(/ /g, "");
    const res = [];
    for (const r of data) {
      let sc = 0;
      if (r.nt.startsWith(q)) sc += 100; else if (r.nt.includes(q)) sc += 70;
      if (r.na.includes(q) || r.ct.includes(cq)) sc += 55;
      if (r.nx.includes(q)) sc += 20;
      if (!sc && ws.every(w => r.nt.includes(w) || r.na.includes(w) || r.nx.includes(w))) sc = 8;
      if (!sc) continue;
      if (/#(dish|fruit|ms_|m_|r_|h-)/.test(r.u) || !/#(f-|dg|mg|sh-|an-|pb|day)/.test(r.u)) sc += 3;
      res.push([sc, r]);
    }
    res.sort((a, b) => b[0] - a[0]);
    if (!res.length) { list.innerHTML = '<p class="shint">Ничего не нашлось. Попробуйте по-другому: по-русски, латиницей или часть слова.</p>'; return; }
    list.innerHTML = res.slice(0, 30).map(([sc, r]) => {
      let snip = "";
      const i = r.nx.indexOf(ws[0]);
      if (sc < 50 && i >= 0) {
        const raw = r.x, s0 = Math.max(0, i - 50);
        snip = (s0 ? "…" : "") + esc(raw.slice(s0, i + 90)) + "…";
        ws.forEach(w => { if (w.length > 1) snip = snip.replace(new RegExp("(" + w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + ")", "i"), "<mark>$1</mark>"); });
      } else snip = esc(r.x.slice(0, 110)) + (r.x.length > 110 ? "…" : "");
      return `<a href="${r.u}"><b>${esc(r.t)}</b>${r.a && sc >= 50 && !r.nt.includes(q) ? `<i>${esc(r.a.slice(0, 60))}</i>` : ""}<span>${snip}</span><em>${r.p}</em></a>`;
    }).join("");
  }
  function go(a, e) {
    const [pg, id] = a.getAttribute("href").split("#");
    const here = location.pathname.split("/").pop() || "index.html";
    close();
    if (pg === here) { e.preventDefault(); jumpTo(id); flash(id); }
    else { e.preventDefault(); location.href = pg + "#" + id; }
  }
  function flash(id) { const el = $(id); if (!el) return; el.classList.remove("hl"); void el.offsetWidth; el.classList.add("hl"); }
  if (location.hash) setTimeout(() => flash(decodeURIComponent(location.hash.slice(1))), 400);
  document.addEventListener("click", e => { if (e.target.closest("[data-search]")) { e.preventDefault(); open(); } });
})();

// Офлайн-режим: скачивание по кнопке + «установить на экран»
(function () {
  const box = $("offline");
  if (!("serviceWorker" in navigator)) { if (box) box.hidden = true; return; }
  window.addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(() => {}));
  if (!box) return;
  const st = box.querySelector(".offst"), btn = box.querySelector(".offbtn"), bar = box.querySelector(".offbar i");
  const standalone = matchMedia("(display-mode: standalone)").matches || navigator.standalone;
  let prompt = null;
  const inst = box.querySelector(".offinst");
  function instHint() {
    if (standalone) { inst.hidden = true; return; }
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
    inst.innerHTML = prompt ? '<button class="instbtn">📲 Добавить на экран телефона</button>'
      : ios ? '📲 Чтобы открывать как приложение: в Safari «Поделиться» ⎋ → «На экран „Домой“».'
        : '📲 Чтобы открывать как приложение: меню браузера ⋮ → «Добавить на главный экран».';
    const b = inst.querySelector(".instbtn");
    if (b) b.onclick = () => prompt.prompt();
  }
  window.addEventListener("beforeinstallprompt", e => { e.preventDefault(); prompt = e; instHint(); });
  instHint();
  const sw = () => navigator.serviceWorker.ready.then(r => r.active);
  const saved = localStorage.getItem("off-saved");
  function show(have, total, fresh) {
    if (have >= total && fresh) { st.innerHTML = "✅ <b>Сайт сохранён в телефоне</b> — откроется без интернета." + (saved ? ` <span class="meta">(${saved})</span>` : ""); btn.textContent = "Проверить обновления"; }
    else if (have > 0) { st.innerHTML = `Сохранено ${have} из ${total} файлов${fresh ? "" : " — есть обновления сайта"}.`; btn.textContent = "📥 Докачать"; }
    else { st.innerHTML = "Пока ничего не сохранено."; btn.textContent = "📥 Скачать всё (" + box.dataset.size + ")"; }
  }
  navigator.serviceWorker.addEventListener("message", e => {
    const m = e.data || {};
    if (m.t === "status") show(m.have, m.total, m.fresh);
    if (m.t === "prog") { box.classList.add("going"); bar.style.width = (100 * m.done / m.total) + "%"; st.textContent = `Скачиваю… ${m.done} из ${m.total}`; btn.disabled = true; }
    if (m.t === "done") {
      box.classList.remove("going"); btn.disabled = false;
      if (m.fail === 0) { const d = new Date().toLocaleString("ru", { day: "numeric", month: "numeric", hour: "2-digit", minute: "2-digit" }); localStorage.setItem("off-saved", d); st.innerHTML = `✅ <b>Готово!</b> Сайт сохранён в телефоне <span class="meta">(${d})</span>`; btn.textContent = "Проверить обновления"; }
      else st.textContent = `Не скачалось файлов: ${m.fail > 0 ? m.fail : "?"} — проверьте интернет и нажмите ещё раз.`, btn.textContent = "📥 Докачать";
    }
  });
  btn.onclick = () => { btn.disabled = true; st.textContent = "Начинаю…"; sw().then(a => a.postMessage("download")); };
  sw().then(a => a.postMessage("status"));
  setTimeout(() => { if (st.textContent === "…") st.textContent = "Офлайн-режим в этом браузере недоступен — откройте сайт в Chrome или Safari."; }, 6000);
})();

// Озвучка тайских фраз
(function () {
  if (!("speechSynthesis" in window)) { document.querySelectorAll("button.say-th").forEach(b => b.remove()); return; }
  let voice = null;
  const pickVoice = () => { voice = speechSynthesis.getVoices().find(v => /^th/i.test(v.lang)) || null; };
  pickVoice(); speechSynthesis.onvoiceschanged = pickVoice;
  function say(t) {
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(t);
    u.lang = "th-TH"; u.rate = 0.85;
    if (voice) u.voice = voice;
    else if (speechSynthesis.getVoices().length && !localStorage.getItem("th-warned")) {
      localStorage.setItem("th-warned", 1);
      alert("На телефоне нет тайского голоса — фраза может прозвучать неправильно.\n\nAndroid: Настройки → Синтез речи → Google → Установить голосовые данные → Тайский.\niPhone: Настройки → Универсальный доступ → Устное содержание → Голоса → Тайский.");
    }
    speechSynthesis.speak(u);
  }
  document.addEventListener("click", e => {
    const b = e.target.closest(".say-th");
    if (!b) return;
    e.stopPropagation(); e.preventDefault();
    const t = (b.dataset.th || ($("bigtext") && $("bigtext").querySelector(".bt").textContent) || "").replace(/ครับ\s*\/\s*ค่ะ/g, "ค่ะ");
    if (t) say(t);
  }, true);
})();

// До поездки — напоминание «До вылета»; в поездке — план открывается на сегодняшнем дне
(function () {
  if (TH_TODAY >= "2026-10-20") document.querySelectorAll(".pretrip").forEach(e => e.remove());
  const d = TH_TODAY.slice(5, 7) + TH_TODAY.slice(8);
  const nav = (performance.getEntriesByType("navigation")[0] || {}).type;
  if (!location.hash && nav !== "back_forward" && !sessionStorage.getItem("plan-jumped") && document.querySelector(".pagenav") && $("day-" + d)) {
    sessionStorage.setItem("plan-jumped", 1);
    setTimeout(() => { const el = $("day-" + d); window.scrollTo(0, el.getBoundingClientRect().top + scrollY - topGap(el)); }, 80);
  }
})();

// Кнопка «Назад» на телефоне закрывает открытое окно (фото, поиск, калькулятор, «Ещё», крупный текст)
(function () {
  const sel = "#lightbox, #fx, #more, #bigtext, #search, #card-sheet";
  let pushed = false, fromPop = false;
  const anyOpen = () => [...document.querySelectorAll(sel)].some(e => !e.hidden);
  new MutationObserver(() => {
    const open = anyOpen();
    document.documentElement.classList.toggle("noscroll", open);  // пока открыто окно — страница под ним не прокручивается
    if (open && !pushed) { history.pushState({ modal: 1 }, ""); pushed = true; }
    else if (!open && pushed) { pushed = false; if (!fromPop && !navAway) history.back(); }
    fromPop = false;
  }).observe(document.body, { attributes: true, attributeFilter: ["hidden"], subtree: true, childList: true });
  // уходим на другую страницу — не делаем history.back(), иначе переход отменится
  let navAway = false;
  const here = () => location.pathname.split("/").pop() || "index.html";
  document.addEventListener("click", e => {
    const a = e.target.closest("a[href]");
    if (!a || a.target === "_blank") return;
    const pg = a.getAttribute("href").split(/[#?]/)[0];
    if (pg && pg !== here() && !/^(tel|mailto):/.test(pg)) navAway = true;
  }, true);
  window.addEventListener("popstate", () => {
    if (!pushed) return;
    fromPop = true; pushed = false;
    document.querySelectorAll(sel).forEach(e => (e.hidden = true));
    document.body.classList.remove("noscroll");
  });
})();

// Фильтр кафе и буфетов по тегам (страница «Еда»)
(function () {
  const bar = $("vfilter");
  if (!bar) return;
  const cards = [...document.querySelectorAll("#where .is-venue")];
  bar.addEventListener("click", e => {
    const b = e.target.closest("button"); if (!b) return;
    const f = b.dataset.f;
    bar.querySelectorAll("button").forEach(x => x.classList.toggle("on", x === b));
    cards.forEach(c => c.classList.toggle("hide", f !== "all" && !c.dataset.tags.split(" ").includes(f)));
    // пустые подзаголовки прячем
    document.querySelectorAll("#where h3, #where h4.sub").forEach(h => {
      let n = h.nextElementSibling; while (n && !n.classList.contains("cards")) { if (/^H[34]$/.test(n.tagName)) { n = null; break; } n = n.nextElementSibling; }
      h.classList.toggle("hide", !!(n && f !== "all" && ![...n.children].some(c => !c.classList.contains("hide"))));
    });
  });
})();

// Подсказки к названиям районов и мест: нажать на подчёркнутое слово
(function () {
  const G = [
    [/На[\s ]Джомтьен[еау]?/, "Наш район: спокойный пляж к югу от Джомтьена. Здесь отель Mövenpick."],
    [/(?<!На[\s ])Джомтьен(?:е|а|у|ом|ский|ского|ском|ская|ской|ские|ских)?/, "Длинный пляж и район между Паттайей и нашим районом. От отеля ≈ 10–15 мин на машине."],
    [/Пратамнак[аеу]?/, "Холм между центром Паттайи и Джомтьеном: Big Buddha, смотровые площадки. ≈ 15–20 мин."],
    [/Наклу[аеыю]/, "Северная окраина Паттайи: Храм Истины, рыбный рынок Лан Пхо. ≈ 35–45 мин."],
    [/Сукхумвит[аеу]?/, "Главное шоссе №3 вдоль побережья. Проходит рядом с отелем, оживлённое — пешком через него с коляской не стоит."],
    [/Тепразит[аеу]?/, "Улица в Джомтьене, где по пятницам–воскресеньям большой ночной рынок. ≈ 15–20 мин."],
    [/Бангсара[йяюе]/, "Тихий посёлок к югу от нас. ≈ 15 мин."],
    [/Саттахип[аеу]?/, "Город с базой ВМФ к югу. Там пляж Сай Кэу. ≈ 35–40 мин."],
    [/Ко[\s ]Лан[аеу]?/, "Остров напротив Паттайи. Паром с пирса Бали Хай ≈ 45 мин."],
    [/Бали[\s ]Хай/, "Пирс на юге центра Паттайи — отсюда паромы на Ко Лан. ≈ 30 мин от отеля."],
    [/Суварнабхуми/, "Главный аэропорт Бангкока. До отеля ≈ 1,5–2 часа на машине."],
    [/сонгтэо/i, "Пикап-маршрутка с лавками в кузове. Платите водителю при выходе."],
    [/Walking[\s ]Street/, "Ночная улица баров в центре Паттайи — не для прогулки с ребёнком."],
  ];
  const all = new RegExp(G.map(g => "(" + g[0].source + ")").join("|"), "g");
  const root = document.querySelector("main"); if (!root) return;
  const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode: n => n.parentElement.closest("h1,h2,h3,h4,a,button,summary,.tg,.tags,script,style,.gl,.subnav,figcaption,.price,textarea,.sc > .t") ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT });
  const list = []; while (w.nextNode()) list.push(w.currentNode);
  list.forEach(n => {
    const box = n.parentElement.closest("article, .card, details, li, p") || root;
    all.lastIndex = 0; if (!all.test(n.nodeValue)) return;
    const t = n.nodeValue, frag = document.createDocumentFragment(); let last = 0, m; all.lastIndex = 0;
    while ((m = all.exec(t))) {
      const i = m.slice(1).findIndex(x => x !== undefined);
      const k = box.closest("article, .card, details") || box; if (!k.__gl) k.__gl = new Set();  // одно подчёркивание на карточку
      if (k.__gl.has(i)) continue;
      k.__gl.add(i);
      frag.append(t.slice(last, m.index));
      const s = document.createElement("span"); s.className = "gl"; s.textContent = m[0]; s.dataset.tip = G[i][1];
      frag.append(s); last = m.index + m[0].length;
    }
    if (!last) return;
    frag.append(t.slice(last)); n.replaceWith(frag);
  });
  const tip = document.createElement("div"); tip.className = "gltip"; tip.hidden = true; document.body.append(tip);
  document.addEventListener("click", e => {
    const s = e.target.closest(".gl");
    if (!s) { tip.hidden = true; return; }
    e.stopPropagation();
    tip.textContent = s.dataset.tip; tip.hidden = false;
    const r = s.getBoundingClientRect(), W = Math.min(300, innerWidth - 24);
    tip.style.width = W + "px";
    tip.style.left = Math.max(12, Math.min(innerWidth - W - 12, r.left + r.width / 2 - W / 2)) + scrollX + "px";
    tip.style.top = (r.bottom + scrollY + 8) + "px";
  }, true);
  window.addEventListener("scroll", () => (tip.hidden = true), { passive: true });
})();

// Короткие карточки: нажатие открывает окно с подробностями и фото
(function () {
  const sheet = $("card-sheet");
  if (!sheet) return;
  const box = sheet.querySelector(".csheet"), body = sheet.querySelector(".cbody");
  const pv = sheet.querySelector(".pv"), nx = sheet.querySelector(".nx"), cnt = sheet.querySelector(".cnt");
  let cur = null, list = [];
  function open(card, dir) {
    if (!dir) box.classList.remove("full");
    cur = card;
    const grp = card.closest("section") || card.closest(".cards") || document;
    list = [...grp.querySelectorAll(".sc")].filter(c => !c.classList.contains("hide") && c.offsetParent !== null);
    const i = list.indexOf(card);
    pv.disabled = i <= 0; nx.disabled = i < 0 || i >= list.length - 1;
    cnt.textContent = list.length > 1 && i >= 0 ? `${i + 1} / ${list.length}` : "";
    sheet.querySelector(".nav").style.visibility = list.length > 1 ? "" : "hidden";
    body.innerHTML = "";
    body.append(...card.querySelector(".full").cloneNode(true).childNodes);
    sheet.hidden = false; box.scrollTop = 0;
    box.classList.toggle("tall", box.scrollHeight > innerHeight * 0.86);
    const gal = body.querySelector(".cgal"), dots = body.querySelectorAll(".dots i");
    if (gal && dots.length) {
      const upd = () => { const i = Math.round(gal.scrollLeft / (gal.firstElementChild.offsetWidth + 8)); dots.forEach((d, k) => d.classList.toggle("on", k === i)); };
      gal.addEventListener("scroll", upd, { passive: true }); upd();
    }
  }
  let busy = false;
  function step(d) {
    const i = list.indexOf(cur), c = list[i + d];
    if (!c || busy) { if (!busy) bounce(d); return; }
    busy = true;
    // старая карточка уезжает, новая выезжает с другой стороны
    body.style.transition = "transform .18s ease-in, opacity .18s";
    body.style.transform = `translateX(${-d * 100}%)`; body.style.opacity = "0";
    setTimeout(() => {
      open(c, d);
      body.style.transition = "none";
      body.style.transform = `translateX(${d * 100}%)`;
      void body.offsetWidth;
      body.style.transition = "transform .22s ease-out, opacity .22s";
      body.style.transform = ""; body.style.opacity = "";
      setTimeout(() => { busy = false; }, 230);
    }, 180);
  }
  function bounce(d) {  // дальше листать некуда
    body.style.transition = "transform .12s";
    body.style.transform = `translateX(${-d * 24}px)`;
    setTimeout(() => { body.style.transform = ""; }, 120);
  }
  function close() {
    sheet.hidden = true;
    // если листали — под окном показываем последнюю открытую карточку
    if (cur && list.length > 1) { const r = cur.getBoundingClientRect(); if (r.top < 60 || r.bottom > innerHeight) scrollTo(cur); }
  }
  [[pv, -1], [nx, 1]].forEach(([b, d]) => {
    ["pointerdown", "touchstart", "mousedown"].forEach(ev => b.addEventListener(ev, e => e.stopPropagation(), { passive: true }));
    b.addEventListener("click", e => { e.preventDefault(); e.stopPropagation(); step(d); });
  });
  document.addEventListener("keydown", e => {
    if (sheet.hidden) return;
    if (e.key === "ArrowRight") step(1);
    if (e.key === "ArrowLeft") step(-1);
  });
  // полоска сверху: вверх — на весь экран, вниз — свернуть или закрыть, нажать — закрыть
  const bar = sheet.querySelector(".sbar"), grab = sheet.querySelector(".grab");
  let gy = null, gd = 0;
  const full = on => box.classList.toggle("full", on);
  const dy = v => box.style.setProperty("--dy", v);
  bar.addEventListener("touchstart", e => {
    if (e.target.closest("button")) return;
    gy = e.touches[0].clientY; gd = 0; box.style.transition = "none";
  }, { passive: true });
  bar.addEventListener("touchmove", e => {
    if (gy === null) return;
    gd = e.touches[0].clientY - gy;
    const up = box.classList.contains("tall") && !box.classList.contains("full") ? -0.15 * innerHeight : 0;
    dy(Math.max(gd, up) + "px");  // окно едет за пальцем
    if (Math.abs(gd) > 5) e.preventDefault();
  }, { passive: false });
  bar.addEventListener("touchend", () => {
    if (gy === null) return;
    gy = null; box.style.transition = "";
    if (gd < -30) { full(true); dy("0px"); }
    else if (gd > 80 && box.classList.contains("full") && box.classList.contains("tall")) { full(false); dy("0px"); }
    else if (gd > 80) {
      dy("100%");
      setTimeout(() => { close(); box.style.transition = "none"; dy("0px"); void box.offsetWidth; box.style.transition = ""; }, 300);
    } else dy("0px");
  });
  // начали листать текст вниз — окно раскрывается на весь экран
  box.addEventListener("scroll", () => { if (box.scrollTop > 40) full(true); }, { passive: true });
  grab.addEventListener("click", e => { e.preventDefault(); e.stopPropagation(); close(); });
  // свайп влево/вправо по окну: карточка едет за пальцем (кроме галереи фото — там свой свайп)
  let sx = 0, sy = 0, sw = false, horiz = null;
  box.addEventListener("touchstart", e => {
    const t = e.touches[0]; sx = t.clientX; sy = t.clientY; horiz = null;
    sw = !busy && !e.target.closest(".cgal, .sbar") && e.touches.length === 1;
  }, { passive: true });
  box.addEventListener("touchmove", e => {
    if (!sw) return;
    const t = e.touches[0], dx = t.clientX - sx, dy = t.clientY - sy;
    if (horiz === null && (Math.abs(dx) > 8 || Math.abs(dy) > 8)) horiz = Math.abs(dx) > 1.3 * Math.abs(dy);
    if (!horiz) return;
    e.preventDefault();
    const i = list.indexOf(cur), edge = (dx > 0 && i <= 0) || (dx < 0 && i >= list.length - 1);
    body.style.transition = "none";
    body.style.transform = `translateX(${edge ? dx / 4 : dx}px)`;
    body.style.opacity = String(1 - Math.min(Math.abs(dx) / innerWidth, 1) * .5);
  }, { passive: false });
  box.addEventListener("touchend", e => {
    if (!sw) return; sw = false;
    if (!horiz) return;
    const dx = e.changedTouches[0].clientX - sx, d = dx < 0 ? 1 : -1;
    if (Math.abs(dx) > 70 && list[list.indexOf(cur) + d]) step(d);
    else { body.style.transition = "transform .2s, opacity .2s"; body.style.transform = ""; body.style.opacity = ""; }
  }, { passive: true });
  // подсказка: при первом открытии карточка чуть «покачивается» — видно, что можно листать
  function hint() {
    if (sessionStorage.getItem("swHint") || list.length < 2) return;
    sessionStorage.setItem("swHint", "1");
    setTimeout(() => { body.classList.add("nudge"); setTimeout(() => body.classList.remove("nudge"), 1300); }, 450);
  }
  function scrollTo(card) {
    window.scrollTo(0, card.getBoundingClientRect().top + scrollY - (typeof topGap === "function" ? topGap(card) : 80));
  }
  window.cardSheet = { open, close, scrollTo };
  document.addEventListener("click", e => {
    const c = e.target.closest(".sc");
    if (!c || e.target.closest("a, .price, .gl")) return;
    open(c); hint();
  });
  document.addEventListener("keydown", e => {
    if (e.key === "Escape" && !sheet.hidden) close();
    if (e.key === "Enter" && document.activeElement && document.activeElement.classList.contains("sc")) open(document.activeElement);
  });
  // крестик и фон закрывают окно; событие дальше не идёт (иначе под пальцем откроется фото)
  const x = sheet.querySelector(".x");
  ["pointerdown", "touchstart", "mousedown"].forEach(ev => x.addEventListener(ev, e => e.stopPropagation(), { passive: true }));
  x.addEventListener("click", e => { e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation(); close(); });
  sheet.addEventListener("click", e => { if (e.target === sheet) { e.preventDefault(); e.stopPropagation(); close(); } });
})();
