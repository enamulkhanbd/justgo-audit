// Variable & Style Finder Plugin - Fixed Search Scope Logic
figma.showUI(__html__, {
    width: 420,
    height: 700,
    themeColors: true
});

console.log('🚀 Variable & Style Finder Plugin Loaded - SEARCH SCOPE FIXED');

// Simple function to get all nodes recursively
function getAllNodes(node) {
    var nodes = [node];
    if ('children' in node) {
        for (var i = 0; i < node.children.length; i++) {
            nodes = nodes.concat(getAllNodes(node.children[i]));
        }
    }
    return nodes;
}

// Simple function to build a readable path for a node
function buildNodePath(node) {
    var path = [];
    var current = node;

    while (current && current.type !== 'DOCUMENT') {
        path.unshift(current.name || 'Unnamed');
        current = current.parent;
    }

    return path.join(' → ');
}

// ASYNC function to safely get variable by ID
async function safeGetVariable(variableId) {
    try {
        var variable = await figma.variables.getVariableByIdAsync(variableId);
        return variable;
    } catch (error) {
        try {
            var variable = figma.variables.getVariableById(variableId);
            return variable;
        } catch (syncError) {
            console.warn('Failed to get variable with both async and sync methods:', error.message, syncError.message);
            return null;
        }
    }
}

// ASYNC function to safely get variable collection
async function safeGetVariableCollection(collectionId) {
    try {
        var collection = await figma.variables.getVariableCollectionByIdAsync(collectionId);
        return collection;
    } catch (error) {
        try {
            var collection = figma.variables.getVariableCollectionById(collectionId);
            return collection;
        } catch (syncError) {
            console.warn('Failed to get collection with both async and sync methods:', error.message, syncError.message);
            return null;
        }
    }
}

// Enhanced function to check style name matching with multiple strategies
function styleMatches(styleName, searchTerm) {
    if (!styleName || !searchTerm) return false;

    var styleNameLower = styleName.toLowerCase().trim();
    var searchLower = searchTerm.toLowerCase().trim();
    var searchParts = searchLower.split('/');
    var searchBase = searchParts[searchParts.length - 1];

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
    var styleNameParts = styleNameLower.split('/');
    var styleBase = styleNameParts[styleNameParts.length - 1];
    if (styleBase === searchBase || styleBase.includes(searchBase) || searchBase.includes(styleBase)) {
        console.log('          ✅ BASE NAME MATCH!', styleBase, 'vs', searchBase);
        return true;
    }

    // Strategy 5: Partial component matching
    for (var i = 0; i < searchParts.length; i++) {
        var searchPart = searchParts[i];
        if (searchPart.length > 2 && styleNameLower.includes(searchPart)) {
            console.log('          ✅ PARTIAL COMPONENT MATCH!', searchPart);
            return true;
        }
    }

    // Strategy 6: Word boundary matching (for cases like "warning" matching "warning/100")
    var searchWords = searchLower.replace(/[\/\-_]/g, ' ').split(' ').filter(function (w) { return w.length > 1; });
    var styleWords = styleNameLower.replace(/[\/\-_]/g, ' ').split(' ').filter(function (w) { return w.length > 1; });

    for (var i = 0; i < searchWords.length; i++) {
        for (var j = 0; j < styleWords.length; j++) {
            if (searchWords[i] === styleWords[j] ||
                searchWords[i].includes(styleWords[j]) ||
                styleWords[j].includes(searchWords[i])) {
                console.log('          ✅ WORD BOUNDARY MATCH!', searchWords[i], 'vs', styleWords[j]);
                return true;
            }
        }
    }

    console.log('          ❌ No match found');
    return false;
}

