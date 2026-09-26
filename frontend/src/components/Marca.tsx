export function Marca() {
  return (
    <span className="marca-conteudo">
      <svg className="marca-icone" viewBox="0 0 64 64" aria-hidden="true">
        <rect width="64" height="64" rx="14" fill="currentColor" />
        <path d="M32 15 L54 25 L32 35 L10 25 Z" fill="var(--fundo)" />
        <path
          d="M20 30.5 V41 C20 44 25.5 47 32 47 C38.5 47 44 44 44 41 V30.5 L32 36 Z"
          fill="var(--fundo)"
          opacity="0.88"
        />
        <line x1="54" y1="25" x2="54" y2="39" stroke="var(--fundo)" strokeWidth="2.2" strokeLinecap="round" />
      </svg>
      <span className="marca-texto">
        <strong>Educação superior em Chapecó</strong>
        <small>Dissertação de mestrado · PPGE/UFFS</small>
      </span>
    </span>
  )
}
