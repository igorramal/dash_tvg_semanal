/**
 * Análise de Sentimento — TV Globo / Elife
 * Cole este código no editor de Apps Script da PLANILHA DE PROCESSAMENTO
 * (Extensões ▸ Apps Script). Configure em Configurações do projeto ▸
 * Propriedades do script:
 *   GEMINI_API_KEY  = sua chave do Gemini
 *   DASH_SHEET_ID   = ID da planilha que o dash lê (onde vai a aba ANALISE_SENTIMENTO)
 *
 * Uso: cole os comentários na aba COMENTARIOS_BRUTOS, preencha PRODUTO e
 * SEMANA_INICIO na aba CONFIG, e clique em "Análise ▸ Rodar análise".
 */

var BATCH_SIZE = 300;                    // comentários por chamada ao Gemini
var MODEL = 'gemini-2.0-flash';
var OUT_TAB = 'ANALISE_SENTIMENTO';
var OUT_HEADER = ['SEMANA_INICIO','PRODUTO','EDITORIA','POLARIDADE','SUBCATEGORIA','QUANTIDADE','EXEMPLOS'];

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Análise')
    .addItem('Rodar análise', 'rodarAnalise')
    .addToUi();
}

function prop_(k){ var v = PropertiesService.getScriptProperties().getProperty(k); if(!v) throw new Error('Falta a propriedade do script: '+k); return v; }
function sheet_(name){ var s = SpreadsheetApp.getActive().getSheetByName(name); if(!s) throw new Error('Aba não encontrada: '+name); return s; }

function rodarAnalise() {
  var ui = SpreadsheetApp.getUi();
  try {
    var cfg = lerConfig_();
    if(!cfg.produto) throw new Error('Preencha PRODUTO na aba CONFIG.');
    if(!cfg.semana)  throw new Error('Preencha SEMANA_INICIO na aba CONFIG.');

    var editoria = acharEditoria_(cfg.produto);
    var prompt = acharPrompt_(editoria);
    var comentarios = lerComentarios_();
    if(!comentarios.length) throw new Error('Nenhum comentário em COMENTARIOS_BRUTOS.');

    SpreadsheetApp.getActive().toast('Analisando '+comentarios.length+' comentários ('+editoria+')…','Análise',10);

    var acc = {}; // chave: polaridade|subcategoria -> {q, ex}
    for(var i=0;i<comentarios.length;i+=BATCH_SIZE){
      var lote = comentarios.slice(i, i+BATCH_SIZE);
      var r = analisarLote_(prompt, lote);
      acumular_(acc, 'positivo', r.positivo);
      acumular_(acc, 'negativo', r.negativo);
      Utilities.sleep(800); // respeita rate limit
    }

    gravarResultado_(cfg, editoria, acc);
    ui.alert('Análise concluída', 'Produto: '+cfg.produto+'\nEditoria: '+editoria+'\nComentários: '+comentarios.length+'\nGravado na aba '+OUT_TAB+' da planilha do dash.', ui.ButtonSet.OK);
  } catch(e){
    ui.alert('Erro na análise', String(e.message||e), ui.ButtonSet.OK);
  }
}

/* ---------- leitura da planilha de processamento ---------- */
function lerConfig_(){
  var vals = sheet_('CONFIG').getDataRange().getValues();
  // linha 1 = cabeçalho (PRODUTO | SEMANA_INICIO), linha 2 = valores
  var h = vals[0].map(function(x){return String(x).trim().toUpperCase();});
  var row = vals[1]||[];
  var idxP = h.indexOf('PRODUTO'), idxS = h.indexOf('SEMANA_INICIO');
  return { produto:String(row[idxP]||'').trim(), semana:fmtData_(row[idxS]) };
}
function lerComentarios_(){
  var vals = sheet_('COMENTARIOS_BRUTOS').getDataRange().getValues();
  var out=[];
  for(var i=1;i<vals.length;i++){ var c=String(vals[i][0]||'').trim(); if(c) out.push(c); }
  return out;
}
function acharEditoria_(produto){
  var vals = sheet_('BASE_PRODUTOS').getDataRange().getValues();
  var alvo = produto.toLowerCase();
  for(var i=1;i<vals.length;i++){
    if(String(vals[i][0]||'').trim().toLowerCase()===alvo) return String(vals[i][1]||'').trim();
  }
  // não achou -> Gemini infere e auto-cadastra
  var editoria = inferirEditoria_(produto);
  sheet_('BASE_PRODUTOS').appendRow([produto, editoria]);
  return editoria;
}
function acharPrompt_(editoria){
  var vals = sheet_('PROMPTS').getDataRange().getValues();
  var alvo = editoria.toLowerCase();
  for(var i=1;i<vals.length;i++){
    if(String(vals[i][0]||'').trim().toLowerCase()===alvo){
      var p=String(vals[i][1]||'').trim();
      if(p) return p;
    }
  }
  throw new Error('Sem prompt cadastrado para a editoria "'+editoria+'" na aba PROMPTS.');
}

