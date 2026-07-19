# Dash Semanal Globo — Repercussão & Mídias

Dashboard semanal (não diário). Mesmo esquema do dash da Copa: `index.html` único no GitHub, hospedado na Netlify, dados vindos de uma planilha Google publicada em CSV.

## Arquivos
- `index.html` — o dashboard inteiro (HTML + CSS + JS, Chart.js via CDN).
- `fonts/` — Globotipo Corporativa (display + textos).
- `logo-elife.png` — logo Elife no header. (Logo da Globo: substituir o círculo `.globo-mark` quando chegar o arquivo.)
- `Planilha_Dash_Semanal_Globo.xlsx` — modelo de preenchimento. Importe no Google Sheets.
- `Planilha_Processamento_Analise.xlsx` — planilha da automação de análise de sentimento (Gemini).
- `AppsScript_Analise.gs` — script da automação (cola na planilha de processamento).

## Como funciona
- O dash agrupa tudo por **SEMANA_INICIO** (data da segunda-feira, formato `dd/mm/aaaa`).
- Cada semana = 1 bloco de linhas nas abas. O time só adiciona linhas novas a cada semana.
- O **gráfico linha "semana anterior"** sai automático da semana imediatamente anterior já preenchida. Não precisa preencher duas vezes.
- Sem planilha configurada, o dash mostra dados de exemplo (semana 29/06/2026) pra referência visual.

## Conectar a planilha (uma vez)
1. Importe `Planilha_Dash_Semanal_Globo.xlsx` no Google Sheets (Arquivo → Importar → Inserir novas páginas). Mantenha os nomes das abas.
2. **Compartilhar → "Qualquer pessoa com o link" → Leitor.**
3. Copie o ID do doc na URL: `docs.google.com/spreadsheets/d/`**`ESSE_ID`**`/edit`.
4. No `index.html`, cole em `const SHEET_ID='...'`. Pronto — o dash lê cada aba pelo nome.

Enquanto `SHEET_ID` estiver vazio, roda com os dados de exemplo.

## Deploy Netlify
1. Suba a pasta num repositório GitHub novo.
2. Netlify → Add new site → Import from GitHub → selecione o repo.
3. Sem build. Publish directory = raiz. Pronto.

## Abas da planilha
| Aba | Para que serve |
|---|---|
| SEMANAS | KPIs do topo (total, X, variação, usuários únicos) + insight da semana |
| REDES | Barras de comentários por rede |
| DIARIO | Linha por dia (semana atual; anterior vem da semana passada) |
| TOP_POSTS | Top post por rede (X/Instagram/Facebook). `IMAGEM_URL` = criativo, fase 2 |
| TERMOS_X | Stats de termos únicos Brasil/Mundo |
| TRENDING_TOPICS | Tabela de horas em TT (Mundo/Brasil) |
| NUVEM | Nuvem de palavras (TERMO + PESO 1–10) |
| GTRENDS_RESUMO | Resumo Google Trends (termos, pesquisas, variações) |
| GTRENDS_CATEGORIAS | Chips de % por categoria |
| GTRENDS_TOP | Top pesquisas por categoria |
| YOUTUBE_TRENDS | Top vídeos do YouTube |
| EDITORIAS | Headline verde por editoria |
| EDITORIAS_DETALHE | Análises detalhadas por programa dentro da editoria |
| METODOLOGIA | Rodapé (fixo, sem semana) |

## Criativos (fase 2)
Slot já existe em cada Top Post. Basta preencher `IMAGEM_URL` na aba `TOP_POSTS` com o link direto da imagem que ela aparece no lugar do placeholder.

## Automação de Análise de Sentimento (Apps Script + Gemini)

Fluxo: você cola comentários → clica num botão na planilha → o script chama o Gemini,
classifica em positivo/negativo por subcategoria e grava na aba `ANALISE_SENTIMENTO`
da planilha do dash. O dash mostra a seção "Análise de Sentimento" automaticamente.

### Setup (uma vez)
1. Importe `Planilha_Processamento_Analise.xlsx` num Google Sheets novo (abas: COMENTARIOS_BRUTOS, CONFIG, BASE_PRODUTOS, PROMPTS).
2. Nessa planilha: **Extensões ▸ Apps Script**, apague o conteúdo e cole o `AppsScript_Analise.gs`. Salve.
3. **Configurações do projeto ▸ Propriedades do script**, adicione:
   - `GEMINI_API_KEY` = sua chave do Gemini
   - `DASH_SHEET_ID` = ID da planilha que o dash lê (a mesma do `SHEET_ID` do index.html)
4. Recarregue a planilha → aparece o menu **Análise**. Na primeira execução o Google pede autorização.

### Rodar
1. Cole os comentários na aba `COMENTARIOS_BRUTOS` (um por linha, coluna A).
2. Na aba `CONFIG`, preencha `PRODUTO` (ex: Amor de Mãe) e `SEMANA_INICIO` (ex: 06/07/2026).
3. Menu **Análise ▸ Rodar análise**. Espere o "Análise concluída".
4. O dash já mostra a seção de sentimento daquela semana/produto.

### Notas
- Produto novo (fora da BASE_PRODUTOS) → o Gemini infere a editoria e auto-cadastra.
- Reprocessar a mesma semana+produto sobrescreve (não duplica).
- Taxonomia por editoria fica na aba `PROMPTS` — dá pra editar sem mexer no código. Só dramaturgia vem pronta; as outras editorias são placeholders.
- Limite de 6 min do Apps Script: lotes de 300 comentários/chamada resolvem para milhares. Volumes muito grandes podem exigir continuação por gatilho (a fazer se precisar).
- Chave do Gemini fica só nas Propriedades do script — nunca no dash nem no repositório.
