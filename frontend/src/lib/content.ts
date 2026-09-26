import data from '../data/site-content.json'
import type { Grafico, Secao, SiteContent } from './types'

const site = data as unknown as SiteContent

export const meta = site.meta
export const capitulos: Secao[] = site.capitulos
export const preTextual = site.pre_textual

// Ordem de leitura: pré-textuais publicados (resumo, abstract, siglas) + capítulos + pós-textuais
export const paginas: Secao[] = [...preTextual, ...capitulos]

export function getCapitulo(slug: string | undefined): Secao | undefined {
  return paginas.find((c) => c.slug === slug)
}

export function vizinhos(slug: string) {
  const i = paginas.findIndex((c) => c.slug === slug)
  return { anterior: paginas[i - 1], proximo: paginas[i + 1] }
}

const notas = new Map((site.notas ?? []).map((n) => [n.numero, n.texto]))
export const getNota = (numero: number) => notas.get(numero) ?? ''

export const tituloCompleto = (s: Secao) => (s.numero ? `${s.numero} ${s.titulo}` : s.titulo)

export function getGrafico(id: string): Grafico | undefined {
  return site.graficos?.[id]
}
