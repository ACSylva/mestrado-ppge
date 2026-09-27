import { siglas } from '../lib/content'
import { buscarReferencia, type Referencia } from '../lib/referencias'

// URL solta no texto (ex.: "Disponível em: https://..."), sem pontuação de fim de frase grudada.
const RE_URL = /https?:\/\/[^\s<>()]+/g

// Sobrenome/instituição em maiúscula inicial, ex.: "Bellani", "Fundeste", "Carbonera".
const NOME_SRC = "[A-ZÀ-Ü][a-zà-üçãõéêíóúñ'’-]+"

// Um "grupo" de citação: um ou mais autores (separados por ";", "," ou " e ") seguidos do ano
// e, opcionalmente, da página. Usado tanto isolado quanto repetido dentro do mesmo parêntese,
// quando várias obras são citadas juntas (ex.: "Fundeste, 2004; Bellani, 1997").
const RE_GRUPO = new RegExp(
  `(${NOME_SRC}(?:\\s*[;,]\\s*${NOME_SRC})*(?:\\s+e\\s+${NOME_SRC})?),?\\s*(\\d{4}[a-z]?)` +
    `(?:\\s*,\\s*p\\.?\\s*\\d+(?:[-–]\\d+)?)?`,
  'g',
)

// Citação ABNT nas duas formas: autor(es)+ano dentro do mesmo parêntese — podendo ter mais de
// uma obra junto, ex.: "(Bellani, 1997; Carbonera, Onghero, 2020)" — capturados em bloco no
// grupo 1 e reprocessados por RE_GRUPO; ou autor(es) fora do parêntese e só o ano dentro,
// ex.: "Bellani (1997)" / "Bellani, (1997)" (grupos 2 e 3).
const RE_CITACAO = new RegExp(
  `\\(([^()]*?\\b(?:19|20)\\d{2}[a-z]?\\b[^()]*)\\)` +
    `|` +
    `\\b(${NOME_SRC}(?:\\s*[;,]\\s*${NOME_SRC})*(?:\\s+e\\s+${NOME_SRC})?)(?:,\\s*|\\s+)\\((\\d{4}[a-z]?)` +
    `(?:\\s*,\\s*p\\.?\\s*\\d+(?:[-–]\\d+)?)?\\)`,
  'g',
)

// Siglas da "Lista de abreviaturas e siglas": casamento exato (sensível a maiúsculas) e por
// palavra inteira, para não confundir com trechos comuns do texto corrido.
const mapaSiglas = new Map(siglas.map((s) => [s.sigla, s.significado]))
const escapaRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const RE_SIGLA = siglas.length
  ? new RegExp(
      `(?<![\\p{L}\\p{N}])(${[...siglas]
        .sort((a, b) => b.sigla.length - a.sigla.length)
        .map((s) => escapaRegex(s.sigla))
        .join('|')})(?![\\p{L}\\p{N}])`,
      'gu',
    )
  : null

function aparaUrl(url: string): { limpa: string; sobra: string } {
  const m = url.match(/[.,;:)\]]+$/)
  return m ? { limpa: url.slice(0, -m[0].length), sobra: m[0] } : { limpa: url, sobra: '' }
}

function Citacao({ children, referencia }: { children: React.ReactNode; referencia: Referencia }) {
  return (
    <span className="citacao" tabIndex={0}>
      {children}
      <span className="citacao-balao" role="tooltip">
        {referencia.texto}
      </span>
    </span>
  )
}

function Sigla({ children, significado }: { children: React.ReactNode; significado: string }) {
  return (
    <span className="sigla-termo" tabIndex={0}>
      {children}
      <span className="sigla-balao" role="tooltip">
        {significado}
      </span>
    </span>
  )
}

