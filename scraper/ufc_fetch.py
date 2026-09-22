"""
ufc_fetch.py -- camada de transporte para o ufcstats.com.

Por que este arquivo existe
---------------------------
O ufcstats.com passou a servir um desafio anti-bot (proof-of-work em
JavaScript) antes de entregar qualquer pagina. Um GET simples com
`requests` recebe HTTP 200 com ~3 KB de tela de carregamento -- nunca o
conteudo. O scraper original do Kaggle usa `requests` e, por isso, hoje
falha EM SILENCIO: o `soup.find(...)` devolve None, o codigo faz
`continue`, e o processo termina anunciando sucesso sem ter gravado nada.

A solucao aqui NAO e resolver o desafio por fora. E usar um navegador de
verdade (Chromium via Playwright), que executa o JavaScript como qualquer
visitante faria. O contexto persistente guarda o cookie entre execucoes,
entao o desafio e resolvido uma vez, nao uma vez por pagina.

Regra de ouro deste modulo: FALHAR ALTO. Se o seletor esperado nao
aparecer, levantamos excecao em vez de devolver HTML inutil. Um scraper
que mente e pior que um que quebra.
"""

from __future__ import annotations

import time

from playwright.sync_api import TimeoutError as PlaywrightTimeout
from playwright.sync_api import sync_playwright

# Trechos que so aparecem na tela do desafio anti-bot.
CHALLENGE_MARKERS = ("Checking your browser", "This site requires JavaScript")


class BlockedError(RuntimeError):
    """A pagina carregou, mas era o desafio anti-bot -- nao o conteudo."""


class StructureError(RuntimeError):
    """A pagina carregou e nao era o desafio, mas o seletor esperado nao
    existe. Normalmente significa que o HTML do site mudou e o parser
    precisa ser revisto."""


class UFCFetcher:
    """Uso:

        with UFCFetcher() as fetch:
            html = fetch.get(url, wait_for="table.b-statistics__table")

    `profile_dir` guarda cookies e o resultado do desafio entre execucoes.
    Nao apague essa pasta sem motivo -- e o que evita refazer o desafio.
    """

    def __init__(
        self,
        profile_dir: str = ".pw-profile",
        headless: bool = False,
        delay: float = 0.4,
        retries: int = 3,
        timeout_ms: int = 25_000,
    ):
        # headless=True nao passa no bot-check do ufcstats hoje. Mantido
        # como parametro so para quando/se isso mudar.
        self.profile_dir = profile_dir
        self.headless = headless
        self.delay = delay
        self.retries = retries
        self.timeout_ms = timeout_ms
        self._pw = None
        self.ctx = None
        self.page = None
        self.n_requests = 0

    # -- ciclo de vida -----------------------------------------------------

    def __enter__(self) -> "UFCFetcher":
        self._pw = sync_playwright().start()
        self.ctx = self._pw.chromium.launch_persistent_context(
            self.profile_dir,
            headless=self.headless,
            viewport={"width": 1280, "height": 900},
            args=["--window-position=-2000,0"] if not self.headless else [],
        )
        self.page = self.ctx.pages[0] if self.ctx.pages else self.ctx.new_page()
        # Imagens nao servem para nada aqui e sao a maior parte do trafego.
        self.page.route(
            "**/*.{png,jpg,jpeg,gif,svg,woff,woff2,ttf}",
            lambda route: route.abort(),
        )
        return self

    def __exit__(self, *exc) -> None:
        try:
            if self.ctx:
                self.ctx.close()
        finally:
            if self._pw:
                self._pw.stop()

    # -- a unica operacao que importa --------------------------------------

    def get(self, url: str, wait_for: str) -> str:
        """Carrega `url` e so devolve o HTML depois que `wait_for` existir.

        `wait_for` e obrigatorio de proposito: e ele que diferencia
        "carregou de verdade" de "carregou a tela do desafio".

        Levanta BlockedError ou StructureError -- nunca devolve HTML
        parcial ou a pagina de desafio.
        """
        last_error: Exception | None = None

        for attempt in range(1, self.retries + 1):
            try:
                self.page.goto(url, timeout=self.timeout_ms, wait_until="domcontentloaded")
                # O desafio se resolve sozinho e recarrega a pagina; esperar
                # pelo seletor cobre os dois casos de uma vez.
                self.page.wait_for_selector(wait_for, timeout=self.timeout_ms)
                self.n_requests += 1
                time.sleep(self.delay)  # cortesia com o site
                return self.page.content()

            except PlaywrightTimeout as exc:
                last_error = exc
                html = ""
                try:
                    html = self.page.content()
                except Exception:
                    pass

                if any(marker in html for marker in CHALLENGE_MARKERS):
                    # O desafio ainda esta rodando. Dar mais tempo costuma
                    # bastar -- o proof-of-work leva alguns segundos.
                    print(f"    [desafio] tentativa {attempt}/{self.retries} em {url}")
                    time.sleep(3 * attempt)
                    continue

                print(f"    [timeout] tentativa {attempt}/{self.retries} em {url}")
                time.sleep(1.5 * attempt)

        # Esgotaram as tentativas -- decidir qual erro descreve melhor.
        html = ""
        try:
            html = self.page.content()
        except Exception:
            pass

        if any(marker in html for marker in CHALLENGE_MARKERS):
            raise BlockedError(
                f"Bloqueado pelo anti-bot em {url}.\n"
                f"  - Confirme que headless=False (o bot-check nao passa headless).\n"
                f"  - Se persistir, apague a pasta '{self.profile_dir}' e tente de novo.\n"
                f"  - Diminua a frequencia (aumente o delay)."
            ) from last_error

        raise StructureError(
            f"Seletor {wait_for!r} nao encontrado em {url}.\n"
            f"  Nao era a tela do desafio, entao provavelmente o HTML do site mudou\n"
            f"  e o parser precisa ser atualizado. Abra a URL no navegador e confira."
        ) from last_error
