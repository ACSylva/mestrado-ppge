import { paginas } from './content'

export type Referencia = { autores: string[]; ano: string; texto: string }

const MARCADORES_FIM_CABECALHO = ['Disponível em', 'DOI:', 'DOI.org', 'Acesso em']

/** Corta a referência antes de "Disponível em/DOI/Acesso em", onde datas de acesso poderiam ser confundidas com o ano de publicação. */
function cabecalho(texto: string): string {
  let idx = -1
  for (const marca of MARCADORES_FIM_CABECALHO) {
    const i = texto.indexOf(marca)
    if (i !== -1 && (idx === -1 || i < idx)) idx = i
  }
  return idx === -1 ? texto : texto.slice(0, idx)
}

const RE_AUTOR_ABNT = /([A-ZÀ-ÜÇ][A-ZÀ-ÜÇ\-'.]{1,}(?:\s[A-ZÀ-ÜÇ][A-ZÀ-ÜÇ\-'.]{1,})*),\s+(?=[A-ZÀ-ÿ])/g
const RE_AUTOR_ORGANIZACAO = /^([A-ZÀ-ÜÇ][A-ZÀ-ÜÇ\s\-'.]{1,40}?)\./
const RE_ANO = /\b(19|20)\d{2}[a-z]?\b/g

function extrairAutores(texto: string): string[] {
  const head = texto.slice(0, 180)
  const out: string[] = []
  let m: RegExpExecArray | null
  RE_AUTOR_ABNT.lastIndex = 0
  while ((m = RE_AUTOR_ABNT.exec(head))) out.push(m[1])
  if (out.length) return out
  // referências institucionais (ex.: "BRASIL. Lei nº ...", "MEC. Portaria ...")
  const org = texto.match(RE_AUTOR_ORGANIZACAO)
  return org ? [org[1].trim()] : []
}

function extrairAno(texto: string): string | null {
  const head = cabecalho(texto)
  const doHead = [...head.matchAll(RE_ANO)].map((m) => m[0])
  if (doHead.length) return doHead[doHead.length - 1]
  const doTexto = [...texto.matchAll(RE_ANO)].map((m) => m[0])
  return doTexto[doTexto.length - 1] ?? null
}

export function normalizar(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .trim()
}

let indiceCache: Referencia[] | null = null

/** Lê o capítulo REFERÊNCIAS (já extraído da dissertação) e monta o índice autor+ano → referência completa. */
export function getReferencias(): Referencia[] {
  if (indiceCache) return indiceCache
  const cap = paginas.find((p) => p.slug === 'referencias')
  const textos = (cap?.blocos ?? [])
    .filter((b) => b.tipo === 'paragrafo')
    .map((b) => ('segmentos' in b ? b.segmentos.filter((s): s is { t: string } => 't' in s).map((s) => s.t).join('').trim() : ''))
    .filter(Boolean)

  indiceCache = textos.map((texto) => ({
    autores: extrairAutores(texto).map(normalizar),
    ano: (extrairAno(texto) ?? '').replace(/[a-z]$/, ''),
    texto,
  }))
  return indiceCache
}

/** Encontra a referência completa a partir dos sobrenomes citados no texto e do ano citado. */
export function buscarReferencia(sobrenomes: string[], ano: string): Referencia | null {
  const anoNum = ano.replace(/[a-z]$/, '')
  const alvo = sobrenomes.map(normalizar)
  return getReferencias().find((r) => r.ano === anoNum && alvo.some((s) => r.autores.includes(s))) ?? null
}
