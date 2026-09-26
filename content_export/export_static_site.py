"""Congela output/conteudo.json + output/media/ nos arquivos que o frontend importa.

Uso:
    python export_static_site.py

Gera frontend/src/data/site-content.json e copia as imagens para
frontend/public/assets/media/. Aplica as regras confirmadas em regras.json:
candidatos marcados com "?" pelo extrator só ganham estilo especial se a
regra correspondente estiver ligada.
"""

from __future__ import annotations

import csv
import json
import re
import shutil
import unicodedata
from pathlib import Path

AQUI = Path(__file__).parent
RAIZ = AQUI.parent
ENTRADA = AQUI / "output" / "conteudo.json"
# Valores dos gráficos-imagem lidos à mão (ver transcricoes/graficos_transcritos.py)
TRANSCRITOS = AQUI / "transcricoes" / "graficos_transcritos.json"
MEDIA_ENTRADA = AQUI / "output" / "media"
SAIDA_JSON = RAIZ / "frontend" / "src" / "data" / "site-content.json"
SAIDA_MEDIA = RAIZ / "frontend" / "public" / "assets" / "media"
# Arquivos públicos para gráficos/painéis (baixáveis direto do GitHub Pages)
SAIDA_DADOS = RAIZ / "frontend" / "public" / "dados"

ENUM_TITULO_RE = re.compile(r"^(\(?(?:[a-z]|\d{1,2}|[ivx]{1,4})\)\s+)([^:]{2,80}:)(\s.*)$", re.S)


def negrito_enum(segs: list[dict]) -> list[dict]:
    """Põe em negrito o trecho entre o enumerador e os dois-pontos."""
    if not segs or "t" not in segs[0]:
        return segs
    m = ENUM_TITULO_RE.match(segs[0]["t"])
    if not m:
        return segs
    resto = {k: v for k, v in segs[0].items() if k != "t"}
    return [
        {**resto, "t": m.group(1)},
        {**resto, "t": m.group(2), "b": True},
        {**resto, "t": m.group(3)},
        *segs[1:],
    ]


# Pré-textuais publicados como páginas (capa, folha de rosto, dedicatória e sumário ficam de fora)
PRE_PUBLICADOS = ("RESUMO", "ABSTRACT", "LISTA DE ABREVIATURAS")
SIGLA_RE = re.compile(r"^(\S+(?: \S+)?)(?:\t+|\s{2,})\s*(.+)$")


def slug(texto: str) -> str:
    s = unicodedata.normalize("NFKD", texto).encode("ascii", "ignore").decode()
    return re.sub(r"[^a-zA-Z0-9]+", "-", s).strip("-").lower()


def aparar(segs: list[dict]) -> list[dict]:
    """Tira tabulações/espaços usados só para empurrar texto no Word."""
    segs = [dict(x) for x in segs]
    if segs and "t" in segs[0]:
        segs[0]["t"] = segs[0]["t"].lstrip()
    if segs and "t" in segs[-1]:
        segs[-1]["t"] = segs[-1]["t"].rstrip()
    return [x for x in segs if x.get("t", "x")]


def limpar_bloco(b: dict, aplicar: dict, nomes_media: dict) -> dict:
    tipo = b["tipo"]
    if tipo == "citacao-longa?":
        tipo = "citacao-longa" if aplicar["citacao_longa"] else "paragrafo"
    elif tipo == "epigrafe?":
        tipo = "epigrafe" if aplicar["epigrafe"] else "paragrafo"
    elif tipo == "epigrafe-autor?":
        tipo = "epigrafe-autor" if aplicar["epigrafe"] else "paragrafo"
    out = {k: v for k, v in b.items() if k not in ("evidencia", "enum_titulo?")}
    out["tipo"] = tipo
    if "segmentos" in out:
        out["segmentos"] = aparar(out["segmentos"])
    if b.get("enum_titulo?") and aplicar["enum_titulo_negrito"]:
        out["segmentos"] = negrito_enum(out["segmentos"])
    if tipo == "imagem":
        out["src"] = f"assets/media/{nomes_media.get(b['arquivo'], b['arquivo'])}"
    return out


def siglas(blocos: list[dict]) -> list[dict]:
    """Lista de abreviaturas: "ACAFE<tab>Associação..." vira par sigla/significado."""
    out = []
    for b in blocos:
        txt = "".join(x.get("t", "") for x in b.get("segmentos", [])).strip()
        m = SIGLA_RE.match(txt)
        if m:
            out.append({"tipo": "sigla", "sigla": m.group(1).strip(), "significado": m.group(2).strip()})
        elif txt:
            out.append({"tipo": "sigla", "sigla": txt, "significado": ""})
    return out


def para_numero(v: str):
    """ "1.234" -> 1234, "12,5%" -> 12.5; devolve None se não for número."""
    t = v.strip().replace("%", "").replace("\u00a0", "").replace(" ", "")
    if not re.fullmatch(r"-?[\d.]+(,\d+)?", t or "x"):
        return None
    t = t.replace(".", "").replace(",", ".")
    try:
        n = float(t)
    except ValueError:
        return None
    return int(n) if n.is_integer() else n


