import { meta } from '../lib/content'

export function Rodape() {
  return (
    <footer className="rodape">
      <div className="rodape-conteudo">
        <p>
          <strong>{meta.instituicao}</strong>
          <br />
          {meta.programa}
          {meta.linha && <> · Linha de pesquisa: {meta.linha}</>}
        </p>
        <p className="rodape-nota">
          Landing page produzida a partir da dissertação de {meta.autora} ({meta.ano}). Conteúdo acadêmico
          disponibilizado para fins de divulgação e consulta.
        </p>
      </div>
    </footer>
  )
}
