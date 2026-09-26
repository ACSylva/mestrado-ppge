import { paginas } from './content'
import type { Bloco, Celula, Secao } from './types'

/**
 * "Data warehouse" leve, construído em cima das tabelas já extraídas nos apêndices da dissertação
 * (Apêndice A — instituições, B — cursos, C — discentes). Cada linha de tabela é achatada num fato
 * {medida, dimensão, categoria, ano, valor}, que os painéis filtram e cruzam em tempo real.
 *
 * Limitações herdadas da fonte: não há "vagas" tabulada (só aparece em texto corrido), não há
 * quebra por IES individual para os dados de discentes, e cada tabela cruza uma única dimensão
 * por vez com o ano — não é possível cruzar duas dimensões simultaneamente (ex.: gênero × rede).
 */

export type Fonte = 'discentes' | 'ies' | 'cursos'
export type Fato = { fonte: Fonte; medida: string; dimensao: string | null; categoria: string | null; ano: string; valor: number }

const norm = (s: string) => s.replace(/\s+/g, ' ').trim()

// A extração da tabela original quebrou "Trancados" em duas linhas em um dos blocos.
const CORRECOES_MEDIDA: Record<string, string> = { 'Tranca dos': 'Trancados' }

function num(s: string | undefined): number | null {
  if (!s) return null
  const t = s.trim()
  if (!t || t === 'X' || t === '-') return null
  const n = Number(t.replace(/\./g, '').replace(',', '.'))
  return Number.isFinite(n) ? n : null
}

/** Busca uma seção (ou subseção, em qualquer profundidade) pelo slug. */
function encontrarSecao(slug: string): Secao | null {
  const buscar = (s: Secao): Secao | null => {
    if (s.slug === slug) return s
    for (const filha of s.secoes) {
      const achada = buscar(filha)
      if (achada) return achada
    }
    return null
  }
  for (const p of paginas) {
    const achada = buscar(p)
    if (achada) return achada
  }
  return null
}

function getTabelas(slug: string): Celula[][][] {
  const sec = encontrarSecao(slug)
  return (sec?.blocos ?? []).filter((b): b is Extract<Bloco, { tipo: 'tabela' }> => b.tipo === 'tabela').map((b) => b.linhas)
}

function getTabela(slug: string, indice = 0): Celula[][] | null {
  return getTabelas(slug)[indice] ?? null
}

// ---- Apêndice C: discentes (uma tabela por dimensão; sem quebra na primeira) ----
const TITULOS_DISCENTES: Record<string, string | null> = {
  'Discentes Global': null,
  'Discentes Por Grau Acadêmico': 'Grau Acadêmico',
  'Discentes Por Modalidade': 'Modalidade',
  'Discentes Por Gênero': 'Gênero',
  'Discentes Por Rede': 'Rede',
  'Discentes por Categoria Administrativa': 'Categoria Administrativa',
  'Discentes Por Raça e Cor': 'Raça e Cor',
  'Discentes por Política Afirmativa': 'Política Afirmativa',
  'Discentes por Política de Financiamento': 'Política de Financiamento',
}

function parseDiscentes(): Fato[] {
  const cap = paginas.find((p) => p.slug === 'apendice-c-dados-dos-discentes')
  const tabelas = (cap?.blocos ?? []).filter((b): b is Extract<Bloco, { tipo: 'tabela' }> => b.tipo === 'tabela')
  const fatos: Fato[] = []
  for (const t of tabelas) {
    const titulo = norm(t.linhas[0][0].t)
    if (!(titulo in TITULOS_DISCENTES)) continue
    const dimensao = TITULOS_DISCENTES[titulo]
    const anos = t.linhas[0].slice(1).map((c) => c.t.trim())
    let medidaAtual = ''
    for (const linha of t.linhas.slice(1)) {
      const cells = linha.map((c) => norm(c.t))
      if (cells.every((c) => !c)) continue
      const comDimensao = cells.length === anos.length + 2
      let idx = 0
      const medidaCel = cells[idx++]
      if (medidaCel) medidaAtual = CORRECOES_MEDIDA[medidaCel] ?? medidaCel
      const categoria = comDimensao ? cells[idx++] : null
      const valores = cells.slice(idx)
      anos.forEach((ano, i) => {
        const valor = num(valores[i])
        if (valor != null) fatos.push({ fonte: 'discentes', medida: medidaAtual, dimensao, categoria, ano, valor })
      })
    }
  }
  return fatos
}

