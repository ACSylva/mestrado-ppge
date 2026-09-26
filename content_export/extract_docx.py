"""Extrai o texto da dissertação (.docx) para um JSON com a árvore de capítulos.

Uso:
    python extract_docx.py ../docs/dissertacao.docx            # gera output/conteudo.json + output/media/
    python extract_docx.py ../docs/dissertacao.docx --relatorio # só imprime diagnóstico dos estilos/padrões

O JSON guarda, para cada parágrafo, a evidência bruta de formatação (estilo,
alinhamento, recuo, tamanho de fonte) além da classificação inferida. Assim
as regras de citação longa / epígrafe / "(a) Título:" podem ser conferidas
contra o texto real antes de serem aplicadas no site.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import shutil
import subprocess
import sys
import tempfile
import unicodedata
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path

from docx import Document
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml.ns import qn
from lxml import etree
from docx.table import Table
from docx.text.paragraph import Paragraph

HEADING_RE = re.compile(r"^(heading|t[ií]tulo)\s*(\d)$", re.IGNORECASE)
CAPTION_STYLES = {"caption", "legenda"}
QUOTE_STYLE_HINTS = ("quote", "citação", "citacao", "cita")
# "(a) Título: texto" ou "a) Título: texto"
ENUM_TITULO_RE = re.compile(r"^\(?([a-z]|\d{1,2}|[ivx]{1,4})\)\s+([^:]{2,80}):\s")

# Recuo de 4 cm (ABNT) ~ 2.286.000 EMU; aceitamos a partir de ~3 cm.
RECUO_CITACAO_EMU = 3 * 360000
VECTOR_EXTS = {".emf", ".wmf", ".svg"}
MC_FALLBACK = "{http://schemas.openxmlformats.org/markup-compatibility/2006}Fallback"
# "Gráfico 3 – Título", "Figura 2 - Título", "Tabela 1: ..." (ABNT: título acima, fonte abaixo)
ROTULO_RE = re.compile(r"^(Figura|Gr[áa]fico|Quadro|Tabela|Mapa|Imagem|Ilustra[çc][ãa]o)\s+(\d+)\s*[-–—:.]?\s*(.*)$", re.I | re.S)
FONTE_RE = re.compile(r"^(Fonte|Nota)s?\s*:", re.I)
CHART_TYPES = {
    "barChart": "barra", "bar3DChart": "barra", "lineChart": "linha", "line3DChart": "linha",
    "pieChart": "pizza", "pie3DChart": "pizza", "doughnutChart": "rosca", "areaChart": "area",
    "area3DChart": "area", "scatterChart": "dispersao", "radarChart": "radar", "ofPieChart": "pizza",
}


def _walk(el):
    """Percorre o XML ignorando o conteúdo alternativo (mc:Fallback) para não duplicar figuras."""
    yield el
    for child in el:
        if child.tag == MC_FALLBACK:
            continue
        yield from _walk(child)


def _cache_valores(ref_el) -> list:
    """Lê os valores em cache de c:strRef / c:numRef / c:multiLvlStrRef / c:strLit / c:numLit."""
    if ref_el is None:
        return []
    for cache_tag in ("c:strCache", "c:numCache", "c:multiLvlStrCache", "c:strLit", "c:numLit"):
        cache = ref_el.find(".//" + qn(cache_tag))
        if cache is None:
            continue
        if cache_tag == "c:multiLvlStrCache":
            cache = cache.find(qn("c:lvl"))  # nível mais interno
        cnt = cache.find(qn("c:ptCount"))
        n = int(cnt.get("val")) if cnt is not None else 0
        vals: list = [None] * n
        for pt in cache.findall(qn("c:pt")):
            idx = int(pt.get("idx"))
            v = pt.find(qn("c:v"))
            txt = v.text if v is not None else None
            if "num" in cache_tag and txt is not None:
                try:
                    num = float(txt)
                    txt = int(num) if num.is_integer() else num
                except ValueError:
                    pass
            if idx >= len(vals):
                vals.extend([None] * (idx + 1 - len(vals)))
            vals[idx] = txt
        return vals
    v = ref_el.find(qn("c:v"))
    return [v.text] if v is not None else []


def _texto_rico(el) -> str | None:
    if el is None:
        return None
    t = "".join(x.text or "" for x in el.iter(qn("a:t"))).strip()
    if t:
        return t
    vals = _cache_valores(el.find(".//" + qn("c:strRef")))
    return vals[0] if vals else None


def parse_chart(blob: bytes) -> dict:
    """Extrai tipo, título e séries (com os valores em cache) de um gráfico nativo do Word."""
    root = etree.fromstring(blob)
    chart = root.find(qn("c:chart"))
    titulo = _texto_rico(chart.find(qn("c:title")))
    plot = chart.find(qn("c:plotArea"))
    grupos = []
    for g in plot:
        nome = etree.QName(g).localname
        if nome not in CHART_TYPES:
            continue
        info = {"tipo": CHART_TYPES[nome], "tipo_ooxml": nome}
        bd = g.find(qn("c:barDir"))
        if bd is not None:
            info["orientacao"] = "horizontal" if bd.get("val") == "bar" else "vertical"
        gr = g.find(qn("c:grouping"))
        if gr is not None:
            info["agrupamento"] = gr.get("val")
        series = []
        for ser in g.findall(qn("c:ser")):
            cat = ser.find(qn("c:cat")) if ser.find(qn("c:cat")) is not None else ser.find(qn("c:xVal"))
            val = ser.find(qn("c:val")) if ser.find(qn("c:val")) is not None else ser.find(qn("c:yVal"))
            fmt = val.find(".//" + qn("c:formatCode")) if val is not None else None
            s = {
                "nome": _texto_rico(ser.find(qn("c:tx"))),
                "categorias": _cache_valores(cat),
                "valores": _cache_valores(val),
            }
            if fmt is not None and fmt.text and fmt.text != "General":
                s["formato"] = fmt.text
            series.append(s)
        info["series"] = series
        grupos.append(info)
    eixos = [_texto_rico(ax.find(qn("c:title"))) for ax in plot if etree.QName(ax).localname.endswith("Ax")]
    tem_planilha = any(etree.QName(e).localname == "externalData" for e in root)
    return {
        "titulo_no_grafico": titulo,
        "tipo": grupos[0]["tipo"] if grupos else None,
        "grupos": grupos,
        "eixos": [e for e in eixos if e],
        "planilha_embutida": tem_planilha,
    }


def converter_vetorial(blob: bytes, ext: str) -> bytes | None:
    """EMF/WMF -> PNG via LibreOffice (headless) e recorta a margem branca com Pillow."""
    soffice = shutil.which("soffice") or shutil.which("libreoffice")
    if not soffice:
        return None
    with tempfile.TemporaryDirectory() as tmp:
        src = Path(tmp) / f"img{ext}"
        src.write_bytes(blob)
        subprocess.run([soffice, "--headless", "--convert-to", "png", "--outdir", tmp, str(src)],
                       capture_output=True, timeout=180)
        out = Path(tmp) / "img.png"
        if not out.exists():
            return None
        try:
            from PIL import Image, ImageChops
            im = Image.open(out).convert("RGB")
            bbox = ImageChops.difference(im, Image.new("RGB", im.size, "white")).getbbox()
            if bbox:
                pad = 8
                im = im.crop((max(0, bbox[0] - pad), max(0, bbox[1] - pad),
                              min(im.width, bbox[2] + pad), min(im.height, bbox[3] + pad)))
            im.save(out)
        except ImportError:
            pass  # sem Pillow: fica com a página inteira
        return out.read_bytes()


def slugify(texto: str) -> str:
    s = unicodedata.normalize("NFKD", texto).encode("ascii", "ignore").decode()
    s = re.sub(r"[^a-zA-Z0-9]+", "-", s).strip("-").lower()
    return s[:80] or "secao"


# Elementos pós-textuais escritos com estilo de corpo de texto (sem "Heading"):
# viram capítulos de nível 1 sem numeração.
POS_TEXTUAL_RE = re.compile(r"^(REFER[ÊE]NCIAS|AP[ÊE]NDICE [A-Z]\s*[-–—].+|ANEXO [A-Z]\s*[-–—].+)$")
# Títulos pré-textuais (resumo, listas, sumário) e estilos de índice gerado pelo Word
PRE_TITULO_STYLES = ("abnt - títulos pré-textuais", "abnt - títulos centralizados",
                     "figure index heading", "table index heading")
INDICE_STYLES = ("toc ", "figure index", "table index")
AUTOR_RE = re.compile(r"^[^.()]{3,90}\(\d{4}[^)]*\)\.?$")


def heading_level(p: Paragraph) -> int | None:
    # Só o nome do estilo conta: no texto dela há parágrafos "Normal" com nível de
    # tópico direto (outlineLvl) que não são títulos (ex.: enunciado dos objetivos).
    name = (p.style.name if p.style is not None else "") or ""
    m = HEADING_RE.match(name.strip())
    return int(m.group(2)) if m else None


def all_caps(p: Paragraph) -> bool:
    style = p.style
    while style is not None:
        if style.font.all_caps:
            return True
        style = style.base_style
    return any(r.font.all_caps for r in p.runs)


def resolve_alignment(p: Paragraph):
    al = p.paragraph_format.alignment
    style = p.style
    while al is None and style is not None:
        al = style.paragraph_format.alignment
        style = style.base_style
    return al


def resolve_left_indent(p: Paragraph) -> int:
    ind = p.paragraph_format.left_indent
    style = p.style
    while ind is None and style is not None:
        ind = style.paragraph_format.left_indent
        style = style.base_style
    return int(ind or 0)


def font_size_pt(p: Paragraph) -> float | None:
    sizes = [r.font.size.pt for r in p.runs if r.font.size is not None and r.text.strip()]
    if sizes:
        return Counter(sizes).most_common(1)[0][0]
    style = p.style
    while style is not None:
        if style.font.size is not None:
            return style.font.size.pt
        style = style.base_style
    return None


class Extractor:
    def __init__(self, docx_path: Path, media_dir: Path | None):
        self.doc = Document(str(docx_path))
        self.docx_path = docx_path
        self.media_dir = media_dir
        self.media: dict[str, str] = {}  # rId -> nome do arquivo
        self.graficos: list[dict] = []
        self.notas_texto = self._ler_notas()
        self.notas: dict[str, dict] = {}  # id -> {numero, texto}, na ordem em que aparecem
        self.avisos: list[str] = []

    def _ler_notas(self) -> dict[str, str]:
        """Notas de rodapé (word/footnotes.xml); python-docx não expõe isso diretamente."""
        for rel in self.doc.part.rels.values():
            if rel.reltype.endswith("/footnotes") and not rel.is_external:
                root = etree.fromstring(rel.target_part.blob)
                out = {}
                for fn in root.findall(qn("w:footnote")):
                    if fn.get(qn("w:type")) in ("separator", "continuationSeparator", "continuationNotice"):
                        continue
                    paras = ["".join(t.text or "" for t in par.iter(qn("w:t"))).strip()
                             for par in fn.findall(qn("w:p"))]
                    out[fn.get(qn("w:id"))] = "\n".join(x for x in paras if x)
                return out
        return {}

    # ---------- runs / segmentos ----------
    def segmentos(self, p: Paragraph) -> tuple[list[dict], list[dict]]:
        """Devolve (segmentos de texto, imagens) preservando quebras manuais."""
        segs: list[dict] = []
        imagens: list[dict] = []
        for child in _walk(p._p):
            tag = child.tag
            if tag == qn("w:r"):
                run_props = child.find(qn("w:rPr"))
                fmt = self._run_fmt(run_props)
                for node in child:
                    if node.tag == qn("w:t"):
                        self._push_text(segs, node.text or "", fmt)
                    elif node.tag == qn("w:tab"):
                        self._push_text(segs, "\t", fmt)
                    elif node.tag == qn("w:footnoteReference"):
                        fid = node.get(qn("w:id"))
                        if fid not in self.notas:
                            self.notas[fid] = {"numero": len(self.notas) + 1,
                                               "texto": self.notas_texto.get(fid, "")}
                        segs.append({"nota": self.notas[fid]["numero"]})
                    elif node.tag == qn("w:br"):
                        # Shift+Enter: quebra de linha manual dentro do mesmo parágrafo.
                        # Quebras de página/coluna viram parágrafo normal (ignoradas).
                        if node.get(qn("w:type")) in (None, "textWrapping"):
                            segs.append({"br": True})
            elif tag == qn("a:blip"):
                rid = child.get(qn("r:embed"))
                if rid:
                    img = self._save_image(rid)
                    if img:
                        imagens.append(img)
            elif tag == qn("c:chart"):
                rid = child.get(qn("r:id"))
                graf = self._save_chart(rid) if rid else None
                if graf:
                    imagens.append(graf)
        # remove quebras no fim
        while segs and segs[-1].get("br"):
            segs.pop()
        return segs, imagens

    @staticmethod
    def _run_fmt(rpr) -> dict:
        fmt: dict = {}
        if rpr is None:
            return fmt

        def on(tag):
            el = rpr.find(qn(tag))
            return el is not None and el.get(qn("w:val")) not in ("0", "false")

        if on("w:b"):
            fmt["b"] = True
        if on("w:i"):
            fmt["i"] = True
        va = rpr.find(qn("w:vertAlign"))
        if va is not None and va.get(qn("w:val")) in ("superscript", "subscript"):
            fmt["va"] = "sup" if va.get(qn("w:val")) == "superscript" else "sub"
        return fmt

    @staticmethod
    def _push_text(segs: list[dict], text: str, fmt: dict):
        if not text:
            return
        if segs and "t" in segs[-1] and {k: v for k, v in segs[-1].items() if k != "t"} == fmt:
            segs[-1]["t"] += text
        else:
            segs.append({"t": text, **fmt})

    def _save_image(self, rid: str) -> dict | None:
        part = self.doc.part.related_parts.get(rid)
        if part is None:
            return None
        ext = Path(part.partname).suffix.lower()
        if rid not in self.media:
            blob = part.blob
            name = hashlib.sha1(blob).hexdigest()[:12] + ext
            self.media[rid] = name
            if ext in VECTOR_EXTS and ext != ".svg":
                png = converter_vetorial(blob, ext) if self.media_dir is not None else None
                if png is None:
                    self.avisos.append(f"Imagem vetorial {ext} ({name}): navegador não exibe, precisa converter "
                                       "(instale LibreOffice Draw e rode de novo).")
                else:
                    blob, ext = png, ".png"
                    name = Path(name).stem + ".png"
                    self.media[rid] = name
            if self.media_dir is not None:
                self.media_dir.mkdir(parents=True, exist_ok=True)
                (self.media_dir / name).write_bytes(blob)
        return {"tipo": "imagem", "arquivo": self.media[rid], "formato": Path(self.media[rid]).suffix.lstrip(".")}

    def _save_chart(self, rid: str) -> dict | None:
        part = self.doc.part.related_parts.get(rid)
        if part is None:
            return None
        try:
            dados = parse_chart(part.blob)
        except Exception as e:  # gráfico com XML inesperado: registra e segue
            self.avisos.append(f"Gráfico {part.partname} não pôde ser lido: {e}")
            return None
        gid = f"grafico-{len(self.graficos) + 1:02d}"
        self.graficos.append({"id": gid, "parte": str(part.partname), **dados})
        return {"tipo": "grafico", "id": gid, "tipo_grafico": dados["tipo"]}

    # ---------- blocos ----------
    def bloco_paragrafo(self, p: Paragraph) -> list[dict]:
        segs, imagens = self.segmentos(p)
        texto = "".join(s.get("t", "") for s in segs).strip()
        style = p.style.name if p.style is not None else ""
        al = resolve_alignment(p)
        recuo = resolve_left_indent(p)
        num = p._p.pPr.find(qn("w:numPr")) if p._p.pPr is not None else None

        blocos: list[dict] = list(imagens)
        if not texto:
            return blocos

        evid = {
            "estilo": style,
            "alinhamento": al.name.lower() if al is not None else None,
            "recuo_cm": round(recuo / 360000, 2),
            "fonte_pt": font_size_pt(p),
        }
        classe = "paragrafo"
        st = style.strip().lower()
        if st in CAPTION_STYLES:
            classe = "legenda"
        elif "epígrafe" in st or "epigrafe" in st:
            classe = "epigrafe-autor?" if "autor" in st else "epigrafe?"
        elif any(h in st for h in QUOTE_STYLE_HINTS) or recuo >= RECUO_CITACAO_EMU:
            classe = "citacao-longa?"  # confirmado no texto dela: recuo de 4 cm
        elif al == WD_ALIGN_PARAGRAPH.RIGHT:
            classe = "epigrafe?"  # candidato
        elif al == WD_ALIGN_PARAGRAPH.CENTER:
            classe = "centralizado"

        bloco = {"tipo": classe, "segmentos": segs, "evidencia": evid}
        if num is not None:
            ilvl = num.find(qn("w:ilvl"))
            bloco["lista_nivel"] = int(ilvl.get(qn("w:val"))) if ilvl is not None else 0
        if ENUM_TITULO_RE.match(texto):
            bloco["enum_titulo?"] = True  # candidato ao padrão "(a) Título: texto"
        blocos.append(bloco)
        return blocos

    def bloco_tabela(self, t: Table) -> dict:
        linhas = []
        for row in t.rows:
            celulas = []
            vistos = set()
            for cell in row.cells:
                # células mescladas aparecem repetidas; mantemos só a primeira ocorrência
                if id(cell._tc) in vistos:
                    continue
                vistos.add(id(cell._tc))
                span = cell._tc.grid_span if hasattr(cell._tc, "grid_span") else 1
                texto = "\n".join(par.text for par in cell.paragraphs).strip()
                c = {"t": texto}
                if span > 1:
                    c["colspan"] = span
                celulas.append(c)
            linhas.append(celulas)
        return {"tipo": "tabela", "linhas": linhas}

    # ---------- árvore ----------
    def extrair(self) -> dict:
        raiz = {"nivel": 0, "titulo": None, "blocos": [], "secoes": []}
        pilha = [raiz]
        slugs: Counter = Counter()
        contadores = [0] * 10
        abertura = {"titulo": None, "slug": "abertura", "blocos": []}
        pre = [abertura]  # seções pré-textuais: abertura (capa etc.), RESUMO, ABSTRACT, listas...
        no_corpo = False

        def novo_slug(titulo):
            base = slugify(titulo)
            slugs[base] += 1
            return base if slugs[base] == 1 else f"{base}-{slugs[base]}"

        for item in self.doc.iter_inner_content():
            if isinstance(item, Paragraph):
                texto = re.sub(r"\s+", " ", item.text).strip()
                st = (item.style.name if item.style is not None else "").lower()
                if st.startswith(INDICE_STYLES):
                    continue  # sumário e listas geradas pelo Word: o site monta os seus
                lvl = heading_level(item)
                numero = None
                if lvl is not None and texto:
                    no_corpo = True
                    contadores[lvl - 1] += 1
                    contadores[lvl:] = [0] * (10 - lvl)
                    numero = ".".join(str(c) for c in contadores[:lvl])
                elif no_corpo and POS_TEXTUAL_RE.match(texto):
                    lvl = 1
                if lvl is not None and texto:
                    titulo = texto.upper() if all_caps(item) else texto
                    no = {"nivel": lvl, "numero": numero, "titulo": titulo, "slug": novo_slug(titulo),
                          "blocos": [], "secoes": []}
                    while pilha[-1]["nivel"] >= lvl:
                        pilha.pop()
                    pilha[-1]["secoes"].append(no)
                    pilha.append(no)
                    continue
                if not no_corpo:
                    if st in PRE_TITULO_STYLES and texto:
                        pre.append({"titulo": texto, "slug": novo_slug(texto), "blocos": []})
                        continue
                    pre[-1]["blocos"].extend(self.bloco_paragrafo(item))
                    continue
                pilha[-1]["blocos"].extend(self.bloco_paragrafo(item))
            elif isinstance(item, Table):
                (pilha[-1] if no_corpo else pre[-1])["blocos"].append(self.bloco_tabela(item))

        vincular_legendas(raiz)
        for no in pilha_todas(raiz):
            marcar_epigrafes(no["blocos"])
        pre = [s for s in pre if s["blocos"]]
        props = self.doc.core_properties
        return {
            "meta": {
                "fonte": self.docx_path.name,
                "extraido_em": datetime.now(timezone.utc).isoformat(timespec="seconds"),
                "titulo_docx": props.title or None,
                "autor_docx": props.author or None,
            },
            # Texto antes do primeiro título, dividido pelos títulos pré-textuais
            "pre_textual": pre,
            "capitulos": raiz["secoes"],
            "notas": list(self.notas.values()),
            "graficos": self.graficos,
            "avisos": self.avisos,
        }


def pilha_todas(no: dict):
    yield no
    for s in no["secoes"]:
        yield from pilha_todas(s)


def marcar_epigrafes(blocos: list[dict]):
    """Linha curta "Autor (ano, p.)" logo após citação/epígrafe = autoria da epígrafe.

    No texto dela, as epígrafes aparecem ora com estilo próprio, ora com o estilo de
    citação longa e autoria alinhada à direita; em todos os casos a linha de autoria
    segue o padrão "Nome (ano...)".
    """
    for i, b in enumerate(blocos):
        if not b.get("segmentos") or i == 0:
            continue
        ant = blocos[i - 1]
        if ant["tipo"] not in ("citacao-longa?", "epigrafe?", "paragrafo"):
            continue
        txt = _texto(b)
        destacado = b["tipo"] in ("citacao-longa?", "epigrafe?", "epigrafe-autor?") or \
            b["evidencia"]["alinhamento"] == "right"
        if destacado and AUTOR_RE.match(txt) and ant["tipo"] != "paragrafo":
            b["tipo"] = "epigrafe-autor?"
            ant["tipo"] = "epigrafe?"
        elif b["tipo"] == "epigrafe-autor?" and ant["tipo"] == "citacao-longa?":
            ant["tipo"] = "epigrafe?"


def _texto(b: dict) -> str:
    return "".join(s.get("t", " ") for s in b.get("segmentos", [])).strip()


def vincular_legendas(no: dict):
    """Liga "Gráfico N – título" (acima) e "Fonte: ..." (abaixo) à figura/tabela/gráfico vizinho.

    Os parágrafos de rótulo e fonte saem do fluxo e passam a ser campos da figura,
    para não aparecerem duplicados no site.
    """
    blocos = no["blocos"]
    remover = set()
    for i, b in enumerate(blocos):
        if b["tipo"] not in ("imagem", "grafico", "tabela"):
            continue
        # rótulo: parágrafo imediatamente acima (ou abaixo, se o texto usa legenda embaixo)
        for j in (i - 1, i + 1):
            if 0 <= j < len(blocos) and j not in remover and blocos[j].get("segmentos"):
                m = ROTULO_RE.match(_texto(blocos[j]))
                if m:
                    b["rotulo"] = {"tipo": m.group(1).capitalize(), "numero": int(m.group(2)),
                                   "titulo": m.group(3).strip(), "texto": _texto(blocos[j])}
                    remover.add(j)
                    break
        # fonte/nota: parágrafos logo abaixo
        k = i + 1
        while k < len(blocos) and (k in remover or blocos[k]["tipo"] in ("imagem", "grafico")):
            k += 1
        fontes = []
        while k < len(blocos) and blocos[k].get("segmentos") and FONTE_RE.match(_texto(blocos[k])):
            fontes.append(_texto(blocos[k]))
            remover.add(k)
            k += 1
        if fontes:
            b["fonte"] = fontes
    no["blocos"] = [b for i, b in enumerate(blocos) if i not in remover]
    for s in no["secoes"]:
        vincular_legendas(s)


def relatorio(ext: Extractor, conteudo: dict):
    doc = ext.doc
    estilos = Counter(p.style.name for p in doc.paragraphs if p.text.strip())
    print("== Estilos de parágrafo (com texto) ==")
    for nome, n in estilos.most_common():
        print(f"  {n:5d}  {nome}")

    def walk(nos, prof=0):
        for no in nos:
            print(f"  {'  ' * prof}{no['numero'] or '-'} {no['titulo'][:70]}  ({len(no['blocos'])} blocos)")
            walk(no["secoes"], prof + 1)

    print("\n== Pré-textuais ==")
    for sec in conteudo["pre_textual"]:
        print(f"  {sec['titulo']!r} ({len(sec['blocos'])} blocos)")
    print(f"\n== Notas de rodapé: {len(conteudo['notas'])} ==")
    print("\n== Árvore de títulos ==")
    walk(conteudo["capitulos"])

    todos = []

    def coleta(nos):
        for no in nos:
            todos.extend(no["blocos"])
            coleta(no["secoes"])

    for sec in conteudo["pre_textual"]:
        todos.extend(sec["blocos"])
    coleta(conteudo["capitulos"])
    tipos = Counter(b["tipo"] for b in todos)
    print("\n== Tipos de bloco ==")
    for t, n in tipos.most_common():
        print(f"  {n:5d}  {t}")

    def amostra(rotulo, cond, k=5):
        achados = [b for b in todos if cond(b)]
        print(f"\n== {rotulo}: {len(achados)} ==")
        for b in achados[:k]:
            txt = "".join(s.get("t", " ⏎ ") for s in b.get("segmentos", []))
            print(f"  - {txt[:160]!r}  {b.get('evidencia')}")

    amostra("Candidatos a citação longa", lambda b: b["tipo"] == "citacao-longa?")
    amostra("Epígrafes", lambda b: b["tipo"] == "epigrafe?")
    amostra("Autoria de epígrafe", lambda b: b["tipo"] == "epigrafe-autor?")
    amostra("Parágrafos com quebra manual (Shift+Enter)", lambda b: any(s.get("br") for s in b.get("segmentos", [])))
    amostra("Padrão '(a) Título: texto'", lambda b: b.get("enum_titulo?"))
    print(f"\n== Tabelas: {tipos.get('tabela', 0)} | Imagens: {tipos.get('imagem', 0)} "
          f"| Gráficos nativos (com dados): {tipos.get('grafico', 0)} ==")
    for g in conteudo["graficos"]:
        n = sum(len(gr["series"]) for gr in g["grupos"])
        print(f"  - {g['id']}: {g['tipo']}, {n} série(s), título={g['titulo_no_grafico']!r}")
    rot = [b for b in todos if b.get("rotulo")]
    print(f"\n== Figuras/tabelas com rótulo vinculado: {len(rot)} de "
          f"{sum(1 for b in todos if b['tipo'] in ('imagem', 'grafico', 'tabela'))} ==")
    for b in rot[:8]:
        print(f"  - [{b['tipo']}] {b['rotulo']['texto'][:100]!r}  fonte={b.get('fonte')}")
    if ext.avisos:
        print("\n== Avisos ==")
        for a in ext.avisos:
            print("  !", a)


def main(argv=None):
    ap = argparse.ArgumentParser()
    ap.add_argument("docx", type=Path)
    ap.add_argument("--saida", type=Path, default=Path(__file__).parent / "output")
    ap.add_argument("--relatorio", action="store_true", help="só imprime diagnóstico, não grava nada")
    args = ap.parse_args(argv)

    media_dir = None if args.relatorio else args.saida / "media"
    ext = Extractor(args.docx, media_dir)
    conteudo = ext.extrair()
    if args.relatorio:
        relatorio(ext, conteudo)
        return
    args.saida.mkdir(parents=True, exist_ok=True)
    out = args.saida / "conteudo.json"
    out.write_text(json.dumps(conteudo, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"ok: {out} ({len(conteudo['capitulos'])} capítulos, {len(ext.media)} imagens, "
          f"{len(ext.graficos)} gráficos nativos)")
    for a in ext.avisos:
        print("  !", a, file=sys.stderr)


if __name__ == "__main__":
    main()
