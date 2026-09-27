/**
 * pesquisa-mapa.js
 *
 * Motor da caixa de pesquisa do mapa (#q). Usado por mapa.js no browser e
 * pelos testes em Node (scripts/testar-pesquisa.js).
 *
 * - ignora maiúsculas e acentos, nos dois lados (litio = lítio);
 * - parte a pesquisa em palavras: um caso aparece se tiver todas, em qualquer campo;
 * - tolera plurais e variações simples (mina/minas, barragem/barragens);
 * - usa os sinónimos de src/_data/sinonimos.json (window.SINONIMOS);
 * - pesquisa também no texto completo da ficha e no campo invisível "pq"
 *   (concelhos e distritos, ver src/_data/casosPorIdioma.js);
 * - tolera uma letra trocada, a mais ou a menos em palavras com 5 ou mais letras;
 * - quando não há resultados, sugere as palavras existentes mais próximas.
 */
(function (root) {
  "use strict";

  var PARAGENS = ("de da do das dos e o a os as em no na nos nas um uma uns umas com por para ao aos à às " +
    "the of in on and an to at for with by from").split(" ");
  var paragens = {};
  PARAGENS.forEach(function (p) { paragens[p] = true; });

  // minúsculas, sem acentos, só letras e números
  function normalizar(s) {
    return String(s || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
  }

  // plurais e variações simples (PT e EN): minas → mina, barragens → barragem, poluições → poluicao
  // palavras cujo plural muda de sentido: "fogos" é quase sempre habitações ("683 fogos"), não incêndios
  var SEM_RADICAL = { fogos: true };
  function radical(w) {
    if (w.length <= 3 || SEM_RADICAL[w]) return w;
    if (/(oes|aes)$/.test(w)) return w.slice(0, -3) + "ao";
    if (/ns$/.test(w)) return w.slice(0, -2) + "m";
    if (w.length > 4 && /ais$/.test(w)) return w.slice(0, -3) + "al";
    if (w.length > 4 && /eis$/.test(w)) return w.slice(0, -3) + "el";
    if (/(ch|sh)es$/.test(w)) return w.slice(0, -2);
    if (/(ss|us|is)$/.test(w)) return w;
    if (/s$/.test(w)) return w.slice(0, -1);
    return w;
  }

  function palavras(s) { return normalizar(s).split(" ").filter(Boolean); }

  // distância de edição (com troca de duas letras vizinhas), com limite para ser rápida
  function distancia(a, b, max) {
    if (Math.abs(a.length - b.length) > max) return max + 1;
    var d = [];
    for (var i = 0; i <= a.length; i++) { d[i] = [i]; }
    for (var j = 1; j <= b.length; j++) { d[0][j] = j; }
    for (i = 1; i <= a.length; i++) {
      var menor = Infinity;
      for (j = 1; j <= b.length; j++) {
        var custo = a[i - 1] === b[j - 1] ? 0 : 1;
        d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + custo);
        if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
        if (d[i][j] < menor) menor = d[i][j];
      }
      if (menor > max) return max + 1;
    }
    return d[a.length][b.length];
  }

  function textoDoCaso(c, ficha) {
    var corpo = ficha && ficha.corpo ? String(ficha.corpo).replace(/<[^>]+>/g, " ") : "";
    return [c.t, c.loc, c.catLabel, c.regLabel, c.res, c.status, (c.quem || []).join(" "), (c.kw || []).join(" "), c.pq, c.petLabel, corpo].join(" ");
  }

  function criarIndice(casos, fichas, grupos) {
    var vocab = {}; // radical → { n: nº de casos, formas: { palavra com acentos: nº } }
    var indice = casos.map(function (c) {
      var texto = textoDoCaso(c, (fichas || {})[c.id]);
      var originais = String(texto).toLowerCase().match(/[a-z0-9À-ɏ]+/g) || [];
      var tokens = {};
      var seq = [];
      originais.forEach(function (o) {
        var n = normalizar(o);
        if (!n) return;
        n.split(" ").forEach(function (p) {
          var r = radical(p);
          seq.push(r);
          if (!tokens[r]) {
            tokens[r] = true;
            var v = vocab[r] || (vocab[r] = { n: 0, formas: {} });
            v.n++;
          }
          if (vocab[r]) vocab[r].formas[o] = (vocab[r].formas[o] || 0) + 1;
        });
      });
      return { id: c.id, tokens: tokens, lista: Object.keys(tokens), frase: " " + seq.join(" ") + " " };
    });

    // sinónimos: cada termo (palavra ou expressão) → grupos a que pertence
    var chaveDe = function (termo) { return palavras(termo).map(radical).join(" "); };
    var gruposChaves = (grupos || []).map(function (g) { return g.map(chaveDe).filter(Boolean); });
    var termoGrupos = {};
    var expressoes = [];
    gruposChaves.forEach(function (g, gi) {
      g.forEach(function (k) {
        (termoGrupos[k] = termoGrupos[k] || []).push(gi);
        if (k.indexOf(" ") !== -1) expressoes.push(k);
      });
    });
    expressoes.sort(function (a, b) { return b.length - a.length; });
    var vocabLista = Object.keys(vocab);

    function formaDe(r) {
      var f = vocab[r] ? vocab[r].formas : {};
      return Object.keys(f).sort(function (a, b) { return f[b] - f[a]; })[0] || r;
    }

    function juntarSinonimos(alts, chave) {
      (termoGrupos[chave] || []).forEach(function (gi) { gruposChaves[gi].forEach(function (k) { alts[k] = true; }); });
    }
    // sinónimos do grupo mais pequeno a que o termo pertence (traduções diretas, ex.: lítio/lithium)
    function juntarProximos(perto, chave) {
      var gs = (termoGrupos[chave] || []).slice().sort(function (a, b) { return gruposChaves[a].length - gruposChaves[b].length; });
      if (gs.length) gruposChaves[gs[0]].forEach(function (k) { perto[k] = true; });
    }

    function termosDaPesquisa(q) {
      var ws = palavras(q);
      var rs = ws.map(radical);
      var usado = rs.map(function () { return false; });
      var termos = [];
      // 1. expressões de várias palavras que existem no dicionário ("peixes mortos", "data center")
      expressoes.forEach(function (e) {
        var partes = e.split(" ");
        for (var i = 0; i + partes.length <= rs.length; i++) {
          var ok = true;
          for (var j = 0; j < partes.length; j++) if (usado[i + j] || rs[i + j] !== partes[j]) { ok = false; break; }
          if (!ok) continue;
          var dir = {}, alts = {}, perto = {};
          dir[e] = true;
          juntarSinonimos(alts, e);
          juntarProximos(perto, e);
          termos.push({ rotulo: ws.slice(i, i + partes.length).join(" "), dir: dir, perto: perto, alts: alts, literal: null, partes: partes });
          for (j = 0; j < partes.length; j++) usado[i + j] = true;
        }
      });
      // 2. palavras soltas
      rs.forEach(function (r, i) {
        if (usado[i] || paragens[ws[i]]) return;
        var dir = {}, alts = {}, perto = {};
        dir[r] = true;
        juntarSinonimos(alts, r);
        juntarProximos(perto, r);
        // erro de escrita: palavra com 5+ letras que não existe (nem como início de palavra)
        if (ws[i].length >= 5 && !vocab[r] && !vocabLista.some(function (v) { return v.indexOf(r) === 0; })) {
          vocabLista.forEach(function (v) {
            if (v.length >= 5 && distancia(r, v, 1) <= 1) { dir[v] = true; juntarSinonimos(alts, v); }
          });
        }
        termos.push({ rotulo: ws[i], dir: dir, perto: perto, alts: alts, literal: r.length >= 4 ? r : null });
      });
      return termos;
    }

    function temChave(ci, k) { return k.indexOf(" ") !== -1 ? ci.frase.indexOf(" " + k + " ") !== -1 : !!ci.tokens[k]; }
    // 2 = o caso tem a própria palavra (ou plural, ou erro de escrita); 1,5 = tem um sinónimo próximo
    // (grupo mais pequeno, ex.: tradução); 1 = só por um sinónimo mais largo; 0 = não tem
    function casoTemTermo(ci, termo) {
      for (var k in termo.dir) if (temChave(ci, k)) return 2;
      // expressão do dicionário cujas palavras estão todas no caso, em qualquer ordem
      if (termo.partes && termo.partes.every(function (p) { return paragens[p] || ci.tokens[p]; })) return 2;
      // início de palavra, para quem ainda está a escrever ("fotovolt", "braga")
      if (termo.literal) {
        for (var t = 0; t < ci.lista.length; t++) {
          var tk = ci.lista[t];
          if (tk.length >= termo.literal.length + 2 && tk.indexOf(termo.literal) === 0) return 2;
        }
      }
      for (k in termo.perto) if (temChave(ci, k)) return 1.5;
      for (k in termo.alts) if (temChave(ci, k)) return 1;
      return 0;
    }

    function sugestoes(termo) {
      var r = radical(palavras(termo.rotulo).join(""));
      return vocabLista
        .map(function (v) { return { v: v, d: distancia(r, v, 2) }; })
        .filter(function (x) { return x.d <= 2 && x.v.length >= 3; })
        .sort(function (a, b) { return a.d - b.d || vocab[b.v].n - vocab[a.v].n; })
        .slice(0, 3)
        .map(function (x) { return formaDe(x.v); });
    }

    // devolve { ids: {id: 2 ou 1} ou null se a pesquisa está vazia, total, termos, sugestoes }.
    // ids[id] = 2 quando o caso tem todas as palavras pesquisadas (ou plurais/erros de escrita),
    // 1,5 ou 1 quando só as tem por sinónimo: o mapa mostra primeiro os de nível mais alto.
    function procurar(q) {
      var termos = termosDaPesquisa(q);
      if (!termos.length) return { ids: null, total: 0, termos: [], sugestoes: [] };
      var ids = {};
      var n = 0;
      indice.forEach(function (ci) {
        var nivel = 2;
        for (var i = 0; i < termos.length && nivel; i++) nivel = Math.min(nivel, casoTemTermo(ci, termos[i]));
        if (nivel) { ids[ci.id] = nivel; n++; }
      });
      var sug = [];
      if (!n) {
        termos.forEach(function (t) {
          var algum = indice.some(function (ci) { return casoTemTermo(ci, t); });
          if (!algum) sug = sug.concat(sugestoes(t));
          else if (termos.length > 1) sug.push(t.rotulo);
        });
      }
      return { ids: ids, total: n, termos: termos.map(function (t) { return t.rotulo; }), sugestoes: sug.filter(function (s, i) { return sug.indexOf(s) === i; }).slice(0, 5) };
    }

    return { procurar: procurar };
  }

  var api = { criarIndice: criarIndice, normalizar: normalizar, radical: radical };
  root.PesquisaMapa = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : this);
