"""
finalize.py -- limpeza final e publicacao em DATA/.

Junta o que o projeto original fazia em SortCombats.py e SortFighters.py,
e entrega exatamente os dois arquivos que o notebook ja le:

    DATA/ufc_gold_dataset_final.csv    (ordenado cronologicamente)
    DATA/ufc_fighters_final.csv        ('--' -> NaN, DOB em datetime)

Mudancas em relacao aos scripts originais
-----------------------------------------
1. Datas. Os originais usam `format='%b %d, %Y'` com `errors='coerce'`.
   Mas o ufcstats escreve o mes por extenso nas paginas de evento
   ("March 11, 1994" -> %B) e abreviado no perfil do lutador
   ("Jul 13, 1978" -> %b). Com um formato fixo, metade vira NaT em
   silencio -- e Event_Date e justamente o que ordena o dataset e
   alimenta o calculo de streak sem vazamento. Aqui tentamos os formatos
   conhecidos, incluindo ISO (dados ja processados), e ABORTAMOS se
   sobrar NaT demais.

2. Validacao antes de publicar: nunca substituimos um arquivo em DATA/
   por outro com menos linhas. O anterior vira .bak.
"""

from __future__ import annotations

import argparse
import os
import shutil
import sys
from pathlib import Path

import numpy as np
import pandas as pd

HERE = Path(__file__).resolve().parent
SRC = HERE / "data"
OUT = HERE.parent / "DATA"

# Ordem de tentativa. ISO primeiro porque dados ja processados (semente,
# re-execucao) chegam nesse formato.
DATE_FORMATS = ("%Y-%m-%d", "%b %d, %Y", "%B %d, %Y")
MAX_NAT_RATE = 0.02  # acima disso, o formato mudou e precisa de atencao


def parse_dates(series: pd.Series, label: str) -> pd.Series:
    """Converte para datetime tentando os formatos conhecidos, e falha
    alto se sobrar NaT demais."""
    # astype(str) transforma None/NaN/NaT nas strings "None"/"nan"/"NaT",
    # entao esses literais precisam entrar na lista de ausentes.
    values = series.astype(str).str.strip().replace(
        {"": None, "nan": None, "None": None, "NaT": None, "--": None, "N/A": None}
    )
    parsed = pd.Series(pd.NaT, index=values.index, dtype="datetime64[ns]")

    for fmt in DATE_FORMATS:
        pending = parsed.isna() & values.notna()
        if not pending.any():
            break
        parsed.loc[pending] = pd.to_datetime(values[pending], format=fmt, errors="coerce")

    had_value = values.notna()
    failed = (parsed.isna() & had_value).sum()
    rate = failed / max(had_value.sum(), 1)

    print(f"  {label}: {had_value.sum():,} com valor, {failed:,} nao convertidas ({rate:.1%})")
    if rate > MAX_NAT_RATE:
        examples = values[parsed.isna() & had_value].dropna().unique()[:5]
        raise SystemExit(
            f"\n[ABORTADO] {label}: {rate:.1%} das datas nao foram reconhecidas.\n"
            f"  Formatos tentados: {DATE_FORMATS}\n"
            f"  Exemplos que falharam: {list(examples)}\n"
            f"  O formato do site provavelmente mudou -- ajuste DATE_FORMATS."
        )
    return parsed


def load_union(raw: Path, published: Path, key: str) -> pd.DataFrame | None:
    """Une a base ja publicada em DATA/ com a coleta bruta do scraper.

    Precisa ser uniao, nao substituicao. scrape_combats.py grava em modo
    append e so coleta o que ainda nao tinha, entao o arquivo bruto
    contem apenas as lutas NOVAS -- publicar ele por cima trocaria a base
    inteira por um punhado de linhas. (Em scrape_fighters.py o arquivo
    bruto ja e completo, mas unir tambem e correto e protege contra uma
    coleta interrompida.)

    Em caso de conflito na chave, o registro recem-coletado vence.
    """
    frames, sources = [], []
    if published.exists():
        frames.append(pd.read_csv(published))
        sources.append(f"publicado {len(frames[-1]):,}")
    if raw.exists():
        frames.append(pd.read_csv(raw))  # por ultimo: vence no keep='last'
        sources.append(f"coletado {len(frames[-1]):,}")

    if not frames:
        return None

    united = pd.concat(frames, ignore_index=True)
    before = len(united)
    united = united.drop_duplicates(subset=key, keep="last").reset_index(drop=True)

    base = len(frames[0]) if published.exists() else 0
    print(f"  uniao: {' + '.join(sources)} = {len(united):,} unicos "
          f"({before - len(united):,} sobrepostos, {len(united) - base:+,} vs base)")
    return united


def publish(df: pd.DataFrame, path: Path, label: str) -> None:
    """Grava validando que nao estamos encolhendo a base."""
    if path.exists():
        previous = len(pd.read_csv(path, usecols=[0]))
        if len(df) < previous:
            raise SystemExit(
                f"\n[ABORTADO] {label}: resultado tem {len(df):,} linhas, "
                f"menos que as {previous:,} atuais. Nada foi gravado."
            )
        backup = path.with_suffix(path.suffix + ".bak")
        shutil.copy2(path, backup)
        print(f"  backup -> {backup.name}")

    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(path.suffix + ".tmp")
    df.to_csv(tmp, index=False)
    os.replace(tmp, path)
    print(f"  publicado -> {path}  ({len(df):,} linhas)")


def finalize_combats() -> None:
    src = SRC / "ufc_gold_dataset.csv"
    out = OUT / "ufc_gold_dataset_final.csv"
    print("\n== Lutas ==")

    df = load_union(src, out, key="Fight_URL")
    if df is None:
        print(f"[pular] nem {src.name} nem {out.name} existem.")
        return

    df["Event_Date"] = parse_dates(df["Event_Date"], "Event_Date")
    # Ordenacao cronologica: e o que impede vazamento temporal no
    # calculo de streak, la no notebook.
    df = df.sort_values("Event_Date", ascending=True).reset_index(drop=True)

    publish(df, out, "lutas")


def finalize_fighters() -> None:
    src = SRC / "ufc_fighters_profiles.csv"
    out = OUT / "ufc_fighters_final.csv"
    print("\n== Lutadores ==")

    df = load_union(src, out, key="Fighter_URL")
    if df is None:
        print(f"[pular] nem {src.name} nem {out.name} existem.")
        return

    # '--' e o placeholder do site para dado ausente (comum nos anos 90).
    df = df.replace("--", np.nan)
    df["DOB"] = parse_dates(df["DOB"], "DOB")

    publish(df, out, "lutadores")


def main() -> int:
    p = argparse.ArgumentParser(description="Limpeza final e publicacao em DATA/")
    p.add_argument("--only", choices=["combats", "fighters"], help="rodar so uma das etapas")
    args = p.parse_args()

    if args.only != "fighters":
        finalize_combats()
    if args.only != "combats":
        finalize_fighters()

    print("\nPronto. O notebook pode ser reexecutado com a base atualizada.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
