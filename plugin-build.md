# Figma Plugin Build Instructions

## File Structure Clarification

This project currently contains TWO different applications:

### 1. Web Application Demo (Current Figma Make App)

```
├── App.tsx                          # Main web app
├── components/VariableLayerFinder.tsx # Web app component
├── components/ui/                   # UI components
├── styles/globals.css              # Web app styles
```

### 2. Actual Figma Plugin Files

```
├── manifest.json                   # Plugin configuration
├── code.ts                        # Plugin main code (TypeScript source)
├── ui.html                        # Plugin UI (HTML/CSS/JS)
```

## To Use the Figma Plugin

### Step 1: Compile TypeScript to JavaScript

You need to compile `code.ts` to `code.js`:

```bash
# Install TypeScript if not already installed
npm install -g typescript

# Compile the plugin code
tsc code.ts --target es2017 --outDir .
```

This creates `code.js` which is what the `manifest.json` references.

### Step 2: Install in Figma

1. Open Figma Desktop App
2. Go to `Plugins` → `Development` → `Import plugin from manifest...`
3. Select the `manifest.json` file
4. The plugin will appear in your plugins list

## Plugin Files Only

If you only want the Figma plugin (not the web demo), you need these files:

- `manifest.json`
- `code.js` (compiled from `code.ts`)
- `ui.html`

## Web App vs Plugin

- The current **web application** (`App.tsx`) is a demo/mockup of what the plugin UI looks like
- The **actual plugin** (`code.ts` + `ui.html`) works inside Figma with real variable data
