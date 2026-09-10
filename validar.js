#!/usr/bin/env node
/**
 * validar.js — verificação automática do Causas de Raiz
 *
 * Corre isto sempre ANTES de subir ficheiros para o servidor (FTP/cPanel).
 * Não precisa de instalar nada: só Node.js (já vem no computador se
 * alguma vez correste "node --version" com sucesso).
 *
 * Como usar:
 *   1. Abre o Terminal.
 *   2. cd para a pasta do site (a pasta onde está este ficheiro).
 *   3. Corre:  node validar.js
 *
 * Se aparecer "TUDO OK" no fim, podes subir os ficheiros com confiança.
 * Se aparecer "ERROS ENCONTRADOS", NÃO subas nada antes de corrigir —
 * a lista diz exatamente o que e onde.
 *
 * O que este script verifica:
 *  - dados.js e dados-en.js são JavaScript válido (sem erros de sintaxe)
 *  - os dois ficheiros têm exatamente os mesmos casos (mesmos IDs, sem duplicados)
 *  - cat / cat2 / est / reg de cada caso existem nas listas oficiais
 *  - cat2 e kw existem em par (PT e EN) para o mesmo caso
 *  - campos obrigatórios não estão vazios (t, loc, res, status, quem, img)
 *  - pet e petLabel andam sempre os dois juntos (ou os dois vazios)
 *  - "verif" é uma data válida e não é uma data no futuro
 *  - "ll" (coordenadas), quando existe, está dentro de Portugal/Atlântico
 *  - sitemap.xml é XML válido e tem uma entrada por cada caso.html/caso-en.html
 *  - os números escritos à mão (llms.txt, diretorio.html, diretorio-en.html,
 *    index-en.html) batem certo com a contagem real de casos e de petições
 */

const fs = require('fs');
const path = require('path');

const DIR = __dirname;
const hoje = new Date().toISOString().slice(0, 10);

let erros = [];
let avisos = [];

function erro(msg) { erros.push(msg); }
function aviso(msg) { avisos.push(msg); }

// ---------- utilidades ----------

function lerFicheiro(nome) {
  const p = path.join(DIR, nome);
  if (!fs.existsSync(p)) return null;
  return fs.readFileSync(p, 'utf8');
}

// Carrega um dados.js/dados-en.js e devolve {CAUSAS, CATEGORIAS, ESTADOS, REGIOES}
// sem depender de nenhuma biblioteca — só substitui "const X" por "global.X"
// antes de avaliar, para conseguirmos ler as variáveis depois.
function carregarDados(nome) {
  const src = lerFicheiro(nome);
  if (src === null) {
    erro(`Não encontrei o ficheiro ${nome}.`);
    return null;
  }
  const preparado = src
    .replace('const CAUSAS', 'global.CAUSAS')
    .replace('const CATEGORIAS', 'global.CATEGORIAS')
    .replace('const ESTADOS', 'global.ESTADOS')
    .replace('const REGIOES', 'global.REGIOES');
  try {
    // eslint-disable-next-line no-eval
    eval(preparado);
  } catch (e) {
    erro(`${nome} tem um erro de sintaxe JavaScript: ${e.message}`);
    return null;
  }
  if (!Array.isArray(global.CAUSAS)) {
    erro(`${nome} não define corretamente o array CAUSAS.`);
    return null;
  }
  return {
    CAUSAS: global.CAUSAS,
    CATEGORIAS: global.CATEGORIAS || [],
    ESTADOS: global.ESTADOS || [],
    REGIOES: global.REGIOES || [],
  };
}

function acaoTipo(c) {
  if (!c.pet) return '';
  const l = (c.petLabel || '').toLowerCase();
  if (l.includes('participa') || l.includes('consulta')) return 'consulta';
  if (l.includes('member') || l.includes('socio') || l.includes('sócio') || l.includes('support')) return 'apoio';
  return 'peticao';
}

// ---------- 1. carregar dados.js e dados-en.js ----------

const pt = carregarDados('dados.js');
const en = carregarDados('dados-en.js');

if (!pt || !en) {
  imprimirRelatorioFinal();
  process.exit(1);
}

const { CAUSAS: causasPt, CATEGORIAS, ESTADOS, REGIOES } = pt;
const { CAUSAS: causasEn, REGIOES: REGIOES_EN } = en;

// cat / cat2 / est usam a mesma chave (ex.: "energia", "urgente") nos dois
// idiomas — só o texto (catLabel) é traduzido. "reg", pelo contrário, é o
// próprio nome da região já traduzido ("Norte" vs "North"), por isso cada
// ficheiro precisa da sua própria lista de regiões para ser validado.

// ---------- 2. mesmos casos nos dois ficheiros ----------

const idsPt = causasPt.map((c) => c.id);
const idsEn = causasEn.map((c) => c.id);

const duplicadosPt = idsPt.filter((id, i) => idsPt.indexOf(id) !== i);
const duplicadosEn = idsEn.filter((id, i) => idsEn.indexOf(id) !== i);
if (duplicadosPt.length) erro(`IDs duplicados em dados.js: ${[...new Set(duplicadosPt)].join(', ')}`);
if (duplicadosEn.length) erro(`IDs duplicados em dados-en.js: ${[...new Set(duplicadosEn)].join(', ')}`);

