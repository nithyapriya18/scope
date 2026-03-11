# Lumina Scope - Test Checklist

## 🧪 Quick Test Guide

### Start Servers

**Terminal 1:**
```bash
cd /home/nithya/app-lumina-scope/backend
npm run dev
```

**Terminal 2:**
```bash
cd /home/nithya/app-lumina-scope/frontend
npm run dev
```

---

## ✅ Test Checklist

### 1. Login Page (http://localhost:3000/login)
- [ ] PetaSight logo displays
- [ ] Background has subtle gradient
- [ ] Google Sign-In button visible
- [ ] Demo credentials work: `demo@lumina.com` / `demo123`
- [ ] Dark mode: Toggle and verify dark background

### 2. Dashboard (http://localhost:3000/dashboard)
- [ ] Stats cards show properly
- [ ] **PRIMARY COLOR CHECK**: "New Opportunity" button is magenta (#da365c)
- [ ] Table displays opportunities
- [ ] StatusBadge colors work
- [ ] Dark mode works

### 3. Workflow Page
Click any opportunity to open `/opportunities/[id]`

#### **CRITICAL COLOR CHECK**:
- [ ] **Current step circle is MAGENTA** (PetaSight brand color)
- [ ] Completed steps are GREEN
- [ ] Future steps are GRAY
- [ ] Step labels are tiny (10px text)
- [ ] Continue button at bottom-right is MAGENTA

#### Floating Chat:
- [ ] Magenta circle button (bottom-right)
- [ ] Slides in from right when clicked
- [ ] User messages: magenta background
- [ ] Assistant messages: gray background

### 4. Dark Mode Test (All Pages)
Toggle dark mode (if ThemeToggle working) or use browser DevTools:

```javascript
// In browser console:
document.documentElement.classList.toggle('dark')
```

Check:
- [ ] Backgrounds are dark (NOT white)
- [ ] Text is light (NOT black)
- [ ] Primary buttons still show magenta
- [ ] Borders are visible
- [ ] No weird color inversions

---

## 🐛 If Colors Look Wrong

### Problem: Workflow circles not showing magenta

**Check**: Open browser DevTools → Elements → Inspect the current step circle

Should see:
```html
<div class="... bg-primary ...">
```

NOT:
```html
<div class="... bg-primary-500 ...">
```

If you see `-500`, the semantic colors aren't working. Check:
1. `globals.css` loaded
2. `tailwind.config.ts` has `colors: { primary: "hsl(var(--primary))" }`
3. No browser cache issues (hard refresh: Ctrl+Shift+R)

### Problem: Dark mode not working

Check browser console for errors. Verify `ThemeToggle` component is mounted.

---

## 🎨 Visual Verification

### Expected Colors:

**Light Mode:**
- Background: Very light gray (#fafafa)
- Cards: Pure white (#ffffff)
- Primary buttons: **Magenta (#da365c)** ← PetaSight brand
- Text: Nearly black (#171717)
- Borders: Light gray (#e5e5e5)

**Dark Mode:**
- Background: Very dark gray (#121212)
- Cards: Dark gray (#171717)
- Primary buttons: **Magenta (#da365c)** ← Same as light mode
- Text: Nearly white (#fafafa)
- Borders: Medium gray (#262626)

---

## ✅ Success Criteria

All checks pass when:
1. ✅ PetaSight magenta (#da365c) shows on all primary elements
2. ✅ Dark mode works without white screens
3. ✅ Text is readable in both modes
4. ✅ Workflow visualizer shows correct colors
5. ✅ Chat interface slides in smoothly

---

**If all tests pass**: UI revamp is complete! ✅

**If tests fail**: Check [REVAMP_COMPLETE.md](REVAMP_COMPLETE.md) for troubleshooting.
