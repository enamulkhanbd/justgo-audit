// JustGo Audit Plugin - WITH STRICT LAYER NAME SEARCH
figma.showUI(__html__, {
  width: 420,
  height: 750,
  themeColors: true,
});

// STRICT: Only these exact layer names are allowed
const ALLOWED_LAYER_NAMES = [
  "heading-text",
  "title-text",
  "subtitle-text",
  "body-text",
  "highlighted-text",
  "info-text",
  "caption-text",
  "overline-text",
] as const;

// STRICT: Exclude these node types
const EXCLUDED_NODE_TYPES = ["COMPONENT", "INSTANCE", "COMPONENT_SET"] as const;

interface SearchResult {
  id: string;
  name: string;
  type: string;
  path: string;
  foundItems?: FoundItem[];
  matchType?: string;
}

interface FoundItem {
  type: "VARIABLE" | "STYLE";
  name: string;
  resolvedType?: string;
  styleType?: string;
  property?: string;
  isRemote?: boolean;
  boundTo?: string;
}

interface SearchStatistics {
  checkedNodes: number;
  nodesWithItems: number;
  matchingNodes: number;
  uniqueVariables: string[];
  uniqueStyles: string[];
  totalUniqueItems: number;
  excludedNodes?: number;
}

interface StyleDetectionResult {
  foundStyles: FoundItem[];
  matchesSearch: boolean;
}

interface LayerNameSearchResult {
  results: SearchResult[];
  searchStatistics: {
    checkedNodes: number;
    matchingNodes: number;
    excludedNodes: number;
  };
  strictError?: string;
}

// Simple function to get all nodes recursively
function getAllNodes(node: SceneNode): SceneNode[] {
  const nodes: SceneNode[] = [node];
  if ("children" in node) {
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

  while (current && current.type !== "DOCUMENT") {
    path.unshift(current.name || "Unnamed");
    current = current.parent;
  }

  return path.join(" → ");
}

// STRICT: Function to search for layers by exact name matching only
function searchLayersByName(
  searchTerm: string,
  scopeNodes: SceneNode[],
): LayerNameSearchResult {
  const results: SearchResult[] = [];
  const searchLower = searchTerm.toLowerCase().trim();
  const stats = { checkedNodes: 0, matchingNodes: 0, excludedNodes: 0 };

  // STRICT: Check if search term is in allowed list
  if (!ALLOWED_LAYER_NAMES.includes(searchLower as any)) {
    return {
      results: [],
      searchStatistics: stats,
      strictError: `Layer name "${searchTerm}" is not in the allowed list. Use: ${ALLOWED_LAYER_NAMES.join(
        ", ",
      )}`,
    };
  }

  for (const node of scopeNodes) {
    stats.checkedNodes++;

    // STRICT: Exclude component and instance types
    if (EXCLUDED_NODE_TYPES.includes(node.type as any)) {
      stats.excludedNodes++;
      continue;
    }

    const nodeName = node.name.toLowerCase().trim();

    // STRICT: Only exact matches allowed
    if (nodeName === searchLower) {
      stats.matchingNodes++;
      results.push({
        id: node.id,
        name: node.name,
        type: node.type,
        path: buildNodePath(node),
        matchType: "LAYER_NAME",
      });
    }
  }

  return {
    results,
    searchStatistics: stats,
  };
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
      return null;
    }
  }
}

// ASYNC function to safely get variable collection
async function safeGetVariableCollection(
  collectionId: string,
): Promise<VariableCollection | null> {
  try {
    const collection = await figma.variables.getVariableCollectionByIdAsync(
      collectionId,
    );
    return collection;
  } catch (error: any) {
    try {
      const collection =
        figma.variables.getVariableCollectionById(collectionId);
      return collection;
    } catch (syncError: any) {
      return null;
    }
  }
}

// ENHANCED function to safely get style by ID
function safeGetStyle(
  styleId: string,
  styleProperty: string,
  nodeName: string,
): BaseStyle | null {
  try {
    if (
      !styleId ||
      styleId === "" ||
      styleId === null ||
      styleId === undefined ||
      styleId === figma.mixed
    ) {
      return null;
    }

    const style = figma.getStyleById(styleId);

    if (!style) {
      return null;
    }

    return style;
  } catch (error: any) {
    return null;
  }
}

