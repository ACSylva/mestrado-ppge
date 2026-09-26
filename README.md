# A educação superior no município de Chapecó - SC

Site estático com o texto da dissertação de Ana Cristina (2025).

## Atualizar o conteúdo (local, não roda no CI)

```bash
cd content_export
pip install -r requirements.txt
python extract_docx.py ../docs/dissertacao.docx --relatorio   # conferir estilos e padrões
python extract_docx.py ../docs/dissertacao.docx               # gera output/conteudo.json + output/media
python export_static_site.py                                  # congela em frontend/src/data + public/assets
```

`regras.json` liga os padrões especiais (citação longa, epígrafe, "(a) Título:")
só depois de conferidos no relatório. Enquanto desligados, viram parágrafo comum.

## Rodar o site (Windows 11)

1. Instale o Node.js LTS (20 ou mais novo): https://nodejs.org
2. Abra o terminal (PowerShell) na pasta do projeto e rode:

```powershell
cd frontend
npm install      # só na primeira vez
npm run dev      # abre em http://localhost:5173
```

Para gerar a versão final (a que vai para o GitHub Pages): `npm run build` (sai em `frontend/dist`)
e `npm run preview` para ver essa versão.

Python só é necessário para atualizar o conteúdo a partir do Word (seção abaixo).
No Windows use `py` no lugar de `python` se `python` não for reconhecido.

## Publicação

`.github/workflows/deploy.yml` faz build + deploy no GitHub Pages quando o
repositório remoto existir. Ainda não há remoto configurado.
