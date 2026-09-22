"""
test_scraper.py -- testes da logica que nao depende da rede.

O que da para testar sem tocar no site: limpeza de valores, a decisao de
quando revisitar um perfil, e o parsing de datas (a parte que falhava em
silencio nos scripts originais).

    python test_scraper.py
"""

from __future__ import annotations

import sys

import pandas as pd

from finalize import parse_dates
from scrape_combats import calculate_fight_duration, clean_fraction, clean_time
from scrape_fighters import _missing, needs_profile_visit

failures: list[str] = []


def check(label: str, got, expected) -> None:
    if got == expected:
        print(f"  ok   {label}")
    else:
        print(f"  FAIL {label}: esperado {expected!r}, veio {got!r}")
        failures.append(label)


print("clean_fraction")
check("'26 of 45'", clean_fraction("26 of 45"), (26, 45))
check("'0 of 0'", clean_fraction("0 of 0"), (0, 0))
check("lixo", clean_fraction("---"), (0, 0))

print("\nclean_time")
check("'1:36'", clean_time("1:36"), 96)
check("'0:00'", clean_time("0:00"), 0)
check("'--'", clean_time("--"), 0)
check("'15:00'", clean_time("15:00"), 900)

print("\ncalculate_fight_duration")
check("round 1, 0:20", calculate_fight_duration("1", "0:20"), 20)
check("round 3, 2:30", calculate_fight_duration("3", "2:30"), 750)
check("round 5, 5:00", calculate_fight_duration("5", "5:00"), 1500)
check("invalido", calculate_fight_duration("N/A", "--"), 0)

print("\n_missing")
check("None", _missing(None), True)
check("NaN", _missing(float("nan")), True)
check("'--'", _missing("--"), True)
check("vazio", _missing("  "), True)
check("valor real", _missing("4.35"), False)
check("zero textual", _missing("0.00"), False)

print("\nneeds_profile_visit")
full = {f: "x" for f in
        ("DOB", "SLpM", "Str_Acc", "SApM", "Str_Def", "TD_Avg", "TD_Acc", "TD_Def", "Sub_Avg")}
idx = {"Wins": "23", "Losses": "1", "Draws": "0"}

check("lutador novo", needs_profile_visit(idx, None)[0], True)
check("em dia", needs_profile_visit(idx, {**idx, **full})[0], False)
check("venceu de novo", needs_profile_visit({**idx, "Wins": "24"}, {**idx, **full})[0], True)
check("perdeu", needs_profile_visit({**idx, "Losses": "2"}, {**idx, **full})[0], True)
check("empatou", needs_profile_visit({**idx, "Draws": "1"}, {**idx, **full})[0], True)
check("stat faltando", needs_profile_visit(idx, {**idx, **full, "SLpM": None})[0], True)
# DOB ausente NAO conta como incompleto: o site nao tem essa data para
# 506 lutadores da base, e revisitar todos eles em toda execucao seria um
# loop que nunca converge.
check("DOB '--' nao revisita", needs_profile_visit(idx, {**idx, **full, "DOB": "--"})[0], False)
check("DOB ausente + stat faltando revisita",
      needs_profile_visit(idx, {**idx, **full, "DOB": None, "TD_Acc": None})[0], True)

print("\nparse_dates (o bug silencioso dos scripts originais)")
# Mes por extenso: o que a pagina de EVENTO usa. Com format='%b %d, %Y'
# fixo, todas estas viravam NaT sem aviso.
extenso = parse_dates(pd.Series(["March 11, 1994", "November 12, 1993"]), "extenso")
check("'March 11, 1994'", str(extenso.iloc[0].date()), "1994-03-11")
check("'November 12, 1993'", str(extenso.iloc[1].date()), "1993-11-12")

# Mes abreviado: o que a pagina de LUTADOR usa.
abrev = parse_dates(pd.Series(["Jul 13, 1978", "Feb 01, 1994"]), "abreviado")
check("'Jul 13, 1978'", str(abrev.iloc[0].date()), "1978-07-13")
check("'Feb 01, 1994'", str(abrev.iloc[1].date()), "1994-02-01")

# ISO: dados ja processados (semente ou re-execucao).
iso = parse_dates(pd.Series(["1978-07-13"]), "iso")
check("'1978-07-13'", str(iso.iloc[0].date()), "1978-07-13")

# Mistura dos tres, que e o caso real depois de semear.
mix = parse_dates(pd.Series(["1978-07-13", "Jul 13, 1978", "March 11, 1994"]), "misto")
check("misto sem NaT", int(mix.isna().sum()), 0)

# Ausentes nao contam como falha de formato.
vazios = parse_dates(pd.Series(["--", "", None, "Jul 13, 1978"]), "com vazios")
check("vazios viram NaT", int(vazios.isna().sum()), 3)
check("o valido converte", str(vazios.iloc[3].date()), "1978-07-13")

print("\nparse_dates aborta quando o formato muda")
try:
    parse_dates(pd.Series(["13/07/1978", "01/02/1994", "11/03/1994"]), "formato novo")
    print("  FAIL deveria ter abortado")
    failures.append("parse_dates nao abortou")
except SystemExit:
    print("  ok   abortou em vez de gravar NaT em silencio")

print()
if failures:
    print(f"{len(failures)} teste(s) falharam: {failures}")
    sys.exit(1)
print("Todos os testes passaram.")
