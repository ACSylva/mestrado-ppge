import { getGrafico } from './content'
import type { Valor } from './types'

const num = (v: Valor) => (typeof v === 'number' ? v : Number(v ?? NaN))

export const fmtNum = (v: number) => Math.round(v).toLocaleString('pt-BR')
export const fmtPct = (v: number, casas = 1) =>
  v.toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas })

export type ExtremosSerie = {
  anoInicial: string
  anoFinal: string
  valorInicial: number
  valorFinal: number
  unidade?: string | null
}

/** Lê o primeiro e o último ponto de uma série de um gráfico já extraído da dissertação. */
export function extremos(graficoId: string, nomeSerie: string): ExtremosSerie | null {
  const g = getGrafico(graficoId)
  const s = g?.grupos[0]?.series.find((s) => s.nome === nomeSerie)
  if (!g || !s || s.valores.length === 0) return null
  const valores = s.valores.map(num)
  const categorias = s.categorias.map(String)
  return {
    anoInicial: categorias[0],
    anoFinal: categorias[categorias.length - 1],
    valorInicial: valores[0],
    valorFinal: valores[valores.length - 1],
    unidade: g.unidade,
  }
}

export function variacaoPct(e: ExtremosSerie): number | null {
  if (!e.valorInicial) return null
  return ((e.valorFinal - e.valorInicial) / Math.abs(e.valorInicial)) * 100
}

/** Especificação de um número em destaque dentro de um painel: qual gráfico/série ler e como rotular. */
export type StatSpec = {
  grafico: string
  serieNome: string
  rotulo: string
  /** Nome da série de meta do PNE no mesmo gráfico, quando existir (ex.: "Meta"). */
  metaSerieNome?: string
}

export type Painel = {
  id: string
  tema: string
  capituloSlug: string
  /** Leitura curta do que os dados deste painel mostram, com os números já verificados nos gráficos da dissertação. */
  achado: string
  stats: StatSpec[]
  /** Todos os gráficos (da dissertação) relacionados a este painel, exibidos ao expandir. */
  graficos: string[]
}

export type Kpi = { rotulo: string; valor: string; detalhe: string }

/** Os quatro números-síntese da dissertação, calculados a partir dos próprios gráficos extraídos (2014 → 2024). */
export function getKpis(): Kpi[] {
  const ies = extremos('grafico-01', 'Número de IES')
  const cursos = extremos('grafico-18', 'Total Cursos')
  const matPresencial = extremos('grafico-19', 'Matrículas Presencial')
  const matEad = extremos('grafico-19', 'Matrículas EaD')

  const kpis: Kpi[] = []
  if (ies) {
    const v = variacaoPct(ies)
    kpis.push({ rotulo: 'IES em Chapecó', valor: fmtNum(ies.valorFinal), detalhe: `${fmtNum(ies.valorInicial)} em ${ies.anoInicial} → +${fmtPct(v ?? 0, 0)}%` })
  }
  if (cursos) {
    const v = variacaoPct(cursos)
    kpis.push({ rotulo: 'Cursos de graduação', valor: fmtNum(cursos.valorFinal), detalhe: `${fmtNum(cursos.valorInicial)} em ${cursos.anoInicial} → +${fmtPct(v ?? 0, 0)}%` })
  }
  if (matPresencial && matEad) {
    const totalInicial = matPresencial.valorInicial + matEad.valorInicial
    const totalFinal = matPresencial.valorFinal + matEad.valorFinal
    const v = ((totalFinal - totalInicial) / totalInicial) * 100
    kpis.push({ rotulo: 'Matrículas totais', valor: fmtNum(totalFinal), detalhe: `${fmtNum(totalInicial)} em ${matPresencial.anoInicial} → +${fmtPct(v, 1)}%` })
    const partEad = (matEad.valorFinal / totalFinal) * 100
    kpis.push({ rotulo: 'Participação da EaD nas matrículas', valor: `${fmtPct(partEad, 1)}%`, detalhe: `em ${matEad.anoFinal} · era ${fmtPct((matEad.valorInicial / totalInicial) * 100, 1)}% em ${matEad.anoInicial}` })
  }
  return kpis
}

/** Linha do tempo institucional de Chapecó — Capítulo 3, que é histórico-narrativo e não tem gráficos com séries anuais. */
export type Marco = { ano: string; titulo: string; texto: string }