if (causasPt.length !== causasEn.length) {
  erro(`dados.js tem ${causasPt.length} casos, dados-en.js tem ${causasEn.length}. Têm de ser iguais.`);
}

const soPt = idsPt.filter((id) => !idsEn.includes(id));
const soEn = idsEn.filter((id) => !idsPt.includes(id));
if (soPt.length) erro(`Casos só em dados.js (faltam em dados-en.js): ${soPt.join(', ')}`);
if (soEn.length) erro(`Casos só em dados-en.js (faltam em dados.js): ${soEn.join(', ')}`);

// ---------- 3. validar cada caso individualmente ----------

const catKeys = CATEGORIAS.map((c) => c[0]);
const estKeys = ESTADOS.map((c) => c[0]);
const camposObrigatorios = ['id', 't', 'loc', 'reg', 'cat', 'catLabel', 'est', 'status', 'res', 'img', 'quem'];

// Portugal + Madeira + Açores, com margem generosa
const LAT_MIN = 30, LAT_MAX = 43, LON_MIN = -32, LON_MAX = -5.5;

function validarCaso(c, origem, listaRegioes) {
  const tag = `[${origem}:${c.id || '???'}]`;

  camposObrigatorios.forEach((campo) => {
    const v = c[campo];
    const vazio = v === undefined || v === null || v === '' || (Array.isArray(v) && v.length === 0);
    if (vazio) erro(`${tag} campo obrigatório "${campo}" está vazio.`);
  });

  if (c.cat && !catKeys.includes(c.cat)) erro(`${tag} categoria "${c.cat}" não existe em CATEGORIAS.`);
  if (c.cat2 && !catKeys.includes(c.cat2)) erro(`${tag} cat2 "${c.cat2}" não existe em CATEGORIAS.`);
  if (c.est && !estKeys.includes(c.est)) erro(`${tag} estado "${c.est}" não existe em ESTADOS.`);
  if (c.reg && !listaRegioes.includes(c.reg)) erro(`${tag} região "${c.reg}" não existe na lista de regiões de ${origem}.`);

  if (typeof c.prazo !== 'boolean') erro(`${tag} "prazo" devia ser true/false, encontrei: ${JSON.stringify(c.prazo)}.`);

  if (c.quem && !Array.isArray(c.quem)) erro(`${tag} "quem" devia ser uma lista (array).`);
  if (c.kw && !Array.isArray(c.kw)) erro(`${tag} "kw" devia ser uma lista (array).`);

  // pet e petLabel andam sempre juntos
  const temPet = !!c.pet;
  const temPetLabel = !!c.petLabel;
  if (temPet !== temPetLabel) {
    erro(`${tag} "pet" e "petLabel" têm de estar ambos preenchidos ou ambos vazios (agora: pet=${JSON.stringify(c.pet)}, petLabel=${JSON.stringify(c.petLabel)}).`);
  }

  // verif: data válida e não no futuro
  if (c.verif) {
    const dataValida = /^\d{4}-\d{2}-\d{2}$/.test(c.verif);
    if (!dataValida) {
      erro(`${tag} "verif" não está no formato AAAA-MM-DD: ${c.verif}`);
    } else if (c.verif > hoje) {
      erro(`${tag} "verif" (${c.verif}) é uma data no futuro. A data de hoje é ${hoje}.`);
    }
  } else {
    erro(`${tag} não tem campo "verif".`);
  }

  // coordenadas dentro da zona esperada
  if (c.ll !== null && c.ll !== undefined) {
    if (!Array.isArray(c.ll) || c.ll.length !== 2) {
      erro(`${tag} "ll" devia ser null ou [latitude, longitude].`);
    } else {
      const [lat, lon] = c.ll;
      if (typeof lat !== 'number' || typeof lon !== 'number') {
        erro(`${tag} coordenadas não são números: ${JSON.stringify(c.ll)}`);
      } else if (lat < LAT_MIN || lat > LAT_MAX || lon < LON_MIN || lon > LON_MAX) {
        aviso(`${tag} coordenadas [${lat}, ${lon}] parecem fora de Portugal/Madeira/Açores — confirma se não há um número trocado.`);
      }
    }
  }

  // imagem: formato esperado
  if (c.img && !c.img.startsWith('https://causasderaiz.org/')) {
    aviso(`${tag} "img" não começa por https://causasderaiz.org/ — confirma o link: ${c.img}`);
  }
}

causasPt.forEach((c) => validarCaso(c, 'PT', REGIOES));
causasEn.forEach((c) => validarCaso(c, 'EN', REGIOES_EN));

// ---------- 4. cat2 / kw têm de existir em par entre PT e EN ----------

const mapaPt = Object.fromEntries(causasPt.map((c) => [c.id, c]));
const mapaEn = Object.fromEntries(causasEn.map((c) => [c.id, c]));

