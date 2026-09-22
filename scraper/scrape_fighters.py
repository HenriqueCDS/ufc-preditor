"""
scrape_fighters.py -- perfis e estatisticas de carreira dos lutadores.

Diferencas em relacao ao FighterScrapingMMA.py original
-------------------------------------------------------
1. Transporte via navegador real (ufc_fetch), porque `requests` nao passa
   mais no anti-bot do site.

2. ATUALIZA quem ja esta na base. O original tem
   `if fighter_url in scraped_urls: continue`, ou seja, so coleta
   lutadores novos e congela as estatisticas de todos os demais para
   sempre -- justamente o oposto do que se quer ao atualizar a base.

3. So visita o perfil individual de quem realmente precisa. O indice
   alfabetico ja traz altura, peso, alcance, guarda e o cartel
   (Wins/Losses/Draws) -- sao 26 paginas para 4.455 lutadores. Quem teve
   o cartel alterado desde o ultimo scrape lutou nesse meio tempo, e e
   exatamente quem precisa das estatisticas de carreira refeitas.
   Resultado: dezenas de perfis por mes em vez de 4.455.

4. Nunca grava zero no lugar de um erro. O original preenche
   `Str_Acc='0%'` quando a visita ao perfil falha -- um valor que o
   modelo nao consegue distinguir de uma precisao real de 0%. Aqui, uma
   falha preserva o valor anterior e e contabilizada no relatorio final.

5. Escrita atomica do arquivo inteiro (tmp + replace), em vez de
   `mode='a'`. Append nao consegue atualizar uma linha existente.

Saida: scraper/data/ufc_fighters_profiles.csv
"""

from __future__ import annotations

import argparse
import os
import string
import sys
from pathlib import Path

import pandas as pd
from bs4 import BeautifulSoup

from ufc_fetch import BlockedError, StructureError, UFCFetcher

HERE = Path(__file__).resolve().parent
DATA_DIR = HERE / "data"
PROFILES_CSV = DATA_DIR / "ufc_fighters_profiles.csv"
# Base ja existente do projeto, usada para semear a primeira execucao.
SEED_CSV = HERE.parent / "DATA" / "ufc_fighters_final.csv"

INDEX_URL = "http://ufcstats.com/statistics/fighters?char={letter}&page=all"

# Colunas que vem do indice alfabetico (baratas: 26 paginas no total).
INDEX_FIELDS = [
    "Fighter_Name", "Height", "Weight", "Reach", "Stance",
    "Wins", "Losses", "Draws",
]
# Colunas que exigem abrir a pagina do lutador (caras: 1 pagina cada).
PROFILE_FIELDS = [
    "DOB", "SLpM", "Str_Acc", "SApM", "Str_Def",
    "TD_Avg", "TD_Acc", "TD_Def", "Sub_Avg",
]
# DOB fica de fora da checagem de completude de proposito: o ufcstats
# simplesmente nao tem data de nascimento de muitos lutadores antigos
# (506 na base atual). Tratar isso como "incompleto" faria o scraper
# revisitar esses mesmos 506 perfis em toda execucao, sem nunca
# conseguir preencher. As 8 estatisticas de carreira, ao contrario,
# sempre existem na pagina (o site mostra 0.00 / 0% quando nao ha dado),
# entao a ausencia delas e sinal real de coleta incompleta.
COMPLETENESS_FIELDS = [f for f in PROFILE_FIELDS if f != "DOB"]
ALL_FIELDS = INDEX_FIELDS + PROFILE_FIELDS + ["Fighter_URL"]


# =========================================================================
# indice alfabetico
# =========================================================================

