"""Valores dos gráficos da dissertação TRANSCRITOS À MÃO a partir das imagens PNG.

Os gráficos do Word são imagens (sem dados embutidos). Cada valor abaixo foi lido
do rótulo impresso no próprio gráfico. Status "a_conferir" até a autora validar.
Rodar: python graficos_transcritos.py  -> gera graficos_transcritos.json
"""
import json
from pathlib import Path

A11 = [str(a) for a in range(2014, 2025)]           # 2014..2024
A9 = ["2014", "2015", "2016", "2017", "2018", "2019", "2022", "2023", "2024"]  # sem 2020/2021 no original

G = {}

def g(id, tipo, categorias, series, unidade=None, obs=None, orientacao="vertical", agrupamento="clustered"):
    G[id] = {"tipo": tipo, "orientacao": orientacao, "agrupamento": agrupamento, "unidade": unidade,
             "categorias": categorias, "series": [{"nome": n, "valores": v} for n, v in series],
             "observacoes": obs or []}

g("grafico-01", "barra", A11, [("Número de IES", [18, 18, 20, 27, 35, 39, 39, 42, 45, 50, 51])])
g("grafico-02", "barra", A11, [("Total de ingressantes com financiamento do FIES",
  [917980, 762617, 724138, 853820, 971821, 1128053, 1284877, 1256106, 1474850, 1565887, 1486565])])
g("grafico-03", "barra", A11, [("Total de ingressantes pelo financiamento do ProUni",
  [162159, 179610, 176562, 180462, 181501, 179827, 131033, 88059, 120035, 130113, 139361])])
g("grafico-04", "barra", A11, [("Total de ingressantes cotistas",
  [1390304, 1505044, 1791689, 1916137, 2094907, 2067691, 1964364, 1927719, 2334142, 2327901, 2734544])],
  obs=["No eixo do original, o 4º ano aparece como \"2027\"; interpretado como 2017."])
g("grafico-05", "linha", A9, [("Taxa Bruta de matrículas na graduação", [31.8, 33.5, 34.6, 33.6, 36.3, 36.2, 38.5, 40.5, 42.9]),
  ("Meta", [50] * 9)], unidade="%", obs=["O original não traz 2020 e 2021."])
g("grafico-06", "linha", A9, [("Taxa líquida de matrículas", [21.2, 21.9, 23.1, 22.4, 24.3, 24.7, 25.0, 25.9, 27.1]),
  ("Meta", [33] * 9)], unidade="%", obs=["O original não traz 2020 e 2021."])
g("grafico-07", "linha", A11, [("Matrículas públicas", [8.1, 5.5, 9.2, 11.8, 12.7, 11.7, 3.6, 9.3, 7.4, 5.8, 5.3]),
  ("Meta", [40] * 11)], unidade="%")
g("grafico-08", "linha", A11, [("Docentes com Mestrado e Doutorado", [73.5, 75.6, 77.6, 79.7, 81.5, 82.6, 83.8, 84.3, 84.6, 84.9, 84.8]),
  ("Meta", [75] * 11)], unidade="%")
g("grafico-09", "linha", A11, [("Docentes com Doutorado", [35.6, 37.3, 39.9, 42.2, 44.2, 46.1, 48.9, 50.8, 52.1, 53.1, 53.9]),
  ("Meta", [35] * 11)], unidade="%")
A10 = A11[:-1]  # 2014..2023
g("grafico-10", "linha", A10, [("Número de Títulos de Mestrado Concedidos",
  [53212, 56667, 59614, 63254, 66993, 70071, 60039, 61138, 59374, 66293]), ("Meta", [60000] * 10)])
g("grafico-11", "linha", A10, [("Número de Títulos de Doutorado Concedidos",
  [17286, 18996, 20603, 22056, 23476, 24432, 20075, 21100, 22993, 25170]), ("Meta", [25000] * 10)])
g("grafico-12", "barra", A11, [
  ("Públicas Federais", [3, 3, 3, 3, 3, 3, 2, 2, 2, 2, 2]),
  ("Públicas Estaduais", [1] * 11),
  ("Privadas com fins lucrativos", [4, 4, 7, 9, 16, 19, 22, 25, 29, 34, 35]),
  ("Privadas sem fins lucrativos", [7, 9, 8, 14, 15, 16, 14, 14, 13, 13, 13]),
  ("Especial", [3, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0]),
  ("Total", [18, 18, 20, 27, 35, 39, 39, 42, 45, 50, 51])])
g("grafico-13", "linha", A11, [
  ("Universidades", [10, 10, 11, 13, 17, 18, 16, 15, 15, 14, 15]),
  ("Centros", [2, 2, 3, 7, 10, 13, 14, 18, 21, 27, 27]),
  ("Faculdades", [5, 5, 5, 6, 7, 7, 8, 8, 8, 8, 8]),
  ("Institutos Federais", [1] * 11),
  ("Total", [18, 18, 20, 27, 35, 39, 39, 42, 45, 50, 51])])
