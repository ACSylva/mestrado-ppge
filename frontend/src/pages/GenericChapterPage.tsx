import { useEffect } from 'react'
import { Link, NavLink, useParams, useSearchParams } from 'react-router-dom'
import { Blocos } from '../components/Blocos'
import { getCapitulo, getNota, paginas, tituloCompleto, vizinhos } from '../lib/content'
import type { Bloco, Secao } from '../lib/types'

// Com HashRouter o "#" já é da rota; a seção vai em ?secao=slug.
function SecaoView({ secao }: { secao: Secao }) {
  const H = `h${Math.min(secao.nivel, 6)}` as 'h2'
  return (
    <section id={secao.slug}>
      <H>{tituloCompleto(secao)}</H>
      <Blocos blocos={secao.blocos} />
      {secao.secoes.map((s) => (
        <SecaoView key={s.slug} secao={s} />
      ))}
    </section>
  )
}

function Indice({ secoes, cap }: { secoes: Secao[]; cap: string }) {
  if (!secoes.length) return null
  return (
    <ul>
      {secoes.map((s) => (
        <li key={s.slug}>
          <Link to={`/dissertacao/${cap}?secao=${s.slug}`}>{tituloCompleto(s)}</Link>
          <Indice secoes={s.secoes} cap={cap} />
        </li>
      ))}
    </ul>
  )
}

function notasDe(secao: Secao): number[] {
  const achadas: number[] = []
  const deBlocos = (bs: Bloco[]) =>
    bs.forEach((b) => 'segmentos' in b && b.segmentos.forEach((s) => 'nota' in s && achadas.push(s.nota)))
  const walk = (s: Secao) => { deBlocos(s.blocos); s.secoes.forEach(walk) }
  walk(secao)
  return achadas
}

export default function GenericChapterPage() {
  const { slug } = useParams()
  const [params] = useSearchParams()
  const cap = getCapitulo(slug)
  const secaoAlvo = params.get('secao')

  useEffect(() => {
    if (secaoAlvo) document.getElementById(secaoAlvo)?.scrollIntoView({ behavior: 'smooth' })
    else window.scrollTo(0, 0)
  }, [slug, secaoAlvo])

  if (!cap) return <main className="capitulo"><p>Capítulo não encontrado.</p></main>
  const { anterior, proximo } = vizinhos(cap.slug)
  const notas = notasDe(cap)

  return (
    <div className="layout-capitulo">
      <aside className="lateral">
        <ol>
          {paginas.map((c) => (
            <li key={c.slug}>
              <NavLink to={`/dissertacao/${c.slug}`}>{tituloCompleto(c)}</NavLink>
              {c.slug === cap.slug && <Indice secoes={c.secoes} cap={c.slug} />}
            </li>
          ))}
        </ol>
      </aside>
      <main className="capitulo">
        <h1>{tituloCompleto(cap)}</h1>
        <Blocos blocos={cap.blocos} />
        {cap.secoes.map((s) => (
          <SecaoView key={s.slug} secao={s} />
        ))}
        {notas.length > 0 && (
          <section className="notas">
            <h2>Notas</h2>
            <ol>
              {notas.map((n) => (
                <li key={n} id={`nota-${n}`} value={n}>
                  {getNota(n)}{' '}
                  <a href={`#ref-${n}`} onClick={(e) => { e.preventDefault(); document.getElementById(`ref-${n}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }) }} aria-label="Voltar ao texto">↩</a>
                </li>
              ))}
            </ol>
          </section>
        )}
        <nav className="paginacao">
          {anterior ? <Link to={`/dissertacao/${anterior.slug}`}>← {tituloCompleto(anterior)}</Link> : <span />}
          {proximo && <Link to={`/dissertacao/${proximo.slug}`}>{tituloCompleto(proximo)} →</Link>}
        </nav>
      </main>
    </div>
  )
}
