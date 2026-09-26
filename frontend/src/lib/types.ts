export type Segmento =
  | { t: string; b?: boolean; i?: boolean; va?: 'sup' | 'sub' }
  | { br: true }
  | { nota: number }

export type BlocoTexto = {
  tipo: 'paragrafo' | 'citacao-longa' | 'epigrafe' | 'epigrafe-autor' | 'legenda' | 'centralizado'
  segmentos: Segmento[]
  lista_nivel?: number
}
export type Rotulo = { tipo: string; numero: number; titulo: string; texto: string }
type Legendado = { rotulo?: Rotulo; fonte?: string[] }

export type Celula = { t: string; colspan?: number }
export type BlocoTabela = { tipo: 'tabela'; linhas: Celula[][] } & Legendado
export type BlocoImagem = { tipo: 'imagem'; arquivo: string; src: string; formato: string; grafico_id?: string } & Legendado
export type BlocoGrafico = { tipo: 'grafico'; id: string; tipo_grafico: string | null } & Legendado
export type BlocoSigla = { tipo: 'sigla'; sigla: string; significado: string }
export type Bloco = BlocoTexto | BlocoTabela | BlocoImagem | BlocoGrafico | BlocoSigla

export type Valor = string | number | null
export type Serie = { nome: string | null; categorias: Valor[]; valores: Valor[]; formato?: string }
export type Grafico = {
  id: string
  rotulo: Rotulo | null
  fonte: string[] | null
  capitulo: string | null
  tipo: string | null
  titulo_no_grafico: string | null
  eixos: string[]
  grupos: { tipo: string; orientacao?: 'horizontal' | 'vertical'; agrupamento?: string; series: Serie[] }[]
  linhas: { serie: string | null; categoria: Valor; valor: Valor }[]
  unidade?: string | null
  origem?: 'transcrito_da_imagem'
  status?: string
  observacoes?: string[]
  imagem?: string
}

export type Secao = {
  nivel: number
  titulo: string
  slug: string
  blocos: Bloco[]
  secoes: Secao[]
  numero?: string | null
  id?: string
}

export type SiteContent = {
  meta: {
    titulo: string
    autora: string
    ano: number
    programa: string
    instituicao: string | null
    linha?: string
    orientador?: string
    defesa?: string
    fonte: string | null
    extraido_em: string | null
  }
  pre_textual: Secao[]
  capitulos: Secao[]
  graficos?: Record<string, Grafico>
  notas?: { numero: number; texto: string }[]
}
