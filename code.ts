// Variable & Style Finder Plugin - Fixed Style Matching Logic
figma.showUI(__html__, { 
  width: 420, 
  height: 700,
  themeColors: true 
});

console.log('🚀 Variable & Style Finder Plugin Loaded - STYLE MATCHING FIXED');

interface SearchResult {
  id: string;
  name: string;
  type: string;
  path: string;
  foundItems: FoundItem[];
}

interface FoundItem {
  type: 'VARIABLE' | 'STYLE';
  name: string;
  resolvedType?: string;
  styleType?: string;
  isRemote?: boolean;
  boundTo?: string;
}

interface ZoomResult {
  success: boolean;
  nodeId?: string;
  nodeName?: string;
  nodePath?: string;
  error?: string;
  details?: string;
}

interface SearchStatistics {
  checkedNodes: number;
  nodesWithItems: number;
  matchingNodes: number;
  uniqueVariables: string[];
  uniqueStyles: string[];
  totalUniqueItems: number;
}

// Simple function to get all nodes recursively
function getAllNodes(node: SceneNode): SceneNode[] {
  const nodes: SceneNode[] = [node];
  if ('children' in node) {
    for (const child of node.children) {
      nodes.push(...getAllNodes(child));
    }
  }
  return nodes;
}

// Simple function to build a readable path for a node
function buildNodePath(node: BaseNode): string {
  const path: string[] = [];
  let current: BaseNode | null = node;
  
  while (current && current.type !== 'DOCUMENT') {
    path.unshift(current.name || 'Unnamed');
    current = current.parent;
  }
  
  return path.join(' → ');
}

// ASYNC function to safely get variable by ID
async function safeGetVariable(variableId: string): Promise<Variable | null> {
  try {
    const variable = await figma.variables.getVariableByIdAsync(variableId);
    return variable;
  } catch (error: any) {
    try {
      const variable = figma.variables.getVariableById(variableId);
      return variable;
    } catch (syncError: any) {
      console.warn('Failed to get variable with both async and sync methods:', error.message, syncError.message);
      return null;
    }
  }
}

// ASYNC function to safely get variable collection
async function safeGetVariableCollection(collectionId: string): Promise<VariableCollection | null> {
  try {
    const collection = await figma.variables.getVariableCollectionByIdAsync(collectionId);
    return collection;
  } catch (error: any) {
    try {
      const collection = figma.variables.getVariableCollectionById(collectionId);
      return collection;
    } catch (syncError: any) {
      console.warn('Failed to get collection with both async and sync methods:', error.message, syncError.message);
      return null;
    }
  }
}

// Enhanced function to check style name matching with multiple strategies
function styleMatches(styleName: string, searchTerm: string): boolean {
  if (!styleName || !searchTerm) return false;
  
  const styleNameLower = styleName.toLowerCase().trim();
  const searchLower = searchTerm.toLowerCase().trim();
  const searchParts = searchLower.split('/');
  const searchBase = searchParts[searchParts.length - 1];
  
  console.log('        🔍 Style matching comparison:');
  console.log('          Style name:', styleNameLower);
  console.log('          Search term:', searchLower);
  console.log('          Search base:', searchBase);
  
  // Strategy 1: Exact match
  if (styleNameLower === searchLower) {
    console.log('          ✅ EXACT MATCH!');
    return true;
  }
  
  // Strategy 2: Contains match
  if (styleNameLower.includes(searchLower)) {
    console.log('          ✅ CONTAINS MATCH!');
    return true;
  }
  
  // Strategy 3: Search contains style name
  if (searchLower.includes(styleNameLower)) {
    console.log('          ✅ REVERSE CONTAINS MATCH!');
    return true;
  }
  
  // Strategy 4: Base name matching
  const styleNameParts = styleNameLower.split('/');
  const styleBase = styleNameParts[styleNameParts.length - 1];
  if (styleBase === searchBase || styleBase.includes(searchBase) || searchBase.includes(styleBase)) {
    console.log('          ✅ BASE NAME MATCH!', styleBase, 'vs', searchBase);
    return true;
  }
  
  // Strategy 5: Partial component matching
  for (const searchPart of searchParts) {
    if (searchPart.length > 2 && styleNameLower.includes(searchPart)) {
      console.log('          ✅ PARTIAL COMPONENT MATCH!', searchPart);
      return true;
    }
  }
  
  // Strategy 6: Word boundary matching (for cases like "warning" matching "warning/100")
  const searchWords = searchLower.replace(/[\/\-_]/g, ' ').split(' ').filter(w => w.length > 1);
  const styleWords = styleNameLower.replace(/[\/\-_]/g, ' ').split(' ').filter(w => w.length > 1);
  
  for (const searchWord of searchWords) {
    for (const styleWord of styleWords) {
      if (searchWord === styleWord || 
          searchWord.includes(styleWord) || 
          styleWord.includes(searchWord)) {
        console.log('          ✅ WORD BOUNDARY MATCH!', searchWord, 'vs', styleWord);
        return true;
      }
    }
  }
  
  console.log('          ❌ No match found');
  return false;
}

