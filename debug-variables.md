# Debug Guide for Variable Detection

## What Changed

The updated plugin now includes:

1. **Better Variable Detection:**

   - Checks all bound variable properties, not just `color`
   - Handles different types of variable bindings
   - More flexible variable name matching

2. **Enhanced Debugging:**

   - Console logs show exactly what variables are found
   - Detailed information about which properties have variables
   - Clear match/no-match indicators

3. **Flexible Name Matching:**
   - Exact match: `colors/surface/canvas`
   - Variable name only: `canvas`
   - Partial path match: `surface/canvas`

## How to Debug

1. **Open Browser Console:**

   - In Figma, right-click the plugin UI and select "Inspect"
   - Go to the Console tab

2. **Run Search:**

   - Enter your variable name and click "Find Layers"
   - Watch the console for detailed logs

3. **Look for These Logs:**
   ```
   Checking node "Rectangle" (RECTANGLE) for variable "colors/surface/canvas"
   Node has 1 fills
   Fill 0: SOLID {boundVariables: {...}}
   Found variable "colors/surface/canvas" on fill property "color"
   ✅ Match found for "colors/surface/canvas"
   ```

## Common Issues & Solutions

### Issue: "Node has 0 fills"

**Solution:** The node might not have fills applied. Check if the variable is applied to strokes, effects, or other properties.

### Issue: "Found variable 'X' but no match"

**Solution:** The variable name format might be different. Try:

- Just the variable name: `canvas`
- Without collection: `surface/canvas`
- Full path: `colors/surface/canvas`

### Issue: "Variables API not available"

**Solution:** Make sure your Figma file has variables defined and you're using a recent version of Figma.

## Testing Steps

1. Create a simple rectangle
2. Apply a variable to its fill
3. Run the plugin with the exact variable name
4. Check console logs for detailed debugging info

If you're still having issues, share the console output and I can help debug further!
