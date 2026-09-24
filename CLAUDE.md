# Regras para editar o site Causas de Raiz

Este site é feito em Eleventy (11ty) e publicado no GitHub Pages, no repositório
`causasderaiz/causasderaiz.github.io`.

## Fonte de verdade

- Editar APENAS ficheiros fonte: `src/`, `eleventy.config.js`, etc.
- NUNCA editar `_site/` diretamente — é a pasta de output gerada pelo build,
  é descartável e é sempre recriada.
- NUNCA reconstruir ou "adivinhar" o código fonte a partir do site publicado
  (causasderaiz.org) nem copiar HTML do site para dentro de `src/`.
- O ficheiro do mapa é `src/assets/js/mapa.js` (fonte). O build gera
  `_site/js/mapa.js`, que é o que fica publicado — nunca editar esse output
  diretamente.
- O mesmo vale para `src/assets/css/site.css` → `_site/css/site.css`.

## Antes de qualquer alteração

Este projeto local **não é um repositório git** (não há `.git`, não há
`git pull` possível). A publicação é feita manualmente, por upload de
ficheiros na interface web do GitHub (nunca por linha de comandos, nunca
inserindo tokens ou credenciais).

Por isso, antes de editar ou publicar seja o que for:

1. Verificar a versão AO VIVO do ficheiro relevante em causasderaiz.org (ou o
   histórico de commits em github.com/causasderaiz/causasderaiz.github.io),
   porque a Silvia por vezes edita ficheiros diretamente no GitHub sem essas
   edições voltarem para este projeto local.
2. Se houver diferença entre o site ao vivo e este código fonte, o site ao
   vivo é a fonte de verdade — atualizar primeiro o ficheiro fonte local para
   corresponder, só depois fazer a alteração pedida.
3. Nunca publicar uma reconstrução completa do site (todas as páginas) sem
   confirmar antes que não há edições ao vivo por reconciliar.

## Depois de alterar

- Correr `npx @11ty/eleventy` a partir da raiz do projeto para gerar `_site/`
  de novo e confirmar que o build não tem erros.
- Se uma alteração não aparecer como esperado, apagar `_site/` por completo
  (`rm -rf _site`) e voltar a construir — o Eleventy não limpa sozinho
  ficheiros órfãos de builds antigos.
- Os ficheiros `index.html` e `index-en.html` referenciam `site.css` e
  `mapa.js` com um hash de conteúdo na query string (`?v=...`). Sempre que
  `site.css` ou `mapa.js` mudam, o GitHub Pages/Fastly só mostra a versão
  nova se `index.html`/`index-en.html` também forem republicados (para que o
  URL do pedido mude e não sirva a versão em cache).

## Regra de design

Não alterar nada do design/visual do site (layout, cores, estilo, ou remover
elementos visuais existentes) sem ordem explícita da Silvia — qualquer
mudança destas tem de ser pedida por ela primeiro, nunca feita por
iniciativa própria.
