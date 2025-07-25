# Variable Layer Finder - Figma Plugin

A Figma plugin that helps you find every layer using a specific design variable in your file.

## Features

- Search for layers by variable name (e.g., "color/surface/default" or "spacing/md")
- Shows complete path to each layer (Page / Frame / Layer)
- Click on results to select and zoom to layers
- Works across all pages in your file
- Real-time search through the Figma API

## Installation

### For Development

1. Download or clone this repository
2. Open Figma Desktop App
3. Go to `Plugins` → `Development` → `Import plugin from manifest...`
4. Select the `manifest.json` file from this folder
5. The plugin will appear in your plugins list

### For Distribution

1. Build the plugin files (ensure `code.js` is compiled from `code.ts`)
2. Submit to Figma Community or share privately

## Files Structure

```
variable-layer-finder/
├── manifest.json     # Plugin configuration
├── code.ts          # Main plugin logic (needs to be compiled to code.js)
├── ui.html          # Plugin user interface
└── README.md        # This file
```

## How to Use

1. Open any Figma file with design variables
2. Run the "Variable Layer Finder" plugin
3. Enter the full variable name (e.g., "color/surface/default")
4. Click "Find Layers" to search
5. Click on any result to select and zoom to that layer

## Variable Name Format

The plugin expects variable names in the format: `collection-name/variable-name`

Examples:

- `color/surface/default`
- `spacing/md`
- `typography/heading/large`
- `border-radius/sm`

## Development

To modify the plugin:

1. Edit `code.ts` for main plugin logic
2. Compile TypeScript to JavaScript: `tsc code.ts --target es2017`
3. Edit `ui.html` for interface changes
4. Reload the plugin in Figma

## API Usage

The plugin uses the following Figma API features:

- `figma.variables` - Access to design variables
- `figma.root.children` - Traverse all pages
- `figma.getNodeById()` - Access specific nodes
- `figma.currentPage.selection` - Select layers
- `figma.viewport.scrollAndZoomIntoView()` - Navigate to layers

## Limitations

- Only searches for variable bindings on supported properties
- Requires variables to be properly bound to layer properties
- Performance may vary with very large files

## Support

For issues or feature requests, please check that:

1. Your file contains design variables
2. Variables are properly bound to layer properties
3. You're using the correct variable name format

## License

MIT License - feel free to modify and distribute.
