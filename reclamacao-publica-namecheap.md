Alojo o site ulmeiro.org (mapa de lutas ambientais em Portugal) na Namecheap. Esta semana tentei atualizar ficheiros estáticos simples — HTML e JavaScript, nada de complicado — e o suporte tornou-se um pesadelo.

Fiz upload dos ficheiros novos várias vezes. O cPanel confirmava sempre o upload, com a data de modificação a mostrar a hora certa. Mesmo assim, o site continuava a mostrar a versão antiga, minutos e horas depois. Tentei apagar e voltar a carregar os ficheiros, forçar refresh no browser, abrir separadores novos, e até adicionar cabeçalhos de no-cache via `.htaccess`. Nada resolveu de forma consistente.

Tudo aponta para uma camada de cache do lado do servidor (LiteSpeed ou semelhante) que não é purgada automaticamente depois de uma alteração aos ficheiros, e que ignora os cabeçalhos `Cache-Control` definidos no `.htaccess`. Ou seja: o cliente faz tudo certo, e mesmo assim o conteúdo não atualiza sem intervenção manual do lado deles.

Para um site com atualizações frequentes, isto é inaceitável. Perdi horas a diagnosticar um problema que não devia sequer existir — atualizar um ficheiro estático num site estático é a coisa mais básica que um alojamento devia garantir.

Se estás a pensar em alojar um site com conteúdo que muda com regularidade, pensa duas vezes antes de escolheres a Namecheap.