/* ---------- Gemini ---------- */
function gemini_(promptText){
  var url = 'https://generativelanguage.googleapis.com/v1beta/models/'+MODEL+':generateContent?key='+prop_('GEMINI_API_KEY');
  var payload = {
    contents:[{parts:[{text:promptText}]}],
    generationConfig:{ temperature:0.2, responseMimeType:'application/json' }
  };
  var opts = {method:'post',contentType:'application/json',payload:JSON.stringify(payload),muteHttpExceptions:true};
  var code, text;
  for(var tent=0; tent<4; tent++){
    var res = UrlFetchApp.fetch(url, opts);
    code = res.getResponseCode(); text = res.getContentText();
    if(code===200) break;
    if(code===429 || code===503){ Utilities.sleep(3000*(tent+1)); continue; } // rate limit: espera e tenta de novo
    break; // outros erros: não adianta repetir
  }
  if(code!==200) throw new Error('Gemini HTTP '+code+': '+text.slice(0,300));
  var body = JSON.parse(text);
  var txt = body.candidates && body.candidates[0] && body.candidates[0].content.parts[0].text;
  if(!txt) throw new Error('Gemini sem resposta.');
  return txt;
}
function analisarLote_(taxonomia, lote){
  var instr = '\n\nComentários (um por linha):\n'+lote.join('\n')+
    '\n\nResponda APENAS em JSON válido, sem texto antes ou depois, no formato:'+
    '\n{"positivo":[{"subcategoria":"...","quantidade":N,"exemplos":["trecho"]}],'+
    '"negativo":[{"subcategoria":"...","quantidade":N,"exemplos":["trecho"]}]}'+
    '\nUse EXATAMENTE as subcategorias listadas acima. Ignore comentários neutros/irrelevantes.';
  var txt = gemini_(taxonomia+instr);
  try { return normalizar_(JSON.parse(txt)); }
  catch(e){
    // tenta extrair o primeiro bloco {...}
    var m = txt.match(/\{[\s\S]*\}/);
    if(m){ try { return normalizar_(JSON.parse(m[0])); } catch(e2){} }
    throw new Error('JSON inválido do Gemini: '+txt.slice(0,200));
  }
}
function normalizar_(o){ return { positivo:Array.isArray(o.positivo)?o.positivo:[], negativo:Array.isArray(o.negativo)?o.negativo:[] }; }

function inferirEditoria_(produto){
  var p = 'Qual editoria abaixo melhor se encaixa com o produto "'+produto+'"?'+
    '\nOpções: jornalismo, dramaturgia, variedades, esportes, institucional, especiais, realities.'+
    '\nResponda APENAS em JSON: {"editoria":"..."}';
  var txt = gemini_(p);
  try { var e = JSON.parse(txt).editoria; if(e) return String(e).trim().toLowerCase(); } catch(err){}
  return 'dramaturgia'; // fallback conservador
}

/* ---------- consolidação + escrita ---------- */
function acumular_(acc, pol, arr){
  (arr||[]).forEach(function(it){
    var sub = String(it.subcategoria||'').trim(); if(!sub) return;
    var q = Number(it.quantidade)||0;
    var key = pol+'|'+sub.toLowerCase();
    if(!acc[key]) acc[key]={pol:pol, sub:sub, q:0, ex:''};
    acc[key].q += q;
    if(!acc[key].ex && it.exemplos && it.exemplos.length) acc[key].ex = String(it.exemplos[0]).trim();
  });
}
function gravarResultado_(cfg, editoria, acc){
  var dash = SpreadsheetApp.openById(prop_('DASH_SHEET_ID'));
  var sh = dash.getSheetByName(OUT_TAB);
  if(!sh){ sh = dash.insertSheet(OUT_TAB); sh.appendRow(OUT_HEADER); }
  // remove linhas anteriores da mesma semana+produto (reprocessamento limpo)
  var vals = sh.getDataRange().getValues();
  var keep = [OUT_HEADER];
  for(var i=1;i<vals.length;i++){
    var same = fmtData_(vals[i][0])===cfg.semana && String(vals[i][1]||'').trim().toLowerCase()===cfg.produto.toLowerCase();
    if(!same) keep.push(vals[i]);
  }
  Object.keys(acc).forEach(function(k){
    var r=acc[k];
    keep.push([cfg.semana, cfg.produto, editoria, r.pol, r.sub, r.q, r.ex]);
  });
  sh.clearContents();
  sh.getRange(1,1,keep.length,OUT_HEADER.length).setValues(keep);
}

/* ---------- util ---------- */
function fmtData_(v){
  if(v instanceof Date){
    var d=('0'+v.getDate()).slice(-2), m=('0'+(v.getMonth()+1)).slice(-2);
    return d+'/'+m+'/'+v.getFullYear();
  }
  return String(v||'').trim();
}
