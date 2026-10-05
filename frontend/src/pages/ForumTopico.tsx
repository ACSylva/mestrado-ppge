import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import topicos from '../data/forumTopicos'
import perguntasPorTopicoJson from '../data/forum_perguntas.json'

interface Resposta {
  id: string
  texto: string
  autor: string
  data: string
}

interface Pergunta {
  id: string
  pergunta: string
  autor: string
  data: string
  respostas: Resposta[]
}

const perguntasPorTopico = perguntasPorTopicoJson as Record<string, Pergunta[]>

// API-ponte compartilhada no Render (ver d:\mestrado\dados\web_app\forum_api\main.py), que grava a
// pergunta/resposta direto no JSON deste repositório via API do GitHub — sem banco de dados nem
// conta exigida de quem participa. FORUM_PROJETO precisa corresponder a uma chave do dicionário
// PROJETOS naquele serviço. O Render gratuito dorme após 15 min sem uso: a primeira pergunta depois
// de um tempo ocioso pode demorar de 30 a 60s para responder (o backend "acorda").
const FORUM_API_BASE = 'https://forum-dissertacoes-api.onrender.com'
const FORUM_PROJETO = 'acsylva-mestrado-ppge'

function formatarData(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
  } catch {
    return ''
  }
}

function CampoHoneypot({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <input
      type="text"
      name="site"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      tabIndex={-1}
      autoComplete="off"
      aria-hidden="true"
      className="forum-honeypot"
    />
  )
}

function FormNovaPergunta({ topicoSlug, onEnviada }: { topicoSlug: string; onEnviada: () => void }) {
  const [nome, setNome] = useState('')
  const [pergunta, setPergunta] = useState('')
  const [honeypot, setHoneypot] = useState('')
  const [status, setStatus] = useState<'ocioso' | 'enviando' | 'ok' | 'erro'>('ocioso')

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!pergunta.trim()) return
    setStatus('enviando')
    try {
      const r = await fetch(`${FORUM_API_BASE}/perguntas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projeto: FORUM_PROJETO, topico: topicoSlug, pergunta, nome, site: honeypot }),
      })
      if (!r.ok) throw new Error('falha')
      setStatus('ok')
      setPergunta('')
      setNome('')
      onEnviada()
    } catch {
      setStatus('erro')
    }
  }

  if (status === 'ok') {
    return (
      <p className="forum-confirmacao">
        Pergunta enviada! Ela passa por um pequeno processo automático e aparece aqui em alguns minutos.
      </p>
    )
  }

  return (
    <form onSubmit={enviar} className="forum-form">
      <CampoHoneypot value={honeypot} onChange={setHoneypot} />
      <textarea
        required
        maxLength={500}
        placeholder="Escreva sua pergunta..."
        value={pergunta}
        onChange={(e) => setPergunta(e.target.value)}
        rows={3}
      />
      <input
        type="text"
        maxLength={60}
        placeholder="Seu nome (opcional)"
        value={nome}
        onChange={(e) => setNome(e.target.value)}
      />
      <div className="forum-form-rodape">
        <button type="submit" disabled={status === 'enviando'}>
          {status === 'enviando' ? 'Enviando…' : 'Enviar pergunta'}
        </button>
        {status === 'erro' && <span className="forum-erro">Não foi possível enviar. Tente novamente.</span>}
      </div>
    </form>
  )
}

function FormNovaResposta({ topicoSlug, perguntaId, onEnviada }: { topicoSlug: string; perguntaId: string; onEnviada: () => void }) {
  const [nome, setNome] = useState('')
  const [resposta, setResposta] = useState('')
  const [honeypot, setHoneypot] = useState('')
  const [status, setStatus] = useState<'ocioso' | 'enviando' | 'ok' | 'erro'>('ocioso')

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!resposta.trim()) return
    setStatus('enviando')
    try {
      const r = await fetch(`${FORUM_API_BASE}/respostas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projeto: FORUM_PROJETO, topico: topicoSlug, pergunta_id: perguntaId, resposta, nome, site: honeypot }),
      })
      if (!r.ok) throw new Error('falha')
      setStatus('ok')
      setResposta('')
      setNome('')
      onEnviada()
    } catch {
      setStatus('erro')
    }
  }

  if (status === 'ok') {
    return <p className="forum-confirmacao forum-confirmacao--resposta">Resposta enviada! Aparece aqui em alguns minutos.</p>
  }

  return (
    <form onSubmit={enviar} className="forum-form forum-form--resposta">
      <CampoHoneypot value={honeypot} onChange={setHoneypot} />
      <textarea
        required
        maxLength={1000}
        placeholder="Escreva sua resposta..."
        value={resposta}
        onChange={(e) => setResposta(e.target.value)}
        rows={2}
      />
      <div className="forum-form-rodape">
        <input
          type="text"
          maxLength={60}
          placeholder="Seu nome (opcional)"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
        />
        <button type="submit" disabled={status === 'enviando'}>
          {status === 'enviando' ? 'Enviando…' : 'Responder'}
        </button>
      </div>
      {status === 'erro' && <span className="forum-erro">Não foi possível enviar. Tente novamente.</span>}
    </form>
  )
}