def scrape_index(fetch: UFCFetcher) -> pd.DataFrame:
    """Percorre as 26 letras e devolve o que o indice sabe de cada lutador.

    Sao sempre 26 requisicoes, independente do tamanho da base.
    """
    rows = []
    for letter in string.ascii_lowercase:
        html = fetch.get(
            INDEX_URL.format(letter=letter),
            wait_for="table.b-statistics__table",
        )
        soup = BeautifulSoup(html, "html.parser")
        table = soup.find("table", class_="b-statistics__table")
        body = table.find("tbody") if table else None
        if body is None:
            raise StructureError(f"Tabela do indice sem <tbody> na letra {letter!r}.")

        letter_rows = 0
        for tr in body.find_all("tr")[1:]:  # primeira linha e cabecalho
            cols = tr.find_all("td")
            if len(cols) < 10:
                continue
            link = cols[0].find("a")
            url = link["href"] if link and link.has_attr("href") else None
            if not url:
                continue

            first, last = cols[0].text.strip(), cols[1].text.strip()
            rows.append({
                "Fighter_Name": f"{first} {last}".strip(),
                "Height": cols[3].text.strip(),
                "Weight": cols[4].text.strip(),
                "Reach": cols[5].text.strip(),
                "Stance": cols[6].text.strip(),
                "Wins": cols[7].text.strip(),
                "Losses": cols[8].text.strip(),
                "Draws": cols[9].text.strip(),
                "Fighter_URL": url,
            })
            letter_rows += 1

        print(f"  [{letter.upper()}] {letter_rows} lutadores no indice")

    df = pd.DataFrame(rows).drop_duplicates(subset="Fighter_URL", keep="last")
    print(f"\nIndice completo: {len(df):,} lutadores.")
    return df


# =========================================================================
# perfil individual
# =========================================================================

def scrape_profile(fetch: UFCFetcher, url: str) -> dict:
    """DOB + as 9 estatisticas de carreira da pagina do lutador."""
    html = fetch.get(url, wait_for="ul.b-list__box-list")
    soup = BeautifulSoup(html, "html.parser")

    def stat(label: str) -> str | None:
        tag = soup.find("i", string=lambda t: t and label in t)
        if not tag:
            return None
        # O valor e o texto solto logo depois do <i> do rotulo.
        sibling = tag.next_sibling
        value = sibling.strip() if sibling else ""
        return value or None

    found = {
        "DOB": stat("DOB:"),
        "SLpM": stat("SLpM:"),
        "Str_Acc": stat("Str. Acc.:"),
        "SApM": stat("SApM:"),
        "Str_Def": stat("Str. Def:"),
        "TD_Avg": stat("TD Avg.:"),
        "TD_Acc": stat("TD Acc.:"),
        "TD_Def": stat("TD Def.:"),
        "Sub_Avg": stat("Sub. Avg.:"),
    }
    if all(v is None for v in found.values()):
        raise StructureError(f"Nenhuma estatistica reconhecida em {url}.")
    return found


# =========================================================================
# decidir quem precisa de visita
# =========================================================================

def _missing(value) -> bool:
    return value is None or (isinstance(value, float) and pd.isna(value)) \
        or str(value).strip() in {"", "nan", "--", "N/A"}


def needs_profile_visit(index_row: dict, previous: dict | None) -> tuple[bool, str]:
    """Devolve (precisa_visitar, motivo)."""
    if previous is None:
        return True, "novo"

    for field in ("Wins", "Losses", "Draws"):
        if str(index_row.get(field, "")).strip() != str(previous.get(field, "")).strip():
            return True, "cartel mudou"

    incomplete = [f for f in COMPLETENESS_FIELDS if _missing(previous.get(f))]
    if incomplete:
        return True, f"faltando {','.join(incomplete[:3])}"

    return False, "em dia"


# =========================================================================
# base anterior
# =========================================================================

def load_previous() -> dict[str, dict]:
    """Perfis ja conhecidos, indexados por Fighter_URL.

    Na primeira execucao a base do projeto (DATA/ufc_fighters_final.csv)
    serve de semente -- assim voce nao revisita 4.455 perfis do zero.
    """
    path = None
    if PROFILES_CSV.exists():
        path = PROFILES_CSV
    elif SEED_CSV.exists():
        path = SEED_CSV
        print(f"Semeando a partir da base existente: {SEED_CSV.name}")

    if path is None:
        print("Nenhuma base anterior encontrada -- primeira coleta completa.")
        return {}

    df = pd.read_csv(path, dtype=str)
    if "Fighter_URL" not in df.columns:
        print(f"[AVISO] {path.name} nao tem Fighter_URL; ignorando como base anterior.")
        return {}

    df = df.dropna(subset=["Fighter_URL"])
    previous = {r["Fighter_URL"]: dict(r) for r in df.to_dict("records")}
    print(f"Base anterior: {len(previous):,} lutadores ({path.name}).")
    return previous