// Enhanced ASYNC function to check if a node uses specific variables or styles
async function nodeHasVariableOrStyle(node: SceneNode, searchTerm: string): Promise<{ found: boolean; items: FoundItem[] }> {
  let found = false;
  const foundItems: FoundItem[] = [];
  
  try {
    const searchLower = searchTerm.toLowerCase().trim();
    const searchParts = searchLower.split('/');
    const searchBase = searchParts[searchParts.length - 1];
    
    // === ENHANCED STYLE DETECTION WITH BETTER MATCHING ===
    console.log('    🎨 Checking styles for:', node.name);
    
    // Check fill style with enhanced matching
    if ('fillStyleId' in node && (node as any).fillStyleId && (node as any).fillStyleId !== figma.mixed) {
      try {
        const fillStyle = figma.getStyleById((node as any).fillStyleId);
        if (fillStyle && fillStyle.type === 'PAINT') {
          console.log('      📝 Found fill style:', fillStyle.name);
          foundItems.push({
            type: 'STYLE',
            name: fillStyle.name,
            styleType: 'PAINT',
            isRemote: (fillStyle as any).remote || false
          });
          
          // Use enhanced style matching
          if (styleMatches(fillStyle.name, searchTerm)) {
            console.log('      ✅ MATCH: Fill style matches search!', fillStyle.name, 'vs', searchTerm);
            found = true;
          }
        }
      } catch (e) {
        console.warn('      ❌ Error getting fill style:', e);
      }
    }
    
    // Check stroke style with enhanced matching
    if ('strokeStyleId' in node && (node as any).strokeStyleId && (node as any).strokeStyleId !== figma.mixed) {
      try {
        const strokeStyle = figma.getStyleById((node as any).strokeStyleId);
        if (strokeStyle && strokeStyle.type === 'PAINT') {
          console.log('      📝 Found stroke style:', strokeStyle.name);
          foundItems.push({
            type: 'STYLE',
            name: strokeStyle.name,
            styleType: 'PAINT',
            isRemote: (strokeStyle as any).remote || false
          });
          
          if (styleMatches(strokeStyle.name, searchTerm)) {
            console.log('      ✅ MATCH: Stroke style matches search!', strokeStyle.name, 'vs', searchTerm);
            found = true;
          }
        }
      } catch (e) {
        console.warn('      ❌ Error getting stroke style:', e);
      }
    }
    
    // Check text style with enhanced matching
    if (node.type === 'TEXT' && 'textStyleId' in node && (node as any).textStyleId && (node as any).textStyleId !== figma.mixed) {
      try {
        const textStyle = figma.getStyleById((node as any).textStyleId);
        if (textStyle && textStyle.type === 'TEXT') {
          console.log('      📝 Found text style:', textStyle.name);
          foundItems.push({
            type: 'STYLE',
            name: textStyle.name,
            styleType: 'TEXT',
            isRemote: (textStyle as any).remote || false
          });
          
          if (styleMatches(textStyle.name, searchTerm)) {
            console.log('      ✅ MATCH: Text style matches search!', textStyle.name, 'vs', searchTerm);
            found = true;
          }
        }
      } catch (e) {
        console.warn('      ❌ Error getting text style:', e);
      }
    }
    
    // Check effect style with enhanced matching
    if ('effectStyleId' in node && (node as any).effectStyleId && (node as any).effectStyleId !== figma.mixed) {
      try {
        const effectStyle = figma.getStyleById((node as any).effectStyleId);
        if (effectStyle && effectStyle.type === 'EFFECT') {
          console.log('      📝 Found effect style:', effectStyle.name);
          foundItems.push({
            type: 'STYLE',
            name: effectStyle.name,
            styleType: 'EFFECT',
            isRemote: (effectStyle as any).remote || false
          });
          
          if (styleMatches(effectStyle.name, searchTerm)) {
            console.log('      ✅ MATCH: Effect style matches search!', effectStyle.name, 'vs', searchTerm);
            found = true;
          }
        }
      } catch (e) {
        console.warn('      ❌ Error getting effect style:', e);
      }
    }
    
    // Check grid style with enhanced matching
    if ('gridStyleId' in node && (node as any).gridStyleId && (node as any).gridStyleId !== figma.mixed) {
      try {
        const gridStyle = figma.getStyleById((node as any).gridStyleId);
        if (gridStyle && gridStyle.type === 'GRID') {
          console.log('      📝 Found grid style:', gridStyle.name);
          foundItems.push({
            type: 'STYLE',
            name: gridStyle.name,
            styleType: 'GRID',
            isRemote: (gridStyle as any).remote || false
          });
          
          if (styleMatches(gridStyle.name, searchTerm)) {
            console.log('      ✅ MATCH: Grid style matches search!', gridStyle.name, 'vs', searchTerm);
            found = true;
          }
        }
      } catch (e) {
        console.warn('      ❌ Error getting grid style:', e);
      }
    }
    
    // === ENHANCED ASYNC VARIABLE DETECTION ===
    console.log('    🔗 Checking variables for:', node.name);
    
    // Check variables in fills
    if ('fills' in node && Array.isArray((node as any).fills)) {
      const fills = (node as any).fills as Paint[];
      console.log('      📝 Node has', fills.length, 'fills');
      
      for (let i = 0; i < fills.length; i++) {
        const fill = fills[i];
        console.log(`        Fill ${i}:`, fill.type, fill.visible !== false ? 'visible' : 'hidden');
        
        if (fill && (fill as any).boundVariables) {
          const boundVars = (fill as any).boundVariables;
          console.log('        Fill has bound variables:', Object.keys(boundVars));
          
          for (const prop in boundVars) {
            const binding = boundVars[prop];
            if (binding && binding.id) {
              try {
                console.log('        🔍 Getting variable with ID:', binding.id);
                const variable = await safeGetVariable(binding.id);
                if (variable) {
                  let varName = variable.name;
                  let fullName = varName;
                  let isRemote = false;
                  
                  // Try to get collection info
                  try {
                    console.log('        🔍 Getting collection for variable:', varName);
                    const collection = await safeGetVariableCollection(variable.variableCollectionId);
                    if (collection) {
                      fullName = `${collection.name}/${variable.name}`;
                      isRemote = (collection as any).remote || false;
                      console.log('        📁 Collection found:', collection.name, 'Remote:', isRemote);
                    }
                  } catch (collErr: any) {
                    console.warn('          Could not get collection for variable:', varName, collErr.message);
                  }
                  
                  console.log('        🔗 Found variable in fill:', fullName, '(', (variable as any).resolvedType, ')');
                  foundItems.push({
                    type: 'VARIABLE',
                    name: fullName,
                    resolvedType: (variable as any).resolvedType,
                    isRemote
                  });
                  
                  // ENHANCED FLEXIBLE MATCHING FOR VARIABLES
                  const fullNameLower = fullName.toLowerCase();
                  const varNameLower = varName.toLowerCase();
                  const fullNameParts = fullNameLower.split('/');
                  const varBaseName = fullNameParts[fullNameParts.length - 1];
                  
                  console.log('        🔍 Comparing:');
                  console.log('          Search:', searchLower, '| Base:', searchBase);
                  console.log('          Variable:', fullNameLower, '| VarBase:', varBaseName);
                  
                  if (fullNameLower.includes(searchLower) || 
                      varNameLower.includes(searchLower) ||
                      fullNameLower.includes(searchBase) ||
                      varBaseName.includes(searchBase) ||
                      searchLower.includes(varBaseName) ||
                      (searchBase.length > 3 && varBaseName.includes(searchBase.substring(0, searchBase.length - 1))) ||
                      (varBaseName.length > 3 && searchBase.includes(varBaseName.substring(0, varBaseName.length - 1)))) {
                    console.log('        ✅ MATCH: Fill variable matches search!', fullName, 'vs', searchTerm);
                    found = true;
                  } else {
                    console.log('        ❌ No match for variable:', fullName);
                  }
                } else {
                  console.log('        ❌ Variable was null for ID:', binding.id);
                }
              } catch (e: any) {
                console.warn('        ❌ Error getting fill variable:', e.message);
              }
            }
          }
        } else {
          console.log('        Fill has no bound variables');
        }
      }
    }
    
    // Check variables in strokes
    if ('strokes' in node && Array.isArray((node as any).strokes)) {
      const strokes = (node as any).strokes as Paint[];
      console.log('      📝 Node has', strokes.length, 'strokes');
      
      for (const stroke of strokes) {
        if (stroke && (stroke as any).boundVariables) {
          for (const prop in (stroke as any).boundVariables) {
            const binding = (stroke as any).boundVariables[prop];
            if (binding && binding.id) {
              try {
                const variable = await safeGetVariable(binding.id);
                if (variable) {
                  let varName = variable.name;
                  let fullName = varName;
                  let isRemote = false;
                  
                  try {
                    const collection = await safeGetVariableCollection(variable.variableCollectionId);
                    if (collection) {
                      fullName = `${collection.name}/${variable.name}`;
                      isRemote = (collection as any).remote || false;
                    }
                  } catch (collErr) {
                    // Ignore
                  }
                  
                  console.log('        🔗 Found variable in stroke:', fullName);
                  foundItems.push({
                    type: 'VARIABLE',
                    name: fullName,
                    resolvedType: (variable as any).resolvedType,
                    isRemote
                  });
                  
                  const fullNameLower = fullName.toLowerCase();
                  const varNameLower = varName.toLowerCase();
                  if (fullNameLower.includes(searchLower) || 
                      varNameLower.includes(searchLower) ||
                      fullNameLower.includes(searchBase) ||
                      searchLower.includes(fullNameLower.split('/').pop() || '')) {
                    console.log('        ✅ MATCH: Stroke variable matches search!', fullName, 'vs', searchTerm);
                    found = true;
                  }
                }
              } catch (e: any) {
                console.warn('        ❌ Error getting stroke variable:', e.message);
              }
            }
          }
        }
      }
    }
    
    // Check other bound variables (width, height, corner radius, etc.)
    const boundVariableProps = ['width', 'height', 'cornerRadius', 'paddingLeft', 'paddingRight', 'paddingTop', 'paddingBottom', 'rotation', 'opacity'];
    
    if ((node as any).boundVariables) {
      console.log('      📝 Node has bound variables for:', Object.keys((node as any).boundVariables));
    }
    
    for (const propName of boundVariableProps) {
      if ((node as any).boundVariables && (node as any).boundVariables[propName]) {
        const binding = (node as any).boundVariables[propName];
        if (binding && binding.id) {
          try {
            const variable = await safeGetVariable(binding.id);
            if (variable) {
              let varName = variable.name;
              let fullName = varName;
              let isRemote = false;
              
              try {
                const collection = await safeGetVariableCollection(variable.variableCollectionId);
                if (collection) {
                  fullName = `${collection.name}/${variable.name}`;
                  isRemote = (collection as any).remote || false;
                }
              } catch (collErr) {
                // Ignore
              }
              
              console.log(`        🔗 Found variable in ${propName}:`, fullName);
              foundItems.push({
                type: 'VARIABLE',
                name: fullName,
                resolvedType: (variable as any).resolvedType,
                isRemote,
                boundTo: propName
              });
              
              const fullNameLower = fullName.toLowerCase();
              const varNameLower = varName.toLowerCase();
              if (fullNameLower.includes(searchLower) || 
                  varNameLower.includes(searchLower) ||
                  fullNameLower.includes(searchBase) ||
                  searchLower.includes(fullNameLower.split('/').pop() || '')) {
                console.log(`        ✅ MATCH: ${propName} variable matches search!`, fullName, 'vs', searchTerm);
                found = true;
              }
            }
          } catch (e: any) {
            console.warn(`        ❌ Error getting ${propName} variable:`, e.message);
          }
        }
      }
    }
    
    // Summary for this node
    if (foundItems.length > 0) {
      console.log('    📋 Total items found on node:', foundItems.length, 'Match:', found);
      if (found) {
        console.log('    🎯 THIS NODE WILL BE INCLUDED IN RESULTS');
      } else {
        console.log('    ⚠️ Node has variables/styles but none match search');
      }
    } else {
      console.log('    📋 No variables or styles found on this node');
    }
    
  } catch (error: any) {
    console.error('  ❌ Error checking node:', node.name, error.message);
  }
  
  return { found, items: foundItems };
}

