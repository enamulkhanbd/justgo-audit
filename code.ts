// JustGo Audit Plugin - WITH STRICT LAYER NAME SEARCH
figma.showUI(__html__, {
  width: 420,
  height: 750,
  themeColors: true,
});

console.log("🚀 JustGo Audit Plugin Loaded - Design System Audit Tool");

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
  console.log("🔍 === JUSTGO AUDIT: STRICT LAYER NAME SEARCH START ===");
  console.log("Search term:", searchTerm);
  console.log("Allowed names:", ALLOWED_LAYER_NAMES);
  console.log("Scope nodes:", scopeNodes.length);

  const results: SearchResult[] = [];
  const searchLower = searchTerm.toLowerCase().trim();
  const stats = { checkedNodes: 0, matchingNodes: 0, excludedNodes: 0 };

  // STRICT: Check if search term is in allowed list
  if (!ALLOWED_LAYER_NAMES.includes(searchLower as any)) {
    console.log(
      `❌ JUSTGO AUDIT: Search term "${searchTerm}" is not in allowed layer names`,
    );
    console.log("🔍 === JUSTGO AUDIT: STRICT LAYER NAME SEARCH END ===");
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

    console.log(
      `  🔍 AUDIT: Checking node ${stats.checkedNodes}/${scopeNodes.length}:`,
      node.name,
      `(${node.type})`,
    );

    // STRICT: Exclude component and instance types
    if (EXCLUDED_NODE_TYPES.includes(node.type as any)) {
      console.log(`    ❌ AUDIT EXCLUDED: Node type ${node.type} is excluded`);
      stats.excludedNodes++;
      continue;
    }

    const nodeName = node.name.toLowerCase().trim();

    // STRICT: Only exact matches allowed
    if (nodeName === searchLower) {
      console.log("    ✅ AUDIT MATCH:", node.name);
      stats.matchingNodes++;
      results.push({
        id: node.id,
        name: node.name,
        type: node.type,
        path: buildNodePath(node),
        matchType: "LAYER_NAME",
      });
      console.log("    🎯 Added to audit results:", node.name);
    } else {
      console.log("    ❌ No exact match:", nodeName, "vs", searchLower);
    }
  }

  console.log("🔍 === JUSTGO AUDIT: STRICT LAYER NAME SEARCH SUMMARY ===");
  console.log("  - Nodes checked:", stats.checkedNodes);
  console.log(
    "  - Excluded nodes (components/instances):",
    stats.excludedNodes,
  );
  console.log("  - Matching nodes found:", stats.matchingNodes);
  console.log("🔍 === JUSTGO AUDIT: STRICT LAYER NAME SEARCH END ===");

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
      console.warn(
        "AUDIT: Failed to get variable with both async and sync methods:",
        error.message,
        syncError.message,
      );
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
      console.warn(
        "AUDIT: Failed to get collection with both async and sync methods:",
        error.message,
        syncError.message,
      );
      return null;
    }
  }
}

// ULTRA COMPREHENSIVE style debugging function for design system audit
function debugNodeStyleProperties(node: SceneNode): void {
  console.log(
    "    🔍 === JUSTGO AUDIT: COMPREHENSIVE STYLE PROPERTY DEBUG ===",
  );
  console.log("    🔍 Node:", node.name, "Type:", node.type);

  // Check if style properties exist
  const styleProperties = [
    "fillStyleId",
    "strokeStyleId",
    "textStyleId",
    "effectStyleId",
    "gridStyleId",
  ];

  console.log(
    "    🔍 AUDIT: Checking which style properties exist on this node...",
  );

  for (const prop of styleProperties) {
    const hasProperty = prop in node;
    const value = hasProperty ? (node as any)[prop] : "DOES NOT EXIST";
    const valueType = typeof value;

    console.log(`    🔍 AUDIT ${prop}:`, {
      exists: hasProperty,
      value: value,
      type: valueType,
      isEmpty: value === "" || value === null || value === undefined,
      isMixed: value === figma.mixed,
    });
  }

  // Let's also check all properties on the node
  console.log(
    '    🔍 AUDIT: All node properties that contain "style":',
    Object.keys(node).filter((key) => key.toLowerCase().includes("style")),
  );

  console.log("    🔍 === END JUSTGO AUDIT STYLE PROPERTY DEBUG ===");
}

