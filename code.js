// JustGo Audit Plugin — robust select-on-click (no unhide/unlock), DS audit, strict layer-name search
// Now with a Node Cache so selection works even if getNodeById glitches.
figma.skipInvisibleInstanceChildren = true;
figma.showUI(__html__, { width: 420, height: 750, themeColors: true });

// STRICT list for Layer Names tab
var ALLOWED_LAYER_NAMES = [
  'heading-text','title-text','subtitle-text','body-text',
  'highlighted-text','info-text','caption-text','overline-text'
];
// Exclude these from the strict layer-name search scope
var EXCLUDED_NODE_TYPES = ['COMPONENT','INSTANCE','COMPONENT_SET'];

// -------- Node Cache (for rock-solid selection) --------
var NODE_CACHE = new Map();
function cacheNode(n){ try{ if (n && n.id) NODE_CACHE.set(n.id, n); }catch(e){} }
function fromCacheOrId(id){
  var n = null;
  try { n = figma.getNodeById(id); } catch(e){}
  return n || NODE_CACHE.get(id) || null;
}

/* ----------------- helpers ----------------- */
function getAllNodes(node){
  var nodes=[node];
  if ('children' in node){
    for (var i=0;i<node.children.length;i++) nodes = nodes.concat(getAllNodes(node.children[i]));
  }
  return nodes;
}
function buildNodePath(node){
  var path=[], cur=node;
  while(cur && cur.type!=='DOCUMENT'){ path.unshift(cur.name||'Unnamed'); cur=cur.parent; }
  return path.join(' → ');
}
function isSceneNode(n){ return !!(n && 'visible' in n && 'locked' in n); }
function findFirstSceneDescendant(n){
  if (!n || !('children' in n)) return null;
  for (var i=0;i<n.children.length;i++){
    var c=n.children[i];
    if (isSceneNode(c)) return c;
    var deep=findFirstSceneDescendant(c);
    if (deep) return deep;
  }
  return null;
}
function getPageOf(node){
  var p=node && node.parent;
  while (p && p.type!=='PAGE') p=p.parent;
  return p||null;
}
function insideInstanceChild(n){
  var cur=n && n.parent;
  while (cur && cur.type!=='PAGE'){
    if (cur.type==='INSTANCE') return true;
    cur = cur.parent;
  }
  return false;
}
function liftToOwningInstance(n){
  var cur=n;
  while (cur && cur.parent && cur.parent.type==='INSTANCE') cur = cur.parent;
  return cur||n;
}
function chainState(n){
  // whether any ancestor is hidden/locked and the first blocker
  var cur=n, blockedBy=null, hidden=false, locked=false;
  while (cur && cur.type!=='PAGE'){
    if ('visible' in cur && cur.visible===false){ hidden=true; if (!blockedBy) blockedBy=cur; }
    if ('locked' in cur && cur.locked===true){ locked=true; if (!blockedBy) blockedBy=cur; }
    cur=cur.parent;
  }
  return { hidden:hidden, locked:locked, blocker:blockedBy };
}
function nearestSelectableAncestor(n){
  var cur=n;
  while (cur && cur.type!=='PAGE'){
    var ok = isSceneNode(cur) &&
             (!('locked' in cur) || cur.locked===false) &&
             (!('visible' in cur) || cur.visible!==false);
    if (ok) return cur;
    cur = cur.parent;
  }
  return null;
}
function trySelect(node){
  try{
    figma.currentPage.selection = [node];
    if (figma.currentPage.selection.length && figma.currentPage.selection[0].id === node.id){
      try { figma.viewport.scrollAndZoomIntoView([node]); } catch(e){} // don't let viewport issues kill success
      return true;
    }
  }catch(e){}
  return false;
}