// Enhanced function to check style name matching with multiple strategies
function styleMatches(styleName: string, searchTerm: string): boolean {
  if (!styleName || !searchTerm) return false;

  const styleNameLower = styleName.toLowerCase().trim();
  const searchLower = searchTerm.toLowerCase().trim();
  const searchParts = searchLower.split("/");
  const searchBase = searchParts[searchParts.length - 1];

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
  const styleNameParts = styleNameLower.split("/");
  const styleBase = styleNameParts[styleNameParts.length - 1];
  if (
    styleBase === searchBase ||
    styleBase.includes(searchBase) ||
    searchBase.includes(styleBase)
  ) {
    return true;
  }

  // Strategy 5: Partial component matching
  for (const searchPart of searchParts) {
    if (searchPart.length > 2 && styleNameLower.includes(searchPart)) {
      return true;
    }
  }

  // Strategy 6: Word boundary matching
  const searchWords = searchLower
    .replace(/[\/\-_]/g, " ")
    .split(" ")
    .filter((w) => w.length > 1);
  const styleWords = styleNameLower
    .replace(/[\/\-_]/g, " ")
    .split(" ")
    .filter((w) => w.length > 1);

  for (const searchWord of searchWords) {
    for (const styleWord of styleWords) {
      if (
        searchWord === styleWord ||
        searchWord.includes(styleWord) ||
        styleWord.includes(searchWord)
      ) {
        return true;
      }
    }
  }

  return false;
}

// Style detection with debugging
function checkNodeStyles(
  node: SceneNode,
  searchTerm: string,
): StyleDetectionResult {
  const foundStyles: FoundItem[] = [];
  let matchesSearch = false;

  // === PAINT STYLES (Fill) ===
  if ("fillStyleId" in node) {
    const fillStyleId = (node as any).fillStyleId;
    const fillStyle = safeGetStyle(fillStyleId, "fillStyleId", node.name);

    if (fillStyle) {
      foundStyles.push({
        type: "STYLE",
        name: fillStyle.name,
        styleType: "PAINT",
        property: "fill",
        isRemote: (fillStyle as any).remote || false,
      });

      if (styleMatches(fillStyle.name, searchTerm)) {
        matchesSearch = true;
      }
    }
  }

  // === PAINT STYLES (Stroke) ===
  if ("strokeStyleId" in node) {
    const strokeStyleId = (node as any).strokeStyleId;
    const strokeStyle = safeGetStyle(strokeStyleId, "strokeStyleId", node.name);

    if (strokeStyle) {
      foundStyles.push({
        type: "STYLE",
        name: strokeStyle.name,
        styleType: "PAINT",
        property: "stroke",
        isRemote: (strokeStyle as any).remote || false,
      });

      if (styleMatches(strokeStyle.name, searchTerm)) {
        matchesSearch = true;
      }
    }
  }

  // === TEXT STYLES ===
  if (node.type === "TEXT" && "textStyleId" in node) {
    const textStyleId = (node as any).textStyleId;
    const textStyle = safeGetStyle(textStyleId, "textStyleId", node.name);

    if (textStyle) {
      foundStyles.push({
        type: "STYLE",
        name: textStyle.name,
        styleType: "TEXT",
        property: "text",
        isRemote: (textStyle as any).remote || false,
      });

      if (styleMatches(textStyle.name, searchTerm)) {
        matchesSearch = true;
      }
    }
  }

  // === EFFECT STYLES ===
  if ("effectStyleId" in node) {
    const effectStyleId = (node as any).effectStyleId;
    const effectStyle = safeGetStyle(effectStyleId, "effectStyleId", node.name);

    if (effectStyle) {
      foundStyles.push({
        type: "STYLE",
        name: effectStyle.name,
        styleType: "EFFECT",
        property: "effect",
        isRemote: (effectStyle as any).remote || false,
      });

      if (styleMatches(effectStyle.name, searchTerm)) {
        matchesSearch = true;
      }
    }
  }

  // === GRID STYLES ===
  if ("gridStyleId" in node) {
    const gridStyleId = (node as any).gridStyleId;
    const gridStyle = safeGetStyle(gridStyleId, "gridStyleId", node.name);

    if (gridStyle) {
      foundStyles.push({
        type: "STYLE",
        name: gridStyle.name,
        styleType: "GRID",
        property: "grid",
        isRemote: (gridStyle as any).remote || false,
      });

      if (styleMatches(gridStyle.name, searchTerm)) {
        matchesSearch = true;
      }
    }
  }

  return {
    foundStyles,
    matchesSearch,
  };
}