function CardPergunta({ topicoSlug, pergunta }: { topicoSlug: string; pergunta: Pergunta }) {
  const [mostrarForm, setMostrarForm] = useState(false)
  const [respostasExtra, setRespostasExtra] = useState(0)

  return (
    <div className="forum-pergunta">
      <p className="forum-pergunta-texto">{pergunta.pergunta}</p>
      <p className="forum-meta">{pergunta.autor} · {formatarData(pergunta.data)}</p>

      {pergunta.respostas.length > 0 && (
        <div className="forum-respostas">
          {pergunta.respostas.map((r) => (
            <div key={r.id} className="forum-resposta">
              <p className="forum-resposta-texto">{r.texto}</p>
              <p className="forum-meta">{r.autor} · {formatarData(r.data)}</p>
            </div>
          ))}
        </div>
      )}

      {respostasExtra > 0 && (
        <p className="forum-confirmacao forum-confirmacao--resposta">
          Sua resposta foi enviada e vai aparecer aqui em alguns minutos.
        </p>
      )}

      {mostrarForm ? (
        <FormNovaResposta topicoSlug={topicoSlug} perguntaId={pergunta.id} onEnviada={() => setRespostasExtra((n) => n + 1)} />
      ) : (
        <button type="button" className="forum-link-responder" onClick={() => setMostrarForm(true)}>
          Responder
        </button>
      )}
    </div>
  )
}

export default function ForumTopico() {
  const { slug } = useParams<{ slug: string }>()
  const topico = topicos.find((t) => t.slug === slug)
  const [novasPerguntas, setNovasPerguntas] = useState(0)

  if (!topico) {
    return (
      <main className="pesquisa">
        <p>Tópico não encontrado.</p>
        <Link to="/forum">← Voltar ao Fórum</Link>
      </main>
    )
  }

  const perguntas = perguntasPorTopico[topico.slug] ?? []

  return (
    <main className="pesquisa">
      <Link to="/forum" className="forum-voltar">← Todos os tópicos</Link>

      <section className="pesquisa-hero">
        <p className="sobretitulo">
          <span className="ponto" aria-hidden="true" />
          Fórum de Discussões
        </p>
        <h1>{topico.titulo}</h1>
        <p className="pesquisa-intro">{topico.descricao}</p>
      </section>

      <FormNovaPergunta topicoSlug={topico.slug} onEnviada={() => setNovasPerguntas((n) => n + 1)} />

      {novasPerguntas > 0 && (
        <p className="forum-confirmacao">Sua pergunta foi enviada e vai aparecer nesta lista em alguns minutos.</p>
      )}

      {perguntas.length === 0 ? (
        <p className="forum-vazio">Nenhuma pergunta publicada neste tópico ainda. Seja o primeiro a perguntar!</p>
      ) : (
        <div className="forum-lista">
          {perguntas.map((p) => (
            <CardPergunta key={p.id} topicoSlug={topico.slug} pergunta={p} />
          ))}
        </div>
      )}
    </main>
  )
}
