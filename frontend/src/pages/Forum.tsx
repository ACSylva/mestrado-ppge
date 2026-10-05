import { Link } from 'react-router-dom'
import topicos from '../data/forumTopicos'

export default function Forum() {
  return (
    <main className="pesquisa">
      <section className="pesquisa-hero">
        <p className="sobretitulo">
          <span className="ponto" aria-hidden="true" />
          Fórum de Discussões
        </p>
        <h1>Um espaço de diálogo sobre a pesquisa</h1>
        <p className="pesquisa-intro">
          Escolha um tópico, pergunte ou responda a quem já perguntou — sem necessidade de criar conta.
        </p>
      </section>

      <ol className="sumario-lista forum-topicos">
        {topicos.map((t) => (
          <li key={t.slug} className="sumario-item">
            <Link to={`/forum/${t.slug}`}>
              <span className="sumario-titulo">
                {t.titulo}
                <span className="forum-topico-descricao">{t.descricao}</span>
              </span>
              <span className="sumario-seta" aria-hidden="true">→</span>
            </Link>
          </li>
        ))}
      </ol>
    </main>
  )
}
