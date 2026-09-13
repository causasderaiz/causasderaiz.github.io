# Reclamação — Namecheap Hosting (domínio ulmeiro.org)

## Resumo do problema

Ao longo de várias horas, tentei atualizar ficheiros estáticos (HTML e JavaScript) do site ulmeiro.org através do Gestor de Ficheiros do cPanel. Apesar de o upload ser confirmado como bem-sucedido — com a data de modificação do ficheiro no servidor a refletir corretamente a hora do upload — o conteúdo servido aos visitantes do site continuou a corresponder à versão antiga, sem qualquer atualização visível.

## O que foi tentado, sem sucesso

- Substituição direta dos ficheiros via upload (múltiplas vezes).
- Apagar o ficheiro antigo antes de fazer upload do novo (delete + upload, em vez de overwrite).
- Forçar atualização do lado do browser: refresh forçado (Ctrl+Shift+R), fecho e reabertura completa do separador, testes em separador novo.
- Adição de cabeçalhos HTTP de no-cache (`Cache-Control`, `Pragma`, `Expires`) via `.htaccess` para os ficheiros `.html` e `.js`.
- Verificação direta do ficheiro no servidor (aberto via URL direto, ex.: `ulmeiro.org/dados.js`) — mesmo aqui, o conteúdo mostrado não correspondia ao ficheiro mais recentemente carregado.

Nenhuma destas ações resolveu o problema de forma consistente. O padrão observado — ficheiro corretamente atualizado no servidor (confirmado pela data de modificação), mas conteúdo antigo continuamente servido aos visitantes — é típico de uma camada de cache do lado do servidor (por exemplo LiteSpeed Cache) que não está a ser corretamente invalidada após alterações aos ficheiros, e que não respeita os cabeçalhos `Cache-Control` definidos via `.htaccess`.

## O que peço

1. Confirmação de que tipo de cache (LiteSpeed, Varnish, CDN, ou outro) está ativo neste plano de hospedagem para o domínio ulmeiro.org.
2. Purga imediata de toda a cache do servidor para este domínio.
3. Instruções claras sobre como desativar esta cache de forma permanente para este site — trata-se de um site com atualizações de conteúdo frequentes (várias vezes por semana), onde qualquer atraso na propagação de alterações é inaceitável.
4. Uma explicação sobre por que razão os cabeçalhos `Cache-Control: no-cache, no-store, must-revalidate` definidos no `.htaccess` não impediram este comportamento.

Este problema já me custou várias horas de trabalho perdido a tentar diagnosticar algo que deveria ser simples: atualizar um ficheiro estático num site estático. Peço uma resolução definitiva, não um paliativo temporário.