idsPt.filter((id) => idsEn.includes(id)).forEach((id) => {
  const cp = mapaPt[id];
  const ce = mapaEn[id];
  const cat2Pt = !!cp.cat2, cat2En = !!ce.cat2;
  if (cat2Pt !== cat2En) {
    erro(`[${id}] "cat2" existe só num dos ficheiros (PT=${cp.cat2 || '—'}, EN=${ce.cat2 || '—'}).`);
  } else if (cat2Pt && cp.cat2 !== ce.cat2) {
    erro(`[${id}] "cat2" diferente entre PT (${cp.cat2}) e EN (${ce.cat2}) — devia ser a mesma categoria.`);
  }

  const kwPt = !!(cp.kw && cp.kw.length), kwEn = !!(ce.kw && ce.kw.length);
  if (kwPt !== kwEn) {
    aviso(`[${id}] "kw" existe só num dos ficheiros (PT=${kwPt ? 'sim' : 'não'}, EN=${kwEn ? 'sim' : 'não'}) — confirma se falta traduzir.`);
  }
});

// ---------- 5. contagens para comparar com o que está escrito à mão ----------

const totalCasos = causasPt.length;
const totalPeticoes = causasPt.filter((c) => acaoTipo(c) === 'peticao').length;

// ---------- 6. sitemap.xml ----------

const sitemap = lerFicheiro('sitemap.xml');
if (sitemap === null) {
  aviso('Não encontrei sitemap.xml — não consegui verificar as entradas do mapa do site.');
} else {
  // XML válido?
  const abreUrl = (sitemap.match(/<url>/g) || []).length;
  const fechaUrl = (sitemap.match(/<\/url>/g) || []).length;
  if (abreUrl !== fechaUrl) {
    erro(`sitemap.xml parece mal formado: ${abreUrl} <url> abertos vs ${fechaUrl} </url> fechados.`);
  }

  const locsSitemap = [...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map((m) => m[1]);

  causasPt.forEach((c) => {
    const urlPt = `https://causasderaiz.org/caso.html?id=${c.id}`;
    const urlEn = `https://causasderaiz.org/caso-en.html?id=${c.id}`;
    if (!locsSitemap.includes(urlPt)) erro(`sitemap.xml não tem entrada para ${urlPt}`);
    if (!locsSitemap.includes(urlEn)) erro(`sitemap.xml não tem entrada para ${urlEn}`);
  });
}

// ---------- 7. números escritos à mão em ficheiros de texto ----------

function verificarNumerosEscritos(nome, padroes) {
  const conteudo = lerFicheiro(nome);
  if (conteudo === null) {
    aviso(`Não encontrei ${nome} — salta a verificação de números.`);
    return;
  }
  padroes.forEach(({ regex, esperado, descricao }) => {
    const m = conteudo.match(regex);
    if (!m) {
      aviso(`${nome}: não encontrei o padrão "${descricao}" para conferir o número.`);
      return;
    }
    const encontrado = parseInt(m[1], 10);
    if (encontrado !== esperado) {
      erro(`${nome}: diz "${descricao}" = ${encontrado}, mas o número real hoje é ${esperado}.`);
    }
  });
}

verificarNumerosEscritos('llms.txt', [
  { regex: /Todos os casos \/ All cases \((\d+)\)/, esperado: totalCasos, descricao: 'Todos os casos (N)' },
]);

verificarNumerosEscritos('diretorio.html', [
  { regex: /(\d+) casos documentados, (\d+) com petição ativa/, esperado: totalCasos, descricao: 'N casos documentados' },
]);

verificarNumerosEscritos('index-en.html', [
  { regex: /See all (\d+) struggles/, esperado: totalCasos, descricao: 'See all N struggles' },
]);

verificarNumerosEscritos('diretorio-en.html', [
  { regex: /(\d+) documented cases/, esperado: totalCasos, descricao: 'N documented cases' },
]);

// ---------- relatório final ----------

function imprimirRelatorioFinal() {
  console.log('');
  console.log('════════════════════════════════════════');
  console.log(' VALIDAÇÃO — Causas de Raiz');
  console.log('════════════════════════════════════════');
  console.log(`Casos verificados: ${typeof totalCasos !== 'undefined' ? totalCasos : '?'}`);
  console.log(`Com petição ativa: ${typeof totalPeticoes !== 'undefined' ? totalPeticoes : '?'}`);
  console.log('');

  if (avisos.length) {
    console.log(`⚠ ${avisos.length} aviso(s) — vale a pena olhar, mas não impedem a publicação:`);
    avisos.forEach((a) => console.log('  - ' + a));
    console.log('');
  }

  if (erros.length) {
    console.log(`✗ ${erros.length} ERRO(S) ENCONTRADO(S) — corrige antes de subir os ficheiros:`);
    erros.forEach((e) => console.log('  - ' + e));
    console.log('');
    console.log('════════════════════════════════════════');
    console.log(' RESULTADO: ERROS ENCONTRADOS — não subir');
    console.log('════════════════════════════════════════');
  } else {
    console.log('════════════════════════════════════════');
    console.log(' RESULTADO: TUDO OK — pode subir os ficheiros');
    console.log('════════════════════════════════════════');
  }
}

imprimirRelatorioFinal();
process.exit(erros.length ? 1 : 0);