// ENHANCED function to safely get style by ID with ULTRA debugging for audit
function safeGetStyle(
  styleId: string,
  styleProperty: string,
  nodeName: string,
): BaseStyle | null {
  console.log("        🎨 === JUSTGO AUDIT: ULTRA STYLE DEBUGGING ===");
  console.log("        🎨 Node:", nodeName);
  console.log("        🎨 Property:", styleProperty);
  console.log("        🎨 Style ID:", styleId);
  console.log("        🎨 Style ID type:", typeof styleId);
  console.log('        🎨 Style ID === "":', styleId === "");
  console.log("        🎨 Style ID === null:", styleId === null);
  console.log("        🎨 Style ID === undefined:", styleId === undefined);
  console.log("        🎨 Style ID === figma.mixed:", styleId === figma.mixed);

  try {
    if (
      !styleId ||
      styleId === "" ||
      styleId === null ||
      styleId === undefined ||
      styleId === figma.mixed
    ) {
      console.log("        🎨 ❌ AUDIT: Invalid style ID - skipping");
      return null;
    }

    console.log("        🎨 ⏳ AUDIT: Attempting figma.getStyleById...");
    const style = figma.getStyleById(styleId);

    if (!style) {
      console.log(
        "        🎨 ❌ AUDIT: figma.getStyleById returned null/undefined",
      );
      return null;
    }

    console.log("        🎨 ✅ AUDIT: Style retrieved successfully!");
    console.log("        🎨 AUDIT Style details:", {
      id: style.id,
      name: style.name,
      type: style.type,
      remote: (style as any).remote || false,
      description: style.description || "No description",
    });

    return style;
  } catch (error: any) {
    console.error(
      "        🎨 ❌ AUDIT ERROR in figma.getStyleById:",
      error.message,
    );
    console.error("        🎨 ❌ AUDIT Error stack:", error.stack);
    return null;
  } finally {
    console.log("        🎨 === END JUSTGO AUDIT STYLE DEBUGGING ===");
  }
}

// Enhanced function to check style name matching with multiple strategies
function styleMatches(styleName: string, searchTerm: string): boolean {
  if (!styleName || !searchTerm) return false;

  const styleNameLower = styleName.toLowerCase().trim();
  const searchLower = searchTerm.toLowerCase().trim();
  const searchParts = searchLower.split("/");
  const searchBase = searchParts[searchParts.length - 1];

  console.log("        🔍 AUDIT: Style matching comparison:");
  console.log("          Style name:", styleNameLower);
  console.log("          Search term:", searchLower);
  console.log("          Search base:", searchBase);

  // Strategy 1: Exact match
  if (styleNameLower === searchLower) {
    console.log("          ✅ AUDIT: EXACT MATCH!");
    return true;
  }

  // Strategy 2: Contains match
  if (styleNameLower.includes(searchLower)) {
    console.log("          ✅ AUDIT: CONTAINS MATCH!");
    return true;
  }

  // Strategy 3: Search contains style name
  if (searchLower.includes(styleNameLower)) {
    console.log("          ✅ AUDIT: REVERSE CONTAINS MATCH!");
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
    console.log(
      "          ✅ AUDIT: BASE NAME MATCH!",
      styleBase,
      "vs",
      searchBase,
    );
    return true;
  }

  // Strategy 5: Partial component matching
  for (const searchPart of searchParts) {
    if (searchPart.length > 2 && styleNameLower.includes(searchPart)) {
      console.log("          ✅ AUDIT: PARTIAL COMPONENT MATCH!", searchPart);
      return true;
    }
  }

  // Strategy 6: Word boundary matching (for cases like "warning" matching "warning/100")
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
        console.log(
          "          ✅ AUDIT: WORD BOUNDARY MATCH!",
          searchWord,
          "vs",
          styleWord,
        );
        return true;
      }
    }
  }

  console.log("          ❌ AUDIT: No match found");
  return false;
}

