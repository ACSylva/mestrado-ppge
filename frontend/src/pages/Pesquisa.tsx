import { useState } from 'react'
import { Link } from 'react-router-dom'
import GraficoView from '../components/Grafico'
import { TextoRico } from '../components/TextoRico'
import { getCapitulo, getGrafico, tituloCompleto } from '../lib/content'
import {
  MARCOS_HISTORICOS,
  PAINEIS,
  extremos,
  fmtNum,
  fmtPct,
  getKpis,
  variacaoPct,
  type Painel,
  type StatSpec,
} from '../lib/pesquisa'

function StatCard({ spec }: { spec: StatSpec }) {
  const e = extremos(spec.grafico, spec.serieNome)
  if (!e) return null
  const percentual = e.unidade === '%'
  const meta = spec.metaSerieNome ? extremos(spec.grafico, spec.metaSerieNome) : null
  const v = variacaoPct(e)
  const atingiuMeta = meta ? e.valorFinal >= meta.valorFinal : null

  return (
    <div className="stat-card">
      <p className="stat-rotulo">{spec.rotulo}</p>
      <p className="stat-valor">
        {percentual ? `${fmtPct(e.valorFinal)}%` : fmtNum(e.valorFinal)}
        <span className="stat-ano"> · {e.anoFinal}</span>
      </p>
      {meta ? (
        <p className={`stat-meta ${atingiuMeta ? 'stat-meta--ok' : 'stat-meta--abaixo'}`}>
          {atingiuMeta ? '✓ meta do PNE atingida' : '✗ abaixo da meta do PNE'} ({fmtPct(meta.valorFinal, 0)}%)
        </p>
      ) : (
        v !== null && (
          <p className="stat-variacao">
            {v >= 0 ? '▲' : '▼'} {fmtPct(Math.abs(v), 1)}% desde {e.anoInicial} ({percentual ? `${fmtPct(e.valorInicial)}%` : fmtNum(e.valorInicial)})
          </p>
        )
      )}
    </div>
  )
}

function PainelCard({ painel }: { painel: Painel }) {
  const [aberto, setAberto] = useState(false)
  return (
    <article className="painel-card">
      <h3>{painel.tema}</h3>
      <p className="painel-achado">{painel.achado}</p>
      <div className="stat-grade">
        {painel.stats.map((s, i) => (
          <StatCard key={i} spec={s} />
        ))}
      </div>
      <button type="button" className="painel-alternar" onClick={() => setAberto(!aberto)} aria-expanded={aberto}>
        {aberto ? 'Ocultar trajetória completa' : 'Ver trajetória completa (2014–2024)'}
      </button>
      {aberto && (
        <div className="painel-graficos">
          {painel.graficos.map((id) => {
            const g = getGrafico(id)
            if (!g) return null
            return (
              <figure key={id} className="figura">
                {g.rotulo && <p className="rotulo">{g.rotulo.texto}</p>}
                <GraficoView g={g} />
                {g.fonte && g.fonte.map((f, i) => <p key={i} className="fonte"><TextoRico texto={f} /></p>)}
              </figure>
            )
          })}
        </div>
      )}
    </article>
  )
}

function Timeline() {
  return (
    <div className="timeline">
      {MARCOS_HISTORICOS.map((m, i) => (
        <div className="timeline-item" key={i}>
          <span className="timeline-marcador" aria-hidden="true" />
          <span className="timeline-ano">{m.ano}</span>
          <div className="timeline-conteudo">
            <h4>{m.titulo}</h4>
            <p>{m.texto}</p>
          </div>
        </div>
      ))}
    </div>
  )
}

export default function Pesquisa() {
  const kpis = getKpis()
  const capitulosComPaineis = [
    { slug: 'introducao', paineis: PAINEIS.filter((p) => p.capituloSlug === 'introducao') },
    {
      slug: 'as-politicas-e-as-dinamicas-da-educacao-superior-no-brasil-analise-do-plano-naci',
      paineis: PAINEIS.filter((p) => p.capituloSlug === 'as-politicas-e-as-dinamicas-da-educacao-superior-no-brasil-analise-do-plano-naci'),
    },
    {
      slug: 'a-educacao-superior-em-chapeco-periodo-de-vigencia-do-pne-2014-2024',
      paineis: PAINEIS.filter((p) => p.capituloSlug === 'a-educacao-superior-em-chapeco-periodo-de-vigencia-do-pne-2014-2024'),
    },
  ]
  const cap3 = getCapitulo('a-educacao-superior-em-chapeco-origem-e-principais-ciclos-de-desenvolvimento')

  return (
    <main className="pesquisa">
      <section className="pesquisa-hero">
        <p className="sobretitulo">
          <span className="ponto" aria-hidden="true" />
          Pesquisa
        </p>
        <h1>Principais achados e números da dissertação</h1>
        <p className="pesquisa-intro">
          Um panorama dos dados sistematizados na pesquisa, organizado por capítulo e tema, com a trajetória
          temporal (2014–2024) de cada indicador extraído do Censo da Educação Superior do INEP.
        </p>
      </section>

      <section className="kpis">
        {kpis.map((k) => (
          <div className="kpi-card" key={k.rotulo}>
            <p className="kpi-valor">{k.valor}</p>
            <p className="kpi-rotulo">{k.rotulo}</p>
            <p className="kpi-detalhe">{k.detalhe}</p>
          </div>
        ))}
      </section>

      {capitulosComPaineis.map(({ slug, paineis }) => {
        if (paineis.length === 0) return null
        const cap = getCapitulo(slug)
        return (
          <section className="pesquisa-capitulo" key={slug}>
            <h2>
              {cap && (
                <Link to={`/dissertacao/${cap.slug}`} className="pesquisa-capitulo-link">
                  {tituloCompleto(cap)}
                </Link>
              )}
            </h2>
            <div className="paineis-grade">
              {paineis.map((p) => (
                <PainelCard key={p.id} painel={p} />
              ))}
            </div>
          </section>
        )
      })}

      {cap3 && (
        <section className="pesquisa-capitulo">
          <h2>
            <Link to={`/dissertacao/${cap3.slug}`} className="pesquisa-capitulo-link">
              {tituloCompleto(cap3)}
            </Link>
          </h2>
          <p className="pesquisa-capitulo-nota">
            Capítulo histórico-narrativo, sem séries estatísticas anuais — a trajetória aqui é institucional:
            os principais marcos da criação e expansão das IES em Chapecó.
          </p>
          <Timeline />
        </section>
      )}
    </main>
  )
}
