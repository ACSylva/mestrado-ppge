export interface ForumTopico {
  slug: string
  titulo: string
  descricao: string
}

// Tópicos do Fórum de Discussões — curados a partir dos principais eixos da dissertação.
// Cada slug define a URL (/forum/:slug) e a chave correspondente em forum_perguntas.json.
const topicos: ForumTopico[] = [
  {
    slug: 'expansao-do-ensino-superior-em-chapeco',
    titulo: 'Expansão do ensino superior em Chapecó (2014–2024)',
    descricao:
      'O que explica o crescimento das matrículas e da oferta de vagas na última década? ' +
      'Compartilhe leituras, dúvidas ou dados sobre a evolução da Taxa Bruta e da Taxa Líquida de Matrícula no município.',
  },
  {
    slug: 'ead-e-a-formacao-superior',
    titulo: 'EaD: acesso ampliado ou formação fragilizada?',
    descricao:
      'A expansão acelerada da Educação a Distância muda a qualidade da formação oferecida? ' +
      'Um espaço para debater experiências, vantagens e limites do ensino a distância na região.',
  },
  {
    slug: 'publico-e-privado-no-ensino-superior',
    titulo: 'Público e privado: FUNDESTE, UFFS, Unoesc e o setor privado',
    descricao:
      'Da fundação da FUNDESTE (hoje Unochapecó) à chegada da UFFS e do Unoesc, como se equilibram ' +
      'as instituições públicas e privadas na oferta de ensino superior em Chapecó?',
  },
  {
    slug: 'politicas-de-acesso-e-permanencia',
    titulo: 'Políticas de acesso e permanência (FIES, Prouni, PNAES)',
    descricao:
      'Qual o papel de programas como FIES, Prouni e PNAES na democratização do acesso à educação ' +
      'superior? Compartilhe experiências ou dúvidas sobre essas políticas.',
  },
  {
    slug: 'duvidas-sobre-a-pesquisa',
    titulo: 'Dúvidas sobre a pesquisa e os dados',
    descricao:
      'Perguntas sobre a metodologia, as fontes de dados (Censo da Educação Superior/Inep) ou ' +
      'qualquer achado apresentado no site podem ser feitas aqui.',
  },
]

export default topicos