// BULLETPROOF ZOOM FUNCTION - Keep this working perfectly!
function zoomToNode(nodeId: string, nodeName: string): ZoomResult {
  console.log('🎯 === ZOOM FUNCTION START ===');
  console.log('Target Node ID:', nodeId);
  console.log('Target Node Name:', nodeName);
  
  try {
    if (!nodeId || typeof nodeId !== 'string') {
      console.error('❌ Invalid node ID:', nodeId);
      return {
        success: false,
        error: 'Invalid node ID provided',
        details: 'Node ID must be a non-empty string'
      };
    }
    
    console.log('🔍 Searching for node...');
    let targetNode: BaseNode | null = null;
    
    try {
      targetNode = figma.getNodeById(nodeId);
      console.log('✅ Found node directly:', targetNode ? targetNode.name : 'null');
    } catch (findError: any) {
      console.warn('⚠️ Direct node lookup failed:', findError.message);
      
      console.log('🔍 Trying fallback search across all pages...');
      const allPages = figma.root.children;
      
      for (const page of allPages) {
        console.log('   Searching page:', page.name);
        
        try {
          const pageNodes = getAllNodes(page as PageNode);
          for (const pageNode of pageNodes) {
            if (pageNode.id === nodeId) {
              targetNode = pageNode;
              console.log('✅ Found node in fallback search:', targetNode.name);
              break;
            }
          }
        } catch (pageError: any) {
          console.warn('   Error searching page:', page.name, pageError.message);
        }
        
        if (targetNode) break;
      }
    }
    
    if (!targetNode) {
      console.error('❌ Node not found after exhaustive search');
      return {
        success: false,
        error: 'Node not found',
        details: `Node with ID "${nodeId}" does not exist or has been deleted`
      };
    }
    
    console.log('✅ Target node confirmed:', targetNode.name, 'Type:', targetNode.type);
    
    let nodePage: PageNode | null = null;
    let current: BaseNode | null = targetNode;
    while (current && current.type !== 'PAGE') {
      current = current.parent;
    }
    nodePage = current as PageNode | null;
    
    if (nodePage) {
      console.log('📄 Node is on page:', nodePage.name);
      if (figma.currentPage !== nodePage) {
        console.log('🔄 Switching to correct page...');
        figma.currentPage = nodePage;
        console.log('✅ Switched to page:', nodePage.name);
      } else {
        console.log('✅ Already on correct page');
      }
    } else {
      console.warn('⚠️ Could not determine node page');
    }
    
    console.log('🎯 Selecting node...');
    try {
      figma.currentPage.selection = [targetNode as SceneNode];
      console.log('✅ Node selected successfully');
    } catch (selectionError: any) {
      console.error('❌ Failed to select node:', selectionError.message);
    }
    
    console.log('🔍 Zooming to node...');
    try {
      figma.viewport.scrollAndZoomIntoView([targetNode]);
      console.log('✅ Zoom successful!');
      
      return {
        success: true,
        nodeId,
        nodeName: targetNode.name,
        nodePath: buildNodePath(targetNode)
      };
      
    } catch (zoomError: any) {
      console.error('❌ Zoom failed:', zoomError.message);
      return {
        success: false,
        error: 'Zoom operation failed',
        details: zoomError.message
      };
    }
    
  } catch (generalError: any) {
    console.error('❌ General error in zoom function:', generalError);
    return {
      success: false,
      error: 'Unexpected error during zoom',
      details: generalError.message
    };
  } finally {
    console.log('🎯 === ZOOM FUNCTION END ===');
  }
}