/* -------- strict layer-name search -------- */
function searchLayersByName(searchTerm, scopeNodes){
  var results=[], searchLower=searchTerm.toLowerCase().trim();
  var stats={checkedNodes:0, matchingNodes:0, excludedNodes:0};

  if (ALLOWED_LAYER_NAMES.indexOf(searchLower)===-1){
    return { results:[], searchStatistics:stats,
      strictError:'Layer name "'+searchTerm+'" is not in the allowed list. Use: '+ALLOWED_LAYER_NAMES.join(', ') };
  }

  for (var i=0;i<scopeNodes.length;i++){
    var node=scopeNodes[i]; stats.checkedNodes++;
    if (EXCLUDED_NODE_TYPES.indexOf(node.type)!==-1){ stats.excludedNodes++; continue; }
    var nodeName=(node.name||'').toLowerCase().trim();
    if (nodeName===searchLower){
      stats.matchingNodes++;
      cacheNode(node);
      results.push({ id:node.id, name:node.name, type:node.type, path:buildNodePath(node), matchType:'LAYER_NAME' });
    }
  }
  return { results:results, searchStatistics:stats };
}
function performLayerNameSearch(term){
  var nodes=[], ctx='';
  if (figma.currentPage.selection.length>0){
    for (var i=0;i<figma.currentPage.selection.length;i++) nodes = nodes.concat(getAllNodes(figma.currentPage.selection[i]));
    ctx='Selected layers ('+figma.currentPage.selection.length+' items)';
  } else {
    for (var j=0;j<figma.currentPage.children.length;j++) nodes = nodes.concat(getAllNodes(figma.currentPage.children[j]));
    ctx=figma.currentPage.name;
  }
  var r=searchLayersByName(term, nodes);
  return {
    results:r.results, context:ctx,
    searchStatistics:{ checkedNodes:r.searchStatistics.checkedNodes, nodesWithItems:0, matchingNodes:r.searchStatistics.matchingNodes,
      uniqueVariables:[], uniqueStyles:[], totalUniqueItems:0, excludedNodes:r.searchStatistics.excludedNodes },
    foundItems:[], totalSearched:nodes.length, searchType:'LAYER_NAME', strictError:r.strictError
  };
}

