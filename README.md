# JustGo Audit - Figma Plugin

A comprehensive design system audit tool for Figma that helps you find layers using variables, styles, and strict layer name matching. Perfect for design system quality assurance and maintenance.

## Features

### 🔍 Design System Audit (Variables & Styles Mode)

- **Comprehensive Variable Detection**: Find layers using design variables (colors, numbers, strings, booleans)
- **Complete Style Detection**: Locate layers with paint, text, effect, and grid styles
- **Smart Scope Logic**: Automatically searches selection first, then expands to page when needed
- **Local & Remote Support**: Works with both local design tokens and remote library components
- **Ultra-Fast Detection**: Optimized async algorithms with comprehensive error handling

### 🔒 Strict Layer Name Search Mode

- **Exact Name Matching**: Find layers by precise layer names only
- **Component Exclusion**: Automatically excludes COMPONENT and INSTANCE types for quality assurance
- **Predefined Validation**: Only allows these exact layer names:
  - `heading-text`
  - `title-text`
  - `subtitle-text`
  - `body-text`
  - `highlighted-text`
  - `info-text`
  - `caption-text`
  - `overline-text`

### 🧠 Smart Features

- **Intelligent Scope Selection**: Searches your selection first, expands to page automatically
- **Detailed Statistics**: Shows nodes checked, design tokens found, and matching criteria
- **Complete Layer Paths**: Displays full path (Page → Frame → Layer) for each result
- **Click to Navigate**: Select and zoom to any layer from search results
- **Real-time Validation**: Instant feedback on search terms and layer names

## Installation

### For Development

1. Download or clone this repository
2. Open Figma Desktop App (plugin requires desktop version)
3. Go to **Plugins → Development → Import plugin from manifest...**
4. Select the `manifest.json` file from this folder
5. The plugin will appear in your plugins list as "JustGo Audit"

### For Distribution

1. Ensure all plugin files are compiled (`code.js` from `code.ts`)
2. Submit to Figma Community or share privately
3. All files must be in the same directory

## File Structure

```
justgo-audit/
├── manifest.json     # Plugin configuration and metadata
├── code.js          # Main plugin logic (JavaScript)
├── code.ts          # Main plugin logic (TypeScript source)
├── ui.html          # Plugin user interface with dual-mode tabs
└── README.md        # This documentation
```

## How to Use

### Variables & Styles Mode

1. Open any Figma file with design variables or styles
2. Run the "JustGo Audit" plugin
3. Select the **"🔗 Variables & Styles"** tab
4. Enter a variable or style name (e.g., `colors/surface/default`)
5. Click **"Start Audit"** to search
6. View detailed statistics and found design tokens
7. Click on any result to select and zoom to that layer

### Layer Names Mode

1. Select the **"🏷️ Layer Names"** tab
2. Enter an exact layer name from the allowed list
3. Use quick-select buttons for guaranteed valid names
4. Click **"Start Audit"** to perform strict search
5. Results automatically exclude components and instances
6. Click on results to navigate to matching layers

## Search Term Formats

### Variables & Styles

The plugin accepts various formats for design tokens:

**Variables:**

- `colors/surface/default`
- `spacing/md`
- `border-radius/lg`
- `typography/heading/large`

**Styles:**

- `button-primary`
- `heading-large`
- `card-shadow`
- `layout-grid`

### Layer Names (Strict Mode)

Only these exact names are allowed:

- `heading-text`
- `title-text`
- `subtitle-text`
- `body-text`
- `highlighted-text`
- `info-text`
- `caption-text`
- `overline-text`

## Smart Search Logic

### Scope Intelligence

1. **Selection First**: If layers are selected, searches within selection
2. **Automatic Expansion**: If no matches in selection, expands to entire page
3. **Context Awareness**: Shows which scope was used in results
4. **Performance Optimized**: Efficient traversal of large design files

### Statistics Reporting

