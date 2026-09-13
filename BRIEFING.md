# Mapa das Causas — briefing de continuação

Página estática única (`index.html`) que agrega as lutas ambientais em Portugal, Madeira e Açores.
Fonte da informação: **ulmeiro.org** (textos, resumos, datas de verificação e links de petições copiados de lá).
Não é um clone do Ulmeiro: é uma vista agregadora, pensada para dar o panorama nacional num só ecrã e para ser citável.

## O que já está feito

- **Mapa Leaflet + OpenStreetMap** com 19 lutas (17 com petição ativa, 2 em acompanhamento).
  Pins numerados com o mesmo número da lista; aro verde nos que têm prazo; saltos rápidos por região; legenda.
- **Filtro de procura na home**: texto livre (título, local, tema, resumo, quem defende), região, tema (chips), estado (todas / petição ativa / stand by), ordenação (urgência / verificado / A-Z). Mapa e lista filtram em conjunto.
- **Ficha lateral** por luta: foto, estado, tema, prazo, resumo, quem defende, data de verificação, link para a petição real e para a ficha no ulmeiro.org.
- **Barra de alerta** com contagem de dias até ao prazo mais próximo (calculada em tempo real).
- **Números nacionais**, secção **Top 100** (progresso rumo a 100 lutas mapeadas), **Metodologia** e **Índice por região** em HTML real.
- **Dados estruturados schema.org** (ItemList de Article com local, coordenadas, data de verificação e publisher Ulmeiro) injetados no `<head>` — para buscadores e assistentes citarem com atribuição.
- Responsivo em três níveis (desktop, iPad, telemóvel), alvos de toque 44px.

## Estrutura do ficheiro

Tudo em `index.html`: `<style>` no `<head>`, conteúdo em HTML, dados e lógica num `<script>` no fim.
`site/img/` guarda as fotografias próprias; cada luta procura `img/<id>.jpg` e, se não existir, usa a imagem do ulmeiro.org (atributo `onerror`).

### Modelo de dados (`const CAUSAS`)

| campo | significado |
|---|---|
| `id` | igual ao `id` da ficha no ulmeiro.org (usado no link e no nome da foto) |
| `t` / `loc` / `reg` / `tema` | título, local, região (filtro e saltos do mapa), tema (chips) |
| `est` | `"ativa"` ou `"acompanhamento"` |
| `prazo` / `prazoISO` | rótulo do prazo e data ISO para a contagem de dias |
| `verif` | data da última verificação (ISO) |
| `quem` | array de quem defende |
| `res` | resumo (texto do Ulmeiro) |
| `pet` | link da petição (ausente em acompanhamento) |
| `ll` | `[latitude, longitude]` — aproximadas ao concelho |

## Sistema visual (manter)

- Tipos: **Londrina Solid** em caixa alta para títulos, **Space Grotesk** para texto, **Space Mono** para etiquetas/dados.
- Cores: papel `#FBF6EA`, tinta `#171A12`, vermelho `#E63A25` (urgência/ameaça), verde `#0E7A4E` e verde vivo `#18C070` (defesa/vitória).
- Traço de 3px, sombras duras deslocadas, sem gradientes, sem cantos muito arredondados, sem emoji decorativo.
- Nada de texto a rolar nem animações de notícia: isto é um diretório, não um canal de televisão.
- Atenção ao contraste: nunca texto escuro sobre fundo escuro (o botão preto leva texto claro).

## Por fazer (por ordem de valor)

1. **Passar as 19 lutas para as 59 do Ulmeiro** e manter as datas de verificação exactas de cada ficha.
2. **Separar os dados do HTML**: `lutas.json` carregado por `fetch`, para editar conteúdo sem tocar no código — e servir como ficheiro de dados abertos citável (com licença e obrigação de atribuição).
3. **Coordenadas reais** por luta (as actuais são aproximadas ao concelho).
4. **Estados que o Ulmeiro usa e aqui faltam**: consulta pública, processo judicial, vitória — com cor e filtro próprios.
5. **Alerta por concelho/região** (email) — é o que transforma visitas em apoiantes e dá indicadores para candidaturas a financiamento.
6. **Capas partilháveis** por luta (imagem gerada com título, local e prazo) para as redes devolverem tráfego.
7. **Fotografias próprias** de manifestações e vigílias, com crédito visível na ficha.
8. Acessibilidade: navegação por teclado na lista, `aria-live` na contagem de resultados, foco visível.

## Regras a respeitar

- Textos, datas e links vêm do ulmeiro.org — **não inventar** números, assinaturas ou factos.
- Atribuição ao Ulmeiro no rodapé e em cada ficha; atribuição obrigatória do OpenStreetMap no mapa.
- Sem publicidade, sem rastreadores de terceiros.
