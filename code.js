// JustGo Audit Plugin - WITH STRICT LAYER NAME SEARCH
figma.showUI(__html__, {
    width: 420,
    height: 750,
    themeColors: true
});

// STRICT: Only these exact layer names are allowed
var ALLOWED_LAYER_NAMES = [
    'heading-text',
    'title-text',
    'subtitle-text',
    'body-text',
    'highlighted-text',
    'info-text',
    'caption-text',
    'overline-text'
];

// STRICT: Exclude these node types
var EXCLUDED_NODE_TYPES = [
    'COMPONENT',
    'INSTANCE',
    'COMPONENT_SET'
];

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

// STRICT: Function to search for layers by exact name matching only
function searchLayersByName(searchTerm, scopeNodes) {
    var results = [];
    var searchLower = searchTerm.toLowerCase().trim();
    var stats = { checkedNodes: 0, matchingNodes: 0, excludedNodes: 0 };

    // STRICT: Check if search term is in allowed list
    if (ALLOWED_LAYER_NAMES.indexOf(searchLower) === -1) {
        return {
            results: [],
            searchStatistics: stats,
            strictError: 'Layer name "' + searchTerm + '" is not in the allowed list. Use: ' + ALLOWED_LAYER_NAMES.join(', ')
        };
    }

    for (var i = 0; i < scopeNodes.length; i++) {
        var node = scopeNodes[i];
        stats.checkedNodes++;

        // STRICT: Exclude component and instance types
        if (EXCLUDED_NODE_TYPES.indexOf(node.type) !== -1) {
            stats.excludedNodes++;
            continue;
        }

        var nodeName = node.name.toLowerCase().trim();

        // STRICT: Only exact matches allowed
        if (nodeName === searchLower) {
            stats.matchingNodes++;
            results.push({
                id: node.id,
                name: node.name,
                type: node.type,
                path: buildNodePath(node),
                matchType: 'LAYER_NAME'
            });
        }
    }

    return {
        results: results,
        searchStatistics: stats
    };
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
            return null;
        }
    }
}

// ENHANCED function to safely get style by ID
function safeGetStyle(styleId, styleProperty, nodeName) {
    try {
        if (!styleId || styleId === '' || styleId === null || styleId === undefined || styleId === figma.mixed) {
            return null;
        }

        var style = figma.getStyleById(styleId);

        if (!style) {
            return null;
        }

        return style;

    } catch (error) {
        return null;
    }
}

// Enhanced function to check style name matching with multiple strategies
function styleMatches(styleName, searchTerm) {
    if (!styleName || !searchTerm) return false;

    var styleNameLower = styleName.toLowerCase().trim();
    var searchLower = searchTerm.toLowerCase().trim();
    var searchParts = searchLower.split('/');
    var searchBase = searchParts[searchParts.length - 1];

    // Strategy 1: Exact match
    if (styleNameLower === searchLower) {
        return true;
    }

    // Strategy 2: Contains match
    if (styleNameLower.includes(searchLower)) {
        return true;
    }

    // Strategy 3: Search contains style name
    if (searchLower.includes(styleNameLower)) {
        return true;
    }

    // Strategy 4: Base name matching
    var styleNameParts = styleNameLower.split('/');
    var styleBase = styleNameParts[styleNameParts.length - 1];
    if (styleBase === searchBase || styleBase.includes(searchBase) || searchBase.includes(styleBase)) {
        return true;
    }

    // Strategy 5: Partial component matching
    for (var i = 0; i < searchParts.length; i++) {
        var searchPart = searchParts[i];
        if (searchPart.length > 2 && styleNameLower.includes(searchPart)) {
            return true;
        }
    }

    // Strategy 6: Word boundary matching
    var searchWords = searchLower.replace(/[\/\-_]/g, ' ').split(' ').filter(function (w) { return w.length > 1; });
    var styleWords = styleNameLower.replace(/[\/\-_]/g, ' ').split(' ').filter(function (w) { return w.length > 1; });

    for (var i = 0; i < searchWords.length; i++) {
        for (var j = 0; j < styleWords.length; j++) {
            if (searchWords[i] === styleWords[j] ||
                searchWords[i].includes(styleWords[j]) ||
                styleWords[j].includes(searchWords[i])) {
                return true;
            }
        }
    }

    return false;
}