g("grafico-14", "linha", A11, [
  ("Presencial", [9, 9, 9, 10, 10, 10, 10, 11, 11, 11, 11]),
  ("EaD", [10, 10, 13, 20, 29, 34, 32, 35, 38, 43, 45]),
  ("Ambas", [1, 1, 2, 3, 4, 5, 3, 4, 4, 4, 5]),
  ("Total", [18, 18, 20, 27, 35, 39, 39, 42, 45, 50, 51])],
  obs=["Total = Presencial + EaD − Ambas (IES que ofertam as duas modalidades aparecem nas duas séries)."])
g("grafico-15", "barra", A11, [
  ("Licenciatura", [55, 59, 67, 93, 140, 150, 163, 189, 212, 221, 253]),
  ("Bacharelado", [79, 88, 99, 124, 162, 195, 250, 295, 384, 409, 466]),
  ("Tecnológico", [83, 92, 102, 164, 219, 273, 338, 410, 553, 578, 643]),
  ("Total Cursos", [217, 239, 268, 381, 521, 618, 751, 894, 1152, 1210, 1365])],
  obs=["Valores lidos da tabela impressa sob o gráfico. Em 2022, 2023 e 2024 a soma dos três graus (1.149, 1.208, 1.362) é 3 menor que o Total do original; mantido como no original."])
g("grafico-16", "area", A11, [
  ("Pública", [92, 31, 32, 19, 20, 19, 16, 17, 17, 18, 19]),
  ("Privada", [125, 208, 236, 362, 501, 599, 735, 877, 1135, 1192, 1346]),
  ("Total Cursos", [217, 239, 268, 381, 521, 618, 751, 894, 1152, 1210, 1365])])
g("grafico-17", "barra", A11, [
  ("Públicas Estaduais", [4, 4, 4, 3, 3, 3, 2, 3, 3, 3, 4]),
  ("Públicas Federais", [17, 17, 16, 16, 17, 16, 14, 14, 14, 15, 15]),
  ("Privadas sem fins lucrativos", [74, 136, 135, 201, 174, 175, 194, 217, 217, 168, 182]),
  ("Privadas com fins lucrativos", [51, 72, 101, 161, 327, 424, 541, 660, 918, 1024, 1164])],
  obs=["Valores lidos da tabela impressa sob o gráfico."])
g("grafico-18", "linha", A11, [
  ("Presencial", [98, 98, 100, 99, 96, 100, 98, 104, 108, 111, 110]),
  ("EaD", [119, 141, 168, 282, 425, 518, 653, 790, 1044, 1099, 1255]),
  ("Total Cursos", [217, 239, 268, 381, 521, 618, 751, 894, 1152, 1210, 1365])],
  obs=["Rótulo de EaD em 2014 aparece parcialmente encoberto no original; 119 confere com Total − Presencial."])
g("grafico-19", "linha", A11, [
  ("Matrículas Presencial", [14599, 14971, 14778, 14733, 14852, 15199, 13998, 13815, 12473, 14333, 15361]),
  ("Matrículas EaD", [3011, 3261, 3727, 4276, 5219, 6349, 7983, 9585, 11446, 11649, 10967])])
g("grafico-20", "linha", A11, [
  ("Ingressos Presencial", [5222, 5184, 4942, 4723, 4865, 4871, 3803, 3755, 3757, 5801, 5229]),
  ("Ingressos EaD", [1561, 1551, 2169, 2825, 3536, 3962, 5328, 6752, 8334, 7621, 7393])])
g("grafico-21", "barra", A11, [
  ("Concluintes Presencial", [1658, 857, 930, 998, 1191, 1321, 1153, 1200, 1046, 1258, 1197]),
  ("Concluintes EaD", [563, 571, 591, 697, 886, 948, 1109, 1206, 961, 1403, 1384])])
g("grafico-22", "barra", A11, [
  ("Matrículas Privada com fins lucrativos", [3898, 4362, 4794, 5361, 6255, 7339, 9043, 10657, 12480, 12791, 12079]),
  ("Matrículas Privada sem fins lucrativos", [599, 10199, 10007, 10046, 10188, 10563, 9232, 8763, 8374, 10152, 11356]),
  ("Matrículas Federal", [2722, 2959, 3069, 3100, 3124, 3132, 3276, 3563, 2648, 2697, 2549]),
  ("Matrículas Estadual", [597, 585, 504, 502, 504, 514, 430, 417, 417, 342, 344]),
  ("Matrículas Especial", [131, 127, 131, 0, 0, 0, 0, 0, 0, 0, 0])], orientacao="horizontal",
  obs=["De 2015 a 2024 a soma das categorias confere exatamente com o total de matrículas do Gráfico 19.",
       "Em 2014 a soma (7.947) fica 9.663 abaixo do total do Gráfico 19 (17.610); o valor 599 de 'Privada sem fins lucrativos' em 2014 foi mantido como está impresso."])