def write_atomic(df: pd.DataFrame, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(path.suffix + ".tmp")
    df.to_csv(tmp, index=False)
    os.replace(tmp, path)


# =========================================================================
# orquestracao
# =========================================================================

def run(limit: int | None = None, headless: bool = False, force_all: bool = False) -> int:
    previous = load_previous()

    with UFCFetcher(profile_dir=str(HERE / ".pw-profile"), headless=headless) as fetch:
        print("\n== Fase 1/2: indice alfabetico (26 paginas) ==")
        index_df = scrape_index(fetch)

        print("\n== Fase 2/2: perfis que precisam de atualizacao ==")
        pending = []
        for row in index_df.to_dict("records"):
            prev = previous.get(row["Fighter_URL"])
            visit, reason = (True, "--force-all") if force_all else needs_profile_visit(row, prev)
            if visit:
                pending.append((row, reason))

        if limit is not None:
            pending = pending[:limit]

        skipped = len(index_df) - len(pending)
        print(f"A visitar: {len(pending):,} perfis  |  ja em dia: {skipped:,}\n")

        merged, failures = [], []
        for i, (row, reason) in enumerate(pending, 1):
            prev = previous.get(row["Fighter_URL"], {})
            try:
                profile = scrape_profile(fetch, row["Fighter_URL"])
            except BlockedError:
                raise  # bloqueio nao e erro de um lutador -- aborta tudo
            except Exception as exc:
                # Preserva o que ja se sabia. Nunca grava zero no lugar de erro.
                print(f"  [{i}/{len(pending)}] FALHOU {row['Fighter_Name']}: {exc}")
                failures.append(row["Fighter_Name"])
                profile = {f: prev.get(f) for f in PROFILE_FIELDS}
            else:
                print(f"  [{i}/{len(pending)}] {row['Fighter_Name']} ({reason})")

            merged.append({**row, **profile})

        visited_urls = {r["Fighter_URL"] for r in merged}

    # Quem nao foi visitado mantem o registro anterior, mas com os campos do
    # indice atualizados (cartel, peso e guarda mudam sem exigir visita).
    for row in index_df.to_dict("records"):
        if row["Fighter_URL"] in visited_urls:
            continue
        prev = previous.get(row["Fighter_URL"], {})
        merged.append({**row, **{f: prev.get(f) for f in PROFILE_FIELDS}})

    # Lutadores que sumiram do indice continuam na base -- nao apagamos nada.
    indexed = set(index_df["Fighter_URL"])
    for url, prev in previous.items():
        if url not in indexed:
            merged.append({f: prev.get(f) for f in ALL_FIELDS} | {"Fighter_URL": url})

    out = pd.DataFrame(merged)[ALL_FIELDS].drop_duplicates(subset="Fighter_URL", keep="first")

    if len(out) < len(previous):
        print(f"\n[ABORTADO] O resultado ({len(out):,}) e menor que a base anterior "
              f"({len(previous):,}). Nada foi gravado.")
        return 1

    write_atomic(out, PROFILES_CSV)
    print(f"\nGravado: {PROFILES_CSV}  ({len(out):,} lutadores)")
    if failures:
        print(f"[AVISO] {len(failures)} perfis falharam e mantiveram os valores antigos:")
        for name in failures[:10]:
            print(f"    - {name}")
        print("  Rode de novo para tentar apenas esses (serao detectados como incompletos).")
    return 0


def main() -> int:
    p = argparse.ArgumentParser(description=__doc__.split("\n")[1])
    p.add_argument("--limit", type=int, help="visitar no maximo N perfis (teste)")
    p.add_argument("--headless", action="store_true",
                   help="nao recomendado: o anti-bot do site nao passa headless")
    p.add_argument("--force-all", action="store_true",
                   help="revisitar todos os perfis, ignorando o que ja esta em dia")
    args = p.parse_args()
    return run(limit=args.limit, headless=args.headless, force_all=args.force_all)


if __name__ == "__main__":
    sys.exit(main())