// Style detection with debugging
function checkNodeStyles(node, searchTerm) {
    var foundStyles = [];
    var matchesSearch = false;

    // === PAINT STYLES (Fill) ===
    if ('fillStyleId' in node) {
        var fillStyleId = node.fillStyleId;
        var fillStyle = safeGetStyle(fillStyleId, 'fillStyleId', node.name);

        if (fillStyle) {
            foundStyles.push({
                type: 'STYLE',
                name: fillStyle.name,
                styleType: 'PAINT',
                property: 'fill',
                isRemote: fillStyle.remote || false
            });

            if (styleMatches(fillStyle.name, searchTerm)) {
                matchesSearch = true;
            }
        }
    }

    // === PAINT STYLES (Stroke) ===
    if ('strokeStyleId' in node) {
        var strokeStyleId = node.strokeStyleId;
        var strokeStyle = safeGetStyle(strokeStyleId, 'strokeStyleId', node.name);

        if (strokeStyle) {
            foundStyles.push({
                type: 'STYLE',
                name: strokeStyle.name,
                styleType: 'PAINT',
                property: 'stroke',
                isRemote: strokeStyle.remote || false
            });

            if (styleMatches(strokeStyle.name, searchTerm)) {
                matchesSearch = true;
            }
        }
    }

    // === TEXT STYLES ===
    if (node.type === 'TEXT' && 'textStyleId' in node) {
        var textStyleId = node.textStyleId;
        var textStyle = safeGetStyle(textStyleId, 'textStyleId', node.name);

        if (textStyle) {
            foundStyles.push({
                type: 'STYLE',
                name: textStyle.name,
                styleType: 'TEXT',
                property: 'text',
                isRemote: textStyle.remote || false
            });

            if (styleMatches(textStyle.name, searchTerm)) {
                matchesSearch = true;
            }
        }
    }

    // === EFFECT STYLES ===
    if ('effectStyleId' in node) {
        var effectStyleId = node.effectStyleId;
        var effectStyle = safeGetStyle(effectStyleId, 'effectStyleId', node.name);

        if (effectStyle) {
            foundStyles.push({
                type: 'STYLE',
                name: effectStyle.name,
                styleType: 'EFFECT',
                property: 'effect',
                isRemote: effectStyle.remote || false
            });

            if (styleMatches(effectStyle.name, searchTerm)) {
                matchesSearch = true;
            }
        }
    }

    // === GRID STYLES ===
    if ('gridStyleId' in node) {
        var gridStyleId = node.gridStyleId;
        var gridStyle = safeGetStyle(gridStyleId, 'gridStyleId', node.name);

        if (gridStyle) {
            foundStyles.push({
                type: 'STYLE',
                name: gridStyle.name,
                styleType: 'GRID',
                property: 'grid',
                isRemote: gridStyle.remote || false
            });

            if (styleMatches(gridStyle.name, searchTerm)) {
                matchesSearch = true;
            }
        }
    }

    return {
        foundStyles: foundStyles,
        matchesSearch: matchesSearch
    };
}

// Enhanced ASYNC function to check if a node uses specific variables or styles
async function nodeHasVariableOrStyle(node, searchTerm) {
    var found = false;
    var foundItems = [];

    try {
        var searchLower = searchTerm.toLowerCase().trim();
        var searchParts = searchLower.split('/');
        var searchBase = searchParts[searchParts.length - 1];

        // === ENHANCED STYLE DETECTION ===
        var styleResult = checkNodeStyles(node, searchTerm);

        // Add style results
        foundItems = foundItems.concat(styleResult.foundStyles);
        if (styleResult.matchesSearch) {
            found = true;
        }

        // === ENHANCED ASYNC VARIABLE DETECTION ===

        // Check variables in fills
        if ('fills' in node && Array.isArray(node.fills)) {
            for (var i = 0; i < node.fills.length; i++) {
                var fill = node.fills[i];

                if (fill && fill.boundVariables) {
                    for (var prop in fill.boundVariables) {
                        var binding = fill.boundVariables[prop];
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

                                    foundItems.push({
                                        type: 'VARIABLE',
                                        name: fullName,
                                        resolvedType: variable.resolvedType,
                                        isRemote: isRemote
                                    });

                                    var fullNameLower = fullName.toLowerCase();
                                    var varNameLower = varName.toLowerCase();
                                    var fullNameParts = fullNameLower.split('/');
                                    var varBaseName = fullNameParts[fullNameParts.length - 1];

                                    if (fullNameLower.includes(searchLower) ||
                                        varNameLower.includes(searchLower) ||
                                        fullNameLower.includes(searchBase) ||
                                        varBaseName.includes(searchBase) ||
                                        searchLower.includes(varBaseName) ||
                                        (searchBase.length > 3 && varBaseName.includes(searchBase.substring(0, searchBase.length - 1))) ||
                                        (varBaseName.length > 3 && searchBase.includes(varBaseName.substring(0, varBaseName.length - 1)))) {
                                        found = true;
                                    }
                                }
                            } catch (e) {
                                // Ignore
                            }
                        }
                    }
                }
            }
        }

        // Check variables in strokes (similar pattern)
        if ('strokes' in node && Array.isArray(node.strokes)) {
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
                                        found = true;
                                    }
                                }
                            } catch (e) {
                                // Ignore
                            }
                        }
                    }
                }
            }
        }

        // Check other bound variables (width, height, corner radius, etc.)
        var boundVariableProps = ['width', 'height', 'cornerRadius', 'paddingLeft', 'paddingRight', 'paddingTop', 'paddingBottom', 'rotation', 'opacity'];

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
                                found = true;
                            }
                        }
                    } catch (e) {
                        // Ignore
                    }
                }
            }
        }

    } catch (error) {
        // Ignore
    }

    return { found: found, items: foundItems };
}