// Handle messages from UI - ASYNC VERSION
figma.ui.onmessage = async (msg) => {
  console.log('📨 Message from UI:', msg.type, msg);
  
  if (msg.type === 'find-variables-and-styles') {
    const searchTerm: string = msg.searchTerm;
    
    if (!searchTerm || !searchTerm.trim()) {
      figma.ui.postMessage({
        type: 'error',
        message: 'Please enter a variable or style name to search for'
      });
      return;
    }
    
    console.log('🔍 === ENHANCED STYLE MATCHING SEARCH START ===');
    console.log('Search term:', searchTerm);
    console.log('Search term lowercase:', searchTerm.toLowerCase());
    console.log('Search parts:', searchTerm.toLowerCase().split('/'));
    console.log('Search base:', searchTerm.toLowerCase().split('/').pop());
    
    // Get all nodes to search
    let nodesToSearch: SceneNode[] = [];
    let context = '';
    
    if (figma.currentPage.selection.length > 0) {
      console.log('🎯 Searching in selection');
      for (const selected of figma.currentPage.selection) {
        const allNodes = getAllNodes(selected);
        nodesToSearch = nodesToSearch.concat(allNodes);
      }
      context = `Selected layers (${figma.currentPage.selection.length} items)`;
    } else {
      console.log('🎯 Searching entire page');
      for (const child of figma.currentPage.children) {
        const allNodes = getAllNodes(child);
        nodesToSearch = nodesToSearch.concat(allNodes);
      }
      context = figma.currentPage.name;
    }
    
    console.log('📊 Total nodes to check:', nodesToSearch.length);
    
    // Check each node ASYNC
    const results: SearchResult[] = [];
    const allFoundItems: FoundItem[] = [];
    let checkedNodes = 0;
    let nodesWithItems = 0;
    let matchingNodes = 0;
    const uniqueVariablesFound: string[] = [];
    const uniqueStylesFound: string[] = [];
    
    for (const node of nodesToSearch) {
      checkedNodes++;
      
      console.log(`  🔍 Checking node ${checkedNodes}/${nodesToSearch.length}:`, node.name, `(${node.type})`);
      
      // ASYNC call to check node
      const check = await nodeHasVariableOrStyle(node, searchTerm);
      
      if (check.items.length > 0) {
        nodesWithItems++;
        console.log('    📋 Node has', check.items.length, 'variables/styles');
        
        // Collect all unique variables and styles found
        for (const item of check.items) {
          if (item.type === 'VARIABLE') {
            if (!uniqueVariablesFound.includes(item.name)) {
              uniqueVariablesFound.push(item.name);
            }
          } else {
            if (!uniqueStylesFound.includes(item.name)) {
              uniqueStylesFound.push(item.name);
            }
          }
        }
      }
      
      if (check.found) {
        matchingNodes++;
        console.log('    ✅ MATCHING NODE FOUND:', node.name);
        
        results.push({
          id: node.id,
          name: node.name,
          type: node.type,
          path: buildNodePath(node),
          foundItems: check.items
        });
        
        // Collect unique found items for summary
        for (const item of check.items) {
          const exists = allFoundItems.some(existingItem => 
            existingItem.name === item.name && existingItem.type === item.type
          );
          if (!exists) {
            allFoundItems.push(item);
          }
        }
      }
    }
    
    console.log('📊 === ENHANCED STYLE MATCHING SUMMARY ===');
    console.log('Total nodes checked:', checkedNodes);
    console.log('Nodes with variables/styles:', nodesWithItems);
    console.log('Nodes matching search:', matchingNodes);
    console.log('Final results count:', results.length);
    console.log('Unique variables/styles found:', allFoundItems.length);
    console.log('All unique variables found:', uniqueVariablesFound);
    console.log('All unique styles found:', uniqueStylesFound);
    console.log('🎉 Enhanced style matching search complete!');
    
    // Send enhanced results to UI
    figma.ui.postMessage({
      type: 'search-results',
      results,
      searchTerm,
      context,
      foundItems: allFoundItems,
      totalSearched: nodesToSearch.length,
      searchStatistics: {
        checkedNodes,
        nodesWithItems,
        matchingNodes,
        uniqueVariables: uniqueVariablesFound,
        uniqueStyles: uniqueStylesFound,
        totalUniqueItems: uniqueVariablesFound.length + uniqueStylesFound.length
      }
    });
  }
  
  if (msg.type === 'zoom-to-layer') {
    const nodeId: string = msg.nodeId;
    const nodeName: string = msg.nodeName || 'Unknown';
    
    const result = zoomToNode(nodeId, nodeName);
    
    figma.ui.postMessage({
      type: 'zoom-result',
      success: result.success,
      nodeId,
      nodeName,
      error: result.error,
      details: result.details,
      nodePath: result.nodePath
    });
  }
};

console.log('✅ Variable & Style Finder ready - ENHANCED STYLE MATCHING FIXED!');