/* ------------- variables & styles ------------- */
async function safeGetVariable(id){ try{ return await figma.variables.getVariableByIdAsync(id); }catch(e){ try{ return figma.variables.getVariableById(id);}catch(e2){return null;} } }
async function safeGetVariableCollection(id){ try{ return await figma.variables.getVariableCollectionByIdAsync(id);}catch(e){ try{ return figma.variables.getVariableCollectionById(id);}catch(e2){return null;} } }
async function safeGetStyle(id){ try{ if (!id || id===figma.mixed) return null; return await figma.getStyleByIdAsync(id);}catch(e){ return null; } }
function styleMatches(styleName, searchTerm){
  if (!styleName || !searchTerm) return false;
  var n=styleName.toLowerCase().trim(), q=searchTerm.toLowerCase().trim();
  if (n===q || n.indexOf(q)!==-1 || q.indexOf(n)!==-1) return true;
  var nBase=n.split('/').pop(), qBase=q.split('/').pop();
  if (nBase===qBase || nBase.indexOf(qBase)!==-1 || qBase.indexOf(nBase)!==-1) return true;
  var qWords=q.replace(/[\/\-_]/g,' ').split(' ').filter(function(w){return w.length>1;});
  var nWords=n.replace(/[\/\-_]/g,' ').split(' ').filter(function(w){return w.length>1;});
  for (var i=0;i<qWords.length;i++) for (var j=0;j<nWords.length;j++){
    if (qWords[i]===nWords[j] || qWords[i].indexOf(nWords[j])!==-1 || nWords[j].indexOf(qWords[i])!==-1) return true;
  }
  return false;
}
async function checkNodeStyles(node, q){
  var items=[], matched=false, s;
  if ('fillStyleId' in node){ s=await safeGetStyle(node.fillStyleId); if (s){ items.push({type:'STYLE',name:s.name,styleType:'PAINT',property:'fill',isRemote:!!s.remote}); if (styleMatches(s.name,q)) matched=true; } }
  if ('strokeStyleId' in node){ s=await safeGetStyle(node.strokeStyleId); if (s){ items.push({type:'STYLE',name:s.name,styleType:'PAINT',property:'stroke',isRemote:!!s.remote}); if (styleMatches(s.name,q)) matched=true; } }
  if (node.type==='TEXT' && 'textStyleId' in node){ s=await safeGetStyle(node.textStyleId); if (s){ items.push({type:'STYLE',name:s.name,styleType:'TEXT',property:'text',isRemote:!!s.remote}); if (styleMatches(s.name,q)) matched=true; } }
  if ('effectStyleId' in node){ s=await safeGetStyle(node.effectStyleId); if (s){ items.push({type:'STYLE',name:s.name,styleType:'EFFECT',property:'effect',isRemote:!!s.remote}); if (styleMatches(s.name,q)) matched=true; } }
  if ('gridStyleId' in node){ s=await safeGetStyle(node.gridStyleId); if (s){ items.push({type:'STYLE',name:s.name,styleType:'GRID',property:'grid',isRemote:!!s.remote}); if (styleMatches(s.name,q)) matched=true; } }
  return { foundStyles:items, matchesSearch:matched };
}
async function nodeHasVariableOrStyle(node, q){
  var found=false, items=[];
  try{
    var styleRes=await checkNodeStyles(node,q);
    items=items.concat(styleRes.foundStyles);
    if (styleRes.matchesSearch) found=true;

    // fills
    if ('fills' in node && Array.isArray(node.fills)){
      for (var i=0;i<node.fills.length;i++){
        var f=node.fills[i]; if (!f || !f.boundVariables) continue;
        for (var key in f.boundVariables){
          var b=f.boundVariables[key]; if (!b||!b.id) continue;
          var v=await safeGetVariable(b.id); if (!v) continue;
          var full=v.name, remote=false, coll=await safeGetVariableCollection(v.variableCollectionId);
          if (coll){ full=coll.name+'/'+v.name; remote=!!coll.remote; }
          items.push({type:'VARIABLE',name:full,resolvedType:v.resolvedType,isRemote:remote});
          var fullLower=full.toLowerCase(), base=fullLower.split('/').pop(), ql=q.toLowerCase();
          if (fullLower.indexOf(ql)!==-1 || base.indexOf(ql)!==-1 || ql.indexOf(base)!==-1) found=true;
        }
      }
    }
    // strokes
    if ('strokes' in node && Array.isArray(node.strokes)){
      for (var i2=0;i2<node.strokes.length;i2++){
        var s=node.strokes[i2]; if (!s || !s.boundVariables) continue;
        for (var key2 in s.boundVariables){
          var b2=s.boundVariables[key2]; if (!b2||!b2.id) continue;
          var v2=await safeGetVariable(b2.id); if (!v2) continue;
          var full2=v2.name, remote2=false, c2=await safeGetVariableCollection(v2.variableCollectionId);
          if (c2){ full2=c2.name+'/'+v2.name; remote2=!!c2.remote; }
          items.push({type:'VARIABLE',name:full2,resolvedType:v2.resolvedType,isRemote:remote2});
          var fullLower2=full2.toLowerCase(), base2=fullLower2.split('/').pop(), ql2=q.toLowerCase();
          if (fullLower2.indexOf(ql2)!==-1 || base2.indexOf(ql2)!==-1 || ql2.indexOf(base2)!==-1) found=true;
        }
      }
    }
    // other bound props
    var BOUND=['width','height','cornerRadius','paddingLeft','paddingRight','paddingTop','paddingBottom','rotation','opacity'];
    if (node.boundVariables){
      for (var k=0;k<BOUND.length;k++){
        var prop=BOUND[k], b3=node.boundVariables[prop];
        if (b3 && b3.id){
          var vv=await safeGetVariable(b3.id); if (!vv) continue;
          var full3=vv.name, remote3=false, c3=await safeGetVariableCollection(vv.variableCollectionId);
          if (c3){ full3=c3.name+'/'+vv.name; remote3=!!c3.remote; }
          items.push({type:'VARIABLE',name:full3,resolvedType:vv.resolvedType,isRemote:remote3,boundTo:prop});
          var fullLower3=full3.toLowerCase(), base3=fullLower3.split('/').pop(), ql3=q.toLowerCase();
          if (fullLower3.indexOf(ql3)!==-1 || base3.indexOf(ql3)!==-1 || ql3.indexOf(base3)!==-1) found=true;
        }
      }
    }
  }catch(e){}
  return { found:found, items:items };
}
async function performSmartSearch(q){
  var allFound=[], uniqVars=[], uniqStyles=[];
  // 1) selection scope
  if (figma.currentPage.selection.length>0){
    var selNodes=[];
    for (var i=0;i<figma.currentPage.selection.length;i++) selNodes = selNodes.concat(getAllNodes(figma.currentPage.selection[i]));
    var selRes=[], selStats={checkedNodes:0,nodesWithItems:0,matchingNodes:0};
    for (var j=0;j<selNodes.length;j++){
      var n=selNodes[j]; selStats.checkedNodes++;
      var res=await nodeHasVariableOrStyle(n,q);
      if (res.items.length){ selStats.nodesWithItems++; res.items.forEach(function(it){ (it.type==='VARIABLE'?uniqVars:uniqStyles).indexOf(it.name)===-1 && (it.type==='VARIABLE'?uniqVars:uniqStyles).push(it.name); }); }
      if (res.found){
        selStats.matchingNodes++;
        cacheNode(n);
        selRes.push({ id:n.id, name:n.name, type:n.type, path:buildNodePath(n), foundItems:res.items });
        res.items.forEach(function(it){ if (!allFound.some(function(a){return a.name===it.name && a.type===it.type;})) allFound.push(it); });
      }
    }
    if (selRes.length) return {
      results:selRes, context:'Selected layers ('+figma.currentPage.selection.length+' items)',
      searchStatistics:{ checkedNodes:selStats.checkedNodes, nodesWithItems:selStats.nodesWithItems, matchingNodes:selStats.matchingNodes,
        uniqueVariables:uniqVars, uniqueStyles:uniqStyles, totalUniqueItems:uniqVars.length+uniqStyles.length },
      foundItems:allFound, totalSearched:selNodes.length, scopeInfo:{ searchedSelection:true, expandedToPage:false }
    };
  }
  // 2) page scope
  var pageNodes=[], pageResults=[], pageStats={checkedNodes:0,nodesWithItems:0,matchingNodes:0};
  for (var c=0;c<figma.currentPage.children.length;c++) pageNodes = pageNodes.concat(getAllNodes(figma.currentPage.children[c]));
  allFound=[]; uniqVars=[]; uniqStyles=[];
  for (var p=0;p<pageNodes.length;p++){
    var node=pageNodes[p]; pageStats.checkedNodes++;
    var chk=await nodeHasVariableOrStyle(node,q);
    if (chk.items.length){ pageStats.nodesWithItems++; chk.items.forEach(function(it){ (it.type==='VARIABLE'?uniqVars:uniqStyles).indexOf(it.name)===-1 && (it.type==='VARIABLE'?uniqVars:uniqStyles).push(it.name); }); }
    if (chk.found){
      pageStats.matchingNodes++;
      cacheNode(node);
      pageResults.push({ id:node.id, name:node.name, type:node.type, path:buildNodePath(node), foundItems:chk.items });
      chk.items.forEach(function(it){ if (!allFound.some(function(a){return a.name===it.name && a.type===it.type;})) allFound.push(it); });
    }
  }
  return {
    results:pageResults, context:figma.currentPage.name + (figma.currentPage.selection.length ? ' (expanded from selection)' : ''),
    searchStatistics:{ checkedNodes:pageStats.checkedNodes, nodesWithItems:pageStats.nodesWithItems, matchingNodes:pageStats.matchingNodes,
      uniqueVariables:uniqVars, uniqueStyles:uniqStyles, totalUniqueItems:uniqVars.length+uniqStyles.length },
    foundItems:allFound, totalSearched:pageNodes.length, scopeInfo:{ searchedSelection:figma.currentPage.selection.length>0, expandedToPage:true }
  };
}