// Enhanced ASYNC function to check if a node uses specific variables or styles
async function nodeHasVariableOrStyle(node, searchTerm) {
    var found = false;
    var foundItems = [];

    try {
        var searchLower = searchTerm.toLowerCase().trim();
        var searchParts = searchLower.split('/');
        var searchBase = searchParts[searchParts.length - 1];

        // === ENHANCED STYLE DETECTION WITH BETTER MATCHING ===
        console.log('    🎨 Checking styles for:', node.name);

        // Check fill style with enhanced matching
        if ('fillStyleId' in node && node.fillStyleId && node.fillStyleId !== figma.mixed) {
            try {
                var fillStyle = figma.getStyleById(node.fillStyleId);
                if (fillStyle) {
                    console.log('      📝 Found fill style:', fillStyle.name);
                    foundItems.push({
                        type: 'STYLE',
                        name: fillStyle.name,
                        styleType: 'PAINT',
                        isRemote: fillStyle.remote || false
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
        if ('strokeStyleId' in node && node.strokeStyleId && node.strokeStyleId !== figma.mixed) {
            try {
                var strokeStyle = figma.getStyleById(node.strokeStyleId);
                if (strokeStyle) {
                    console.log('      📝 Found stroke style:', strokeStyle.name);
                    foundItems.push({
                        type: 'STYLE',
                        name: strokeStyle.name,
                        styleType: 'PAINT',
                        isRemote: strokeStyle.remote || false
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
        if (node.type === 'TEXT' && 'textStyleId' in node && node.textStyleId && node.textStyleId !== figma.mixed) {
            try {
                var textStyle = figma.getStyleById(node.textStyleId);
                if (textStyle) {
                    console.log('      📝 Found text style:', textStyle.name);
                    foundItems.push({
                        type: 'STYLE',
                        name: textStyle.name,
                        styleType: 'TEXT',
                        isRemote: textStyle.remote || false
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
        if ('effectStyleId' in node && node.effectStyleId && node.effectStyleId !== figma.mixed) {
            try {
                var effectStyle = figma.getStyleById(node.effectStyleId);
                if (effectStyle) {
                    console.log('      📝 Found effect style:', effectStyle.name);
                    foundItems.push({
                        type: 'STYLE',
                        name: effectStyle.name,
                        styleType: 'EFFECT',
                        isRemote: effectStyle.remote || false
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
        if ('gridStyleId' in node && node.gridStyleId && node.gridStyleId !== figma.mixed) {
            try {
                var gridStyle = figma.getStyleById(node.gridStyleId);
                if (gridStyle) {
                    console.log('      📝 Found grid style:', gridStyle.name);
                    foundItems.push({
                        type: 'STYLE',
                        name: gridStyle.name,
                        styleType: 'GRID',
                        isRemote: gridStyle.remote || false
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
        if ('fills' in node && Array.isArray(node.fills)) {
            console.log('      📝 Node has', node.fills.length, 'fills');
            for (var i = 0; i < node.fills.length; i++) {
                var fill = node.fills[i];
                console.log('        Fill', i, ':', fill.type, fill.visible !== false ? 'visible' : 'hidden');

                if (fill && fill.boundVariables) {
                    console.log('        Fill has bound variables:', Object.keys(fill.boundVariables));
                    for (var prop in fill.boundVariables) {
                        var binding = fill.boundVariables[prop];
                        if (binding && binding.id) {
                            try {
                                console.log('        🔍 Getting variable with ID:', binding.id);
                                var variable = await safeGetVariable(binding.id);
                                if (variable) {
                                    var varName = variable.name;
                                    var fullName = varName;
                                    var isRemote = false;

                                    // Try to get collection info
                                    try {
                                        console.log('        🔍 Getting collection for variable:', varName);
                                        var collection = await safeGetVariableCollection(variable.variableCollectionId);
                                        if (collection) {
                                            fullName = collection.name + '/' + variable.name;
                                            isRemote = collection.remote || false;
                                            console.log('        📁 Collection found:', collection.name, 'Remote:', isRemote);
                                        }
                                    } catch (collErr) {
                                        console.warn('          Could not get collection for variable:', varName, collErr.message);
                                    }

                                    console.log('        🔗 Found variable in fill:', fullName, '(', variable.resolvedType, ')');
                                    foundItems.push({
                                        type: 'VARIABLE',
                                        name: fullName,
                                        resolvedType: variable.resolvedType,
                                        isRemote: isRemote
                                    });

                                    // ENHANCED FLEXIBLE MATCHING FOR VARIABLES
                                    var fullNameLower = fullName.toLowerCase();
                                    var varNameLower = varName.toLowerCase();
                                    var fullNameParts = fullNameLower.split('/');
                                    var varBaseName = fullNameParts[fullNameParts.length - 1];

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
                            } catch (e) {
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
        if ('strokes' in node && Array.isArray(node.strokes)) {
            console.log('      📝 Node has', node.strokes.length, 'strokes');
            for (var i = 0; i < node.strokes.length; i++) {
                var stroke = node.strokes[i];
                if (stroke && stroke.boundVariables) {
                    for (var prop in stroke.boundVariables) {
                        var binding = stroke.boundVariables[prop];
                        if (binding && binding.id) {
                            try {
                                var variable = await safeGetVariable(binding.id);
                                if (variable) {
                                    var varName = variable.name;
                                    var fullName = varName;
                                    var isRemote = false;

                                    try {
                                        var collection = await safeGetVariableCollection(variable.variableCollectionId);
                                        if (collection) {
                                            fullName = collection.name + '/' + variable.name;
                                            isRemote = collection.remote || false;
                                        }
                                    } catch (collErr) {
                                        // Ignore
                                    }

                                    console.log('        🔗 Found variable in stroke:', fullName);
                                    foundItems.push({
                                        type: 'VARIABLE',
                                        name: fullName,
                                        resolvedType: variable.resolvedType,
                                        isRemote: isRemote
                                    });

                                    var fullNameLower = fullName.toLowerCase();
                                    var varNameLower = varName.toLowerCase();
                                    if (fullNameLower.includes(searchLower) ||
                                        varNameLower.includes(searchLower) ||
                                        fullNameLower.includes(searchBase) ||
                                        searchLower.includes(fullNameLower.split('/').pop() || '')) {
                                        console.log('        ✅ MATCH: Stroke variable matches search!', fullName, 'vs', searchTerm);
                                        found = true;
                                    }
                                }
                            } catch (e) {
                                console.warn('        ❌ Error getting stroke variable:', e.message);
                            }
                        }
                    }
                }
            }
        }

        // Check other bound variables (width, height, corner radius, etc.)
        var boundVariableProps = ['width', 'height', 'cornerRadius', 'paddingLeft', 'paddingRight', 'paddingTop', 'paddingBottom', 'rotation', 'opacity'];

        if (node.boundVariables) {
            console.log('      📝 Node has bound variables for:', Object.keys(node.boundVariables));
        }

        for (var p = 0; p < boundVariableProps.length; p++) {
            var propName = boundVariableProps[p];
            if (node.boundVariables && node.boundVariables[propName]) {
                var binding = node.boundVariables[propName];
                if (binding && binding.id) {
                    try {
                        var variable = await safeGetVariable(binding.id);
                        if (variable) {
                            var varName = variable.name;
                            var fullName = varName;
                            var isRemote = false;

                            try {
                                var collection = await safeGetVariableCollection(variable.variableCollectionId);
                                if (collection) {
                                    fullName = collection.name + '/' + variable.name;
                                    isRemote = collection.remote || false;
                                }
                            } catch (collErr) {
                                // Ignore
                            }

                            console.log('        🔗 Found variable in', propName + ':', fullName);
                            foundItems.push({
                                type: 'VARIABLE',
                                name: fullName,
                                resolvedType: variable.resolvedType,
                                isRemote: isRemote,
                                boundTo: propName
                            });

                            var fullNameLower = fullName.toLowerCase();
                            var varNameLower = varName.toLowerCase();
                            if (fullNameLower.includes(searchLower) ||
                                varNameLower.includes(searchLower) ||
                                fullNameLower.includes(searchBase) ||
                                searchLower.includes(fullNameLower.split('/').pop() || '')) {
                                console.log('        ✅ MATCH: ' + propName + ' variable matches search!', fullName, 'vs', searchTerm);
                                found = true;
                            }
                        }
                    } catch (e) {
                        console.warn('        ❌ Error getting', propName, 'variable:', e.message);
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

    } catch (error) {
        console.error('  ❌ Error checking node:', node.name, error.message);
    }

    return { found: found, items: foundItems };
}

// BULLETPROOF ZOOM FUNCTION - Keep this working perfectly!
function zoomToNode(nodeId, nodeName) {
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
        var targetNode = null;

        try {
            targetNode = figma.getNodeById(nodeId);
            console.log('✅ Found node directly:', targetNode ? targetNode.name : 'null');
        } catch (findError) {
            console.warn('⚠️ Direct node lookup failed:', findError.message);

            console.log('🔍 Trying fallback search across all pages...');
            var allPages = figma.root.children;

            for (var p = 0; p < allPages.length; p++) {
                var page = allPages[p];
                console.log('   Searching page:', page.name);

                try {
                    var pageNodes = getAllNodes(page);
                    for (var n = 0; n < pageNodes.length; n++) {
                        if (pageNodes[n].id === nodeId) {
                            targetNode = pageNodes[n];
                            console.log('✅ Found node in fallback search:', targetNode.name);
                            break;
                        }
                    }
                } catch (pageError) {
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
                details: 'Node with ID "' + nodeId + '" does not exist or has been deleted'
            };
        }

        console.log('✅ Target node confirmed:', targetNode.name, 'Type:', targetNode.type);

        var nodePage = null;
        var current = targetNode;
        while (current && current.type !== 'PAGE') {
            current = current.parent;
        }
        nodePage = current;

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
            figma.currentPage.selection = [targetNode];
            console.log('✅ Node selected successfully');
        } catch (selectionError) {
            console.error('❌ Failed to select node:', selectionError.message);
        }

        console.log('🔍 Zooming to node...');
        try {
            figma.viewport.scrollAndZoomIntoView([targetNode]);
            console.log('✅ Zoom successful!');

            return {
                success: true,
                nodeId: nodeId,
                nodeName: targetNode.name,
                nodePath: buildNodePath(targetNode)
            };

        } catch (zoomError) {
            console.error('❌ Zoom failed:', zoomError.message);
            return {
                success: false,
                error: 'Zoom operation failed',
                details: zoomError.message
            };
        }

    } catch (generalError) {
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

// ENHANCED: Smart search scope selection with automatic fallback
async function performSmartSearch(searchTerm) {
    console.log('🧠 === SMART SEARCH SCOPE LOGIC ===');

    var allFoundItems = [];
    var uniqueVariablesFound = [];
    var uniqueStylesFound = [];

    // First, try searching in selection if something is selected
    var selectionResults = [];
    var selectionStats = { checkedNodes: 0, nodesWithItems: 0, matchingNodes: 0 };

    if (figma.currentPage.selection.length > 0) {
        console.log('🎯 PHASE 1: Searching in selection first...');
        var selectionNodes = [];

        for (var i = 0; i < figma.currentPage.selection.length; i++) {
            var selected = figma.currentPage.selection[i];
            var allNodes = getAllNodes(selected);
            selectionNodes = selectionNodes.concat(allNodes);
        }

        console.log('📊 Selection contains', selectionNodes.length, 'total nodes');

        // Check selection nodes
        for (var i = 0; i < selectionNodes.length; i++) {
            var node = selectionNodes[i];
            selectionStats.checkedNodes++;

            console.log('  🔍 Checking selection node', selectionStats.checkedNodes + '/' + selectionNodes.length + ':', node.name);

            var check = await nodeHasVariableOrStyle(node, searchTerm);

            if (check.items.length > 0) {
                selectionStats.nodesWithItems++;

                // Collect unique items
                for (var j = 0; j < check.items.length; j++) {
                    var item = check.items[j];
                    if (item.type === 'VARIABLE') {
                        if (uniqueVariablesFound.indexOf(item.name) === -1) {
                            uniqueVariablesFound.push(item.name);
                        }
                    } else {
                        if (uniqueStylesFound.indexOf(item.name) === -1) {
                            uniqueStylesFound.push(item.name);
                        }
                    }
                }
            }

            if (check.found) {
                selectionStats.matchingNodes++;
                selectionResults.push({
                    id: node.id,
                    name: node.name,
                    type: node.type,
                    path: buildNodePath(node),
                    foundItems: check.items
                });

                for (var j = 0; j < check.items.length; j++) {
                    var item = check.items[j];
                    var exists = false;
                    for (var k = 0; k < allFoundItems.length; k++) {
                        if (allFoundItems[k].name === item.name && allFoundItems[k].type === item.type) {
                            exists = true;
                            break;
                        }
                    }
                    if (!exists) {
                        allFoundItems.push(item);
                    }
                }
            }
        }

        console.log('📊 Selection search results:');
        console.log('  - Nodes checked:', selectionStats.checkedNodes);
        console.log('  - Nodes with variables/styles:', selectionStats.nodesWithItems);
        console.log('  - Matching nodes found:', selectionStats.matchingNodes);

        // If we found matches in selection, return them
        if (selectionResults.length > 0) {
            console.log('✅ Found', selectionResults.length, 'results in selection - using selection scope');
            return {
                results: selectionResults,
                context: 'Selected layers (' + figma.currentPage.selection.length + ' items)',
                searchStatistics: {
                    checkedNodes: selectionStats.checkedNodes,
                    nodesWithItems: selectionStats.nodesWithItems,
                    matchingNodes: selectionStats.matchingNodes,
                    uniqueVariables: uniqueVariablesFound,
                    uniqueStyles: uniqueStylesFound,
                    totalUniqueItems: uniqueVariablesFound.length + uniqueStylesFound.length
                },
                foundItems: allFoundItems,
                totalSearched: selectionNodes.length
            };
        }

        // If selection had some variables/styles but no matches, inform user
        if (selectionStats.nodesWithItems > 0) {
            console.log('⚠️ Selection has variables/styles but none match search - expanding to page...');
        } else {
            console.log('⚠️ Selection has no variables/styles at all - expanding to page...');
        }
    }

    // Phase 2: Search entire page (fallback or default)
    console.log('🎯 PHASE 2: Searching entire page...');

    var pageNodes = [];
    for (var i = 0; i < figma.currentPage.children.length; i++) {
        var child = figma.currentPage.children[i];
        var allNodes = getAllNodes(child);
        pageNodes = pageNodes.concat(allNodes);
    }

    console.log('📊 Page contains', pageNodes.length, 'total nodes');

    var pageResults = [];
    var pageStats = { checkedNodes: 0, nodesWithItems: 0, matchingNodes: 0 };

    // Clear previous collections and start fresh for page search
    allFoundItems = [];
    uniqueVariablesFound = [];
    uniqueStylesFound = [];

    for (var i = 0; i < pageNodes.length; i++) {
        var node = pageNodes[i];
        pageStats.checkedNodes++;

        console.log('  🔍 Checking page node', pageStats.checkedNodes + '/' + pageNodes.length + ':', node.name, '(' + node.type + ')');

        var check = await nodeHasVariableOrStyle(node, searchTerm);

        if (check.items.length > 0) {
            pageStats.nodesWithItems++;

            // Collect unique items
            for (var j = 0; j < check.items.length; j++) {
                var item = check.items[j];
                if (item.type === 'VARIABLE') {
                    if (uniqueVariablesFound.indexOf(item.name) === -1) {
                        uniqueVariablesFound.push(item.name);
                    }
                } else {
                    if (uniqueStylesFound.indexOf(item.name) === -1) {
                        uniqueStylesFound.push(item.name);
                    }
                }
            }
        }

        if (check.found) {
            pageStats.matchingNodes++;
            pageResults.push({
                id: node.id,
                name: node.name,
                type: node.type,
                path: buildNodePath(node),
                foundItems: check.items
            });

            for (var j = 0; j < check.items.length; j++) {
                var item = check.items[j];
                var exists = false;
                for (var k = 0; k < allFoundItems.length; k++) {
                    if (allFoundItems[k].name === item.name && allFoundItems[k].type === item.type) {
                        exists = true;
                        break;
                    }
                }
                if (!exists) {
                    allFoundItems.push(item);
                }
            }
        }
    }

    console.log('📊 Page search results:');
    console.log('  - Nodes checked:', pageStats.checkedNodes);
    console.log('  - Nodes with variables/styles:', pageStats.nodesWithItems);
    console.log('  - Matching nodes found:', pageStats.matchingNodes);

    var context = figma.currentPage.name;
    if (figma.currentPage.selection.length > 0) {
        context += ' (expanded from selection)';
    }

    return {
        results: pageResults,
        context: context,
        searchStatistics: {
            checkedNodes: pageStats.checkedNodes,
            nodesWithItems: pageStats.nodesWithItems,
            matchingNodes: pageStats.matchingNodes,
            uniqueVariables: uniqueVariablesFound,
            uniqueStyles: uniqueStylesFound,
            totalUniqueItems: uniqueVariablesFound.length + uniqueStylesFound.length
        },
        foundItems: allFoundItems,
        totalSearched: pageNodes.length,
        scopeInfo: {
            searchedSelection: figma.currentPage.selection.length > 0,
            selectionHadVariables: selectionStats.nodesWithItems > 0,
            expandedToPage: true
        }
    };
}

// Handle messages from UI - ENHANCED WITH SMART SEARCH
figma.ui.onmessage = async function (msg) {
    console.log('📨 Message from UI:', msg.type, msg);

    if (msg.type === 'find-variables-and-styles') {
        var searchTerm = msg.searchTerm;

        if (!searchTerm || !searchTerm.trim()) {
            figma.ui.postMessage({
                type: 'error',
                message: 'Please enter a variable or style name to search for'
            });
            return;
        }

        console.log('🔍 === SMART SEARCH START ===');
        console.log('Search term:', searchTerm);
        console.log('Current selection:', figma.currentPage.selection.length, 'items');

        try {
            var searchResult = await performSmartSearch(searchTerm);

            console.log('🎉 Smart search complete!');
            console.log('Final results count:', searchResult.results.length);
            console.log('Context:', searchResult.context);

            // Send results to UI
            figma.ui.postMessage({
                type: 'search-results',
                results: searchResult.results,
                searchTerm: searchTerm,
                context: searchResult.context,
                foundItems: searchResult.foundItems,
                totalSearched: searchResult.totalSearched,
                searchStatistics: searchResult.searchStatistics,
                scopeInfo: searchResult.scopeInfo
            });

        } catch (error) {
            console.error('❌ Error during smart search:', error);
            figma.ui.postMessage({
                type: 'error',
                message: 'Search failed: ' + error.message
            });
        }
    }

    if (msg.type === 'zoom-to-layer') {
        var nodeId = msg.nodeId;
        var nodeName = msg.nodeName || 'Unknown';

        var result = zoomToNode(nodeId, nodeName);

        figma.ui.postMessage({
            type: 'zoom-result',
            success: result.success,
            nodeId: nodeId,
            nodeName: nodeName,
            error: result.error,
            details: result.details,
            nodePath: result.nodePath
        });
    }
};

console.log('✅ Variable & Style Finder ready - SMART SEARCH SCOPE FIXED!');