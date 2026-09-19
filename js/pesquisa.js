/**
 * pesquisa.js
 *
 * Inicializa a pesquisa full-text (Pagefind) na caixa #pesquisa. O índice é
 * gerado no build (scripts/pagefind-build.js) a partir do HTML final de
 * _site/, separado automaticamente por idioma através do atributo
 * lang="pt-PT" / lang="en" de cada página.
 */
document.addEventListener("DOMContentLoaded", function () {
  var el = document.getElementById("pesquisa");
  if (!el || typeof PagefindUI === "undefined") return;
  var idioma = window.IDIOMA || "pt";
  var ui = window.UI || {};
  new PagefindUI({
    element: "#pesquisa",
    showSubResults: true,
    showImages: true,
    excerptLength: 20,
    resetStyles: false,
    translations: {
      placeholder: (ui.pesquisa && ui.pesquisa.placeholder) || "",
      zero_results: (ui.pesquisa && ui.pesquisa.semResultados) || "",
    },
  });
});
