import { useState } from 'react'
import type { Grafico, Valor } from '../lib/types'

const CORES = ['#1d5c63', '#d08c3a', '#6b4c9a', '#4f8a3c', '#b8475a', '#3a78b8', '#8a7a3c', '#5c6470']
const num = (v: Valor) => (typeof v === 'number' ? v : Number(v ?? NaN))
const fmt = (v: Valor) => (typeof v === 'number' ? v.toLocaleString('pt-BR') : String(v ?? '–'))

// arredonda o topo do eixo para um valor "redondo" (1, 2, 2,5 ou 5 × 10^n)
function teto(v: number) {
  const p = Math.pow(10, Math.floor(Math.log10(v)))
  return ([1, 2, 2.5, 5, 10].find((m) => m * p >= v) ?? 10) * p
}

type Dica = { x: number; y: number; texto: string } | null

function Barras({ g, ocultas, setDica }: { g: Grafico; ocultas: Set<number>; setDica: (d: Dica) => void }) {
  const u = g.unidade ?? ''
  const grupo = g.grupos[0]
  const series = grupo.series.map((s, i) => ({ ...s, i })).filter((s) => !ocultas.has(s.i))
  const cats = grupo.series[0]?.categorias ?? []
  const horizontal = grupo.orientacao === 'horizontal'
  const empilhado = grupo.agrupamento === 'stacked' || grupo.agrupamento === 'percentStacked'
  const totais = cats.map((_, c) => series.reduce((a, s) => a + (num(s.valores[c]) || 0), 0))
  const max = teto(Math.max(1, ...(empilhado ? totais : series.flatMap((s) => s.valores.map((v) => num(v) || 0)))))
  const W = 640, H = horizontal ? Math.max(220, cats.length * Math.max(34, series.length * 9 + 10) + 40) : 300
  const m = horizontal ? { l: 50, r: 30, t: 10, b: 24 } : { l: 56, r: 10, t: 10, b: 30 }
  const iw = W - m.l - m.r, ih = H - m.t - m.b
  const banda = (horizontal ? ih : iw) / Math.max(1, cats.length)
  const larg = empilhado ? banda * 0.7 : (banda * 0.8) / Math.max(1, series.length)
  const escala = (v: number) => (v / max) * (horizontal ? iw : ih)

  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={g.rotulo?.texto ?? g.titulo_no_grafico ?? 'Gráfico'}>
      <g transform={`translate(${m.l},${m.t})`}>
        {[0, 0.25, 0.5, 0.75, 1].map((f) => {
          const p = f * (horizontal ? iw : ih)
          return horizontal ? (
            <g key={f}><line x1={p} x2={p} y1={0} y2={ih} className="grade" /><text x={p} y={ih + 16} className="eixo" textAnchor="middle">{fmt(Math.round(max * f * 100) / 100)}{u}</text></g>
          ) : (
            <g key={f}><line x1={0} x2={iw} y1={ih - p} y2={ih - p} className="grade" /><text x={-6} y={ih - p + 4} className="eixo" textAnchor="end">{fmt(Math.round(max * f * 100) / 100)}{u}</text></g>
          )
        })}
        {cats.map((cat, c) => {
          let acum = 0
          return (
            <g key={c}>
              {series.map((s, k) => {
                const v = num(s.valores[c]) || 0
                const len = escala(v)
                const off = empilhado ? escala(acum) : 0
                acum += v
                const pos = c * banda + (empilhado ? banda * 0.15 : banda * 0.1 + k * larg)
                const r = horizontal
                  ? { x: off, y: pos, width: len, height: larg }
                  : { x: pos, y: ih - off - len, width: larg, height: len }
                const texto = `${s.nome ? s.nome + ' · ' : ''}${fmt(cat)}: ${fmt(s.valores[c])}${u}`
                return (
                  <rect key={k} {...r} fill={CORES[s.i % CORES.length]} className="marca"
                    onMouseMove={(e) => setDica({ x: e.nativeEvent.offsetX, y: e.nativeEvent.offsetY, texto })}
                    onMouseLeave={() => setDica(null)}>
                    <title>{texto}</title>
                  </rect>
                )
              })}
              {horizontal ? (
                <text x={-6} y={c * banda + banda / 2 + 4} className="eixo" textAnchor="end">{fmt(cat)}</text>
              ) : (
                <text x={c * banda + banda / 2} y={ih + 16} className="eixo" textAnchor="middle">{fmt(cat)}</text>
              )}
            </g>
          )
        })}
      </g>
    </svg>
  )
}

function Linhas({ g, ocultas, setDica }: { g: Grafico; ocultas: Set<number>; setDica: (d: Dica) => void }) {
  const u = g.unidade ?? ''
  const grupo = g.grupos[0]
  const series = grupo.series.map((s, i) => ({ ...s, i })).filter((s) => !ocultas.has(s.i))
  const cats = grupo.series[0]?.categorias ?? []
  const max = teto(Math.max(1, ...series.flatMap((s) => s.valores.map((v) => num(v) || 0))))
  const W = 640, H = 300, m = { l: 56, r: 16, t: 10, b: 40 }
  const iw = W - m.l - m.r, ih = H - m.t - m.b
  const x = (c: number) => (cats.length > 1 ? (c / (cats.length - 1)) * iw : iw / 2)
  const y = (v: number) => ih - (v / max) * ih
  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={g.rotulo?.texto ?? 'Gráfico'}>
      <g transform={`translate(${m.l},${m.t})`}>
        {[0, 0.5, 1].map((f) => (
          <g key={f}><line x1={0} x2={iw} y1={ih - f * ih} y2={ih - f * ih} className="grade" /><text x={-6} y={ih - f * ih + 4} className="eixo" textAnchor="end">{fmt(Math.round(max * f * 100) / 100)}{u}</text></g>
        ))}
        {cats.map((c, i) => <text key={i} x={x(i)} y={ih + 16} className="eixo" textAnchor="middle">{fmt(c)}</text>)}
        {series.map((s) => (
          <g key={s.i} stroke={CORES[s.i % CORES.length]} fill={CORES[s.i % CORES.length]}>
            <polyline fill="none" strokeWidth={2} points={s.valores.map((v, i) => `${x(i)},${y(num(v) || 0)}`).join(' ')} />
            {s.valores.map((v, i) => {
              const texto = `${s.nome ? s.nome + ' · ' : ''}${fmt(cats[i])}: ${fmt(v)}${u}`
              return (
                <circle key={i} cx={x(i)} cy={y(num(v) || 0)} r={4} className="marca"
                  onMouseMove={(e) => setDica({ x: e.nativeEvent.offsetX, y: e.nativeEvent.offsetY, texto })}
                  onMouseLeave={() => setDica(null)}><title>{texto}</title></circle>
              )
            })}
          </g>
        ))}
      </g>
    </svg>
  )
}

