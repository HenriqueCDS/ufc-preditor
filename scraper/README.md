# Scraper — atualização da base do ufcstats.com

Mantém `DATA/ufc_fighters_final.csv` e `DATA/ufc_gold_dataset_final.csv` atualizados, **no mesmo schema que o notebook já lê**. Nenhuma alteração no `Projeto_final_ufc_predidor.ipynb` é necessária.

Porte do [joseSilva31/MMA_Scraping_Kaggle](https://github.com/joseSilva31/MMA_Scraping_Kaggle) (MIT), a origem do dataset do Kaggle usado no projeto.

---

## Por que o original parou de funcionar

O ufcstats.com passou a servir um desafio anti-bot (proof-of-work em JavaScript) antes de qualquer página. Um GET com `requests` recebe HTTP 200 com ~3 KB de tela de carregamento — nunca o conteúdo.

O pior não é falhar, é **como** falha. O scraper original tem:

```python
table = soup.find('table', class_='b-statistics__table')
if not table: continue
```

Sem tabela → `continue`. Ele percorre as 26 letras, não grava nada, imprime `--- RECOLHA CONCLUÍDA! ---` e sai com código 0. Parece que simplesmente não havia novidade.

Aqui, o transporte usa um Chromium real via Playwright — que executa o JavaScript como qualquer visitante — e **toda falha é alta**: `BlockedError` se o anti-bot não passou, `StructureError` se o HTML mudou.

---

## Instalação

```bash
cd scraper
pip install -r requirements.txt
playwright install chromium
```

## Uso

```bash
python run_update.py
```

Faz tudo em ordem: lutas → lutadores → limpeza → publicação em `DATA/`.

Uma janela do Chrome abre fora da área visível. **É necessária** — o anti-bot não passa em modo headless. `Ctrl+C` é seguro: o checkpoint retoma de onde parou.

### Scripts individuais

```bash
python scrape_combats.py                  # lutas novas
python scrape_combats.py --limit-events 5 # só os 5 eventos mais recentes (teste)
python scrape_combats.py --full-scan      # varre os ~700 eventos até 1993 (auditoria)
python scrape_fighters.py                 # índice + perfis que mudaram
python scrape_fighters.py --limit 10      # teste rápido
python scrape_fighters.py --force-all     # revisita os 4.455 perfis (lento)
python finalize.py                        # limpeza e publicação em DATA/
python test_scraper.py                    # testes (não tocam na rede)
```

---

## A otimização que torna isso viável

O índice alfabético (`?char=a&page=all`) já traz altura, peso, alcance, guarda e o cartel — **26 páginas para 4.455 lutadores**. Só `DOB` e as 8 estatísticas de carreira exigem abrir o perfil individual.

Quem teve o cartel alterado desde o último scrape lutou nesse meio tempo — e é exatamente quem precisa das estatísticas refeitas. O mesmo sinal serve para as duas coisas.

| | Original | Aqui |
|---|---|---|
| Atualização mensal | 4.455 perfis (horas) | ~26 páginas + dezenas de perfis (minutos) |
| Atualiza lutador já existente | ❌ nunca | ✅ quando o cartel muda |

Na primeira execução, `DATA/` serve de semente — você não recoleta as 8.551 lutas e os 4.455 perfis que já tem.

---

## Correções em relação ao original

| # | Problema | Correção |
|---|---|---|
| 1 | `requests` não passa no anti-bot, e falha em silêncio | Playwright + falha alta em cada etapa |
| 2 | `if url in scraped_urls: continue` nos **lutadores** congela as stats de quem já está na base, para sempre | Índice sempre relido; perfil revisitado quando o cartel muda |
| 3 | Perfil que falha grava `Str_Acc='0%'` — indistinguível de uma precisão real de 0% | Falha preserva o valor anterior e entra no relatório final |
| 4 | `mode='a'` não consegue atualizar uma linha existente | Escrita atômica do arquivo inteiro (tmp + replace) |
| 5 | `format='%b %d, %Y'` + `errors='coerce'`: a página de **evento** escreve o mês por extenso (`March 11, 1994` → `%B`), então as datas viravam `NaT` em silêncio — e `Event_Date` é o que ordena o dataset e sustenta o cálculo de streak sem vazamento | Tenta `%Y-%m-%d`, `%b` e `%B`; **aborta** se passar de 2% de não convertidas |
| 6 | `DOB` ausente marcava o perfil como incompleto — mas o site não tem essa data para 506 lutadores, que seriam revisitados para sempre | `DOB` fora da checagem de completude |

O checkpoint por `Fight_URL` nas **lutas** foi mantido: ali ele está certo, porque uma luta encerrada nunca muda.

### Retomada depois de interrupção

O checkpoint é a **união** de `DATA/ufc_gold_dataset_final.csv` (base publicada) com `data/ufc_gold_dataset.csv` (o que a rodada interrompida já gravou). Precisa ser união: usar só o segundo descartaria a semente e mandaria recoletar as ~8.500 lutas que já estão publicadas.

A varredura vai do evento mais recente para o mais antigo e **para depois de 5 eventos seguidos sem novidade** — como a listagem é cronológica e lutas encerradas não mudam, o que resta é mais antigo e já está na base. Isso transforma uma varredura de ~700 páginas em ~1 minuto numa atualização de rotina.

A ressalva: se o ufcstats adicionar retroativamente um evento antigo, a parada antecipada não o encontra. Para uma auditoria completa do histórico, use `--full-scan`.

---

## Arquivos

```
ufc_fetch.py        Transporte: Chromium persistente, falha alta
scrape_combats.py   Eventos e lutas      → data/ufc_gold_dataset.csv
scrape_fighters.py  Índice e perfis      → data/ufc_fighters_profiles.csv
finalize.py         Limpeza e publicação → ../DATA/*_final.csv
run_update.py       Orquestrador
test_scraper.py     Testes offline
```

`data/` é a saída bruta (ignorada pelo git). A base publicada em `../DATA/` é a que o notebook lê e a que vai versionada.

---

## Fluxo completo

```bash
cd scraper && python run_update.py    # 1. atualiza DATA/
# 2. reexecuta o notebook → modelos treinados nos dados novos
# 3. exporta artefatos (JSON + .onnx) para o site
git add DATA/ && git commit && git push
```

---

## Notas

- **Seja moderado.** Isso bate num único site. O delay padrão é 0,4 s entre requisições — não reduza sem motivo.
- **Uso pessoal/acadêmico.** O `robots.txt` do ufcstats retorna 404, mas o desafio anti-bot é um sinal claro de que tráfego automatizado em volume não é bem-vindo. O modo incremental mantém isso na casa de dezenas de páginas por mês.
- **Não redistribua** os dados brutos de forma que conflite com os termos do site.
- Se o anti-bot travar: confirme `headless=False`, apague `.pw-profile/` e tente de novo.
- Se aparecer `StructureError`: o HTML do site mudou. Abra a URL no navegador e ajuste o seletor — é falha honesta, não silenciosa.