// COMPLETELY REWRITTEN style detection with ULTRA debugging for design system audit
function checkNodeStyles(
  node: SceneNode,
  searchTerm: string,
): StyleDetectionResult {
  const foundStyles: FoundItem[] = [];
  let matchesSearch = false;

  console.log("    🎨 === JUSTGO AUDIT: ULTRA STYLE DETECTION START ===");
  console.log("    🎨 Node:", node.name, "Type:", node.type);
  console.log("    🎨 Searching for:", searchTerm);

  // First, debug what style properties exist
  debugNodeStyleProperties(node);

  // === PAINT STYLES (Fill) ===
  console.log("    🎨 --- AUDIT: Checking Fill Styles ---");
  if ("fillStyleId" in node) {
    const fillStyleId = (node as any).fillStyleId;
    console.log(
      "    🎨 AUDIT: fillStyleId property exists, value:",
      fillStyleId,
    );

    const fillStyle = safeGetStyle(fillStyleId, "fillStyleId", node.name);

    if (fillStyle) {
      console.log(
        "    🎨 ✅ AUDIT: Fill style successfully retrieved:",
        fillStyle.name,
      );
      foundStyles.push({
        type: "STYLE",
        name: fillStyle.name,
        styleType: "PAINT",
        property: "fill",
        isRemote: (fillStyle as any).remote || false,
      });

      if (styleMatches(fillStyle.name, searchTerm)) {
        console.log("    🎨 🎯 AUDIT: FILL STYLE MATCHES SEARCH!");
        matchesSearch = true;
      }
    } else {
      console.log("    🎨 ❌ AUDIT: Fill style retrieval failed");
    }
  } else {
    console.log("    🎨 ⚠️ AUDIT: Node does not have fillStyleId property");
  }

  // === PAINT STYLES (Stroke) ===
  console.log("    🎨 --- AUDIT: Checking Stroke Styles ---");
  if ("strokeStyleId" in node) {
    const strokeStyleId = (node as any).strokeStyleId;
    console.log(
      "    🎨 AUDIT: strokeStyleId property exists, value:",
      strokeStyleId,
    );

    const strokeStyle = safeGetStyle(strokeStyleId, "strokeStyleId", node.name);

    if (strokeStyle) {
      console.log(
        "    🎨 ✅ AUDIT: Stroke style successfully retrieved:",
        strokeStyle.name,
      );
      foundStyles.push({
        type: "STYLE",
        name: strokeStyle.name,
        styleType: "PAINT",
        property: "stroke",
        isRemote: (strokeStyle as any).remote || false,
      });

      if (styleMatches(strokeStyle.name, searchTerm)) {
        console.log("    🎨 🎯 AUDIT: STROKE STYLE MATCHES SEARCH!");
        matchesSearch = true;
      }
    } else {
      console.log("    🎨 ❌ AUDIT: Stroke style retrieval failed");
    }
  } else {
    console.log("    🎨 ⚠️ AUDIT: Node does not have strokeStyleId property");
  }

  // === TEXT STYLES ===
  console.log("    🎨 --- AUDIT: Checking Text Styles ---");
  if (node.type === "TEXT" && "textStyleId" in node) {
    const textStyleId = (node as any).textStyleId;
    console.log(
      "    🎨 AUDIT: textStyleId property exists on TEXT node, value:",
      textStyleId,
    );

    const textStyle = safeGetStyle(textStyleId, "textStyleId", node.name);

    if (textStyle) {
      console.log(
        "    🎨 ✅ AUDIT: Text style successfully retrieved:",
        textStyle.name,
      );
      foundStyles.push({
        type: "STYLE",
        name: textStyle.name,
        styleType: "TEXT",
        property: "text",
        isRemote: (textStyle as any).remote || false,
      });

      if (styleMatches(textStyle.name, searchTerm)) {
        console.log("    🎨 🎯 AUDIT: TEXT STYLE MATCHES SEARCH!");
        matchesSearch = true;
      }
    } else {
      console.log("    🎨 ❌ AUDIT: Text style retrieval failed");
    }
  } else {
    if (node.type !== "TEXT") {
      console.log(`    🎨 ⚠️ AUDIT: Node is not TEXT type (${node.type})`);
    } else {
      console.log(
        "    🎨 ⚠️ AUDIT: TEXT node does not have textStyleId property",
      );
    }
  }

  // === EFFECT STYLES ===
  console.log("    🎨 --- AUDIT: Checking Effect Styles ---");
  if ("effectStyleId" in node) {
    const effectStyleId = (node as any).effectStyleId;
    console.log(
      "    🎨 AUDIT: effectStyleId property exists, value:",
      effectStyleId,
    );

    const effectStyle = safeGetStyle(effectStyleId, "effectStyleId", node.name);

    if (effectStyle) {
      console.log(
        "    🎨 ✅ AUDIT: Effect style successfully retrieved:",
        effectStyle.name,
      );
      foundStyles.push({
        type: "STYLE",
        name: effectStyle.name,
        styleType: "EFFECT",
        property: "effect",
        isRemote: (effectStyle as any).remote || false,
      });

      if (styleMatches(effectStyle.name, searchTerm)) {
        console.log("    🎨 🎯 AUDIT: EFFECT STYLE MATCHES SEARCH!");
        matchesSearch = true;
      }
    } else {
      console.log("    🎨 ❌ AUDIT: Effect style retrieval failed");
    }
  } else {
    console.log("    🎨 ⚠️ AUDIT: Node does not have effectStyleId property");
  }

  // === GRID STYLES ===
  console.log("    🎨 --- AUDIT: Checking Grid Styles ---");
  if ("gridStyleId" in node) {
    const gridStyleId = (node as any).gridStyleId;
    console.log(
      "    🎨 AUDIT: gridStyleId property exists, value:",
      gridStyleId,
    );

    const gridStyle = safeGetStyle(gridStyleId, "gridStyleId", node.name);

    if (gridStyle) {
      console.log(
        "    🎨 ✅ AUDIT: Grid style successfully retrieved:",
        gridStyle.name,
      );
      foundStyles.push({
        type: "STYLE",
        name: gridStyle.name,
        styleType: "GRID",
        property: "grid",
        isRemote: (gridStyle as any).remote || false,
      });

      if (styleMatches(gridStyle.name, searchTerm)) {
        console.log("    🎨 🎯 AUDIT: GRID STYLE MATCHES SEARCH!");
        matchesSearch = true;
      }
    } else {
      console.log("    🎨 ❌ AUDIT: Grid style retrieval failed");
    }
  } else {
    console.log("    🎨 ⚠️ AUDIT: Node does not have gridStyleId property");
  }

  // === ALTERNATIVE STYLE DETECTION ===
  console.log("    🎨 --- AUDIT: Alternative Style Detection Methods ---");

  // Try to find styles through different methods
  if ("fills" in node && Array.isArray((node as any).fills)) {
    console.log("    🎨 AUDIT: Checking if fills have style information...");
    const fills = (node as any).fills as Paint[];
    for (let i = 0; i < fills.length; i++) {
      const fill = fills[i];
      console.log(`    🎨 AUDIT Fill ${i}:`, {
        type: fill.type,
        visible: fill.visible,
        hasStyleInfo: "styleId" in fill,
      });
    }
  }

  if ("strokes" in node && Array.isArray((node as any).strokes)) {
    console.log("    🎨 AUDIT: Checking if strokes have style information...");
    const strokes = (node as any).strokes as Paint[];
    for (let i = 0; i < strokes.length; i++) {
      const stroke = strokes[i];
      console.log(`    🎨 AUDIT Stroke ${i}:`, {
        type: stroke.type,
        visible: stroke.visible,
        hasStyleInfo: "styleId" in stroke,
      });
    }
  }

  console.log("    🎨 === JUSTGO AUDIT: ULTRA STYLE DETECTION SUMMARY ===");
  console.log("    🎨 Total styles found:", foundStyles.length);
  console.log("    🎨 Matches search:", matchesSearch);
  console.log(
    "    🎨 Found styles:",
    foundStyles.map((s) => s.name),
  );
  console.log("    🎨 === JUSTGO AUDIT: ULTRA STYLE DETECTION END ===");

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

    console.log("  🔍 === JUSTGO AUDIT: NODE ANALYSIS START ===");
    console.log("  🔍 Node:", node.name, "Type:", node.type);
    console.log("  🔍 Search term:", searchTerm);

    // === ENHANCED STYLE DETECTION ===
    const styleResult = checkNodeStyles(node, searchTerm);

    // Add style results
    foundItems = foundItems.concat(styleResult.foundStyles);
    if (styleResult.matchesSearch) {
      found = true;
    }

    // === ENHANCED ASYNC VARIABLE DETECTION ===
    console.log("    🔗 === JUSTGO AUDIT: VARIABLE DETECTION START ===");
    console.log("    🔗 Checking variables for:", node.name);

    // Check variables in fills
    if ("fills" in node && Array.isArray((node as any).fills)) {
      const fills = (node as any).fills as Paint[];
      console.log("      📝 AUDIT: Node has", fills.length, "fills");

      for (let i = 0; i < fills.length; i++) {
        const fill = fills[i];
        console.log(
          `        AUDIT Fill ${i}:`,
          fill.type,
          fill.visible !== false ? "visible" : "hidden",
        );

        if (fill && (fill as any).boundVariables) {
          const boundVars = (fill as any).boundVariables;
          console.log(
            "        AUDIT: Fill has bound variables:",
            Object.keys(boundVars),
          );

          for (const prop in boundVars) {
            const binding = boundVars[prop];
            if (binding && binding.id) {
              try {
                console.log(
                  "        🔍 AUDIT: Getting variable with ID:",
                  binding.id,
                );
                const variable = await safeGetVariable(binding.id);
                if (variable) {
                  let varName = variable.name;
                  let fullName = varName;
                  let isRemote = false;

                  try {
                    console.log(
                      "        🔍 AUDIT: Getting collection for variable:",
                      varName,
                    );
                    const collection = await safeGetVariableCollection(
                      variable.variableCollectionId,
                    );
                    if (collection) {
                      fullName = `${collection.name}/${variable.name}`;
                      isRemote = (collection as any).remote || false;
                      console.log(
                        "        📁 AUDIT: Collection found:",
                        collection.name,
                        "Remote:",
                        isRemote,
                      );
                    }
                  } catch (collErr: any) {
                    console.warn(
                      "          AUDIT: Could not get collection for variable:",
                      varName,
                      collErr.message,
                    );
                  }

                  console.log(
                    "        🔗 AUDIT: Found variable in fill:",
                    fullName,
                    "(",
                    (variable as any).resolvedType,
                    ")",
                  );
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

                  console.log("        🔍 AUDIT: Comparing:");
                  console.log(
                    "          Search:",
                    searchLower,
                    "| Base:",
                    searchBase,
                  );
                  console.log(
                    "          Variable:",
                    fullNameLower,
                    "| VarBase:",
                    varBaseName,
                  );

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
                    console.log(
                      "        ✅ AUDIT: MATCH: Fill variable matches search!",
                      fullName,
                      "vs",
                      searchTerm,
                    );
                    found = true;
                  } else {
                    console.log(
                      "        ❌ AUDIT: No match for variable:",
                      fullName,
                    );
                  }
                } else {
                  console.log(
                    "        ❌ AUDIT: Variable was null for ID:",
                    binding.id,
                  );
                }
              } catch (e: any) {
                console.warn(
                  "        ❌ AUDIT: Error getting fill variable:",
                  e.message,
                );
              }
            }
          }
        } else {
          console.log("        AUDIT: Fill has no bound variables");
        }
      }
    }

    // Check variables in strokes
    if ("strokes" in node && Array.isArray((node as any).strokes)) {
      const strokes = (node as any).strokes as Paint[];
      console.log("      📝 AUDIT: Node has", strokes.length, "strokes");

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

                  console.log(
                    "        🔗 AUDIT: Found variable in stroke:",
                    fullName,
                  );
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
                    console.log(
                      "        ✅ AUDIT: MATCH: Stroke variable matches search!",
                      fullName,
                      "vs",
                      searchTerm,
                    );
                    found = true;
                  }
                }
              } catch (e: any) {
                console.warn(
                  "        ❌ AUDIT: Error getting stroke variable:",
                  e.message,
                );
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

    if ((node as any).boundVariables) {
      console.log(
        "      📝 AUDIT: Node has bound variables for:",
        Object.keys((node as any).boundVariables),
      );
    }

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

              console.log(
                `        🔗 AUDIT: Found variable in ${propName}:`,
                fullName,
              );
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
                console.log(
                  `        ✅ AUDIT: MATCH: ${propName} variable matches search!`,
                  fullName,
                  "vs",
                  searchTerm,
                );
                found = true;
              }
            }
          } catch (e: any) {
            console.warn(
              `        ❌ AUDIT: Error getting ${propName} variable:`,
              e.message,
            );
          }
        }
      }
    }

    // Summary for this node
    console.log("  🔍 === JUSTGO AUDIT: NODE ANALYSIS SUMMARY ===");
    console.log("  🔍 Total items found on node:", foundItems.length);
    console.log(
      "  🔍 Styles found:",
      foundItems.filter((item) => item.type === "STYLE").length,
    );
    console.log(
      "  🔍 Variables found:",
      foundItems.filter((item) => item.type === "VARIABLE").length,
    );
    console.log("  🔍 Matches search:", found);

    if (found) {
      console.log("  🔍 🎯 AUDIT: THIS NODE WILL BE INCLUDED IN RESULTS");
    } else if (foundItems.length > 0) {
      console.log(
        "  🔍 ⚠️ AUDIT: Node has variables/styles but none match search",
      );
    } else {
      console.log("  🔍 📋 AUDIT: No variables or styles found on this node");
    }
    console.log("  🔍 === JUSTGO AUDIT: NODE ANALYSIS END ===");
  } catch (error: any) {
    console.error("  ❌ AUDIT: Error checking node:", node.name, error.message);
  }

  return { found, items: foundItems };
}