function Pizza({ g, rosca, setDica }: { g: Grafico; rosca: boolean; setDica: (d: Dica) => void }) {
  const u = g.unidade ?? ''
  const s = g.grupos[0].series[0]
  const vals = s.valores.map((v) => Math.max(0, num(v) || 0))
  const total = vals.reduce((a, b) => a + b, 0) || 1
  const R = 120, r0 = rosca ? 60 : 0
  let ang = -Math.PI / 2
  const ponto = (a: number, r: number) => `${Math.cos(a) * r},${Math.sin(a) * r}`
  return (
    <svg viewBox="-150 -140 300 280" role="img" aria-label={g.rotulo?.texto ?? 'Gráfico'} className="pizza">
      {vals.map((v, i) => {
        const a0 = ang, a1 = ang + (v / total) * Math.PI * 2
        ang = a1
        const grande = a1 - a0 > Math.PI ? 1 : 0
        const d = `M${ponto(a0, R)} A${R},${R} 0 ${grande} 1 ${ponto(a1, R)} L${ponto(a1, r0)} ${r0 ? `A${r0},${r0} 0 ${grande} 0 ${ponto(a0, r0)}` : ''} Z`
        const texto = `${fmt(s.categorias[i])}: ${fmt(s.valores[i])}${u} (${((v / total) * 100).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%)`
        return (
          <path key={i} d={d} fill={CORES[i % CORES.length]} className="marca" stroke="#fff"
            onMouseMove={(e) => setDica({ x: e.nativeEvent.offsetX, y: e.nativeEvent.offsetY, texto })}
            onMouseLeave={() => setDica(null)}><title>{texto}</title></path>
        )
      })}
    </svg>
  )
}

function TabelaDados({ g }: { g: Grafico }) {
  const u = g.unidade ?? ''
  const grupo = g.grupos[0]
  const cats = grupo?.series[0]?.categorias ?? []
  return (
    <div className="tabela-wrap">
      <table>
        <thead><tr><th></th>{grupo?.series.map((s, i) => <th key={i}>{s.nome ?? `Série ${i + 1}`}</th>)}</tr></thead>
        <tbody>
          {cats.map((c, r) => (
            <tr key={r}><td>{fmt(c)}</td>{grupo.series.map((s, i) => <td key={i}>{fmt(s.valores[r])}{u}</td>)}</tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default function GraficoView({ g }: { g: Grafico }) {
  const [ocultas, setOcultas] = useState<Set<number>>(new Set())
  const [verDados, setVerDados] = useState(false)
  const [dica, setDica] = useState<Dica>(null)
  const grupo = g.grupos[0]
  if (!grupo) return <p className="aviso">Gráfico sem dados legíveis.</p>

  const pizza = grupo.tipo === 'pizza' || grupo.tipo === 'rosca'
  const suportado = ['barra', 'linha', 'area', 'pizza', 'rosca'].includes(grupo.tipo)
  const legenda = pizza
    ? grupo.series[0].categorias.map((c) => fmt(c))
    : grupo.series.map((s, i) => s.nome ?? `Série ${i + 1}`)
  const alternar = (i: number) => {
    const n = new Set(ocultas)
    if (n.has(i)) n.delete(i)
    else n.add(i)
    setOcultas(n)
  }

  return (
    <div className="grafico">
      <div className="grafico-area" onMouseLeave={() => setDica(null)}>
        {!suportado || verDados ? (
          <TabelaDados g={g} />
        ) : pizza ? (
          <Pizza g={g} rosca={grupo.tipo === 'rosca'} setDica={setDica} />
        ) : grupo.tipo === 'barra' ? (
          <Barras g={g} ocultas={ocultas} setDica={setDica} />
        ) : (
          <Linhas g={g} ocultas={ocultas} setDica={setDica} />
        )}
        {dica && !verDados && <div className="dica" style={{ left: dica.x + 12, top: dica.y + 12 }}>{dica.texto}</div>}
      </div>
      <div className="grafico-controles">
        <div className="legenda">
          {legenda.map((l, i) => (
            <button key={i} type="button" disabled={pizza} onClick={() => alternar(i)}
              className={ocultas.has(i) ? 'oculta' : ''}>
              <span style={{ background: CORES[i % CORES.length] }} />{l}
            </button>
          ))}
        </div>
        {suportado && (
          <button type="button" className="ver-dados" onClick={() => setVerDados(!verDados)}>
            {verDados ? 'Ver gráfico' : 'Ver dados'}
          </button>
        )}
      </div>
    </div>
  )
}
