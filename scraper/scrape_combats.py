"""
scrape_combats.py -- eventos e lutas do UFC.

Diferencas em relacao ao CombatScrapingMMA.py original
------------------------------------------------------
1. Transporte via navegador real (ufc_fetch).

2. O checkpoint por Fight_URL foi mantido -- aqui ele esta CERTO. Uma
   luta encerrada nunca muda, entao nunca precisa ser rebuscada. (No
   scraper de lutadores o mesmo padrao esta errado; veja o cabecalho de
   scrape_fighters.py.)

3. O checkpoint e semeado a partir de DATA/ufc_gold_dataset_final.csv na
   primeira execucao, para nao rebuscar as ~8.500 lutas que voce ja tem.

4. Erros por luta sao contados e listados no fim, em vez de virarem um
   `print` que se perde no meio de milhares de linhas. Um evento que
   falha inteiro aborta com mensagem clara em vez de `continue`.

5. Varre os eventos do mais recente para o mais antigo, para que uma
   execucao interrompida ja tenha pego o que interessa.

Saida: scraper/data/ufc_gold_dataset.csv
"""

from __future__ import annotations

import argparse
import os
import sys
from pathlib import Path

import pandas as pd
from bs4 import BeautifulSoup

from ufc_fetch import BlockedError, StructureError, UFCFetcher

HERE = Path(__file__).resolve().parent
DATA_DIR = HERE / "data"
GOLD_CSV = DATA_DIR / "ufc_gold_dataset.csv"
SEED_CSV = HERE.parent / "DATA" / "ufc_gold_dataset_final.csv"

EVENTS_URL = "http://ufcstats.com/statistics/events/completed?page=all"


# =========================================================================
# limpeza (portado verbatim do original -- formatos ja validados)
# =========================================================================

def clean_fraction(value_str: str) -> tuple[int, int]:
    """'26 of 45' -> (26, 45)"""
    try:
        parts = value_str.split(" of ")
        return int(parts[0]), int(parts[1])
    except Exception:
        return 0, 0


def clean_time(time_str: str) -> int:
    """'1:36' -> 96 segundos"""
    try:
        if ":" not in time_str or time_str == "--":
            return 0
        m, s = time_str.split(":")
        return int(m) * 60 + int(s)
    except Exception:
        return 0


def calculate_fight_duration(round_str: str, time_str: str) -> int:
    """Duracao total da luta em segundos."""
    try:
        current_round = int(round_str)
        completed = (current_round - 1) * 5 * 60
        m, s = time_str.split(":")
        return completed + int(m) * 60 + int(s)
    except Exception:
        return 0


def _as_int(value: str) -> int:
    return int(value) if value.isdigit() else 0


# =========================================================================
# uma luta
# =========================================================================

