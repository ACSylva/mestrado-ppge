import { useState } from 'react'
import { getGrafico } from '../lib/content'
import type { Bloco, Grafico, Rotulo, Segmento } from '../lib/types'
import GraficoView from './Grafico'
import { TextoRico } from './TextoRico'

function Segmentos({ segs }: { segs: Segmento[] }) {
  return (
    <>
      {segs.map((s, i) => {
        if ('br' in s) return <br key={i} />
        if ('nota' in s)
          return (
            <sup key={i} className="nota-ref" id={`ref-${s.nota}`}>
              <a href={`#nota-${s.nota}`} onClick={(e) => { e.preventDefault(); document.getElementById(`nota-${s.nota}`)?.scrollIntoView({ behavior: 'smooth' }) }}>{s.nota}</a>
            </sup>
          )
        let el: React.ReactNode = <TextoRico texto={s.t} />
        if (s.va === 'sup') el = <sup>{el}</sup>
        if (s.va === 'sub') el = <sub>{el}</sub>
        if (s.i) el = <em>{el}</em>
        if (s.b) el = <strong>{el}</strong>
        return <span key={i}>{el}</span>
      })}
    </>
  )
}

// ABNT: identificação ("Gráfico 1 – ...") acima, fonte abaixo.
function Figura({ rotulo, fonte, children }: { rotulo?: Rotulo; fonte?: string[]; children: React.ReactNode }) {
  if (!rotulo && !fonte) return <>{children}</>
  return (
    <figure className="figura">
      {rotulo && <figcaption className="rotulo">{rotulo.texto}</figcaption>}
      {children}
      {fonte?.map((f, i) => <p key={i} className="fonte"><TextoRico texto={f} /></p>)}
    </figure>
  )
}

// Gráfico que no Word é imagem: versão interativa (valores transcritos) + imagem original
function GraficoTranscrito({ g, src, alt }: { g: Grafico; src: string; alt: string }) {
  const [aba, setAba] = useState<'interativo' | 'imagem'>('interativo')
  return (
    <div className="grafico-transcrito">
      <div className="abas" role="tablist">
        <button type="button" role="tab" aria-selected={aba === 'interativo'} onClick={() => setAba('interativo')}>Interativo</button>
        <button type="button" role="tab" aria-selected={aba === 'imagem'} onClick={() => setAba('imagem')}>Imagem original</button>
        <a href={`dados/graficos.json`} download className="baixar">Baixar dados (JSON)</a>
      </div>
      {aba === 'interativo' ? <GraficoView g={g} /> : <div className="figura-img"><img src={src} alt={alt} loading="lazy" /></div>}
      {g.origem === 'transcrito_da_imagem' && (
        <details className="aviso-transcricao">
          <summary>Valores transcritos da imagem original — a conferir</summary>
          <ul>{(g.observacoes ?? []).map((o, i) => <li key={i}>{o}</li>)}</ul>
        </details>
      )}
    </div>
  )
}

export function BlocoView({ bloco }: { bloco: Bloco }) {
  switch (bloco.tipo) {
    case 'sigla':
      return null // renderizadas em grupo por <Blocos>
    case 'grafico': {
      const g = getGrafico(bloco.id)
      return (
        <Figura rotulo={bloco.rotulo} fonte={bloco.fonte}>
          {g ? <GraficoView g={g} /> : <p className="aviso">Gráfico não encontrado.</p>}
        </Figura>
      )
    }
    case 'tabela':
      return (
        <Figura rotulo={bloco.rotulo} fonte={bloco.fonte}>
        <div className="tabela-wrap">
          <table>
            <tbody>
              {bloco.linhas.map((linha, i) => (
                <tr key={i}>
                  {linha.map((c, j) => {
                    const Tag = i === 0 ? 'th' : 'td'
                    return (
                      <Tag key={j} colSpan={c.colspan}>
                        {c.t.split('\n').map((l, k) => (k ? [<br key={k} />, l] : l))}
                      </Tag>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        </Figura>
      )
    case 'imagem': {
      const g = bloco.grafico_id ? getGrafico(bloco.grafico_id) : undefined
      if (g)
        return (
          <Figura rotulo={bloco.rotulo} fonte={bloco.fonte}>
            <GraficoTranscrito g={g} src={bloco.src} alt={bloco.rotulo?.texto ?? ''} />
          </Figura>
        )
      return (
        <Figura rotulo={bloco.rotulo} fonte={bloco.fonte}>
          <div className="figura-img">
            <img src={bloco.src} alt={bloco.rotulo?.texto ?? ''} loading="lazy" />
          </div>
        </Figura>
      )
    }
    default: {
      const nivel = bloco.lista_nivel
      const style = nivel !== undefined ? { marginLeft: `${1.5 + nivel * 1.5}rem` } : undefined
      return (
        <p className={bloco.tipo} style={style}>
          <Segmentos segs={bloco.segmentos} />
        </p>
      )
    }
  }
}

export function Blocos({ blocos }: { blocos: Bloco[] }) {
  const siglas = blocos.filter((b) => b.tipo === 'sigla')
  return (
    <>
      {siglas.length > 0 && (
        <dl className="siglas">
          {siglas.map((b, i) => (
            <div key={i}><dt>{b.sigla}</dt><dd>{b.significado}</dd></div>
          ))}
        </dl>
      )}
      {blocos.map((b, i) => (
        <BlocoView key={i} bloco={b} />
      ))}
    </>
  )
}