// ---- Apêndice A (IES) e B (Cursos): uma única tabela grande, em blocos delimitados por
// sub-cabeçalhos no formato "Título do bloco | 2014 | 2015 | ... | 2024" ----
function parseEmBlocos(
  linhas: Celula[][],
  medidaPadrao: string,
  mapaDimensao: Record<string, string | null | 'IGNORAR'>,
): Fato[] {
  const fatos: Fato[] = []
  let anos: string[] | null = null
  let dimensaoAtual: string | null | 'IGNORAR' = 'IGNORAR'
  for (const linha of linhas) {
    const cells = linha.map((c) => norm(c.t))
    if (cells.every((c) => !c)) continue
    if (cells[1] === '2014') {
      const titulo = cells[0]
      dimensaoAtual = titulo in mapaDimensao ? mapaDimensao[titulo] : 'IGNORAR'
      anos = cells.slice(1)
      continue
    }
    if (!anos || dimensaoAtual === 'IGNORAR') continue
    const rotulo = cells[0]
    // Dentro de um bloco com quebra por categoria, uma linha "Total" é apenas a soma de conferência
    // da própria tabela-fonte, não uma categoria — mas no bloco "sem quebra" o rótulo da própria
    // medida pode começar com "Total" (ex.: "Total Cursos"), então só filtramos no primeiro caso.
    if (dimensaoAtual !== null && /^total/i.test(rotulo)) continue
    const valores = cells.slice(1)
    if (dimensaoAtual === null) {
      // No bloco "sem quebra" o próprio rótulo da linha (ex.: "Nº de IES", "Total Cursos") já é a
      // medida — mas padronizamos para medidaPadrao, para casar com o nome usado nos demais blocos.
      anos.forEach((ano, i) => {
        const valor = num(valores[i])
        if (valor != null) fatos.push({ fonte: 'ies', medida: medidaPadrao, dimensao: null, categoria: null, ano, valor })
      })
    } else {
      anos.forEach((ano, i) => {
        const valor = num(valores[i])
        if (valor != null) fatos.push({ fonte: 'ies', medida: medidaPadrao, dimensao: dimensaoAtual as string, categoria: rotulo, ano, valor })
      })
    }
  }
  return fatos
}

function parseIes(): Fato[] {
  const linhas = getTabela('apendice-a-dados-das-instituicoes-de-educacao-superior')
  if (!linhas) return []
  const mapa: Record<string, string | null | 'IGNORAR'> = {
    'Total': null, // bloco inicial "sem quebra": Nº de IES total por ano
    'Total por Categoria': 'Categoria Administrativa',
    'Total por Organização Acadêmica': 'Organização Acadêmica',
    'Total por Modalidade': 'Modalidade',
    'IES EaD e Presencial': 'IGNORAR', // listagem nominal (X/vazio), não é contagem por categoria
  }
  return parseEmBlocos(linhas, 'Nº de IES', mapa).map((f) => ({ ...f, fonte: 'ies' as const }))
}

function parseCursos(): Fato[] {
  const linhas = getTabela('apendice-b-dados-dos-cursos')
  if (!linhas) return []
  const mapa: Record<string, string | null | 'IGNORAR'> = {
    'Geral': null, // bloco inicial "sem quebra": Total de cursos por ano
    'Cursos Por Nível': 'Grau Acadêmico',
    'Cursos Por Rede': 'Rede',
    'Cursos Por Categoria': 'Categoria Administrativa',
    'Cursos Por Modalidade': 'Modalidade',
    'Cursos Por Área – Global': 'Área (todas as modalidades)',
    'Cursos Por Área – Presencial': 'Área (Presencial)',
    'Cursos Por Área – EaD': 'Área (EaD)',
    'Cursos por Área e Tipo de Rede Pública': 'IGNORAR',
    'Cursos por Área e Tipo de Rede Privada': 'IGNORAR',
  }
  const fatos = parseEmBlocos(linhas, 'Nº de Cursos', mapa).map((f) => ({ ...f, fonte: 'cursos' as const }))
  // as sub-tabelas "Cursos em <Área>" (linhas soltas Presencial/EaD sem cabeçalho "2014") repetem
  // dados já cobertos pelos blocos de Área acima e são ignoradas pelo parser genérico.
  return fatos
}

