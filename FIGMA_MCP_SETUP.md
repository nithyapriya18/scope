# Figma MCP Setup for PetaSight Brand

## Current Status ✅
- Figma MCP server installed: `@tothienbao6a0/figma-mcp-server`
- Path: `/home/nithya/.nvm/versions/node/v20.20.0/bin/figma-mcp-server`
- Brand colors updated in Tailwind config and globals.css

## PetaSight Brand Colors (Applied)
- **Primary**: `#da365c` (Magenta) - Main brand color
- **Secondary**: `#1e40af` (Blue-800) - Supporting color
- **Accent**: `#34d399` (Emerald-400) - Highlight color

## To Complete Setup:

### 1. Get Your Figma Personal Access Token
1. Visit: https://www.figma.com/developers/api#access-tokens
2. Log in to your Figma account
3. Scroll to "Personal access tokens"
4. Click "Create new token"
5. Name it: "Claude MCP Access"
6. Set scopes: "Read-only" (file content access)
7. Copy the token (it will look like: `figd_XXXXXXXXXXXX...`)

### 2. Configure MCP Server
Once you have the token, run:

```bash
# Add Figma token to Claude settings
cat > ~/.claude/figma_token.txt << 'EOF'
YOUR_FIGMA_TOKEN_HERE
EOF

# Update Claude settings with MCP server config
node -e "
const fs = require('fs');
const path = require('path');
const settingsPath = path.join(process.env.HOME, '.claude/settings.json');
const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));

if (!settings.mcpServers) settings.mcpServers = {};

settings.mcpServers.figma = {
  command: '/home/nithya/.nvm/versions/node/v20.20.0/bin/figma-mcp-server',
  args: [],
  env: {
    FIGMA_ACCESS_TOKEN: fs.readFileSync(path.join(process.env.HOME, '.claude/figma_token.txt'), 'utf8').trim()
  }
};

fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
console.log('✅ Figma MCP server configured!');
"
```

### 3. Extract Design System from Figma
Once configured, I can:
- Extract typography scale
- Get exact color values and variations
- Pull spacing tokens
- Get component styles
- Extract icon specifications
- Get layout grids

### 4. Figma File Details
**URL**: https://www.figma.com/design/LqVdvmkBMQ8slIJt1xrvdW/PetaSight-Brand?node-id=0-1&p=f&t=VjOIqcwnNVUL1xau-0

**File ID**: `LqVdvmkBMQ8slIJt1xrvdW`
**Node ID**: `0-1`

## What I've Already Updated

### ✅ Tailwind Config ([frontend/tailwind.config.ts](frontend/tailwind.config.ts))
- Added ps-primary, ps-secondary, ps-accent color palettes (50-900 shades)
- Added semantic colors (primary, secondary, accent, background, foreground, card, border)
- Updated font family (Inter with full weight range)
- Updated border radius values

### ✅ Global Styles ([frontend/app/globals.css](frontend/app/globals.css))
- Added CSS custom properties for light and dark modes
- Semantic color variables using RGB values for Tailwind
- Dark mode support with slate-based grays
- Proper antialiasing for Inter font

## Next Steps After Token Setup

1. **Extract from Figma**:
   ```typescript
   // I'll be able to fetch:
   - Color styles and variables
   - Text styles (typography scale)
   - Effect styles (shadows, blurs)
   - Grid styles (layouts)
   - Component specifications
   ```

2. **Generate Design Tokens**:
   ```json
   {
     "colors": { ... },
     "typography": { ... },
     "spacing": { ... },
     "shadows": { ... },
     "radii": { ... }
   }
   ```

3. **Update Components**:
   - Button variants
   - Input styles
   - Card designs
   - Modal layouts
   - Badge colors
   - Alert styles

## Manual Alternative (If No Token)

If you can't provide a Figma token, you can manually export the design tokens:

1. Open Figma file
2. Go to Inspect panel (right sidebar)
3. Select each color style
4. Copy hex values
5. Provide them to me in this format:

```
Primary: #da365c
Secondary: #1e40af
Accent: #34d399
Success: #...
Warning: #...
Error: #...
Info: #...
```

## Current Color System

```typescript
// Light Mode
background: #ffffff (white)
foreground: #0f172a (slate-900)
card: #ffffff
border: #e2e8f0 (slate-200)
muted: #f1f5f9 (slate-100)

// Dark Mode
background: #0f172a (slate-900)
foreground: #f8fafc (slate-50)
card: #1e293b (slate-800)
border: #334155 (slate-700)
muted: #1e293b (slate-800)

// Brand Colors (both modes)
primary: #da365c (magenta)
secondary: #1e40af (blue-800)
accent: #34d399 (emerald-400)
```

## Testing

After setup, test the colors:

```bash
cd frontend
npm run dev
```

Visit any page and check:
- Primary buttons use magenta (#da365c)
- Links and highlights use magenta
- Secondary actions use blue (#1e40af)
- Success states use emerald (#34d399)
- Dark mode toggles properly
