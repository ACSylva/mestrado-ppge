import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Blocos } from '../components/Blocos'
import { capitulos, meta, preTextual } from '../lib/content'

// Fotos de Chapecó que se alternam atrás de toda a página inicial (ver .inicio-fundo no CSS).
const FUNDO_IMAGENS = [
  '/assets/media/foto-chapeco.png',
  '/assets/media/foto-chapeco-historica-1960.jpg',
  '/assets/media/foto-chapeco-matriz-dia.jpg',
  '/assets/media/foto-chapeco-skyline-noite.jpg',
  '/assets/media/foto-chapeco-matriz-centro.jpg',
  '/assets/media/foto-unochapeco.webp',
  '/assets/media/foto-unoesc.jpg',
  '/assets/media/foto-uffs.jpg',
  '/assets/media/foto-ifsc.jpg',
]

function FundoInicio() {
  const [indice, setIndice] = useState(0)

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const id = setInterval(() => setIndice((i) => (i + 1) % FUNDO_IMAGENS.length), 6000)
    return () => clearInterval(id)
  }, [])

  return (
    <div className="inicio-fundo" aria-hidden="true">
      {FUNDO_IMAGENS.map((src, i) => (
        <div
          key={src}
          className="inicio-fundo-img"
          style={{ backgroundImage: `url(${src})`, opacity: i === indice ? 1 : 0 }}
        />
      ))}
    </div>
  )
}

export default function Inicio() {
  const resumo = preTextual.find((p) => p.titulo.toUpperCase() === 'RESUMO')
  const metaLinhas = [
    { rotulo: 'Programa', valor: meta.programa },
    { rotulo: 'Instituição', valor: meta.instituicao },
    { rotulo: 'Linha de pesquisa', valor: meta.linha },
    { rotulo: 'Orientador', valor: meta.orientador },
    { rotulo: 'Defesa', valor: meta.defesa && `Defendida e aprovada em ${meta.defesa}` },
  ].filter((l) => l.valor)

  return (
    <main className="inicio">
      <FundoInicio />
      <section className="hero">
        <p className="sobretitulo">
          <span className="ponto" aria-hidden="true" />
          Dissertação de mestrado · {meta.ano}
        </p>
        <h1>{meta.titulo}</h1>
        <div className="hero-regua" aria-hidden="true" />

        <div className="autoria-card">
          <p className="autoria-nome">{meta.autora}</p>
          <dl className="autoria-grade">
            {metaLinhas.map((l) => (
              <div key={l.rotulo}>
                <dt>{l.rotulo}</dt>
                <dd>{l.valor}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {resumo && (
        <section className="resumo">
          <h2>Resumo</h2>
          <Blocos blocos={resumo.blocos} />
        </section>
      )}

      {capitulos.length === 0 ? (
        <p className="aviso">O texto da dissertação ainda não foi importado.</p>
      ) : (
        <nav className="sumario" aria-label="Sumário da dissertação">
          <h2>Sumário</h2>
          <ol className="sumario-lista">
            {preTextual.filter((p) => p !== resumo).map((p) => (
              <li key={p.slug} className="sumario-item sumario-item--pre">
                <Link to={`/dissertacao/${p.slug}`}>
                  <span className="sumario-titulo">{p.titulo}</span>
                  <span className="sumario-seta" aria-hidden="true">→</span>
                </Link>
              </li>
            ))}
            {capitulos.map((c, i) => (
              <li key={c.slug} className="sumario-item">
                <Link to={`/dissertacao/${c.slug}`}>
                  <span className="sumario-numero">{String(c.numero ?? i + 1).padStart(2, '0')}</span>
                  <span className="sumario-titulo">{c.titulo}</span>
                  <span className="sumario-seta" aria-hidden="true">→</span>
                </Link>
              </li>
            ))}
          </ol>
        </nav>
      )}
    </main>
  )
}