// ---- "As áreas dos cursos de graduação": os 10 cursos (pelo nome) com mais matrículas,
// separados por modalidade — a granularidade mais fina disponível: o próprio curso. ----
function parseCursosPorNome(): Fato[] {
  const tabelas = getTabelas('as-areas-dos-cursos-de-graduacao')
  const rotulosModalidade = ['Curso (Top 10 – Presencial)', 'Curso (Top 10 – EaD)']
  const fatos: Fato[] = []
  tabelas.forEach((linhas, i) => {
    const dimensao = rotulosModalidade[i]
    if (!dimensao || linhas.length < 2) return
    const anos = linhas[1].slice(1).map((c) => c.t.trim())
    for (const linha of linhas.slice(2)) {
      const cells = linha.map((c) => norm(c.t))
      if (cells.every((c) => !c)) continue
      const categoria = cells[0]
      const valores = cells.slice(1)
      anos.forEach((ano, j) => {
        const valor = num(valores[j])
        if (valor != null) fatos.push({ fonte: 'discentes', medida: 'Matrículas', dimensao, categoria, ano, valor })
      })
    }
  })
  return fatos
}

let cache: Fato[] | null = null

export function getFatos(): Fato[] {
  if (!cache) cache = [...parseDiscentes(), ...parseCursosPorNome(), ...parseIes(), ...parseCursos()]
  return cache
}

// ---- Cadastro de instituições (perfil, não série histórica) ----
// Fonte: seção "Natureza administrativa" (cadastro com categoria/modalidade) cruzada com a tabela
// de "Expansão das EaD em Chapecó" (início, status e 1 retrato de matrículas EaD em 2024).
export type Instituicao = {
  nome: string
  sigla: string | null
  categoriaAdministrativa: string
  modalidades: { tipo: string; inativa: boolean }[]
  ead: { inicio: string; ultimoAno: string; status: string; matriculas: number } | null
}

export const foldNome = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[–\-.,]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

// A extração do texto original tem alguns erros de digitação nos nomes das IES entre as diferentes
// tabelas/planilhas (ex.: "Estácio" ↔ "Estádio"); esses pares fazem o cruzamento funcionar mesmo assim.
export const ALIAS_NOME: Record<string, string> = {
  [foldNome('Centro Universitário Estácio de Brasília – Estácio Brasília')]: foldNome('Centro Universitário Estádio de Brasília – Estácio Brasília'),
  [foldNome('Universidade Estácio de Sá')]: foldNome('Universidade Estágio de Sá'),
  [foldNome('Universidade Anhembi Morumbi')]: foldNome('Universidade Anhambi Morumbi'),
  [foldNome('Fundação Universidade do Estado de Santa Catarina')]: foldNome('Universidade do Estado de Santa Catarina'),
  [foldNome('Centro Universitário SENAI Blumenau')]: foldNome('Centro Universitário SENAI Santa Catarina'),
  [foldNome('Faculdade Pitágoras Unopar de Chapecó')]: foldNome('Faculdade Pitágoras Unopar Chapecó'),
}

/** Todas as grafias equivalentes a uma chave (ela mesma + os dois lados do alias, se houver). */
export function chavesEquivalentes(chave: string): string[] {
  const chaves = new Set([chave])
  if (ALIAS_NOME[chave]) chaves.add(ALIAS_NOME[chave])
  for (const [a, b] of Object.entries(ALIAS_NOME)) if (b === chave) chaves.add(a)
  return [...chaves]
}