// ENHANCED: Smart search scope selection with automatic fallback
async function performSmartSearch(searchTerm: string) {
  console.log("🧠 === JUSTGO AUDIT: SMART SEARCH SCOPE LOGIC ===");

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
    console.log("🎯 AUDIT PHASE 1: Searching in selection first...");
    let selectionNodes: SceneNode[] = [];

    for (const selected of figma.currentPage.selection) {
      const allNodes = getAllNodes(selected);
      selectionNodes = selectionNodes.concat(allNodes);
    }

    console.log(
      "📊 AUDIT: Selection contains",
      selectionNodes.length,
      "total nodes",
    );

    // Check selection nodes
    for (const node of selectionNodes) {
      selectionStats.checkedNodes++;

      console.log(
        `  🔍 AUDIT: Checking selection node ${selectionStats.checkedNodes}/${selectionNodes.length}:`,
        node.name,
      );

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

    console.log("📊 AUDIT: Selection search results:");
    console.log("  - Nodes checked:", selectionStats.checkedNodes);
    console.log(
      "  - Nodes with variables/styles:",
      selectionStats.nodesWithItems,
    );
    console.log("  - Matching nodes found:", selectionStats.matchingNodes);

    // If we found matches in selection, return them
    if (selectionResults.length > 0) {
      console.log(
        "✅ AUDIT: Found",
        selectionResults.length,
        "results in selection - using selection scope",
      );
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

    // If selection had some variables/styles but no matches, inform user
    if (selectionStats.nodesWithItems > 0) {
      console.log(
        "⚠️ AUDIT: Selection has variables/styles but none match search - expanding to page...",
      );
    } else {
      console.log(
        "⚠️ AUDIT: Selection has no variables/styles at all - expanding to page...",
      );
    }
  }

  // Phase 2: Search entire page (fallback or default)
  console.log("🎯 AUDIT PHASE 2: Searching entire page...");

  let pageNodes: SceneNode[] = [];
  for (const child of figma.currentPage.children) {
    const allNodes = getAllNodes(child);
    pageNodes = pageNodes.concat(allNodes);
  }

  console.log("📊 AUDIT: Page contains", pageNodes.length, "total nodes");

  const pageResults: SearchResult[] = [];
  const pageStats = { checkedNodes: 0, nodesWithItems: 0, matchingNodes: 0 };

  // Clear previous collections and start fresh for page search
  allFoundItems = [];
  uniqueVariablesFound.length = 0;
  uniqueStylesFound.length = 0;

  for (const node of pageNodes) {
    pageStats.checkedNodes++;

    console.log(
      `  🔍 AUDIT: Checking page node ${pageStats.checkedNodes}/${pageNodes.length}:`,
      node.name,
      `(${node.type})`,
    );

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

  console.log("📊 AUDIT: Page search results:");
  console.log("  - Nodes checked:", pageStats.checkedNodes);
  console.log("  - Nodes with variables/styles:", pageStats.nodesWithItems);
  console.log("  - Matching nodes found:", pageStats.matchingNodes);

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
  console.log("🏷️ === JUSTGO AUDIT: STRICT LAYER NAME SEARCH START ===");
  console.log("Search term:", searchTerm);
  console.log(
    "Current selection:",
    figma.currentPage.selection.length,
    "items",
  );

  let searchNodes: SceneNode[] = [];
  let context = "";

  // Determine search scope
  if (figma.currentPage.selection.length > 0) {
    console.log("🎯 AUDIT: Using selection as search scope");
    for (const selected of figma.currentPage.selection) {
      const allNodes = getAllNodes(selected);
      searchNodes = searchNodes.concat(allNodes);
    }
    context = `Selected layers (${figma.currentPage.selection.length} items)`;
  } else {
    console.log("🎯 AUDIT: Using entire page as search scope");
    for (const child of figma.currentPage.children) {
      const allNodes = getAllNodes(child);
      searchNodes = searchNodes.concat(allNodes);
    }
    context = figma.currentPage.name;
  }

  console.log(
    "📊 AUDIT: Search scope contains",
    searchNodes.length,
    "total nodes",
  );

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
  console.log("📨 JUSTGO AUDIT: Message from UI:", msg.type, msg);

  if (msg.type === "find-variables-and-styles") {
    const searchTerm: string = msg.searchTerm;

    if (!searchTerm || !searchTerm.trim()) {
      figma.ui.postMessage({
        type: "error",
        message: "Please enter a variable or style name to search for",
      });
      return;
    }

    console.log("🔍 === JUSTGO AUDIT: SMART SEARCH START ===");
    console.log("Search term:", searchTerm);
    console.log(
      "Current selection:",
      figma.currentPage.selection.length,
      "items",
    );

    try {
      const searchResult = await performSmartSearch(searchTerm);

      console.log("🎉 JUSTGO AUDIT: Smart search complete!");
      console.log("Final results count:", searchResult.results.length);
      console.log("Context:", searchResult.context);

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
      console.error("❌ JUSTGO AUDIT: Error during smart search:", error);
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

    console.log("🏷️ === JUSTGO AUDIT: STRICT LAYER NAME SEARCH START ===");
    console.log("Search term:", searchTerm);

    try {
      const searchResult = performLayerNameSearch(searchTerm);

      console.log("🎉 JUSTGO AUDIT: Strict layer name search complete!");
      console.log("Final results count:", searchResult.results.length);
      console.log("Context:", searchResult.context);

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
      console.error(
        "❌ JUSTGO AUDIT: Error during strict layer name search:",
        error,
      );
      figma.ui.postMessage({
        type: "error",
        message: "Layer name search failed: " + error.message,
      });
    }
  }
};

console.log(
  "✅ JustGo Audit ready - Design System Audit Tool with comprehensive detection!",
);
