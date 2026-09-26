import { useMemo, useState } from 'react'
import GraficoView from '../components/Grafico'
import { ANOS, consultar, dimensoesPorMedida, getInstituicoes, getMedidas } from '../lib/dw'
import { ANOS_CURSOS, getAtributosIes, getCursosDaIes, temDadosDeCursos, turnoDaLinha } from '../lib/cursosPorIes'
import type { Grafico } from '../lib/types'

const fmt = (v: number) => Math.round(v).toLocaleString('pt-BR')

function KpiCard({ rotulo, valor, detalhe }: { rotulo: string; valor: string; detalhe: string }) {
  return (
    <div className="kpi-card kpi-card--painel">
      <p className="kpi-valor">{valor}</p>
      <p className="kpi-rotulo">{rotulo}</p>
      <p className="kpi-detalhe">{detalhe}</p>
    </div>
  )
}

function PainelIndicadores() {
  const medidas = useMemo(() => getMedidas(), [])
  const [medida, setMedida] = useState(medidas[0]?.valor ?? '')
  const [dimensao, setDimensao] = useState<string>('')
  const [anoDe, setAnoDe] = useState(ANOS[0])
  const [anoAte, setAnoAte] = useState(ANOS[ANOS.length - 1])

  // Se a medida deixar de existir (não deveria, mas por segurança), realinha para a primeira disponível.
  const medidaValida = medidas.some((m) => m.valor === medida) ? medida : medidas[0]?.valor ?? ''
  const dimensoes = useMemo(() => dimensoesPorMedida(medidaValida), [medidaValida])
  const dimensaoValida = dimensao === '' || dimensoes.includes(dimensao) ? dimensao : ''

  const anosNoIntervalo = ANOS.filter((a) => a >= anoDe && a <= anoAte)
  const fatos = useMemo(
    () => consultar({ medida: medidaValida, dimensao: dimensaoValida || null, anoDe, anoAte }),
    [medidaValida, dimensaoValida, anoDe, anoAte],
  )

  // Pivota os fatos em {categoria -> {ano -> valor}}, preservando a ordem de 1ª aparição.
  const categorias: string[] = []
  const porCategoria = new Map<string, Map<string, number>>()
  for (const f of fatos) {
    const chave = f.categoria ?? medidaValida
    if (!porCategoria.has(chave)) { porCategoria.set(chave, new Map()); categorias.push(chave) }
    porCategoria.get(chave)!.set(f.ano, f.valor)
  }

  const grafico: Grafico = {
    id: 'painel',
    rotulo: {
      tipo: 'Painel',
      numero: 0,
      titulo: dimensaoValida ? `${medidaValida} por ${dimensaoValida}` : medidaValida,
      texto: dimensaoValida ? `${medidaValida} por ${dimensaoValida} (${anoDe}–${anoAte})` : `${medidaValida} (${anoDe}–${anoAte})`,
    },
    fonte: ['Fonte: dados sistematizados pela autora a partir do Censo da Educação Superior (INEP), extraídos dos apêndices da dissertação.'],
    capitulo: null,
    tipo: categorias.length > 1 && anosNoIntervalo.length > 1 ? 'linha' : 'barra',
    titulo_no_grafico: null,
    eixos: [],
    grupos: [
      {
        tipo: categorias.length > 1 && anosNoIntervalo.length > 1 ? 'linha' : 'barra',
        series: categorias.map((cat) => ({
          nome: cat,
          categorias: anosNoIntervalo,
          valores: anosNoIntervalo.map((ano) => porCategoria.get(cat)?.get(ano) ?? 0),
        })),
      },
    ],
    linhas: [],
    unidade: null,
  }

  // KPIs: total no último ano do intervalo, no primeiro, variação, nº de categorias.
  const totalPorAno = (ano: string) => categorias.reduce((soma, c) => soma + (porCategoria.get(c)?.get(ano) ?? 0), 0)
  const totalFinal = anosNoIntervalo.length ? totalPorAno(anosNoIntervalo[anosNoIntervalo.length - 1]) : 0
  const totalInicial = anosNoIntervalo.length ? totalPorAno(anosNoIntervalo[0]) : 0
  const variacao = totalInicial ? ((totalFinal - totalInicial) / totalInicial) * 100 : null

  return (
    <>
      <p className="painel-intro">
        Filtre por medida, dimensão e período para ver gráficos, KPIs e tabela de totalizadores atualizados em
        tempo real, a partir dos dados sistematizados nos apêndices da dissertação (Censo da Educação Superior
        / INEP). <strong>Limitações da fonte:</strong> não há dado de "vagas" tabulado, a quebra por IES
        individual só existe para o número de instituições (não para matrículas/concluintes), e cada dimensão é
        cruzada isoladamente com o ano — não é possível combinar duas dimensões ao mesmo tempo (ex.: gênero e
        rede simultaneamente).
      </p>

      <section className="painel-filtros">
        <label>
          <span>Medida</span>
          <select value={medidaValida} onChange={(e) => { setMedida(e.target.value); setDimensao('') }}>
            {Object.entries(
              medidas.reduce<Record<string, string[]>>((grupos, m) => {
                (grupos[m.grupo] ??= []).push(m.valor)
                return grupos
              }, {}),
            ).map(([grupo, itens]) => (
              <optgroup key={grupo} label={grupo}>
                {itens.map((m) => <option key={m} value={m}>{m}</option>)}
              </optgroup>
            ))}
          </select>
        </label>
        <label>
          <span>Dimensão (quebra)</span>
          <select value={dimensaoValida} onChange={(e) => setDimensao(e.target.value)}>
            <option value="">(sem quebra — total geral)</option>
            {dimensoes.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
        </label>
        <label>
          <span>De</span>
          <select value={anoDe} onChange={(e) => setAnoDe(e.target.value)}>
            {ANOS.filter((a) => a <= anoAte).map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
        </label>
        <label>
          <span>Até</span>
          <select value={anoAte} onChange={(e) => setAnoAte(e.target.value)}>
            {ANOS.filter((a) => a >= anoDe).map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
        </label>
      </section>

      {categorias.length === 0 ? (
        <p className="aviso">Sem dados para esta combinação de filtros.</p>
      ) : (
        <>
          <section className="kpis kpis--painel">
            <KpiCard rotulo={`Total em ${anosNoIntervalo[anosNoIntervalo.length - 1] ?? '–'}`} valor={fmt(totalFinal)} detalhe={medidaValida} />
            <KpiCard rotulo={`Total em ${anosNoIntervalo[0] ?? '–'}`} valor={fmt(totalInicial)} detalhe={medidaValida} />
            <KpiCard
              rotulo="Variação no período"
              valor={variacao === null ? '—' : `${variacao >= 0 ? '+' : ''}${variacao.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`}
              detalhe={`${anoDe} → ${anoAte}`}
            />
            <KpiCard rotulo="Categorias na quebra" valor={String(categorias.length)} detalhe={dimensaoValida || 'sem quebra'} />
          </section>

          <section className="painel-grafico">
            <GraficoView g={grafico} />
          </section>

          <section className="painel-tabela">
            <h2>Totalizadores</h2>
            <div className="tabela-wrap">
              <table>
                <thead>
                  <tr>
                    <th>{dimensaoValida || medidaValida}</th>
                    {anosNoIntervalo.map((a) => <th key={a}>{a}</th>)}
                    <th>Total período</th>
                  </tr>
                </thead>
                <tbody>
                  {categorias.map((cat) => {
                    const linha = anosNoIntervalo.map((a) => porCategoria.get(cat)?.get(a) ?? 0)
                    const total = linha.reduce((a, b) => a + b, 0)
                    return (
                      <tr key={cat}>
                        <td>{cat}</td>
                        {linha.map((v, i) => <td key={i}>{fmt(v)}</td>)}
                        <td><strong>{fmt(total)}</strong></td>
                      </tr>
                    )
                  })}
                </tbody>
                <tfoot>
                  <tr>
                    <td><strong>Total</strong></td>
                    {anosNoIntervalo.map((a) => <td key={a}><strong>{fmt(totalPorAno(a))}</strong></td>)}
                    <td><strong>{fmt(categorias.reduce((s, c) => s + anosNoIntervalo.reduce((s2, a) => s2 + (porCategoria.get(c)?.get(a) ?? 0), 0), 0))}</strong></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </section>
        </>
      )}
    </>
  )
}

function TabelaCursosIes({ nome, ano }: { nome: string; ano: number }) {
  const linhas = getCursosDaIes(nome, ano)
  const temDados = temDadosDeCursos(nome)

  if (!temDados) {
    return (
      <div className="ficha-ies-cursos">
        <h4>Cursos ofertados</h4>
        <p className="ficha-ies-semdado">Sem dados de cursos (Censo INEP/Chapecó) para esta instituição.</p>
      </div>
    )
  }
  if (linhas.length === 0) {
    return (
      <div className="ficha-ies-cursos">
        <h4>Cursos ofertados em {ano}</h4>
        <p className="ficha-ies-semdado">Nenhum curso registrado para esta instituição em {ano}.</p>
      </div>
    )
  }
  const total = (campo: keyof (typeof linhas)[number]) => linhas.reduce((s, l) => s + (typeof l[campo] === 'number' ? (l[campo] as number) : 0), 0)

  return (
    <div className="ficha-ies-cursos">
      <h4>Cursos ofertados em {ano} <span className="ficha-ies-cursos-contagem">({linhas.length})</span></h4>
      <div className="tabela-wrap">
        <table className="tabela-cursos">
          <thead>
            <tr>
              <th>Curso</th>
              <th>Grau</th>
              <th>Modalidade</th>
              <th>Turno</th>
              <th>Vagas</th>
              <th>Inscritos</th>
              <th>Ingr.</th>
              <th>Matr.</th>
              <th>Concl.</th>
              <th>Tranc.</th>
              <th>Evad.</th>
            </tr>
          </thead>
          <tbody>
            {linhas.map((l, i) => (
              <tr key={i}>
                <td>{l.curso}</td>
                <td>{l.grauAcademico ?? '—'}</td>
                <td>{l.modalidade}</td>
                <td>{turnoDaLinha(l)}</td>
                <td>{fmt(l.vagas)}</td>
                <td>{fmt(l.inscritos)}</td>
                <td>{fmt(l.ingressantes)}</td>
                <td>{fmt(l.matriculas)}</td>
                <td>{fmt(l.concluintes)}</td>
                <td>{fmt(l.trancados)}</td>
                <td>{fmt(l.evadidos)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td><strong>Total</strong></td>
              <td></td>
              <td></td>
              <td></td>
              <td><strong>{fmt(total('vagas'))}</strong></td>
              <td><strong>{fmt(total('inscritos'))}</strong></td>
              <td><strong>{fmt(total('ingressantes'))}</strong></td>
              <td><strong>{fmt(total('matriculas'))}</strong></td>
              <td><strong>{fmt(total('concluintes'))}</strong></td>
              <td><strong>{fmt(total('trancados'))}</strong></td>
              <td><strong>{fmt(total('evadidos'))}</strong></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}

function FichaInstituicao({ inst, ano }: { inst: ReturnType<typeof getInstituicoes>[number]; ano: number }) {
  const atributos = getAtributosIes(inst.nome)
  return (
    <article className="ficha-ies">
      <header>
        <h3>{inst.nome}</h3>
        {inst.sigla && <span className="ficha-ies-sigla">{inst.sigla}</span>}
      </header>
      <dl className="ficha-ies-atributos">
        <div>
          <dt>Categoria administrativa</dt>
          <dd>{inst.categoriaAdministrativa}</dd>
        </div>
        <div>
          <dt>Tipo de rede</dt>
          <dd>{atributos?.rede ?? '—'}</dd>
        </div>
        <div>
          <dt>Organização acadêmica</dt>
          <dd>{atributos?.organizacaoAcademica ?? '—'}</dd>
        </div>
        <div>
          <dt>Modalidade ofertada</dt>
          <dd>
            {inst.modalidades.map((m, i) => (
              <span key={i} className={`badge-modalidade ${m.inativa ? 'badge-modalidade--inativa' : ''}`}>
                {m.tipo}{m.inativa ? ' (inativa)' : ''}
              </span>
            ))}
          </dd>
        </div>
        {inst.ead && (
          <>
            <div>
              <dt>EaD em Chapecó desde</dt>
              <dd>{inst.ead.inicio}{inst.ead.ultimoAno !== inst.ead.inicio ? ` até ${inst.ead.ultimoAno}` : ''}</dd>
            </div>
            <div>
              <dt>Status (EaD)</dt>
              <dd>{inst.ead.status}</dd>
            </div>
          </>
        )}
      </dl>
      <TabelaCursosIes nome={inst.nome} ano={ano} />
    </article>
  )
}

function PainelInstituicoes() {
  const instituicoes = useMemo(
    () => [...getInstituicoes()].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')),
    [],
  )
  const [busca, setBusca] = useState('')
  const [selecionadas, setSelecionadas] = useState<Set<string>>(new Set())
  const [ano, setAno] = useState(ANOS_CURSOS[ANOS_CURSOS.length - 1])

  const filtradas = instituicoes.filter((i) => i.nome.toLowerCase().includes(busca.toLowerCase()) || i.sigla?.toLowerCase().includes(busca.toLowerCase()))

  const alternar = (nome: string) => {
    const nova = new Set(selecionadas)
    if (nova.has(nome)) nova.delete(nome)
    else nova.add(nome)
    setSelecionadas(nova)
  }

  const escolhidas = instituicoes.filter((i) => selecionadas.has(i.nome))

  return (
    <>
      <p className="painel-intro">
        Selecione uma ou mais instituições e um ano para ver, por IES individual: cadastro (categoria
        administrativa, modalidade) e os cursos ofertados naquele ano, com vagas, inscritos, ingressantes,
        matriculados, concluintes, trancados e evadidos — Censo da Educação Superior (INEP), filtrado para o
        município de Chapecó/SC. Cobre {ANOS_CURSOS[0]}–{ANOS_CURSOS[ANOS_CURSOS.length - 1]}.
      </p>

      <div className="ies-busca">
        <input
          type="search"
          placeholder="Buscar por nome ou sigla…"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />
        <label className="ies-ano">
          <span>Ano</span>
          <select value={ano} onChange={(e) => setAno(Number(e.target.value))}>
            {[...ANOS_CURSOS].reverse().map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
        </label>
        <span className="ies-busca-contagem">{filtradas.length} de {instituicoes.length} instituições</span>
      </div>

      <div className="ies-lista">
        {filtradas.map((i) => (
          <label key={i.nome} className="ies-item">
            <input type="checkbox" checked={selecionadas.has(i.nome)} onChange={() => alternar(i.nome)} />
            <span className="ies-item-nome">{i.nome}</span>
            {i.sigla && <span className="ies-item-sigla">{i.sigla}</span>}
          </label>
        ))}
      </div>

      {escolhidas.length > 0 && (
        <section className="ies-fichas">
          <h2>{escolhidas.length === 1 ? 'Ficha da instituição' : `${escolhidas.length} instituições selecionadas`}</h2>
          <div className="ies-fichas-grade">
            {escolhidas.map((i) => <FichaInstituicao key={i.nome} inst={i} ano={ano} />)}
          </div>
        </section>
      )}
    </>
  )
}

export default function Painel() {
  const [aba, setAba] = useState<'indicadores' | 'instituicoes'>('indicadores')

  return (
    <main className="painel">
      <section className="painel-hero">
        <p className="sobretitulo">
          <span className="ponto" aria-hidden="true" />
          Painel interativo
        </p>
        <h1>Explore os dados da dissertação</h1>
      </section>

      <div className="painel-abas" role="tablist">
        <button type="button" role="tab" aria-selected={aba === 'indicadores'} onClick={() => setAba('indicadores')}>
          Indicadores
        </button>
        <button type="button" role="tab" aria-selected={aba === 'instituicoes'} onClick={() => setAba('instituicoes')}>
          Instituições
        </button>
      </div>

      {aba === 'indicadores' ? <PainelIndicadores /> : <PainelInstituicoes />}
    </main>
  )
}