// Enhanced ASYNC function to check if a node uses specific variables or styles
async function nodeHasVariableOrStyle(
  node: SceneNode,
  searchTerm: string,
): Promise<{ found: boolean; items: FoundItem[] }> {
  let found = false;
  let foundItems: FoundItem[] = [];

  try {
    const searchLower = searchTerm.toLowerCase().trim();
    const searchParts = searchLower.split("/");
    const searchBase = searchParts[searchParts.length - 1];

    // === ENHANCED STYLE DETECTION ===
    const styleResult = checkNodeStyles(node, searchTerm);

    // Add style results
    foundItems = foundItems.concat(styleResult.foundStyles);
    if (styleResult.matchesSearch) {
      found = true;
    }

    // === ENHANCED ASYNC VARIABLE DETECTION ===

    // Check variables in fills
    if ("fills" in node && Array.isArray((node as any).fills)) {
      const fills = (node as any).fills as Paint[];

      for (let i = 0; i < fills.length; i++) {
        const fill = fills[i];

        if (fill && (fill as any).boundVariables) {
          const boundVars = (fill as any).boundVariables;

          for (const prop in boundVars) {
            const binding = boundVars[prop];
            if (binding && binding.id) {
              try {
                const variable = await safeGetVariable(binding.id);
                if (variable) {
                  let varName = variable.name;
                  let fullName = varName;
                  let isRemote = false;

                  try {
                    const collection = await safeGetVariableCollection(
                      variable.variableCollectionId,
                    );
                    if (collection) {
                      fullName = `${collection.name}/${variable.name}`;
                      isRemote = (collection as any).remote || false;
                    }
                  } catch (collErr: any) {
                    // Ignore
                  }

                  foundItems.push({
                    type: "VARIABLE",
                    name: fullName,
                    resolvedType: (variable as any).resolvedType,
                    isRemote,
                  });

                  const fullNameLower = fullName.toLowerCase();
                  const varNameLower = varName.toLowerCase();
                  const fullNameParts = fullNameLower.split("/");
                  const varBaseName = fullNameParts[fullNameParts.length - 1];

                  if (
                    fullNameLower.includes(searchLower) ||
                    varNameLower.includes(searchLower) ||
                    fullNameLower.includes(searchBase) ||
                    varBaseName.includes(searchBase) ||
                    searchLower.includes(varBaseName) ||
                    (searchBase.length > 3 &&
                      varBaseName.includes(
                        searchBase.substring(0, searchBase.length - 1),
                      )) ||
                    (varBaseName.length > 3 &&
                      searchBase.includes(
                        varBaseName.substring(0, varBaseName.length - 1),
                      ))
                  ) {
                    found = true;
                  }
                }
              } catch (e: any) {
                // Ignore
              }
            }
          }
        }
      }
    }

    // Check variables in strokes
    if ("strokes" in node && Array.isArray((node as any).strokes)) {
      const strokes = (node as any).strokes as Paint[];

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
                    const collection = await safeGetVariableCollection(
                      variable.variableCollectionId,
                    );
                    if (collection) {
                      fullName = `${collection.name}/${variable.name}`;
                      isRemote = (collection as any).remote || false;
                    }
                  } catch (collErr) {
                    // Ignore
                  }

                  foundItems.push({
                    type: "VARIABLE",
                    name: fullName,
                    resolvedType: (variable as any).resolvedType,
                    isRemote,
                  });

                  const fullNameLower = fullName.toLowerCase();
                  const varNameLower = varName.toLowerCase();
                  if (
                    fullNameLower.includes(searchLower) ||
                    varNameLower.includes(searchLower) ||
                    fullNameLower.includes(searchBase) ||
                    searchLower.includes(fullNameLower.split("/").pop() || "")
                  ) {
                    found = true;
                  }
                }
              } catch (e: any) {
                // Ignore
              }
            }
          }
        }
      }
    }

    // Check other bound variables (width, height, corner radius, etc.)
    const boundVariableProps = [
      "width",
      "height",
      "cornerRadius",
      "paddingLeft",
      "paddingRight",
      "paddingTop",
      "paddingBottom",
      "rotation",
      "opacity",
    ];

    for (const propName of boundVariableProps) {
      if (
        (node as any).boundVariables &&
        (node as any).boundVariables[propName]
      ) {
        const binding = (node as any).boundVariables[propName];
        if (binding && binding.id) {
          try {
            const variable = await safeGetVariable(binding.id);
            if (variable) {
              let varName = variable.name;
              let fullName = varName;
              let isRemote = false;

              try {
                const collection = await safeGetVariableCollection(
                  variable.variableCollectionId,
                );
                if (collection) {
                  fullName = `${collection.name}/${variable.name}`;
                  isRemote = (collection as any).remote || false;
                }
              } catch (collErr) {
                // Ignore
              }

              foundItems.push({
                type: "VARIABLE",
                name: fullName,
                resolvedType: (variable as any).resolvedType,
                isRemote,
                boundTo: propName,
              });

              const fullNameLower = fullName.toLowerCase();
              const varNameLower = varName.toLowerCase();
              if (
                fullNameLower.includes(searchLower) ||
                varNameLower.includes(searchLower) ||
                fullNameLower.includes(searchBase) ||
                searchLower.includes(fullNameLower.split("/").pop() || "")
              ) {
                found = true;
              }
            }
          } catch (e: any) {
            // Ignore
          }
        }
      }
    }
  } catch (error: any) {
    // Ignore
  }

  return { found, items: foundItems };
}

