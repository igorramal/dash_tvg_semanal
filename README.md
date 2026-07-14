# Dash Semanal Globo — Repercussão & Mídias

Dashboard semanal (não diário). Mesmo esquema do dash da Copa: `index.html` único no GitHub, hospedado na Netlify, dados vindos de uma planilha Google publicada em CSV.

## Arquivos
- `index.html` — o dashboard inteiro (HTML + CSS + JS, Chart.js via CDN).
- `fonts/` — Globotipo Corporativa (display + textos).
- `logo-elife.png` — logo Elife no header. (Logo da Globo: substituir o círculo `.globo-mark` quando chegar o arquivo.)
- `Planilha_Dash_Semanal_Globo.xlsx` — modelo de preenchimento. Importe no Google Sheets.

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
