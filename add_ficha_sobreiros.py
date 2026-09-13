import json

corpo_pt = ('<p>A Quercus denunciou, em comunicado enviado às redações a 1 de setembro de 2026, '
            'a intenção da Câmara Municipal da Covilhã de abater cerca de 1.400 sobreiros — dezenas '
            'dos quais centenários — para permitir a expansão do Parque Industrial do Tortosendo, no '
            'âmbito da revisão do Plano Diretor Municipal (PDM). A associação ambiental aponta a '
            'existência de duas linhas de água, três charcas e várias nascentes na área prevista, além '
            'de 10 casas de primeira habitação cujos residentes poderão ser expropriados. A denúncia '
            'surge a poucos dias do fim da discussão pública da revisão do PDM, que termina a 4 de '
            'setembro de 2026.</p><p>A Quercus questiona a necessidade de mais solo industrial, '
            'alegando que a atual zona industrial "tem metade dos seus lotes vazios ou abandonados", e '
            'considera a expansão um "falso pretexto". A associação sustenta que, por se tratar de uma '
            'espécie protegida, a Câmara terá de demonstrar que a expansão sobre o povoamento de '
            'sobreiros é "a única alternativa viável para satisfazer o interesse público" antes de poder '
            'autorizar a sua remoção. O presidente da Câmara, Hélio Fazendeiro, confirma que esta '
            'terceira fase do parque industrial já estava prevista no planeamento há cerca de 30 anos, '
            'reconhece as preocupações ambientais e das famílias afetadas, e garante que a expansão '
            'cumprirá a lei, com replantação de árvores como já aconteceu noutras fases do mesmo parque.</p>')

corpo_en = ('<p>Quercus denounced, in a statement sent to newsrooms on 1 September 2026, Covilhã City '
            "Council's intention to fell around 1,400 cork oaks — dozens of them centuries old — to allow "
            'the expansion of the Tortosendo Industrial Park, as part of the revision of the Municipal '
            'Master Plan (PDM). The environmental group points to two watercourses, three ponds and '
            'several springs in the planned area, plus 10 primary residences whose occupants could face '
            "expropriation. The denunciation comes days before the end of the PDM revision's public "
            'discussion period, which closes on 4 September 2026.</p><p>Quercus questions the need for '
            'more industrial land, arguing the current industrial zone "has half its plots empty or '
            'abandoned", and calls the expansion a "false pretext". The group argues that, since it '
            'involves a legally protected species, the council must prove the expansion into the cork oak '
            'stand is "the only viable alternative to serve the public interest" before authorising its '
            'removal. Mayor Hélio Fazendeiro confirms this third phase of the industrial park was already '
            'planned around 30 years ago, acknowledges the environmental and family concerns, and says the '
            'expansion will comply with the law, including replanting trees as happened in earlier phases '
            'of the same park.</p>')

fontes_pt = [
  ["Observador (denúncia da Quercus)","https://observador.pt/2026/09/01/quercus-denuncia-abate-de-1-400-sobreiros-para-expansao-de-parque-industrial-na-covilha/"],
  ["Rádio Clube da Covilhã (resposta do presidente da Câmara)","https://radio-covilha.pt/2026/09/noticias/quercus-denuncia-possivel-abate-de-sobreiros-no-tortosendo-camara-garante-cumprimento-da-lei/"],
  ["Greensavers / SAPO Ambiente","https://greensavers.sapo.pt/quercus-denuncia-abate-de-1-400-sobreiros-para-expansao-de-parque-industrial-na-covilha/"],
  ["Ambiente Magazine","https://www.ambientemagazine.com/quercus-denuncia-abate-de-1-400-sobreiros-para-expansao-do-parque-industrial-do-tortosendo/"]
]
fontes_en = [
  ["Observador (Quercus denunciation, in Portuguese)","https://observador.pt/2026/09/01/quercus-denuncia-abate-de-1-400-sobreiros-para-expansao-de-parque-industrial-na-covilha/"],
  ["Rádio Clube da Covilhã (mayor's response, in Portuguese)","https://radio-covilha.pt/2026/09/noticias/quercus-denuncia-possivel-abate-de-sobreiros-no-tortosendo-camara-garante-cumprimento-da-lei/"],
  ["Greensavers / SAPO Ambiente (in Portuguese)","https://greensavers.sapo.pt/quercus-denuncia-abate-de-1-400-sobreiros-para-expansao-de-parque-industrial-na-covilha/"],
  ["Ambiente Magazine (in Portuguese)","https://www.ambientemagazine.com/quercus-denuncia-abate-de-1-400-sobreiros-para-expansao-do-parque-industrial-do-tortosendo/"]
]

def entry_js(corpo, fontes, stat, link, linkL):
    return ('"corpo":' + json.dumps(corpo, ensure_ascii=False) +
            ',"fontes":' + json.dumps(fontes, ensure_ascii=False) +
            ',"stat":' + json.dumps(stat, ensure_ascii=False) +
            ',"link":' + json.dumps(link, ensure_ascii=False) +
            ',"linkL":' + json.dumps(linkL, ensure_ascii=False))

pt_js = entry_js(corpo_pt, fontes_pt,
                  "PDM prevê abater cerca de 1.400 sobreiros, dezenas centenários",
                  "https://observador.pt/2026/09/01/quercus-denuncia-abate-de-1-400-sobreiros-para-expansao-de-parque-industrial-na-covilha/",
                  "Ler notícia →")
en_js = entry_js(corpo_en, fontes_en,
                  "Master plan would fell around 1,400 cork oaks, dozens centuries old",
                  "https://observador.pt/2026/09/01/quercus-denuncia-abate-de-1-400-sobreiros-para-expansao-de-parque-industrial-na-covilha/",
                  "Read the article (in Portuguese) →")

# ---- fichas.js ----
path = 'fichas.js'
t = open(path, encoding='utf-8').read()
tail = '"linkL":"Ver página do movimento Reabrir a Galé →"}'
assert t.rstrip().endswith(tail + '};'), t[-100:]
idx = t.rindex(tail) + len(tail)
new_t = t[:idx] + ',"sobreiros-tortosendo":{' + pt_js + '}' + t[idx:]
open(path, 'w', encoding='utf-8').write(new_t)
print('fichas.js written, len', len(new_t))

# ---- fichas-en.js ----
path = 'fichas-en.js'
t = open(path, encoding='utf-8').read()
tail_en = '"linkL":"See the Reabrir a Galé movement\'s page →"}'
idx = t.index(tail_en) + len(tail_en)
new_t = t[:idx] + ',"sobreiros-tortosendo":{' + en_js + '}' + t[idx:]
open(path, 'w', encoding='utf-8').write(new_t)
print('fichas-en.js written, len', len(new_t))