/* ----------------- UI bridge ----------------- */
figma.ui.onmessage = async function(msg){
  if (msg.type==='find-variables-and-styles'){
    var q=(msg.searchTerm||'').trim();
    if (!q){ figma.ui.postMessage({type:'error', message:'Please enter a variable or style name to search for'}); return; }
    try{
      var res=await performSmartSearch(q);
      figma.ui.postMessage({ type:'search-results', results:res.results, searchTerm:q, context:res.context, foundItems:res.foundItems, totalSearched:res.totalSearched, searchStatistics:res.searchStatistics, scopeInfo:res.scopeInfo, searchType:'VARIABLES_STYLES' });
    }catch(e){ figma.ui.postMessage({type:'error', message:'Search failed: '+(e&&e.message?e.message:e)}); }
  }

  if (msg.type==='find-layer-names'){
    var q2=(msg.searchTerm||'').trim();
    if (!q2){ figma.ui.postMessage({type:'error', message:'Please enter a layer name to search for'}); return; }
    try{
      var r2=performLayerNameSearch(q2);
      figma.ui.postMessage({ type:'search-results', results:r2.results, searchTerm:q2, context:r2.context, foundItems:r2.foundItems, totalSearched:r2.totalSearched, searchStatistics:r2.searchStatistics, searchType:'LAYER_NAME', strictError:r2.strictError });
    }catch(e){ figma.ui.postMessage({type:'error', message:'Layer name search failed: '+(e&&e.message?e.message:e)}); }
  }

  // Selection: no state changes; best-effort; now uses cache and gives clear reasons
  if (msg.type==='select-node' && msg.id){
    try{
      var raw = fromCacheOrId(msg.id);
      if (!raw){ figma.ui.postMessage({ type:'select-node:fail', reason:'not-found', id:msg.id }); return; }

      var candidate = isSceneNode(raw) ? raw : findFirstSceneDescendant(raw);
      if (!candidate){ figma.ui.postMessage({ type:'select-node:fail', reason:'not-scene', id:msg.id }); return; }

      // Go to the correct page first
      var page = getPageOf(candidate);
      if (page && figma.currentPage.id !== page.id) figma.currentPage = page;

      // 1) Try exact node
      if (trySelect(candidate)){
        figma.ui.postMessage({ type:'select-node:ok', id:candidate.id, exact:true });
        return;
      }

      // 2) If inside an Instance, try selecting the Instance itself
      var instOwner = insideInstanceChild(candidate) ? liftToOwningInstance(candidate) : null;
      if (instOwner && trySelect(instOwner)){
        figma.ui.postMessage({ type:'select-node:ok', id:instOwner.id, exact:false, reason:'inside-instance-child' });
        return;
      }

      // 3) If blocked by lock/visibility, try nearest selectable ancestor (still no state changes)
      var state = chainState(candidate);
      var fallback = nearestSelectableAncestor(candidate);
      if (fallback && trySelect(fallback)){
        figma.ui.postMessage({
          type:'select-node:ok', id:fallback.id, exact:false,
          reason:(state.locked||state.hidden)?'locked-or-hidden':'fallback-parent',
          blocker: state.blocker ? { id:state.blocker.id, name:state.blocker.name, type:state.blocker.type } : null
        });
        return;
      }

      // 4) Couldn’t select anything; tell the UI *why*
      var why = chainState(candidate);
      figma.ui.postMessage({
        type:'select-node:blocked',
        id:candidate.id,
        insideInstance: insideInstanceChild(candidate),
        locked: !!why.locked, hidden: !!why.hidden,
        blocker: why.blocker ? { id:why.blocker.id, name:why.blocker.name, type:why.blocker.type } : null
      });
    }catch(e){
      figma.ui.postMessage({ type:'select-node:fail', reason:'exception', detail:String(e) });
    }
  }
};