export const MARCOS_HISTORICOS: Marco[] = [
  {
    ano: '1970',
    titulo: 'Criação da Fundeste',
    texto:
      'Em 04 de julho de 1970, a Assembleia de criação da Fundação Universitária do Desenvolvimento do Oeste (Fundeste) é realizada em Chapecó — a primeira instituição de ensino superior da região.',
  },
  {
    ano: '1991',
    titulo: 'Unificação e criação da Unoesc',
    texto:
      'Fundeste, FEMARP e FUOC se unificam e, pela Lei nº 1.673/1991, dá-se origem à Universidade do Oeste de Santa Catarina (Unoesc), primeira universidade do Oeste catarinense.',
  },
  {
    ano: '1996',
    titulo: 'Credenciamento da Unoesc',
    texto: 'Em 14 de agosto de 1996, o Ministério da Educação expede o decreto de credenciamento da Unoesc.',
  },
  {
    ano: '2000',
    titulo: 'UDESC chega a Chapecó e reativação da Fundeste',
    texto:
      'A UDESC é autorizada a ofertar o curso de Pedagogia a distância em Chapecó; no mesmo ano tem início a reativação da Fundeste, primeiro passo para a criação da Unochapecó.',
  },
  {
    ano: '2002',
    titulo: 'Unoesc dá lugar à Unochapecó',
    texto:
      'A Fundeste é reativada e a Unoesc é transformada na Unochapecó; a sede da Reitoria da Unoesc migra para Joaçaba, interrompendo temporariamente a oferta de cursos próprios em Chapecó. A UDESC cria o Centro de Educação a Distância (Cead) e o Centro de Educação Superior do Oeste (CEO) na cidade.',
  },
  {
    ano: '2006',
    titulo: 'Chega o futuro IFSC',
    texto: 'Portaria de 24 de agosto de 2006 autoriza o funcionamento de uma unidade do CEFET (futuro IFSC) em Chapecó.',
  },
  {
    ano: '2008',
    titulo: 'CEFET vira Instituto Federal',
    texto: 'A Lei Federal nº 11.892/2008 transforma o CEFET local no IFSC – Campus Chapecó.',
  },
  {
    ano: '2009',
    titulo: 'UFFS chega a Chapecó e Unoesc retoma cursos próprios',
    texto:
      'Em 15 de setembro de 2009 é criada a Universidade Federal da Fronteira Sul (UFFS), com um de seus seis campi em Chapecó. No mesmo ano, a Unoesc retoma a oferta de cursos na cidade ao concluir a aquisição da Faculdade Exponencial (FIE).',
  },
  {
    ano: '2003+',
    titulo: 'Expansão do setor privado com fins lucrativos',
    texto:
      'A FAEM (atual UCEFF) é criada em 2003; nas décadas seguintes, novas faculdades privadas com fins lucrativos se instalam em Chapecó, movimento que se intensifica ainda mais a partir de meados dos anos 2010 com a chegada de grandes redes de ensino a distância.',
  },
]