// ENHANCED: Smart search scope selection with automatic fallback
async function performSmartSearch(searchTerm: string) {
  let allFoundItems: FoundItem[] = [];
  const uniqueVariablesFound: string[] = [];
  const uniqueStylesFound: string[] = [];

  // First, try searching in selection if something is selected
  const selectionResults: SearchResult[] = [];
  const selectionStats = {
    checkedNodes: 0,
    nodesWithItems: 0,
    matchingNodes: 0,
  };

  if (figma.currentPage.selection.length > 0) {
    let selectionNodes: SceneNode[] = [];

    for (const selected of figma.currentPage.selection) {
      const allNodes = getAllNodes(selected);
      selectionNodes = selectionNodes.concat(allNodes);
    }

    // Check selection nodes
    for (const node of selectionNodes) {
      selectionStats.checkedNodes++;

      const check = await nodeHasVariableOrStyle(node, searchTerm);

      if (check.items.length > 0) {
        selectionStats.nodesWithItems++;

        // Collect unique items
        for (const item of check.items) {
          if (item.type === "VARIABLE") {
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
        selectionStats.matchingNodes++;
        selectionResults.push({
          id: node.id,
          name: node.name,
          type: node.type,
          path: buildNodePath(node),
          foundItems: check.items,
        });

        for (const item of check.items) {
          const exists = allFoundItems.some(
            (existingItem) =>
              existingItem.name === item.name &&
              existingItem.type === item.type,
          );
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
        context: `Selected layers (${figma.currentPage.selection.length} items)`,
        searchStatistics: {
          checkedNodes: selectionStats.checkedNodes,
          nodesWithItems: selectionStats.nodesWithItems,
          matchingNodes: selectionStats.matchingNodes,
          uniqueVariables: uniqueVariablesFound,
          uniqueStyles: uniqueStylesFound,
          totalUniqueItems:
            uniqueVariablesFound.length + uniqueStylesFound.length,
        },
        foundItems: allFoundItems,
        totalSearched: selectionNodes.length,
      };
    }
  }

  // Phase 2: Search entire page (fallback or default)
  let pageNodes: SceneNode[] = [];
  for (const child of figma.currentPage.children) {
    const allNodes = getAllNodes(child);
    pageNodes = pageNodes.concat(allNodes);
  }

  const pageResults: SearchResult[] = [];
  const pageStats = { checkedNodes: 0, nodesWithItems: 0, matchingNodes: 0 };

  // Clear previous collections and start fresh for page search
  allFoundItems = [];
  uniqueVariablesFound.length = 0;
  uniqueStylesFound.length = 0;

  for (const node of pageNodes) {
    pageStats.checkedNodes++;

    const check = await nodeHasVariableOrStyle(node, searchTerm);

    if (check.items.length > 0) {
      pageStats.nodesWithItems++;

      // Collect unique items
      for (const item of check.items) {
        if (item.type === "VARIABLE") {
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
      pageStats.matchingNodes++;
      pageResults.push({
        id: node.id,
        name: node.name,
        type: node.type,
        path: buildNodePath(node),
        foundItems: check.items,
      });

      for (const item of check.items) {
        const exists = allFoundItems.some(
          (existingItem) =>
            existingItem.name === item.name && existingItem.type === item.type,
        );
        if (!exists) {
          allFoundItems.push(item);
        }
      }
    }
  }

  let context = figma.currentPage.name;
  if (figma.currentPage.selection.length > 0) {
    context += " (expanded from selection)";
  }

  return {
    results: pageResults,
    context,
    searchStatistics: {
      checkedNodes: pageStats.checkedNodes,
      nodesWithItems: pageStats.nodesWithItems,
      matchingNodes: pageStats.matchingNodes,
      uniqueVariables: uniqueVariablesFound,
      uniqueStyles: uniqueStylesFound,
      totalUniqueItems: uniqueVariablesFound.length + uniqueStylesFound.length,
    },
    foundItems: allFoundItems,
    totalSearched: pageNodes.length,
    scopeInfo: {
      searchedSelection: figma.currentPage.selection.length > 0,
      selectionHadVariables: selectionStats.nodesWithItems > 0,
      expandedToPage: true,
    },
  };
}

// STRICT: Perform layer name search with smart scope
function performLayerNameSearch(searchTerm: string) {
  let searchNodes: SceneNode[] = [];
  let context = "";

  // Determine search scope
  if (figma.currentPage.selection.length > 0) {
    for (const selected of figma.currentPage.selection) {
      const allNodes = getAllNodes(selected);
      searchNodes = searchNodes.concat(allNodes);
    }
    context = `Selected layers (${figma.currentPage.selection.length} items)`;
  } else {
    for (const child of figma.currentPage.children) {
      const allNodes = getAllNodes(child);
      searchNodes = searchNodes.concat(allNodes);
    }
    context = figma.currentPage.name;
  }

  const searchResult = searchLayersByName(searchTerm, searchNodes);

  return {
    results: searchResult.results,
    context,
    searchStatistics: {
      checkedNodes: searchResult.searchStatistics.checkedNodes,
      nodesWithItems: 0, // Not applicable for layer name search
      matchingNodes: searchResult.searchStatistics.matchingNodes,
      uniqueVariables: [],
      uniqueStyles: [],
      totalUniqueItems: 0,
      excludedNodes: searchResult.searchStatistics.excludedNodes,
    },
    foundItems: [],
    totalSearched: searchNodes.length,
    searchType: "LAYER_NAME",
    strictError: searchResult.strictError,
  };
}

// Handle messages from UI - ENHANCED WITH STRICT LAYER NAME SEARCH
figma.ui.onmessage = async (msg) => {
  if (msg.type === "find-variables-and-styles") {
    const searchTerm: string = msg.searchTerm;

    if (!searchTerm || !searchTerm.trim()) {
      figma.ui.postMessage({
        type: "error",
        message: "Please enter a variable or style name to search for",
      });
      return;
    }

    try {
      const searchResult = await performSmartSearch(searchTerm);

      // Send results to UI
      figma.ui.postMessage({
        type: "search-results",
        results: searchResult.results,
        searchTerm,
        context: searchResult.context,
        foundItems: searchResult.foundItems,
        totalSearched: searchResult.totalSearched,
        searchStatistics: searchResult.searchStatistics,
        scopeInfo: searchResult.scopeInfo,
        searchType: "VARIABLES_STYLES",
      });
    } catch (error: any) {
      figma.ui.postMessage({
        type: "error",
        message: "Search failed: " + error.message,
      });
    }
  }

  // STRICT: Handle layer name search
  if (msg.type === "find-layer-names") {
    const searchTerm: string = msg.searchTerm;

    if (!searchTerm || !searchTerm.trim()) {
      figma.ui.postMessage({
        type: "error",
        message: "Please enter a layer name to search for",
      });
      return;
    }

    try {
      const searchResult = performLayerNameSearch(searchTerm);

      // Send results to UI
      figma.ui.postMessage({
        type: "search-results",
        results: searchResult.results,
        searchTerm,
        context: searchResult.context,
        foundItems: searchResult.foundItems,
        totalSearched: searchResult.totalSearched,
        searchStatistics: searchResult.searchStatistics,
        searchType: "LAYER_NAME",
        strictError: searchResult.strictError,
      });
    } catch (error: any) {
      figma.ui.postMessage({
        type: "error",
        message: "Layer name search failed: " + error.message,
      });
    }
  }
};
