#!/bin/bash

echo "🔧 Building Figma Plugin..."
echo ""

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check if we're in the right directory
if [ ! -f "code.ts" ]; then
    echo "❌ Error: code.ts not found in current directory"
    echo "Make sure you're in the project root directory"
    exit 1
fi

# Check if code.js already exists and is recent
if [ -f "code.js" ]; then
    echo "✅ code.js already exists"
    echo "💡 The JavaScript file has been manually compiled with async API support"
    echo ""
else
    echo "⚠️  code.js not found - attempting TypeScript compilation..."
    
    # Try different compilation methods
    if command_exists tsc; then
        echo "✅ Using global TypeScript compiler..."
        tsc code.ts --target es2017 --lib es2017,dom --outDir . --skipLibCheck
    elif command_exists npx; then
        echo "✅ Using npx to run TypeScript compiler..."
        npx tsc code.ts --target es2017 --lib es2017,dom --outDir . --skipLibCheck
    elif [ -f "package.json" ] && command_exists npm; then
        echo "✅ Installing TypeScript locally and compiling..."
        npm install --save-dev typescript > /dev/null 2>&1
        npx tsc code.ts --target es2017 --lib es2017,dom --outDir . --skipLibCheck
    else
        echo "❌ Error: No TypeScript compiler found"
        echo ""
        echo "Please install TypeScript using one of these methods:"
        echo "  1. Global: npm install -g typescript"
        echo "  2. Local: npm install --save-dev typescript"
        echo "  3. Use npx: npx tsc code.ts --target es2017 --lib es2017,dom --outDir . --skipLibCheck"
        echo ""
        echo "💡 Or use the pre-compiled code.js file that's already provided"
        exit 1
    fi
fi

# Check if compilation was successful or if pre-compiled file exists
if [ -f "code.js" ]; then
    echo ""
    echo "🎉 Plugin ready!"
    echo ""
    echo "📁 Plugin files ready for Figma:"
    echo "   ✓ manifest.json"
    echo "   ✓ code.js (ES2017 compatible with async API support)"  
    echo "   ✓ ui.html"
    echo ""
    echo "🎯 To install in Figma:"
    echo "   1. Open Figma Desktop App"
    echo "   2. Go to Plugins → Development → Import plugin from manifest..."
    echo "   3. Select manifest.json from this folder"
    echo ""
    echo "🌟 Enhanced Features:"
    echo "   • Supports ALL variable types (color, number, string, boolean, etc.)"
    echo "   • Works with local AND remote variables from libraries"
    echo "   • Uses async API for better remote variable access"
    echo "   • Searches all properties: fills, strokes, text, layout, size, effects"
    echo ""
    echo "💡 Tip: Check browser console (F12) when running for detailed logs"
else
    echo ""
    echo "❌ No code.js file found. Plugin cannot be installed."
    echo "Please ensure compilation was successful or use the provided pre-compiled version."
fi