"""
scrape_upcoming.py -- proximos eventos do UFC e seus cards.

Le http://ufcstats.com/statistics/events/upcoming e, para cada evento, a
pagina do evento (que ja lista as lutas com categoria de peso -- nao ha
necessidade de abrir cada luta). Publica direto em
backend/ml/artifacts/upcoming.json, que o backend serve em /api/events/*.

Mesmas regras do resto do scraper: falha ALTA (BlockedError/StructureError)
e escrita atomica -- se algo der errado, o JSON anterior fica intacto e o
site continua mostrando o ultimo card bom.

    python scrape_upcoming.py               # navegador visivel (local)
    xvfb-run -a python scrape_upcoming.py   # CI Linux (ver .github/workflows)

O arquivo so e reescrito quando o conteudo dos eventos muda, para que o
workflow agendado nao gere um commit por dia sem novidade.
"""

from __future__ import annotations

import argparse
import json
import os
import sys
import tempfile
from datetime import date, datetime, timezone
from pathlib import Path

from bs4 import BeautifulSoup

from ufc_fetch import BlockedError, StructureError, UFCFetcher

HERE = Path(__file__).resolve().parent
OUTPUT = HERE.parent / "backend" / "ml" / "artifacts" / "upcoming.json"
UPCOMING_URL = "http://ufcstats.com/statistics/events/upcoming"


# =========================================================================
# parsing (puro -- testavel offline com HTML salvo)
# =========================================================================

def _text(tag) -> str:
    return " ".join(tag.get_text(" ", strip=True).split()) if tag else ""


def _parse_date(raw: str) -> str:
    """'September 26, 2026' -> '2026-09-26'. Levanta se o formato mudar."""
    try:
        return datetime.strptime(raw.strip(), "%B %d, %Y").date().isoformat()
    except ValueError as exc:
        raise StructureError(f"Data em formato inesperado: {raw!r}") from exc


def event_id_from_url(url: str) -> str:
    return url.rstrip("/").rsplit("/", 1)[-1]


def parse_events_list(html: str) -> list[dict]:
    """Lista de eventos futuros: id, nome, data ISO, local, url."""
    soup = BeautifulSoup(html, "html.parser")
    table = soup.find("table", class_="b-statistics__table-events")
    if table is None:
        raise StructureError("Tabela de eventos (b-statistics__table-events) ausente.")

    events = []
    for tr in table.find("tbody").find_all("tr"):
        link = tr.find("a", class_="b-link_style_black")
        if link is None:  # linha espacadora vazia
            continue
        date_tag = tr.find("span", class_="b-statistics__date")
        cols = tr.find_all("td", recursive=False)
        if date_tag is None or len(cols) < 2:
            raise StructureError(f"Linha de evento com estrutura inesperada: {_text(tr)!r}")
        events.append({
            "id": event_id_from_url(link["href"]),
            "name": _text(link),
            "date": _parse_date(_text(date_tag)),
            "location": _text(cols[1]),
            "url": link["href"],
        })
    return events


def parse_event_fights(html: str) -> list[dict]:
    """Lutas do card na ordem em que aparecem (luta principal primeiro).

    Um card recem-anunciado pode nao ter lutas ainda -- devolve lista vazia
    em vez de falhar. Mas uma linha de luta sem exatamente 2 lutadores e
    sinal de mudanca no HTML: levanta.
    """
    soup = BeautifulSoup(html, "html.parser")
    fights = []
    for tr in soup.find_all("tr", attrs={"data-link": True}):
        names = [_text(a) for a in tr.select("p a[href*='fighter-details']")]
        cols = tr.find_all("td", recursive=False)
        if len(names) != 2 or len(cols) < 7:
            raise StructureError(f"Linha de luta com estrutura inesperada: {_text(tr)!r}")
        fights.append({
            "fighter1": names[0],
            "fighter2": names[1],
            "weight_class": _text(cols[6]),
            # A imagem belt.png marca luta valendo cinturao.
            "title_bout": tr.find("img", src=lambda s: s and "belt" in s) is not None,
        })
    return fights


# =========================================================================
# publicacao
# =========================================================================

def _load_previous(path: Path) -> dict | None:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return None


def write_atomic(path: Path, payload: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    fd, tmp = tempfile.mkstemp(dir=path.parent, suffix=".tmp")
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as fh:
            json.dump(payload, fh, ensure_ascii=False, indent=2)
            fh.write("\n")
        os.replace(tmp, path)
    except BaseException:
        Path(tmp).unlink(missing_ok=True)
        raise


def run(headless: bool = False, output: Path = OUTPUT) -> bool:
    """Devolve True se o arquivo foi reescrito, False se nada mudou."""
    with UFCFetcher(profile_dir=str(HERE / ".pw-profile"), headless=headless) as fetch:
        html = fetch.get(UPCOMING_URL, wait_for="table.b-statistics__table-events")
        events = parse_events_list(html)
        print(f"{len(events)} evento(s) futuro(s) na listagem.")

        for event in events:
            e_html = fetch.get(event["url"], wait_for="span.b-content__title-highlight")
            event["fights"] = parse_event_fights(e_html)
            print(f"  {event['date']}  {event['name']}: {len(event['fights'])} luta(s)")

    # Eventos que ja passaram nao interessam (a listagem as vezes mantem o
    # evento do dia por algumas horas).
    today = date.today().isoformat()
    events = [e for e in events if e["date"] >= today]

    previous = _load_previous(output)
    if previous and previous.get("events") == events:
        print("Sem mudancas nos cards -- arquivo mantido.")
        return False

    write_atomic(output, {
        "scraped_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "source": UPCOMING_URL,
        "events": events,
    })
    print(f"Publicado em {output}")
    return True


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    parser.add_argument("--headless", action="store_true",
                        help="Chromium headless (o anti-bot hoje nao passa assim).")
    parser.add_argument("--output", type=Path, default=OUTPUT)
    args = parser.parse_args()
    try:
        run(headless=args.headless, output=args.output)
    except (BlockedError, StructureError) as exc:
        print(f"\nERRO: {exc}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