def linhas_tidy(grafico: dict) -> list[dict]:
    """Formato longo (uma linha por ponto), fácil de usar em qualquer biblioteca de gráficos."""
    out = []
    for g in grafico["grupos"]:
        for s in g["series"]:
            for i, v in enumerate(s["valores"]):
                cat = s["categorias"][i] if i < len(s["categorias"]) else None
                out.append({"serie": s["nome"], "categoria": cat, "valor": v})
    return out


def catalogar(secoes: list[dict], figuras: list[dict], caminho: list[str]):
    """Lista figuras, gráficos e tabelas com rótulo, fonte e onde aparecem."""
    for no in secoes:
        for b in no["blocos"]:
            if b["tipo"] not in ("imagem", "grafico", "tabela"):
                continue
            item = {
                "id": b.get("id"),
                "tipo": b["tipo"],
                "rotulo": b.get("rotulo"),
                "fonte": b.get("fonte"),
                "capitulo": caminho[0] if caminho else no["slug"],
                "secao": no["slug"],
            }
            if b["tipo"] == "imagem":
                item["arquivo"] = b["src"]
            elif b["tipo"] == "grafico":
                item["grafico_id"] = b["id"]
            figuras.append(item)
        catalogar(no["secoes"], figuras, caminho or [no["slug"]])


def limpar_secao(no: dict, aplicar: dict, nomes_media: dict) -> dict:
    return {
        "nivel": no["nivel"],
        "numero": no.get("numero"),
        "titulo": no["titulo"],
        "slug": no["slug"],
        "blocos": [limpar_bloco(b, aplicar, nomes_media) for b in no["blocos"]],
        "secoes": [limpar_secao(s, aplicar, nomes_media) for s in no["secoes"]],
    }


def nomear(conteudo: dict) -> dict:
    """Dá ids legíveis a figuras e tabelas ("grafico-01", "quadro-03", "apendice-c-tabela-2")
    e devolve o mapa arquivo-hash -> nome legível para as imagens."""
    nomes: dict[str, str] = {}

    def walk(nos, cap_slug=None):
        for no in nos:
            cap = cap_slug or no["slug"]
            sem_rotulo = 0
            for b in no["blocos"]:
                if b["tipo"] not in ("imagem", "tabela", "grafico"):
                    continue
                r = b.get("rotulo")
                if r:
                    b["id"] = f"{slug(r['tipo'])}-{r['numero']:02d}"
                else:
                    sem_rotulo += 1
                    b["id"] = f"{slug(no['titulo'])[:40]}-{b['tipo']}-{sem_rotulo}"
                if b["tipo"] == "imagem":
                    ext = Path(b["arquivo"]).suffix
                    nomes.setdefault(b["arquivo"], b["id"] + ext)
            walk(no["secoes"], cap)

    walk(conteudo["capitulos"])
    return nomes


