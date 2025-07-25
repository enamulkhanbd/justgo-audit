# Figma Plugin Manifest Reference

## ✅ Valid Manifest Properties

Your `manifest.json` should only contain these properties:

### Required Properties

- `name` - Plugin name (string)
- `id` - Unique plugin ID (string)
- `api` - Figma API version, typically "1.0.0" (string)
- `main` - Path to main code file, e.g. "code.js" (string)

### Optional Properties

- `ui` - Path to UI file, e.g. "ui.html" (string)
- `documentAccess` - Document access level: "dynamic-page" | "readonly" (string)
- `networkAccess` - Network access configuration (object)
- `permissions` - Array of permissions (array)
- `version` - Plugin version (string)
- `editorType` - Array of supported editors, e.g. ["figma"] (array)
- `relaunchButtons` - Relaunch button configuration (object)
- `menu` - Menu configuration (array)
- `parameters` - Parameter configuration (array)
- `parameterOnly` - Whether plugin is parameter-only (boolean)

## ❌ Invalid Properties (will cause errors)

These properties are **NOT allowed** in Figma manifests:

- `description` ❌ (This caused your error)
- `author` ❌
- `homepage` ❌
- `repository` ❌
- `keywords` ❌
- `license` ❌

## Fixed Manifest

Your corrected manifest.json:

```json
{
  "name": "Variable Layer Finder",
  "id": "variable-layer-finder-12345",
  "api": "1.0.0",
  "main": "code.js",
  "ui": "ui.html",
  "documentAccess": "dynamic-page",
  "networkAccess": {
    "allowedDomains": []
  },
  "permissions": [],
  "version": "1.0.0",
  "editorType": ["figma"]
}
```

## Installation Steps (after fix)

1. **Save the corrected manifest.json**
2. **Open Figma Desktop App**
3. **Go to Plugins → Development → Import plugin from manifest...**
4. **Select your manifest.json file**
5. **Plugin should now load without errors** ✅