export const PAINEIS: Painel[] = [
  {
    id: 'expansao-ies',
    tema: 'Expansão das instituições em Chapecó',
    capituloSlug: 'introducao',
    achado:
      'O número de instituições de educação superior atuando em Chapecó saltou de 18, em 2014, para 51, em 2024 — um crescimento de 183,3%, impulsionado sobretudo pela oferta a distância.',
    stats: [{ grafico: 'grafico-01', serieNome: 'Número de IES', rotulo: 'IES em Chapecó' }],
    graficos: ['grafico-01'],
  },
  {
    id: 'financiamento-brasil',
    tema: 'Financiamento estudantil no Brasil',
    capituloSlug: 'as-politicas-e-as-dinamicas-da-educacao-superior-no-brasil-analise-do-plano-naci',
    achado:
      'Entre 2014 e 2024, o FIES ampliou em 62% o número de ingressantes financiados no Brasil e o número de cotistas quase dobrou (+96,7%), enquanto o ProUni recuou 14% no período.',
    stats: [
      { grafico: 'grafico-02', serieNome: 'Total de ingressantes com financiamento do FIES', rotulo: 'Ingressantes com FIES' },
      { grafico: 'grafico-03', serieNome: 'Total de ingressantes pelo financiamento do ProUni', rotulo: 'Ingressantes com ProUni' },
      { grafico: 'grafico-04', serieNome: 'Total de ingressantes cotistas', rotulo: 'Ingressantes cotistas' },
    ],
    graficos: ['grafico-02', 'grafico-03', 'grafico-04'],
  },
  {
    id: 'metas-pne-acesso',
    tema: 'Metas do PNE: acesso e trajetória',
    capituloSlug: 'as-politicas-e-as-dinamicas-da-educacao-superior-no-brasil-analise-do-plano-naci',
    achado:
      'Nenhuma das metas de acesso do PNE 2014-2024 foi plenamente alcançada no Brasil: a taxa líquida de matrículas chegou a 27,1% (meta de 33%) e a participação de matrículas em IES públicas caiu para 5,3%, bem distante da meta de 40%.',
    stats: [
      { grafico: 'grafico-05', serieNome: 'Taxa Bruta de matrículas na graduação', rotulo: 'Taxa bruta de matrículas', metaSerieNome: 'Meta' },
      { grafico: 'grafico-06', serieNome: 'Taxa líquida de matrículas', rotulo: 'Taxa líquida de matrículas', metaSerieNome: 'Meta' },
      { grafico: 'grafico-07', serieNome: 'Matrículas públicas', rotulo: 'Matrículas em IES públicas', metaSerieNome: 'Meta' },
    ],
    graficos: ['grafico-05', 'grafico-06', 'grafico-07'],
  },
  {
    id: 'metas-pne-docencia',
    tema: 'Metas do PNE: qualificação docente e pós-graduação',
    capituloSlug: 'as-politicas-e-as-dinamicas-da-educacao-superior-no-brasil-analise-do-plano-naci',
    achado:
      'Ao contrário das metas de acesso, as metas de qualificação docente e pós-graduação do PNE foram superadas no Brasil: em 2024, 84,8% dos docentes tinham mestrado ou doutorado (meta de 75%) e 53,9% possuíam doutorado (meta de 35%).',
    stats: [
      { grafico: 'grafico-08', serieNome: 'Docentes com Mestrado e Doutorado', rotulo: 'Docentes com mestrado/doutorado', metaSerieNome: 'Meta' },
      { grafico: 'grafico-09', serieNome: 'Docentes com Doutorado', rotulo: 'Docentes com doutorado', metaSerieNome: 'Meta' },
      { grafico: 'grafico-10', serieNome: 'Número de Títulos de Mestrado Concedidos', rotulo: 'Títulos de mestrado/ano', metaSerieNome: 'Meta' },
      { grafico: 'grafico-11', serieNome: 'Número de Títulos de Doutorado Concedidos', rotulo: 'Títulos de doutorado/ano', metaSerieNome: 'Meta' },
    ],
    graficos: ['grafico-08', 'grafico-09', 'grafico-10', 'grafico-11'],
  },
  {
    id: 'perfil-institucional-chapeco',
    tema: 'Perfil institucional das IES em Chapecó',
    capituloSlug: 'a-educacao-superior-em-chapeco-periodo-de-vigencia-do-pne-2014-2024',
    achado:
      'A expansão em Chapecó foi liderada pelo setor privado com fins lucrativos (de 4 para 35 IES) e pela modalidade EaD (de 10 para 45 IES); a rede pública se manteve praticamente estável.',
    stats: [
      { grafico: 'grafico-12', serieNome: 'Privadas com fins lucrativos', rotulo: 'IES privadas com fins lucrativos' },
      { grafico: 'grafico-13', serieNome: 'Centros', rotulo: 'IES do tipo Centro universitário' },
      { grafico: 'grafico-14', serieNome: 'EaD', rotulo: 'IES ofertando EaD' },
    ],
    graficos: ['grafico-12', 'grafico-13', 'grafico-14'],
  },
  {
    id: 'oferta-cursos-chapeco',
    tema: 'Oferta de cursos de graduação em Chapecó',
    capituloSlug: 'a-educacao-superior-em-chapeco-periodo-de-vigencia-do-pne-2014-2024',
    achado:
      'O número de cursos de graduação em Chapecó saltou de 217 para 1.365 entre 2014 e 2024 (+529%), crescimento concentrado quase que exclusivamente na modalidade EaD (de 119 para 1.255 cursos) e nas instituições privadas com fins lucrativos.',
    stats: [
      { grafico: 'grafico-18', serieNome: 'Total Cursos', rotulo: 'Total de cursos de graduação' },
      { grafico: 'grafico-16', serieNome: 'Privada', rotulo: 'Cursos em IES privadas' },
      { grafico: 'grafico-15', serieNome: 'Tecnológico', rotulo: 'Cursos tecnológicos' },
    ],
    graficos: ['grafico-15', 'grafico-16', 'grafico-17', 'grafico-18'],
  },
  {
    id: 'fluxo-modalidade',
    tema: 'Matrículas, ingressantes e concluintes por modalidade',
    capituloSlug: 'a-educacao-superior-em-chapeco-periodo-de-vigencia-do-pne-2014-2024',
    achado:
      'O total de matrículas cresceu 49,5% na década, mas o crescimento foi puxado pela EaD: as matrículas nessa modalidade aumentaram 264%, os ingressantes 374% e os concluintes 146%, enquanto o presencial se manteve praticamente estável.',
    stats: [
      { grafico: 'grafico-19', serieNome: 'Matrículas EaD', rotulo: 'Matrículas EaD' },
      { grafico: 'grafico-20', serieNome: 'Ingressos EaD', rotulo: 'Ingressantes EaD' },
      { grafico: 'grafico-21', serieNome: 'Concluintes EaD', rotulo: 'Concluintes EaD' },
    ],
    graficos: ['grafico-19', 'grafico-20', 'grafico-21'],
  },
  {
    id: 'fluxo-categoria',
    tema: 'Matrículas, ingressantes e concluintes por categoria administrativa',
    capituloSlug: 'a-educacao-superior-em-chapeco-periodo-de-vigencia-do-pne-2014-2024',
    achado:
      'As instituições privadas sem fins lucrativos tiveram o salto mais expressivo em matrículas — de 599 para 11.356, quase 19 vezes mais — enquanto as matrículas em instituições federais recuaram levemente no período.',
    stats: [
      { grafico: 'grafico-22', serieNome: 'Matrículas Privada sem fins lucrativos', rotulo: 'Matrículas em privadas sem fins lucrativos' },
      { grafico: 'grafico-22', serieNome: 'Matrículas Privada com fins lucrativos', rotulo: 'Matrículas em privadas com fins lucrativos' },
      { grafico: 'grafico-22', serieNome: 'Matrículas Federal', rotulo: 'Matrículas em IES federais' },
    ],
    graficos: ['grafico-22', 'grafico-23', 'grafico-24'],
  },
  {
    id: 'genero',
    tema: 'Educação superior por gênero em Chapecó',
    capituloSlug: 'a-educacao-superior-em-chapeco-periodo-de-vigencia-do-pne-2014-2024',
    achado:
      'As mulheres são maioria em todas as etapas da trajetória acadêmica em Chapecó e ampliaram sua vantagem: as matrículas femininas cresceram 61% na década, contra 34% entre os homens.',
    stats: [
      { grafico: 'grafico-25', serieNome: 'Matrículas Feminino', rotulo: 'Matrículas femininas' },
      { grafico: 'grafico-25', serieNome: 'Matrículas Masculino', rotulo: 'Matrículas masculinas' },
      { grafico: 'grafico-27', serieNome: 'Concluintes Feminino', rotulo: 'Concluintes femininas' },
    ],
    graficos: ['grafico-25', 'grafico-26', 'grafico-27'],
  },
  {
    id: 'financiamento-chapeco',
    tema: 'Financiamento estudantil em Chapecó',
    capituloSlug: 'a-educacao-superior-em-chapeco-periodo-de-vigencia-do-pne-2014-2024',
    achado:
      'Em Chapecó, o FIES seguiu como o principal programa de financiamento estudantil, o ProUni cresceu 72% e o apoio social institucional caiu 68% desde 2014.',
    stats: [
      { grafico: 'grafico-28', serieNome: 'FIES', rotulo: 'Matrículas com FIES' },
      { grafico: 'grafico-28', serieNome: 'PROUNI', rotulo: 'Matrículas com ProUni' },
      { grafico: 'grafico-28', serieNome: 'APOIO SOCIAL', rotulo: 'Matrículas com apoio social' },
    ],
    graficos: ['grafico-28'],
  },
]