def scrape_fight(fetch: UFCFetcher, fight_url: str) -> dict | None:
    html = fetch.get(fight_url, wait_for="i.b-fight-details__fight-title")
    soup = BeautifulSoup(html, "html.parser")

    weight_class = soup.find("i", class_="b-fight-details__fight-title").text.strip()

    fighters = [p.text.strip() for p in soup.find_all("h3", class_="b-fight-details__person-name")]
    if len(fighters) < 2:
        return None

    statuses = [t.text.strip() for t in soup.find_all("i", class_="b-fight-details__person-status")]
    if statuses and statuses[0] == "W":
        winner = fighters[0]
    elif len(statuses) > 1 and statuses[1] == "W":
        winner = fighters[1]
    else:
        winner = "Draw/NC"

    details = soup.find("div", class_="b-fight-details__content")
    if details is None:
        raise StructureError(f"Bloco de detalhes ausente em {fight_url}")

    def detail(label: str) -> str:
        tag = details.find("i", string=lambda s: s and label in s)
        return tag.next_sibling.strip() if tag and tag.next_sibling else "N/A"

    method = details.find("i", style="font-style: normal").text.strip()
    end_round = detail("Round:")
    end_time = detail("Time:")
    time_format = detail("Time format:")

    tables = soup.find_all("table")
    if len(tables) < 3:
        # Lutas antigas (pre-2008) as vezes nao tem tabela de round.
        # Isso e esperado -- pular a luta, nao abortar o evento.
        return None

    cols_tot = tables[0].find("tbody").find_all("tr")[0].find_all("td")
    cols_sig = tables[2].find("tbody").find_all("tr")[0].find_all("td")

    def tot(idx): return [p.text.strip() for p in cols_tot[idx].find_all("p")]
    def sig(idx): return [p.text.strip() for p in cols_sig[idx].find_all("p")]

    f1_sig_l, f1_sig_a = clean_fraction(tot(2)[0])
    f2_sig_l, f2_sig_a = clean_fraction(tot(2)[1])
    f1_td = clean_fraction(tot(5)[0])
    f2_td = clean_fraction(tot(5)[1])

    return {
        "Fight_URL": fight_url,
        "Fighter_1": fighters[0], "Fighter_2": fighters[1], "Winner": winner,
        "Weight_Class": weight_class,
        "Method": method, "End_Round": end_round, "End_Time": end_time,
        "Total_Fight_Time_Sec": calculate_fight_duration(end_round, end_time),
        "Time_Format": time_format,
        "F1_KD": _as_int(tot(1)[0]), "F2_KD": _as_int(tot(1)[1]),
        "F1_Sig_Landed": f1_sig_l, "F1_Sig_Att": f1_sig_a,
        "F2_Sig_Landed": f2_sig_l, "F2_Sig_Att": f2_sig_a,
        "F1_TD_Landed": f1_td[0], "F2_TD_Landed": f2_td[0],
        "F1_TD_Att": f1_td[1], "F2_TD_Att": f2_td[1],
        "F1_Sub_Att": _as_int(tot(7)[0]), "F2_Sub_Att": _as_int(tot(7)[1]),
        "F1_Ctrl_Sec": clean_time(tot(9)[0]), "F2_Ctrl_Sec": clean_time(tot(9)[1]),
        "F1_Head": clean_fraction(sig(3)[0])[0], "F2_Head": clean_fraction(sig(3)[1])[0],
        "F1_Body": clean_fraction(sig(4)[0])[0], "F2_Body": clean_fraction(sig(4)[1])[0],
        "F1_Leg": clean_fraction(sig(5)[0])[0], "F2_Leg": clean_fraction(sig(5)[1])[0],
        "F1_Distance": clean_fraction(sig(6)[0])[0], "F2_Distance": clean_fraction(sig(6)[1])[0],
        "F1_Clinch": clean_fraction(sig(7)[0])[0], "F2_Clinch": clean_fraction(sig(7)[1])[0],
        "F1_Ground": clean_fraction(sig(8)[0])[0], "F2_Ground": clean_fraction(sig(8)[1])[0],
    }


# =========================================================================
# checkpoint
# =========================================================================

def load_known_fights() -> set[str]:
    """URLs de lutas ja coletadas -- a UNIAO da base publicada com o que
    esta rodada ja gravou.

    Precisa ser uniao, nao "a primeira que existir". Depois de uma
    execucao interrompida, data/ufc_gold_dataset.csv existe mas contem
    so as lutas novas; usar so ele descartaria a semente e mandaria o
    scraper rebuscar as ~8.500 lutas que ja estao em DATA/.
    """
    known: set[str] = set()
    for path, label in ((SEED_CSV, "semente publicada"), (GOLD_CSV, "coletado nesta rodada")):
        if not path.exists():
            continue
        urls = set(pd.read_csv(path, usecols=["Fight_URL"], dtype=str)["Fight_URL"].dropna())
        print(f"  {label} ({path.name}): {len(urls):,} lutas, +{len(urls - known):,} ineditas")
        known |= urls

    if known:
        print(f"Checkpoint: {len(known):,} lutas ja conhecidas.")
    else:
        print("Nenhum checkpoint -- coleta completa (varias horas).")
    return known


