// Simple Node.js script to help with plugin compilation
console.log('🔧 Variable Layer Finder - Plugin Build Helper');
console.log('');

// Check if we're in Node.js environment
if (typeof process !== 'undefined' && process.versions && process.versions.node) {
    console.log('✅ Running in Node.js environment');
    console.log('');

    const fs = require('fs');
    const path = require('path');

    // Check if required files exist
    const requiredFiles = ['manifest.json', 'code.js', 'ui.html'];
    let allFilesExist = true;

    console.log('📁 Checking required plugin files:');

    requiredFiles.forEach(file => {
        if (fs.existsSync(file)) {
            console.log('   ✅ ' + file);
        } else {
            console.log('   ❌ ' + file + ' (MISSING)');
            allFilesExist = false;
        }
    });

    console.log('');

    if (allFilesExist) {
        console.log('🎉 All plugin files are ready!');
        console.log('');
        console.log('🎯 To install in Figma:');
        console.log('   1. Open Figma Desktop App');
        console.log('   2. Go to Plugins → Development → Import plugin from manifest...');
        console.log('   3. Select manifest.json from this folder');
        console.log('');
        console.log('🔧 Plugin Features:');
        console.log('   • Supports ALL variable types (color, number, string, boolean)');
        console.log('   • Works with local AND remote variables');
        console.log('   • Searches all properties (fills, strokes, text, layout, effects)');
        console.log('   • Uses async API for better remote variable access');
        console.log('');

        // Check code.js file size and content
        try {
            const codeStats = fs.statSync('code.js');
            console.log('📊 code.js file size: ' + Math.round(codeStats.size / 1024) + ' KB');

            const codeContent = fs.readFileSync('code.js', 'utf8');
            if (codeContent.includes('getVariableByIdAsync')) {
                console.log('✅ Uses async variable API (required for remote variables)');
            } else {
                console.log('⚠️  Warning: May not use async variable API');
            }

            if (codeContent.includes('console.log')) {
                console.log('✅ Includes debugging logs');
            }

        } catch (err) {
            console.log('⚠️  Could not analyze code.js file');
        }

    } else {
        console.log('❌ Missing required files. Plugin cannot be installed.');
        console.log('');
        console.log('🔧 What to do:');
        console.log('   • Make sure all files are in the same directory');
        console.log('   • Check file names are exactly: manifest.json, code.js, ui.html');
    }

} else {
    console.log('❌ This script should be run with Node.js');
    console.log('');
    console.log('🔧 To run: node build_plugin.js');
}

console.log('');
console.log('💡 Need help? Check the plugin-status-check.md file for troubleshooting');