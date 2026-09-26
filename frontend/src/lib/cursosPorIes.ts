import dados from '../data/cursos-por-ies.json'
import { chavesEquivalentes, foldNome } from './dw'

/**
 * Dados granulares (IES × Curso × Modalidade × Ano) para o painel de Instituições — fonte:
 * Dados/INEP.db (Censo da Educação Superior/INEP), filtrado para o município de Chapecó/SC
 * (código IBGE 4204202). Ver Dados/_converter_inep.py. Cobre 2004–2024, validado contra os
 * totais já publicados na dissertação (bate exatamente em 2014 e 2024).
 */
export type LinhaCurso = {
  ies: string
  sigla: string | null
  modalidade: string
  area: string | null
  curso: string
  ano: number
  vagas: number
  inscritos: number
  ingressantes: number
  matriculas: number
  concluintes: number
  trancados: number
  evadidos: number
  transferidos: number
  vagasDiurno: number
  vagasNoturno: number
  matriculasDiurno: number
  matriculasNoturno: number
  grauAcademico: string | null
}

/** Rótulo curto de turno, com base nas vagas (ou matrículas, se não houver vaga informada). Só faz sentido para cursos presenciais. */
export function turnoDaLinha(l: LinhaCurso): string {
  const diurno = l.vagasDiurno || l.matriculasDiurno
  const noturno = l.vagasNoturno || l.matriculasNoturno
  if (!diurno && !noturno) return '—'
  if (diurno && noturno) return 'Diurno e noturno'
  return diurno ? 'Diurno' : 'Noturno'
}

const TODAS: LinhaCurso[] = (dados as { linhas: LinhaCurso[] }).linhas
export const ANOS_CURSOS: number[] = (dados as { anos: number[] }).anos
export const FONTE_CURSOS: string = (dados as { fonte: string }).fonte

export type AtributosIes = { rede: string | null; organizacaoAcademica: string | null }
const ATRIBUTOS_IES: Record<string, AtributosIes> = (dados as { instituicoes: Record<string, AtributosIes> }).instituicoes

let indicePorIesFold: Map<string, LinhaCurso[]> | null = null
let indiceAtributosFold: Map<string, AtributosIes> | null = null

function getIndice(): Map<string, LinhaCurso[]> {
  if (!indicePorIesFold) {
    indicePorIesFold = new Map()
    for (const linha of TODAS) {
      const chave = foldNome(linha.ies)
      if (!indicePorIesFold.has(chave)) indicePorIesFold.set(chave, [])
      indicePorIesFold.get(chave)!.push(linha)
    }
  }
  return indicePorIesFold
}

function getIndiceAtributos(): Map<string, AtributosIes> {
  if (!indiceAtributosFold) {
    indiceAtributosFold = new Map()
    for (const [nome, atributos] of Object.entries(ATRIBUTOS_IES)) indiceAtributosFold.set(foldNome(nome), atributos)
  }
  return indiceAtributosFold
}

/** Rede (Pública/Privada) e organização acadêmica (Universidade, Centro Universitário...) da IES, via Censo INEP. */
export function getAtributosIes(nomeIes: string): AtributosIes | null {
  const indice = getIndiceAtributos()
  for (const chave of chavesEquivalentes(foldNome(nomeIes))) {
    const atributos = indice.get(chave)
    if (atributos) return atributos
  }
  return null
}

/** Cursos ofertados por uma IES (pelo nome do cadastro do site) num ano específico. */
export function getCursosDaIes(nomeIes: string, ano: number): LinhaCurso[] {
  const indice = getIndice()
  for (const chave of chavesEquivalentes(foldNome(nomeIes))) {
    const linhas = indice.get(chave)
    if (linhas) return linhas.filter((l) => l.ano === ano).sort((a, b) => a.curso.localeCompare(b.curso, 'pt-BR'))
  }
  return []
}

/** Se a IES tem dado nesta fonte em pelo menos um ano (para diferenciar "sem dado" de "zero no ano escolhido"). */
export function temDadosDeCursos(nomeIes: string): boolean {
  const indice = getIndice()
  return chavesEquivalentes(foldNome(nomeIes)).some((c) => indice.has(c))
}
