/**
 * mapa.js
 *
 * Lógica do mapa interativo (Leaflet), lista e painel de detalhe. Adaptado
 * do JavaScript original do index.html, mas agora lê os dados injetados
 * pelo build (window.CAUSAS_DATA / FICHAS_DATA / TAXONOMIAS / UI / IDIOMA)
 * em vez de carregar dados.js/fichas.js como <script> separados. A filtragem
 * continua toda no browser, tal como no site original.
 */
(function () {
  "use strict";
  var LUTAS = window.CAUSAS_DATA || [];
  var FICHAS = window.FICHAS_DATA || {};
  var TAX = window.TAXONOMIAS;
  var UI = window.UI;
  var IDIOMA = window.IDIOMA || "pt";

  var ESTICON = { urgente: "⚡", consulta: "🗳", tribunal: "⚖", vitoria: "✓", acompanhamento: "◐" };
  var ESTLBL = TAX.estados[IDIOMA];
  var CATLBL = TAX.categorias[IDIOMA];
  var st = { q: "", reg: "", est: "todas", cats: new Set(), ord: "prazo", sel: null };
  var seguidas = new Set();
  var $ = function (s) { return document.querySelector(s); };

  function dfmt(iso) {
    var p = iso.split("-");
    return p[2] + "/" + p[1] + "/" + p[0];
  }

  function imgTagAttrs(c) {
    if (!c.imagem) return { src: "/img-static/img-placeholder.svg", srcset: "" };
    var srcset = Object.keys(c.imagem.jpeg)
      .map(function (w) { return c.imagem.jpeg[w] + " " + w + "w"; })
      .join(", ");
    return { src: c.imagem.fallback, srcset: srcset };
  }

  function acaoTipo(c) {
    if (!c.pet) return "";
    var l = (c.petLabel || "").toLowerCase();
    if (l.indexOf("participa") !== -1 || l.indexOf("consulta") !== -1 || l.indexOf("consultation") !== -1 || l.indexOf("take part") !== -1) return "consulta";
    if (l.indexOf("member") !== -1 || l.indexOf("socio") !== -1 || l.indexOf("sócio") !== -1 || l.indexOf("support") !== -1) return "apoio";
    return "peticao";
  }
  function estadoBadge(c) {
    if (c.est === "urgente") {
      return c.pet
        ? { k: "urgente", i: "⚡", l: UI.estados.peticaoAtiva }
        : { k: "situacao", i: "⚡", l: UI.estados.situacaoAtiva };
    }
    return { k: c.est, i: ESTICON[c.est] || "", l: ESTLBL[c.est] || c.est };
  }

  // ---------- filtros (searchbar) ----------
  $("#reg").insertAdjacentHTML(
    "beforeend",
    TAX.regioes.ordem.map(function (slug) { return '<option value="' + slug + '">' + TAX.regioes.labels[slug][IDIOMA] + "</option>"; }).join("")
  );
  $("#estado").innerHTML =
    '<button data-est="todas" aria-pressed="true">' + UI.estados.todas + "</button>" +
    [
      ["peticao", UI.estados.peticao],
      ["consulta", UI.estados.consulta],
      ["tribunal", UI.estados.tribunal],
      ["vitoria", UI.estados.vitoria],
      ["acompanhamento", UI.estados.acompanhamento],
    ]
      .map(function (kl) { return '<button data-est="' + kl[0] + '" aria-pressed="false">' + kl[1] + "</button>"; })
      .join("");
  $("#estado").querySelectorAll("button").forEach(function (b) {
    b.onclick = function () {
      st.est = b.dataset.est;
      $("#estado").querySelectorAll("button").forEach(function (x) { x.setAttribute("aria-pressed", x === b); });
      render();
    };
  });
  $("#estado").insertAdjacentHTML(
    "beforebegin",
    TAX.categorias.ordem
      .map(function (k) {
        var n = LUTAS.filter(function (c) { return c.cat === k || c.cat2 === k; }).length;
        return '<button class="chip' + (n ? "" : " chip--vazio") + '" data-cat="' + k + '" aria-pressed="false">' + CATLBL[k] + " <i>" + n + "</i></button>";
      })
      .join("")
  );
  $("#chips").querySelectorAll(".chip").forEach(function (b) {
    b.onclick = function () {
      var k = b.dataset.cat;
      st.cats.has(k) ? st.cats.delete(k) : st.cats.add(k);
      b.setAttribute("aria-pressed", st.cats.has(k));
      render();
    };
  });
  $("#q").oninput = function (ev) { st.q = ev.target.value.toLowerCase(); render(); };
  $("#reg").onchange = function (ev) { st.reg = ev.target.value; render(); };
  $("#ord").onchange = function (ev) { st.ord = ev.target.value; render(); };
  $("#go").onclick = function () { window.scrollTo({ top: $("#mapa").offsetTop - 64, behavior: "smooth" }); };
  $("#reset").onclick = function () {
    st.q = ""; st.reg = ""; st.est = "todas"; st.cats.clear(); st.ord = "prazo";
    $("#q").value = ""; $("#reg").value = ""; $("#ord").value = "prazo";
    $("#chips").querySelectorAll(".chip").forEach(function (b) { b.setAttribute("aria-pressed", "false"); });
    $("#estado").querySelectorAll("button").forEach(function (b, i) { b.setAttribute("aria-pressed", i === 0); });
    render();
  };

  // ---------- mapa Leaflet ----------
  var map = L.map("map", { scrollWheelZoom: true, zoomControl: false }).setView([39.5, -8.2], 6);
  document.getElementById("map").classList.add("tema-classico");
  L.control.zoom({ position: "topright" }).addTo(map);
  var osm = L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 18, attribution: "© OpenStreetMap contributors" }).addTo(map);

  var googleEarthUrl = function (c) { return c.ll ? "https://earth.google.com/web/@" + c.ll[0] + "," + c.ll[1] + ",0a,900d,0y,0h,0t,0r" : ""; };
  function googleEarthAreaUrl() {
    var ct = map.getCenter(), z = map.getZoom();
    var groundRes = (156543.03392 * Math.cos((ct.lat * Math.PI) / 180)) / Math.pow(2, z);
    var dist = Math.max(300, Math.round(groundRes * map.getSize().y));
    return "https://earth.google.com/web/@" + ct.lat.toFixed(6) + "," + ct.lng.toFixed(6) + ",0a," + dist + "d,0y,0h,0t,0r";
  }
  var markers = {};
  var icone = function (c, i) {
    var isDatacenter = c.cat === "datacenter" || c.cat2 === "datacenter";
    return L.divIcon({
      className: "", iconSize: [34, 34], iconAnchor: [17, 17],
      html: '<span class="pin ' + estadoBadge(c).k + (c.prazo ? " prazo" : "") + (isDatacenter ? " datacenter" : "") + (isDatacenter && c.planeado ? " planeado" : "") + '">' + String(c.num || i + 1).padStart(2, "0") + "</span>",
    });
  };
  var VISTAS = {};
  VISTAS[UI.busca.todoPais] = [[36.9, -9.6], [42.2, -6.1]];
  TAX.regioes.ordem.forEach(function (slug) {
    var bboxes = {
      norte: [[40.8, -8.9], [42.2, -6.6]], centro: [[39.3, -9.1], [41.0, -6.9]],
      "lisboa-vale-tejo": [[38.3, -9.6], [39.7, -8.3]], alentejo: [[37.4, -9.0], [38.8, -7.0]],
      algarve: [[36.9, -9.0], [37.6, -7.4]], madeira: [[32.6, -17.3], [32.9, -16.6]],
      acores: [[36.9, -31.3], [39.8, -25.0]], nacional: [[36.9, -9.6], [42.2, -6.1]],
    };
    if (bboxes[slug]) VISTAS[TAX.regioes.labels[slug][IDIOMA]] = bboxes[slug];
  });
  LUTAS.forEach(function (c, i) {
    if (!c.ll) return;
    var m = L.marker(c.ll, { icon: icone(c, i), title: c.t, riseOnHover: true }).addTo(map);
    m.bindTooltip("<b>" + c.t + "</b><br>" + c.loc + "<br><i>" + c.status + "</i>", { direction: "top", offset: [0, -18] });
    m.on("click", function () { openCausa(c.id); });
    markers[c.id] = m;
  });

  var SATELITE_MIN_ZOOM = 7;
  var satelite = L.tileLayer.wms("https://sh.dataspace.copernicus.eu/ogc/wms/974de996-4005-491e-b9c9-ff02058a8b06", {
    tileSize: 512, minZoom: SATELITE_MIN_ZOOM, maxZoom: 18, layers: "TRUE_COLOR", maxcc: 20,
    attribution: '© <a href="https://dataspace.copernicus.eu/" target="_blank">Copernicus Data Space Ecosystem</a>',
  });
  $("#jumps").innerHTML =
    Object.keys(VISTAS).map(function (k) { return '<button class="jump" data-k="' + k + '">' + k + "</button>"; }).join("") +
    '<span class="camadas" id="camadas" role="group" aria-label="Estilo do mapa"><button type="button" data-camada="mapa" aria-pressed="true">Mapa</button><button type="button" data-camada="satelite" aria-pressed="false">Satélite</button></span>' +
    '<button class="jump" id="geoBtn" type="button" title="Google Earth">🌍 Google Earth</button>';
  $("#jumps").querySelectorAll(".jump[data-k]").forEach(function (b) {
    b.onclick = function () {
      $("#jumps").querySelectorAll(".jump[data-k]").forEach(function (x) { x.setAttribute("aria-pressed", x === b); });
      map.flyToBounds(VISTAS[b.dataset.k], { padding: [36, 36], duration: 0.8 });
    };
  });
  $("#geoBtn").onclick = function () { window.open(googleEarthAreaUrl(), "_blank", "noopener"); };
  $("#camadas").addEventListener("click", function (e) {
    var b = e.target.closest("button[data-camada]");
    if (!b) return;
    var querSatelite = b.dataset.camada === "satelite";
    $("#camadas").querySelectorAll("button").forEach(function (x) { x.setAttribute("aria-pressed", x === b ? "true" : "false"); });
    if (querSatelite) {
      if (map.getZoom() < SATELITE_MIN_ZOOM) map.setZoom(SATELITE_MIN_ZOOM);
      map.setMinZoom(SATELITE_MIN_ZOOM);
      if (map.hasLayer(osm)) map.removeLayer(osm);
      if (!map.hasLayer(satelite)) satelite.addTo(map);
    } else {
      map.setMinZoom(0);
      if (map.hasLayer(satelite)) map.removeLayer(satelite);
      if (!map.hasLayer(osm)) osm.addTo(map);
    }
    document.getElementById("map").classList.toggle("tema-classico", !querSatelite);
  });
  map.fitBounds(VISTAS[UI.busca.todoPais], { padding: [28, 28] });

  var PESO = { urgente: 0, consulta: 1, tribunal: 2, acompanhamento: 3, vitoria: 4 };
  function match(c) {
    if (st.est !== "todas") {
      var tp = acaoTipo(c);
      if (st.est === "peticao" && tp !== "peticao") return false;
      if (st.est === "consulta" && tp !== "consulta") return false;
      if (st.est === "tribunal" && c.est !== "tribunal") return false;
      if (st.est === "vitoria" && c.est !== "vitoria") return false;
      if (st.est === "acompanhamento" && !(c.est === "acompanhamento" || (c.est === "urgente" && !c.pet))) return false;
    }
    if (st.reg && c.reg !== st.reg) return false;
    if (st.cats.size && !st.cats.has(c.cat) && !(c.cat2 && st.cats.has(c.cat2))) return false;
    if (st.q) {
      var hay = (c.t + " " + c.loc + " " + c.catLabel + " " + c.cat + " " + c.res + " " + c.regLabel + " " + c.quem.join(" ") + " " + c.status + " " + (c.kw || []).join(" ")).toLowerCase();
      if (hay.indexOf(st.q) === -1) return false;
    }
    return true;
  }
  function sorted(list) {
    var s = list.slice();
    if (st.ord === "az") s.sort(function (a, b) { return a.t.localeCompare(b.t, IDIOMA); });
    else if (st.ord === "verif") s.sort(function (a, b) { return b.verif.localeCompare(a.verif); });
    else s.sort(function (a, b) { return (b.prazo ? 1 : 0) - (a.prazo ? 1 : 0) || PESO[a.est] - PESO[b.est] || a.t.localeCompare(b.t, IDIOMA); });
    return s;
  }
  function render() {
    var vis = sorted(LUTAS.filter(match));
    $("#count").textContent = vis.length + " / " + LUTAS.length;
    $("#list").innerHTML = vis.length
      ? vis
          .map(function (c, i) {
            var img = imgTagAttrs(c);
            var badge = estadoBadge(c);
            return (
              '<button class="card ' + (st.sel === c.id ? "sel" : "") + '" data-id="' + c.id + '">' +
              '<img class="thumb" src="' + img.src + '" srcset="' + img.srcset + '" sizes="120px" alt="' + c.loc + '" loading="lazy">' +
              "<div>" +
              '<div class="row">' +
              '<span class="mono" style="color:var(--ink-soft)">' + String(c.num || i + 1).padStart(2, "0") + "</span>" +
              '<span class="tag ' + badge.k + '">' + badge.i + " " + badge.l + "</span>" +
              '<span class="mono" style="color:var(--ink-soft)">' + c.catLabel + "</span>" +
              "</div>" +
              "<h3>" + c.t + "</h3>" +
              '<div class="loc">' + c.loc + "</div>" +
              '<div class="who-min">' + c.quem.join(" · ") + "</div>" +
              "</div></button>"
            );
          })
          .join("")
      : '<div class="empty"><p class="disp" style="font-size:28px">' + UI.lista.nadaTitulo + '</p><p>' + UI.lista.nadaTexto + "</p></div>";
    $("#list").querySelectorAll(".card").forEach(function (b) {
      b.onclick = function () { openCausa(b.dataset.id); };
      b.onmouseenter = function () { hi(b.dataset.id, true); };
      b.onmouseleave = function () { hi(b.dataset.id, false); };
    });
    var ids = {};
    vis.forEach(function (c, i) {
      ids[c.id] = true;
      if (markers[c.id]) markers[c.id].setIcon(icone(c, i));
    });
    LUTAS.forEach(function (c) {
      var m = markers[c.id];
      if (!m) return;
      var has = map.hasLayer(m);
      if (ids[c.id] && !has) m.addTo(map);
      if (!ids[c.id] && has) map.removeLayer(m);
    });
    $("#s-urg").textContent = LUTAS.filter(function (c) { return acaoTipo(c) === "peticao"; }).length;
    $("#s-sb").textContent = LUTAS.filter(function (c) { return acaoTipo(c) === "consulta"; }).length;
    $("#n-tot").textContent = LUTAS.length;
    $("#n-org").textContent = new Set(LUTAS.flatMap(function (c) { return c.quem || []; }).map(function (q) { return q.trim(); }).filter(Boolean)).size;
    $("#n-reg").textContent = new Set(LUTAS.map(function (c) { return c.reg; })).size;
  }
  function hi(id, on) {
    var m = markers[id];
    if (!m) return;
    var el = m.getElement();
    if (el) el.querySelector(".pin").classList.toggle("on", on);
  }
  function openCausa(id) {
    var c = LUTAS.find(function (x) { return x.id === id; });
    st.sel = id;
    if (c.ll) map.flyTo(c.ll, c.reg === "madeira" || c.reg === "acores" ? 9 : 10, { duration: 0.9 });
    var segue = seguidas.has(id);
    var F = FICHAS[c.id] || { corpo: "", fontes: [], stat: "", link: "", linkL: "" };
    var img = imgTagAttrs(c);
    var acaoLabel = c.petLabel ? c.petLabel.replace(/^[^A-Za-zÀ-ú]+/, "").replace(/\s*→\s*$/, "") : "";
    var acao = c.pet ? '<a class="btn btn--ink" href="' + c.pet + '" target="_blank" rel="noopener">' + acaoLabel + "</a>" : "";
    var badge = estadoBadge(c);
    $("#pbody").innerHTML =
      '<img class="panel-hero" src="' + img.src + '" srcset="' + img.srcset + '" sizes="480px" alt="' + c.loc + '">' +
      '<div class="pad">' +
      '<div class="row" style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">' +
      '<span class="numcaso">Nº ' + String(c.num || "").padStart(2, "0") + "</span>" +
      '<span class="tag ' + badge.k + '">' + badge.i + " " + badge.l + "</span>" +
      '<span class="mono">' + c.catLabel + "</span>" +
      "</div>" +
      "<h2>" + c.t + "</h2>" +
      '<div class="loc">' + c.loc + " · " + c.regLabel + "</div>" +
      '<p class="mono" style="color:var(--red-dark);margin-top:12px">' + c.status + "</p>" +
      (F.stat ? '<p class="mono" style="color:var(--ink-soft);margin-top:6px">' + F.stat + "</p>" : "") +
      '<p style="font-size:17px"><b>' + c.res + "</b></p>" +
      '<div class="actions">' +
      acao +
      '<button class="btn ' + (segue ? "btn--green" : "") + '" id="follow">' + (segue ? UI.painel.aSeguir : UI.painel.seguir) + "</button>" +
      (c.ll ? '<a class="btn btn--sm" href="' + googleEarthUrl(c) + '" target="_blank" rel="noopener">' + UI.painel.googleEarth + "</a>" : "") +
      '<button class="btn btn--sm" id="sharelink">' + UI.painel.copiarLink + "</button>" +
      '<a class="btn btn--sm btn--green" href="/' + c.id + (IDIOMA === "en" ? "-en" : "") + '.html" target="_blank" rel="noopener">' + UI.painel.verFichaCompleta + "</a>" +
      "</div>" +
      (!c.pet ? '<div class="note">' + UI.painel.semAcaoImediata + "</div>" : "") +
      '<div class="section-lbl"><span class="mono">' + UI.painel.oQueEstaAcontecer + "</span></div>" +
      '<div class="corpo">' + F.corpo + "</div>" +
      '<div class="section-lbl"><span class="mono">' + UI.painel.quemEnvolvido + "</span></div>" +
      '<div class="who">' + c.quem.map(function (q) { return "<span>" + q + "</span>"; }).join("") + "</div>" +
      '<div class="section-lbl"><span class="mono">' + UI.painel.fontes + "</span></div>" +
      '<ol class="fontes">' +
      F.fontes.map(function (f) { return '<li><a href="' + f[1] + '" target="_blank" rel="noopener">' + f[0] + "</a></li>"; }).join("") +
      (F.link ? '<li><a href="' + F.link + '" target="_blank" rel="noopener">' + (F.linkL || "Saber mais") + "</a></li>" : "") +
      "</ol></div>";
    $("#follow").onclick = function () {
      seguidas.has(id) ? seguidas.delete(id) : seguidas.add(id);
      toast(seguidas.has(id) ? "OK" : "OK");
      openCausa(id);
    };
    $("#sharelink").onclick = function () {
      var url = location.origin + "/" + id + (IDIOMA === "en" ? "-en" : "") + ".html";
      (navigator.clipboard ? navigator.clipboard.writeText(url) : Promise.reject()).then(function () { toast(UI.painel.linkCopiado); }).catch(function () { window.prompt("Link:", url); });
    };
    $("#panel").classList.add("open"); $("#panel").setAttribute("aria-hidden", "false");
    $("#scrim").classList.add("on");
    render();
  }
  function closePanel() {
    $("#panel").classList.remove("open"); $("#panel").setAttribute("aria-hidden", "true");
    $("#scrim").classList.remove("on"); st.sel = null;
    render();
  }
  $("#close").onclick = closePanel;
  $("#scrim").onclick = closePanel;
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") closePanel(); });
  var tt;
  function toast(msg) {
    var el = $("#toast");
    el.textContent = msg;
    el.classList.add("on");
    clearTimeout(tt);
    tt = setTimeout(function () { el.classList.remove("on"); }, 2600);
  }

  (function () {
    var c = LUTAS.find(function (x) { return x.prazo && acaoTipo(x) === "peticao"; }) || LUTAS[0];
    if (!c || !$("#alerta-prazo")) return;
    $("#alerta-prazo").innerHTML =
      "<b>" + c.t.split(":")[0] + "</b>, " + c.loc.split(",")[0] + ". " + c.status.replace(/^[^ ]+ /, "") + ". " +
      (c.pet ? '<a href="' + c.pet + '" target="_blank" rel="noopener">' + (c.petLabel || "Agir") + "</a>" : '<a href="/' + c.id + (IDIOMA === "en" ? "-en" : "") + '.html">Ver</a>');
  })();

  if ($("#deadlines")) {
    $("#deadlines").innerHTML =
      LUTAS.filter(function (c) { return c.prazo; })
        .map(function (c) { return '<li style="border:3px solid var(--cream);padding:14px 16px"><span class="mono" style="color:var(--green-bright-text)">' + c.status + "</span><br><b>" + c.t + "</b><br><span style=\"opacity:.7\">" + c.loc + "</span></li>"; })
        .join("") +
      LUTAS.filter(function (c) { return acaoTipo(c) === "peticao" && !c.prazo; })
        .slice(0, 5)
        .map(function (c) { return '<li style="border-bottom:2px dotted rgba(251,246,234,.35);padding:10px 0"><span class="mono" style="opacity:.6">' + (IDIOMA === "en" ? "open petition" : "petição aberta") + "</span><br><b>" + c.t + "</b></li>"; })
        .join("");
  }

  // dados estruturados (JSON-LD) para a lista completa
  (function () {
    var ld = document.createElement("script");
    ld.type = "application/ld+json";
    ld.textContent = JSON.stringify({
      "@context": "https://schema.org", "@type": "ItemList",
      name: IDIOMA === "en" ? "Environmental conflicts in Portugal, Madeira and the Azores" : "Conflitos ambientais em Portugal Continental, Madeira e Açores",
      numberOfItems: LUTAS.length,
      itemListElement: LUTAS.map(function (c, i) {
        return {
          "@type": "ListItem", position: i + 1,
          item: {
            "@type": "Article", headline: c.t, about: c.catLabel, abstract: c.res,
            url: location.origin + "/" + c.id + (IDIOMA === "en" ? "-en" : "") + ".html",
            dateModified: c.verif,
            publisher: { "@type": "Organization", name: "Causas de Raiz" },
          },
        };
      }),
    });
    document.head.appendChild(ld);
  })();

  render();
})();
