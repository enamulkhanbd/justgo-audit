# How to Compile TypeScript to JavaScript

You currently have both a **web application** (App.tsx, components/) and **Figma plugin files** (code.ts, manifest.json, ui.html) in the same project.

## Method 1: Using TypeScript Compiler (Recommended)

### Install TypeScript globally:

```bash
npm install -g typescript
```

### Compile the plugin code:

```bash
# Navigate to your project directory
cd /path/to/your/project

# Compile code.ts to code.js
tsc code.ts --target es2017 --lib es2017,dom --outDir . --skipLibCheck
```

This creates `code.js` in the same directory.

## Method 2: Using npx (No Global Install)

```bash
# If you don't want to install TypeScript globally
npx tsc code.ts --target es2017 --lib es2017,dom --outDir . --skipLibCheck
```

## Method 3: Using the Build Script

Make the build script executable and run it:

```bash
# Make it executable
chmod +x build-plugin.sh

# Run it
./build-plugin.sh
```

## Method 4: Using Node.js (if available)

```bash
# If you have Node.js/npm in your project
npm init -y  # Creates package.json if it doesn't exist
npm install --save-dev typescript
npx tsc code.ts --target es2017 --lib es2017,dom --outDir . --skipLibCheck
```

## What This Does:

- Reads `code.ts` (TypeScript source)
- Compiles it to `code.js` (JavaScript output)
- The `manifest.json` references `code.js` (correct!)

## File Structure After Compilation:

```
├── App.tsx                    # Web app (current Figma Make)
├── components/                # Web app components
├── code.ts                   # Plugin source (TypeScript)
├── code.js                   # Plugin compiled (JavaScript) ← NEW
├── manifest.json             # Plugin config (references code.js)
├── ui.html                   # Plugin UI
└── styles/                   # Web app styles
```

## Plugin Files Only (for Figma):

After compilation, you only need these 3 files for the Figma plugin:

- `manifest.json`
- `code.js` (compiled from code.ts)
- `ui.html`