g("grafico-23", "barra", A11, [
  ("Ingressos Privada com fins lucrativos", [1828, 1879, 2490, 2844, 3442, 4121, 5251, 6912, 8626, 7895, 7554]),
  ("Ingressos Privada sem fins lucrativos", [343, 3622, 3391, 3639, 3890, 3667, 2823, 2557, 2399, 4498, 4140]),
  ("Ingressos Federal", [971, 1040, 1117, 942, 953, 942, 950, 903, 946, 902, 804]),
  ("Ingressos Estadual", [129, 134, 108, 123, 116, 103, 107, 135, 120, 127, 124]),
  ("Ingressos Especial", [3512, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0])], orientacao="horizontal",
  obs=["A soma das categorias confere com o total de ingressos do Gráfico 20, exceto 2015 (6.675 × 6.735) e 2016 (7.106 × 7.111); valores mantidos como impressos (conferidos com zoom)."])
g("grafico-24", "barra", A11, [
  ("Concluintes Privada com fins lucrativos", [550, 605, 693, 825, 1044, 1144, 1297, 1378, 1103, 1545, 1469]),
  ("Concluintes Privada sem fins lucrativos", [117, 1458, 1469, 1665, 1720, 1807, 1361, 1245, 1177, 1358, 1264]),
  ("Concluintes Federal", [134, 219, 258, 285, 297, 288, 257, 313, 258, 327, 264]),
  ("Concluintes Estadual", [83, 118, 67, 66, 59, 107, 61, 33, 108, 58, 71]),
  ("Concluintes Especial", [1337, 0, 9, 0, 0, 0, 0, 0, 0, 0, 0])], orientacao="horizontal",
  obs=["A soma das categorias confere em todos os anos com o total de concluintes do Gráfico 27 (masculino + feminino)."])
g("grafico-25", "linha", A11, [
  ("Matrículas Masculino", [7409, 7766, 7858, 8044, 8459, 9091, 9020, 9325, 9295, 9905, 9908]),
  ("Matrículas Feminino", [10201, 10466, 10647, 10965, 11612, 12457, 12961, 14075, 14624, 16077, 16420])],
  obs=["Masculino + Feminino confere em todos os anos com o total de matrículas do Gráfico 19."])
g("grafico-26", "linha", A11, [
  ("Ingressos Masculino", [2980, 3023, 3250, 3257, 3563, 3878, 3777, 3975, 4676, 5098, 4771]),
  ("Ingressos Feminino", [3803, 3712, 3861, 4291, 4838, 4955, 5354, 6532, 7415, 8324, 7851])],
  obs=["Masculino + Feminino confere em todos os anos com o total de ingressos do Gráfico 20."])
g("grafico-27", "linha", A11, [
  ("Concluintes Masculino", [806, 857, 930, 998, 1191, 1321, 1153, 1200, 1046, 1258, 1197]),
  ("Concluintes Feminino", [1415, 1543, 1566, 1843, 1929, 2025, 1823, 1769, 1600, 2030, 1871])],
  obs=["No Word este gráfico está em formato EMF; a imagem do site foi convertida para PNG."])
g("grafico-28", "barra", A11, [
  ("PROUNI", [374, 767, 871, 1008, 908, 758, 882, 772, 739, 689, 643]),
  ("APOIO SOCIAL", [3108, 3438, 3636, 4112, 3760, 3053, 1774, 2186, 2431, 909, 1004]),
  ("FIES", [3823, 1296, 4377, 4216, 5091, 4860, 6529, 5555, 5262, 5134, 4823])])

# Gráfico 21: inconsistência encontrada ao cruzar com os Gráficos 24 e 27
G["grafico-21"]["observacoes"].append(
  "Atenção: de 2015 a 2024 a série 'Concluintes Presencial' é idêntica a 'Concluintes Masculino' do Gráfico 27, "
  "e Presencial + EaD não bate com o total de concluintes dos Gráficos 24 e 27 (ex.: 2015 = 1.428 × 2.400). "
  "Possível erro no gráfico original; conferir com a planilha.")


def validar():
    probs = []
    for gid, d in G.items():
        n = len(d["categorias"])
        for s in d["series"]:
            if len(s["valores"]) != n:
                probs.append(f"{gid}: série {s['nome']!r} tem {len(s['valores'])} valores para {n} categorias")
    return probs


if __name__ == "__main__":
    erros = validar()
    assert not erros, erros
    out = {
        "origem": "transcrito manualmente a partir das imagens dos gráficos do .docx (rótulos de dados impressos)",
        "status": "a_conferir",
        "graficos": G,
    }
    p = Path(__file__).with_suffix(".json")
    p.write_text(json.dumps(out, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"ok: {p.name} ({len(G)} gráficos)")