let cacheInstituicoes: Instituicao[] | null = null

export function getInstituicoes(): Instituicao[] {
  if (cacheInstituicoes) return cacheInstituicoes

  const linhasRoster = getTabela('natureza-administrativa') ?? []
  const instituicoes: Instituicao[] = []
  for (const linha of linhasRoster.slice(1)) {
    const cells = linha.map((c) => norm(c.t))
    const [nome, siglaCel, categoria, modalidadeCel] = cells
    if (!siglaCel && !categoria && !modalidadeCel) continue // linha de cabeçalho de grupo (só o nome)
    const modalidades = (modalidadeCel ?? '')
      .split('\n')
      .map((m) => m.trim())
      .filter(Boolean)
      .map((m) => ({ tipo: m.replace(/\(.*?\)/g, '').trim(), inativa: /inativa/i.test(m) }))
    instituicoes.push({
      nome,
      sigla: siglaCel === '*-' || siglaCel === '*_' ? null : siglaCel,
      categoriaAdministrativa: categoria,
      modalidades,
      ead: null,
    })
  }

  const linhasEad = getTabela('a-expansao-das-ead-no-municipio-de-chapeco') ?? []
  const eadPorNomeFold = new Map<string, { inicio: string; ultimoAno: string; status: string; matriculas: number }>()
  for (const linha of linhasEad.slice(1)) {
    const cells = linha.map((c) => norm(c.t))
    const [nome, , inicio, ultimoAno, status, matriculasCel] = cells
    if (!nome || /^total/i.test(nome)) continue
    eadPorNomeFold.set(foldNome(nome), { inicio, ultimoAno, status, matriculas: num(matriculasCel) ?? 0 })
  }

  for (const inst of instituicoes) {
    const chave = foldNome(inst.nome)
    inst.ead = eadPorNomeFold.get(chave) ?? eadPorNomeFold.get(ALIAS_NOME[chave] ?? '') ?? null
  }

  cacheInstituicoes = instituicoes
  return instituicoes
}

export const ANOS = Array.from({ length: 11 }, (_, i) => String(2014 + i))

export const ROTULO_GRUPO: Record<Fonte, string> = {
  discentes: 'Discentes',
  cursos: 'Cursos de graduação',
  ies: 'Instituições (IES)',
}

export type MedidaInfo = { valor: string; grupo: string }

/**
 * Todas as medidas disponíveis, de todas as fontes juntas — cada medida pertence a uma única fonte
 * (nomes nunca colidem entre discentes/cursos/IES), então não há razão para o filtro de "fonte de
 * dados" restringir a lista de medidas visíveis: a própria medida já deixa claro do que se trata.
 */
export function getMedidas(): MedidaInfo[] {
  const ordem = ['Inscritos', 'Ingressos', 'Matrículas', 'Concluintes', 'Trancados', 'Transferidos', 'Evadidos', 'Nº de Cursos', 'Nº de IES']
  const porMedida = new Map<string, Fonte>()
  for (const f of getFatos()) if (!porMedida.has(f.medida)) porMedida.set(f.medida, f.fonte)
  const nomes = [...porMedida.keys()].sort((a, b) => {
    const ia = ordem.indexOf(a), ib = ordem.indexOf(b)
    return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib)
  })
  return nomes.map((valor) => ({ valor, grupo: ROTULO_GRUPO[porMedida.get(valor)!] }))
}

/** Dimensões com dados para a medida escolhida (ex.: "Curso específico" só existe para Matrículas). */
export function dimensoesPorMedida(medida: string): string[] {
  const set = new Set(getFatos().filter((f) => f.medida === medida && f.dimensao).map((f) => f.dimensao as string))
  return [...set]
}

export function consultar(opts: { medida: string; dimensao: string | null; anoDe: string; anoAte: string }): Fato[] {
  const { medida, dimensao, anoDe, anoAte } = opts
  return getFatos().filter((f) => f.medida === medida && f.dimensao === dimensao && f.ano >= anoDe && f.ano <= anoAte)
}