/** Trecho de texto puro (sem citação nem URL) com siglas conhecidas viradas em tooltip. */
function ComSiglas({ texto }: { texto: string }) {
  if (!RE_SIGLA) return <>{texto}</>
  const partes: React.ReactNode[] = []
  let cursor = 0
  let i = 0
  RE_SIGLA.lastIndex = 0
  let m: RegExpExecArray | null
  while ((m = RE_SIGLA.exec(texto))) {
    if (m.index > cursor) partes.push(texto.slice(cursor, m.index))
    partes.push(
      <Sigla key={`g${i++}`} significado={mapaSiglas.get(m[0]) as string}>
        {m[0]}
      </Sigla>,
    )
    cursor = m.index + m[0].length
    if (m.index === RE_SIGLA.lastIndex) RE_SIGLA.lastIndex++
  }
  if (cursor < texto.length) partes.push(texto.slice(cursor))
  return <>{partes}</>
}

function citacaoOuTexto(autoresStr: string, ano: string, textoOriginal: string, key: string): React.ReactNode {
  const sobrenomes = autoresStr.split(/[;,]|\s+e\s+/).map((s) => s.trim()).filter(Boolean)
  const ref = buscarReferencia(sobrenomes, ano)
  return ref ? (
    <Citacao key={key} referencia={ref}>
      {textoOriginal}
    </Citacao>
  ) : (
    <ComSiglas key={key} texto={textoOriginal} />
  )
}

/** Interior de um parêntese com ano(s): pode ter uma ou mais obras juntas ("Fundeste, 2004; Bellani, 1997"). */
function processarGrupos(texto: string, keyPrefix: string): React.ReactNode[] {
  const partes: React.ReactNode[] = []
  let cursor = 0
  let i = 0
  RE_GRUPO.lastIndex = 0
  let m: RegExpExecArray | null
  while ((m = RE_GRUPO.exec(texto))) {
    if (m.index > cursor) partes.push(<ComSiglas key={`${keyPrefix}t${i++}`} texto={texto.slice(cursor, m.index)} />)
    partes.push(citacaoOuTexto(m[1], m[2], m[0], `${keyPrefix}c${i++}`))
    cursor = m.index + m[0].length
    if (m.index === RE_GRUPO.lastIndex) RE_GRUPO.lastIndex++
  }
  if (cursor < texto.length) partes.push(<ComSiglas key={`${keyPrefix}t${i++}`} texto={texto.slice(cursor)} />)
  return partes
}

/** Trecho de texto (dentro de um segmento) com citações ABNT viradas em tooltip, siglas em tooltip e URLs viradas em link. */
function ComCitacoes({ texto }: { texto: string }) {
  const partes: React.ReactNode[] = []
  let cursor = 0
  let i = 0
  RE_CITACAO.lastIndex = 0
  let m: RegExpExecArray | null
  while ((m = RE_CITACAO.exec(texto))) {
    if (m.index > cursor) partes.push(<ComSiglas key={`s${i++}`} texto={texto.slice(cursor, m.index)} />)
    if (m[1] !== undefined) {
      partes.push('(', ...processarGrupos(m[1], `z${i++}-`), ')')
    } else {
      partes.push(citacaoOuTexto(m[2] as string, m[3] as string, m[0], `c${i++}`))
    }
    cursor = m.index + m[0].length
    if (m.index === RE_CITACAO.lastIndex) RE_CITACAO.lastIndex++
  }
  if (cursor < texto.length) partes.push(<ComSiglas key={`s${i++}`} texto={texto.slice(cursor)} />)
  return <>{partes}</>
}

/** Segmento de texto completo: primeiro separa URLs em links (abrindo em nova aba), depois aplica citações no restante. */
export function TextoRico({ texto }: { texto: string }) {
  if (!texto) return null
  const partes: React.ReactNode[] = []
  let cursor = 0
  let i = 0
  RE_URL.lastIndex = 0
  let m: RegExpExecArray | null
  while ((m = RE_URL.exec(texto))) {
    if (m.index > cursor) partes.push(<ComCitacoes key={`t${i++}`} texto={texto.slice(cursor, m.index)} />)
    const { limpa, sobra } = aparaUrl(m[0])
    if (limpa) {
      partes.push(
        <a key={`u${i++}`} href={limpa} target="_blank" rel="noopener noreferrer">
          {limpa}
        </a>,
      )
    }
    if (sobra) partes.push(sobra)
    cursor = m.index + m[0].length
  }
  if (cursor < texto.length) partes.push(<ComCitacoes key={`t${i++}`} texto={texto.slice(cursor)} />)
  return <>{partes}</>
}