// ENHANCED: Smart search scope selection with automatic fallback
async function performSmartSearch(searchTerm) {
    var allFoundItems = [];
    var uniqueVariablesFound = [];
    var uniqueStylesFound = [];

    // First, try searching in selection if something is selected
    var selectionResults = [];
    var selectionStats = { checkedNodes: 0, nodesWithItems: 0, matchingNodes: 0 };

    if (figma.currentPage.selection.length > 0) {
        var selectionNodes = [];

        for (var i = 0; i < figma.currentPage.selection.length; i++) {
            var selected = figma.currentPage.selection[i];
            var allNodes = getAllNodes(selected);
            selectionNodes = selectionNodes.concat(allNodes);
        }

        // Check selection nodes
        for (var i = 0; i < selectionNodes.length; i++) {
            var node = selectionNodes[i];
            selectionStats.checkedNodes++;

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

        // If we found matches in selection, return them
        if (selectionResults.length > 0) {
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
    }

    // Phase 2: Search entire page (fallback or default)
    var pageNodes = [];
    for (var i = 0; i < figma.currentPage.children.length; i++) {
        var child = figma.currentPage.children[i];
        var allNodes = getAllNodes(child);
        pageNodes = pageNodes.concat(allNodes);
    }

    var pageResults = [];
    var pageStats = { checkedNodes: 0, nodesWithItems: 0, matchingNodes: 0 };

    // Clear previous collections and start fresh for page search
    allFoundItems = [];
    uniqueVariablesFound = [];
    uniqueStylesFound = [];

    for (var i = 0; i < pageNodes.length; i++) {
        var node = pageNodes[i];
        pageStats.checkedNodes++;

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

// STRICT: Perform layer name search with smart scope
function performLayerNameSearch(searchTerm) {
    var searchNodes = [];
    var context = '';

    // Determine search scope
    if (figma.currentPage.selection.length > 0) {
        for (var i = 0; i < figma.currentPage.selection.length; i++) {
            var selected = figma.currentPage.selection[i];
            var allNodes = getAllNodes(selected);
            searchNodes = searchNodes.concat(allNodes);
        }
        context = 'Selected layers (' + figma.currentPage.selection.length + ' items)';
    } else {
        for (var i = 0; i < figma.currentPage.children.length; i++) {
            var child = figma.currentPage.children[i];
            var allNodes = getAllNodes(child);
            searchNodes = searchNodes.concat(allNodes);
        }
        context = figma.currentPage.name;
    }

    var searchResult = searchLayersByName(searchTerm, searchNodes);

    return {
        results: searchResult.results,
        context: context,
        searchStatistics: {
            checkedNodes: searchResult.searchStatistics.checkedNodes,
            nodesWithItems: 0, // Not applicable for layer name search
            matchingNodes: searchResult.searchStatistics.matchingNodes,
            uniqueVariables: [],
            uniqueStyles: [],
            totalUniqueItems: 0,
            excludedNodes: searchResult.searchStatistics.excludedNodes
        },
        foundItems: [],
        totalSearched: searchNodes.length,
        searchType: 'LAYER_NAME',
        strictError: searchResult.strictError
    };
}

// Handle messages from UI - ENHANCED WITH STRICT LAYER NAME SEARCH
figma.ui.onmessage = async function (msg) {
    if (msg.type === 'find-variables-and-styles') {
        var searchTerm = msg.searchTerm;

        if (!searchTerm || !searchTerm.trim()) {
            figma.ui.postMessage({
                type: 'error',
                message: 'Please enter a variable or style name to search for'
            });
            return;
        }

        try {
            var searchResult = await performSmartSearch(searchTerm);

            // Send results to UI
            figma.ui.postMessage({
                type: 'search-results',
                results: searchResult.results,
                searchTerm: searchTerm,
                context: searchResult.context,
                foundItems: searchResult.foundItems,
                totalSearched: searchResult.totalSearched,
                searchStatistics: searchResult.searchStatistics,
                scopeInfo: searchResult.scopeInfo,
                searchType: 'VARIABLES_STYLES'
            });

        } catch (error) {
            figma.ui.postMessage({
                type: 'error',
                message: 'Search failed: ' + error.message
            });
        }
    }

    // STRICT: Handle layer name search
    if (msg.type === 'find-layer-names') {
        var searchTerm = msg.searchTerm;

        if (!searchTerm || !searchTerm.trim()) {
            figma.ui.postMessage({
                type: 'error',
                message: 'Please enter a layer name to search for'
            });
            return;
        }

        try {
            var searchResult = performLayerNameSearch(searchTerm);

            // Send results to UI
            figma.ui.postMessage({
                type: 'search-results',
                results: searchResult.results,
                searchTerm: searchTerm,
                context: searchResult.context,
                foundItems: searchResult.foundItems,
                totalSearched: searchResult.totalSearched,
                searchStatistics: searchResult.searchStatistics,
                searchType: 'LAYER_NAME',
                strictError: searchResult.strictError
            });

        } catch (error) {
            figma.ui.postMessage({
                type: 'error',
                message: 'Layer name search failed: ' + error.message
            });
        }
    }
};