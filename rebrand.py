import re, glob, os

SITE = "/sessions/intelligent-lucid-ptolemy/mnt/Desktop/Ulmeiro/site"

files = [f for f in glob.glob(os.path.join(SITE, "*.html"))] + \
        [os.path.join(SITE, f) for f in ["dados.js","dados-en.js","fichas.js","fichas-en.js"]]

EMAIL_PLACEHOLDER = "\x00EMAILDOMAIN\x00"

report = []

for path in files:
    with open(path, encoding="utf-8") as fh:
        t = fh.read()
    orig = t

    # 1. Protect the email domain (keep geral@ulmeiro.org untouched)
    t = t.replace("geral@ulmeiro.org", "geral@" + EMAIL_PLACEHOLDER)

    # 2. Swap the bare/lowercase domain everywhere else: ulmeiro.org -> mapaderaiz.org
    n_domain = len(re.findall(r"ulmeiro\.org", t))
    t = re.sub(r"ulmeiro\.org", "mapaderaiz.org", t)

    # 3. Restore protected email
    t = t.replace(EMAIL_PLACEHOLDER, "ulmeiro.org")

    # 4. Replace the capitalized brand word "Ulmeiro" -> "Mapa de Raiz"
    #    (case-sensitive; never touches lowercase "ulmeiro" inside filenames/domain)
    n_brand = len(re.findall(r"\bUlmeiro\b", t))
    t = re.sub(r"\bUlmeiro\b", "Mapa de Raiz", t)

    # 5. Fix stray old label found only in livro.html
    n_stray = t.count("Mapa das Causas")
    t = t.replace("Mapa das Causas", "Mapa de Raiz")

    if t != orig:
        with open(path, "w", encoding="utf-8") as fh:
            fh.write(t)
        report.append((os.path.basename(path), n_domain, n_brand, n_stray))

print(f"{'ficheiro':30s} {'dominio':>8s} {'marca':>8s} {'stray':>8s}")
for r in report:
    print(f"{r[0]:30s} {r[1]:8d} {r[2]:8d} {r[3]:8d}")
