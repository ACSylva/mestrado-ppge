import { buscarReferencia, type Referencia } from '../lib/referencias'

// URL solta no texto (ex.: "Disponível em: https://..."), sem pontuação de fim de frase grudada.
const RE_URL = /https?:\/\/[^\s<>()]+/g

// Citação ABNT autor-data, nas duas formas: "(Autor; Autor2, 2019, p. 10)" e "Autor (2019, p. 10)".
const RE_CITACAO =
  /(?:\(([A-ZÀ-Ü][a-zà-üçãõéêíóúñ'’-]+(?:\s*[;,]\s*[A-ZÀ-Ü][a-zà-üçãõéêíóúñ'’-]+)*(?:\s+e\s+[A-ZÀ-Ü][a-zà-üçãõéêíóúñ'’-]+)?),?\s*(\d{4}[a-z]?)(?:\s*,\s*p\.?\s*\d+(?:[-–]\d+)?)?\))|(?:\b([A-ZÀ-Ü][a-zà-üçãõéêíóúñ'’-]+(?:\s*[;,]\s*[A-ZÀ-Ü][a-zà-üçãõéêíóúñ'’-]+)*(?:\s+e\s+[A-ZÀ-Ü][a-zà-üçãõéêíóúñ'’-]+)?)\s\((\d{4}[a-z]?)(?:\s*,\s*p\.?\s*\d+(?:[-–]\d+)?)?\))/g

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

/** Trecho de texto (dentro de um segmento) com citações ABNT viradas em tooltip e URLs viradas em link. */
function ComCitacoes({ texto }: { texto: string }) {
  const partes: React.ReactNode[] = []
  let cursor = 0
  let i = 0
  RE_CITACAO.lastIndex = 0
  let m: RegExpExecArray | null
  while ((m = RE_CITACAO.exec(texto))) {
    if (m.index > cursor) partes.push(texto.slice(cursor, m.index))
    const autoresStr = m[1] ?? m[3]
    const ano = (m[2] ?? m[4]) as string
    const sobrenomes = autoresStr.split(/[;,]|\s+e\s+/).map((s) => s.trim()).filter(Boolean)
    const ref = buscarReferencia(sobrenomes, ano)
    if (ref) {
      partes.push(
        <Citacao key={`c${i++}`} referencia={ref}>
          {m[0]}
        </Citacao>,
      )
    } else {
      partes.push(m[0])
    }
    cursor = m.index + m[0].length
    if (m.index === RE_CITACAO.lastIndex) RE_CITACAO.lastIndex++
  }
  if (cursor < texto.length) partes.push(texto.slice(cursor))
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
