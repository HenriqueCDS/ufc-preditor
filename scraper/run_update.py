"""
run_update.py -- atualizacao completa da base, em ordem.

    python run_update.py

Equivale a rodar, nesta sequencia:

    python scrape_combats.py      # lutas novas (checkpoint por Fight_URL)
    python scrape_fighters.py     # indice + perfis que mudaram
    python finalize.py            # limpeza e publicacao em DATA/

As lutas vem primeiro de proposito: e o cartel dos lutadores que muda
DEPOIS de um evento, entao coletar as lutas antes mantem as duas bases
consistentes entre si dentro da mesma execucao.

Uma janela do Chrome vai abrir (fora da area visivel). E necessaria: o
anti-bot do ufcstats nao passa em modo headless. Ctrl+C e seguro -- o
checkpoint retoma de onde parou.
"""

from __future__ import annotations

import argparse
import sys
import time

import finalize
import scrape_combats
import scrape_fighters
from ufc_fetch import BlockedError, StructureError


def main() -> int:
    p = argparse.ArgumentParser(description="Atualiza DATA/ do zero ao fim.")
    p.add_argument("--limit-events", type=int,
                   help="verificar so os N eventos mais recentes (teste rapido)")
    p.add_argument("--skip-combats", action="store_true")
    p.add_argument("--skip-fighters", action="store_true")
    args = p.parse_args()

    started = time.time()
    try:
        if not args.skip_combats:
            print("=" * 60)
            print(" 1/3  LUTAS")
            print("=" * 60)
            scrape_combats.run(limit_events=args.limit_events)

        if not args.skip_fighters:
            print("\n" + "=" * 60)
            print(" 2/3  LUTADORES")
            print("=" * 60)
            scrape_fighters.run()

        print("\n" + "=" * 60)
        print(" 3/3  LIMPEZA E PUBLICACAO")
        print("=" * 60)
        finalize.main()

    except BlockedError as exc:
        print(f"\n[BLOQUEADO]\n{exc}")
        return 2
    except StructureError as exc:
        print(f"\n[ESTRUTURA MUDOU]\n{exc}")
        return 3
    except KeyboardInterrupt:
        print("\n\nInterrompido. O checkpoint foi preservado -- "
              "rode de novo para continuar de onde parou.")
        return 130

    mins = (time.time() - started) / 60
    print(f"\nTudo pronto em {mins:.1f} min.")
    print("Proximo passo: reexecutar o notebook com a base atualizada.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