def append_rows(rows: list[dict]) -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    pd.DataFrame(rows).to_csv(
        GOLD_CSV, mode="a", header=not GOLD_CSV.exists(), index=False
    )


# =========================================================================
# orquestracao
# =========================================================================

def run(limit_events: int | None = None, headless: bool = False,
        stop_after_known: int | None = 5) -> int:
    known = load_known_fights()
    new_total, failures = 0, []
    streak_known = 0  # eventos consecutivos sem nenhuma luta nova

    with UFCFetcher(profile_dir=str(HERE / ".pw-profile"), headless=headless) as fetch:
        html = fetch.get(EVENTS_URL, wait_for="a.b-link_style_black")
        soup = BeautifulSoup(html, "html.parser")
        events = [a["href"] for a in soup.find_all("a", class_="b-link_style_black")]
        if not events:
            raise StructureError("Nenhum evento encontrado na listagem.")

        # Mais recentes primeiro: se interromper, ja pegou o que importa.
        if limit_events:
            events = events[:limit_events]
        print(f"Eventos a verificar: {len(events):,}\n")

        for i, event_url in enumerate(events, 1):
            e_html = fetch.get(event_url, wait_for="tr.b-fight-details__table-row")
            e_soup = BeautifulSoup(e_html, "html.parser")

            date_tag = e_soup.find("li", class_="b-list__box-list-item")
            event_date = date_tag.text.replace("Date:", "").strip() if date_tag else None
            if not event_date:
                raise StructureError(f"Data ausente no evento {event_url}")

            links = [tr["data-link"] for tr in e_soup.find_all("tr", class_="b-fight-details__table-row")
                     if tr.get("data-link")]
            pending = [u for u in links if u not in known]

            if not pending:
                streak_known += 1
                print(f"[{i}/{len(events)}] {event_date} -- {len(links)} lutas, nada novo")
                # A listagem vem do mais recente para o mais antigo e uma
                # luta encerrada nunca muda. Entao uma sequencia de eventos
                # totalmente conhecidos significa que o resto, mais antigo,
                # tambem esta na base -- nao ha por que visitar as ~700
                # paginas restantes so para confirmar.
                if stop_after_known and streak_known >= stop_after_known:
                    print(f"\n{streak_known} eventos seguidos sem novidade -- "
                          f"o restante e mais antigo e ja esta na base.")
                    print("Use --full-scan para varrer o historico inteiro assim mesmo.")
                    break
                continue

            streak_known = 0
            print(f"[{i}/{len(events)}] {event_date} -- {len(pending)} luta(s) nova(s)")
            rows = []
            for url in pending:
                try:
                    data = scrape_fight(fetch, url)
                except BlockedError:
                    raise
                except Exception as exc:
                    print(f"    FALHOU {url}: {exc}")
                    failures.append(url)
                    continue
                if data:
                    data["Event_Date"] = event_date
                    rows.append(data)
                    known.add(url)

            if rows:
                append_rows(rows)
                new_total += len(rows)
                print(f"    gravadas {len(rows)} luta(s)")

    print(f"\nConcluido: {new_total:,} luta(s) nova(s) em {GOLD_CSV}")
    if failures:
        print(f"[AVISO] {len(failures)} luta(s) falharam (rode de novo para tentar so elas):")
        for url in failures[:10]:
            print(f"    - {url}")
    return 0


def main() -> int:
    p = argparse.ArgumentParser(description=__doc__.split("\n")[1])
    p.add_argument("--limit-events", type=int, help="verificar so os N eventos mais recentes")
    p.add_argument("--headless", action="store_true",
                   help="nao recomendado: o anti-bot do site nao passa headless")
    p.add_argument("--full-scan", action="store_true",
                   help="varrer todos os eventos ate o mais antigo, sem parada antecipada")
    args = p.parse_args()
    return run(limit_events=args.limit_events, headless=args.headless,
               stop_after_known=None if args.full_scan else 5)


if __name__ == "__main__":
    sys.exit(main())