def main():
    regras = json.loads((AQUI / "regras.json").read_text(encoding="utf-8"))
    conteudo = json.loads(ENTRADA.read_text(encoding="utf-8"))
    aplicar = regras["aplicar"]

    nomes_media = nomear(conteudo)
    pre = []
    for sec in conteudo["pre_textual"]:
        if not sec["titulo"] or not sec["titulo"].upper().startswith(PRE_PUBLICADOS):
            continue
        blocos = [limpar_bloco(b, aplicar, nomes_media) for b in sec["blocos"]]
        if sec["titulo"].upper().startswith("LISTA DE ABREVIATURAS"):
            blocos = siglas(blocos)
        pre.append({"nivel": 1, "numero": None, "titulo": sec["titulo"], "slug": sec["slug"],
                    "blocos": blocos, "secoes": []})

    site = {
        "meta": {**regras["meta"], "fonte": conteudo["meta"]["fonte"], "extraido_em": conteudo["meta"]["extraido_em"]},
        "pre_textual": pre,
        "capitulos": [limpar_secao(c, aplicar, nomes_media) for c in conteudo["capitulos"]],
        "notas": conteudo.get("notas", []),
    }

    # Gráficos nativos do Word: os números vêm do cache do próprio gráfico,
    # ou seja, exatamente o que aparece na dissertação.
    figuras: list[dict] = []
    catalogar(site["capitulos"], figuras, [])
    por_id = {f["grafico_id"]: f for f in figuras if f.get("grafico_id")}
    graficos = []
    for g in conteudo.get("graficos", []):
        f = por_id.get(g["id"], {})
        graficos.append({
            "id": g["id"],
            "rotulo": f.get("rotulo"),
            "fonte": f.get("fonte"),
            "capitulo": f.get("capitulo"),
            "tipo": g["tipo"],
            "titulo_no_grafico": g["titulo_no_grafico"],
            "eixos": g["eixos"],
            "grupos": g["grupos"],
            "linhas": linhas_tidy(g),
        })
    # Gráficos que no Word são imagem: dados transcritos à mão, marcados "a conferir"
    if TRANSCRITOS.exists():
        trans = json.loads(TRANSCRITOS.read_text(encoding="utf-8"))
        por_fig = {f["id"]: f for f in figuras}
        for gid, d in trans["graficos"].items():
            f = por_fig.get(gid)
            if not f:
                print(f"  ! transcrição {gid} sem figura correspondente no texto")
                continue
            series = [{"nome": s["nome"], "categorias": d["categorias"], "valores": s["valores"]} for s in d["series"]]
            g = {
                "id": gid, "rotulo": f.get("rotulo"), "fonte": f.get("fonte"), "capitulo": f.get("capitulo"),
                "tipo": d["tipo"], "titulo_no_grafico": None, "eixos": [],
                "grupos": [{"tipo": d["tipo"], "orientacao": d["orientacao"], "agrupamento": d["agrupamento"],
                            "series": series}],
                "unidade": d.get("unidade"),
                "origem": "transcrito_da_imagem", "status": trans["status"],
                "observacoes": d.get("observacoes", []),
                "imagem": f.get("arquivo"),
            }
            g["linhas"] = linhas_tidy(g)
            graficos.append(g)
            f["grafico_id"] = gid
        marcar = {g["id"] for g in graficos}

        def ligar(nos):
            for no in nos:
                for b in no["blocos"]:
                    if b["tipo"] == "imagem" and b.get("id") in marcar:
                        b["grafico_id"] = b["id"]
                ligar(no["secoes"])

        ligar(site["capitulos"])
    site["graficos"] = {g["id"]: g for g in graficos}
    # Tabelas e quadros: dados reais digitados no Word -> JSON + um CSV por tabela
    tabelas = []
    todas = {}

    def coleta_tabelas(nos):
        for no in nos:
            for b in no["blocos"]:
                if b["tipo"] == "tabela":
                    todas[b["id"]] = b
            coleta_tabelas(no["secoes"])

    coleta_tabelas(site["capitulos"])
    if SAIDA_DADOS.exists():
        shutil.rmtree(SAIDA_DADOS)
    (SAIDA_DADOS / "tabelas").mkdir(parents=True)
    for f in figuras:
        if f["tipo"] != "tabela":
            continue
        b = todas[f["id"]]
        linhas = [[c["t"] for c in linha] for linha in b["linhas"]]
        tabelas.append({
            **{k: f[k] for k in ("id", "rotulo", "fonte", "capitulo", "secao")},
            "csv": f"dados/tabelas/{f['id']}.csv",
            "cabecalho": linhas[0] if linhas else [],
            "linhas": linhas[1:],
            "linhas_numericas": [[para_numero(c) for c in linha] for linha in linhas[1:]],
        })
        with open(SAIDA_DADOS / "tabelas" / f"{f['id']}.csv", "w", newline="", encoding="utf-8-sig") as fh:
            csv.writer(fh, delimiter=";").writerows(linhas)

    fonte = {"fonte": conteudo["meta"]["fonte"], "extraido_em": conteudo["meta"]["extraido_em"]}
    (SAIDA_DADOS / "tabelas.json").write_text(
        json.dumps({**fonte, "tabelas": tabelas}, ensure_ascii=False, indent=1), encoding="utf-8")
    (SAIDA_DADOS / "graficos.json").write_text(
        json.dumps({**fonte, "graficos": graficos}, ensure_ascii=False, indent=1), encoding="utf-8")
    (SAIDA_DADOS / "figuras.json").write_text(
        json.dumps({**fonte, "figuras": figuras}, ensure_ascii=False, indent=1), encoding="utf-8")

    SAIDA_JSON.parent.mkdir(parents=True, exist_ok=True)
    SAIDA_JSON.write_text(json.dumps(site, ensure_ascii=False, indent=1), encoding="utf-8")

    if SAIDA_MEDIA.exists():
        shutil.rmtree(SAIDA_MEDIA)
    SAIDA_MEDIA.mkdir(parents=True)
    n = 0
    if MEDIA_ENTRADA.exists():
        for f in MEDIA_ENTRADA.iterdir():
            if f.name in nomes_media:  # só as imagens publicadas (capa/ficha ficam de fora)
                shutil.copy2(f, SAIDA_MEDIA / nomes_media[f.name])
                n += 1
    (SAIDA_MEDIA / ".gitkeep").touch()
    print(f"ok: {SAIDA_JSON.relative_to(RAIZ)} ({len(site['capitulos'])} capítulos), {n} imagens copiadas")
    print(f"ok: {SAIDA_DADOS.relative_to(RAIZ)}/ graficos.json ({len(graficos)}), "
          f"figuras.json ({len(figuras)}), tabelas.json + CSV ({len(tabelas)})")


if __name__ == "__main__":
    main()