- **Nodes Audited**: Total number of layers checked
- **With Design Tokens**: Layers containing variables or styles
- **Matching Criteria**: Layers that match your search term
- **Unique Items Found**: Distinct variables and styles discovered

## Development

### Prerequisites

- Figma Desktop App
- TypeScript compiler (if modifying code.ts)
- Basic understanding of Figma Plugin API

### Modifying the Plugin

1. Edit `code.ts` for main plugin logic changes
2. Compile TypeScript: `tsc code.ts --target es2017`
3. Edit `ui.html` for interface modifications
4. Update `manifest.json` for configuration changes
5. Reload plugin in Figma to test changes

## API Usage

The plugin leverages these Figma API features:

### Core APIs

- `figma.variables.*` - Access design variables and collections
- `figma.getStyleById()` - Retrieve style information
- `figma.root.children` - Traverse document structure
- `figma.currentPage.selection` - Handle user selections

### Navigation APIs

- `figma.getNodeById()` - Access specific nodes
- `figma.viewport.scrollAndZoomIntoView()` - Navigate to layers
- `figma.currentPage.selection` - Select found layers

### Async Operations

- `figma.variables.getVariableByIdAsync()` - Fetch variables asynchronously
- `figma.variables.getVariableCollectionByIdAsync()` - Get variable collections

## Technical Capabilities

### Variable Detection

- **Fill Variables**: Colors and images bound to fill properties
- **Stroke Variables**: Border colors and styles
- **Dimension Variables**: Width, height, corner radius, padding
- **Text Variables**: String content and properties
- **Boolean Variables**: Visibility and state toggles

### Style Detection

- **Paint Styles**: Fill and stroke styling
- **Text Styles**: Typography and text formatting
- **Effect Styles**: Shadows, blurs, and other effects
- **Grid Styles**: Layout grid configurations

### Quality Assurance

- **Component Exclusion**: Automatically skips COMPONENT and INSTANCE nodes
- **Error Handling**: Comprehensive error catching and user feedback
- **Validation**: Strict input validation for layer names
- **Performance**: Optimized for large files with thousands of layers

## Limitations

- **Desktop Only**: Requires Figma Desktop App (not browser version)
- **Variable Binding**: Only finds variables properly bound to layer properties
- **Style Application**: Only detects styles actually applied to layers
- **Performance**: May be slower with extremely large files (10,000+ layers)
- **Layer Names**: Strict mode limited to predefined 8 layer names only

## Troubleshooting

### Common Issues

- **No Results Found**: Ensure variables/styles are properly bound to layers
- **Plugin Won't Load**: Verify you're using Figma Desktop, not browser
- **Search Fails**: Check variable name format (collection-name/variable-name)
- **Layer Names Rejected**: Use only the 8 allowed exact layer names

### Debug Steps

1. Verify your file contains the variables/styles you're searching for
2. Check that variables are bound to layer properties (not just defined)
3. Ensure layer names match exactly (case-sensitive)
4. Try searching in a smaller selection first
5. Restart Figma Desktop if plugin becomes unresponsive

## Version History

### v2.0.0 - JustGo Audit

- **NEW**: Dual-mode interface (Variables/Styles + Layer Names)
- **NEW**: Strict layer name search with component exclusion
- **NEW**: Smart scope logic with automatic expansion
- **NEW**: Comprehensive statistics and reporting
- **NEW**: Enhanced error handling and validation
- **IMPROVED**: Ultra-fast async variable detection
- **IMPROVED**: Complete style detection coverage
- **IMPROVED**: Professional audit-focused interface

## Support

For issues, feature requests, or questions:

1. **Check Documentation**: Review this README and troubleshooting section
2. **Verify Setup**: Ensure proper installation and Figma Desktop usage
3. **Test with Sample**: Try with a known working file first
4. **Report Issues**: Include plugin version, Figma version, and error details

## License

MIT License - Feel free to modify and distribute for your design system needs.

---

**JustGo Audit** - Making design system audits faster, more accurate, and more comprehensive. Perfect for design teams maintaining quality and consistency across large-scale projects.
