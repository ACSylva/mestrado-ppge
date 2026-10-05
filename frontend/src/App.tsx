import { NavLink, Route, Routes } from 'react-router-dom'
import { capitulos } from './lib/content'
import { Marca } from './components/Marca'
import { Rodape } from './components/Rodape'
import Inicio from './pages/Inicio'
import GenericChapterPage from './pages/GenericChapterPage'
import Pesquisa from './pages/Pesquisa'
import Painel from './pages/Painel'
import ProducaoAcademica from './pages/ProducaoAcademica'

export default function App() {
  const primeiro = capitulos[0]
  return (
    <>
      <header className="topo">
        <NavLink to="/" className="marca">
          <Marca />
        </NavLink>
        <nav>
          <NavLink to="/" end>Início</NavLink>
          {primeiro && <NavLink to={`/dissertacao/${primeiro.slug}`}>Dissertação</NavLink>}
          <NavLink to="/pesquisa">Pesquisa</NavLink>
          <NavLink to="/painel">Painel</NavLink>
          <NavLink to="/producao-academica">Produção Acadêmica</NavLink>
        </nav>
      </header>
      <Routes>
        <Route path="/" element={<Inicio />} />
        <Route path="/dissertacao/:slug" element={<GenericChapterPage />} />
        <Route path="/pesquisa" element={<Pesquisa />} />
        <Route path="/painel" element={<Painel />} />
        <Route path="/producao-academica" element={<ProducaoAcademica />} />
        <Route path="*" element={<Inicio />} />
      </Routes>
      <Rodape />
    </>
  )
}
