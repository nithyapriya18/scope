# Restore Original PetaSight Design

## ✅ Completed:

1. **Tailwind Config** - Restored PetaSight colors (ps-primary, ps-secondary) with full 50-900 scale
2. **Global CSS** - Restored simple design without CSS variables

## 🔄 Need to Restore:

All components need to use `ps-primary` colors instead of semantic colors:

### Color Replacements Needed:

| Current (Lovable) | Original (PetaSight) |
|------------------|---------------------|
| `bg-primary` | `bg-ps-primary-600` |
| `text-primary` | `text-ps-primary-600` |
| `bg-card` | `bg-white dark:bg-gray-800` |
| `text-foreground` | `text-gray-900 dark:text-white` |
| `text-muted-foreground` | `text-gray-600 dark:text-gray-400` |
| `border-border` | `border-gray-200 dark:border-gray-700` |
| `bg-background` | `bg-white dark:bg-gray-900` |

### Files to Restore:

1. ✅ **Login** - Use app-maxima style with ps-primary gradient background
2. **Header** - Use Header.tsx.backup as reference
3. **Footer** - Simple with ps-primary branding
4. **WorkflowVisualizer** - Use ps-primary-600 for current step
5. **Dashboard** - Use ps-primary-600 for buttons and accents
6. **ChatInterface** - Use ps-primary-600 for user messages
7. **StatusBadge** - Use ps-primary for clarification

## PetaSight Brand:
- Primary: **#da365c** (ps-primary-600)
- Gradient backgrounds: from-ps-primary-50 to-white
- Buttons: bg-ps-primary-600 hover:bg-ps-primary-700
- Links: text-ps-primary-600 hover:text-ps-primary-900
