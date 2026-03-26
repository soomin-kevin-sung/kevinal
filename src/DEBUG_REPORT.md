# Debug Report: Blank Screen on Startup

**Date:** 2026-03-26
**App:** Kevinal (Tauri + React terminal app)
**Symptom:** Completely blank/white screen on startup -- no elements render at all.
**Context:** The app recently replaced a custom `TabBar` with `rc-dock` for drag-and-drop split pane layouts.

---

## Issue #1 (HIGH) -- `rc-dock` DockLayout has `position: absolute` but parent lacks explicit dimensions

**Likelihood:** Very High
**Root Cause:**

The `DockLayout` component is rendered with inline style `position: absolute; inset: 0`:

```tsx
// DockArea.tsx, line 208
style={{ position: "absolute", inset: 0 }}
```

Additionally, rc-dock's own CSS (rc-dock-dark.css, line 512-515) sets:

```css
.dock-layout {
  overflow: hidden;
  position: relative;
}
```

The inline `position: absolute` overrides this to `absolute`. For `position: absolute` with `inset: 0` to work, the parent element **must** have `position: relative` (or any non-static positioning).

The parent is `<div className="terminal-content">`, which **does** have `position: relative` in App.css (line 168). However, the critical issue is that `.terminal-content` uses `flex: 1` to fill remaining space in the flex column. While this generally works, the combination of:

1. The DockLayout being absolutely positioned (taken out of flow)
2. The Welcome overlay also being absolutely positioned with `inset: 0`
3. Both elements being children of the same relatively-positioned parent

...means the `.terminal-content` div has **zero intrinsic content height** (both children are out of normal flow). In a flex layout, `flex: 1` should still allocate space based on remaining room, so this alone may not be the direct cause, but it contributes to sizing fragility.

**Suggested Fix:**
Add explicit height to `.terminal-content` to ensure it fills available space even when children are absolutely positioned:

```css
.terminal-content {
  flex: 1;
  position: relative;
  overflow: hidden;
  min-height: 0; /* Important for flex children to prevent overflow */
}
```

The `min-height: 0` is critical -- without it, flex items default to `min-height: auto`, which can cause unexpected sizing behavior with absolutely positioned children.

---

## Issue #2 (HIGH) -- `rc-dock` DockLayout renders an empty dockbox with zero-height children

**Likelihood:** Very High
**Root Cause:**

The `defaultLayout` in DockArea.tsx (line 96-101) is:

```tsx
const defaultLayout: LayoutData = {
  dockbox: {
    mode: "horizontal",
    children: [],
  },
};
```

This creates a DockLayout with an **empty** dockbox -- no panels, no tabs. The rc-dock library renders its `.dock-box` with `position: absolute; width: 100%; height: 100%` (rc-dock-dark.css line 516-520), but when there are **zero children**, the box has no visible content. The internal flex containers collapse to zero size.

Since there are no panels or tabs, rc-dock renders essentially an empty absolutely-positioned container. This is working as designed -- rc-dock shows nothing because there is nothing to show. The Welcome overlay is supposed to cover this.

**However**, the Welcome overlay should still be visible (see Issue #3 and #4 for why it might not be).

**Suggested Fix:**
This is expected behavior and not the primary bug. The Welcome overlay should cover the empty dock. However, if you want the dock to show a placeholder panel, provide a non-empty default layout or handle the empty state differently.

---

## Issue #3 (CRITICAL) -- Welcome overlay may not be visible due to `rc-dock` CSS z-index and stacking context

**Likelihood:** Very High
**Root Cause:**

In App.tsx (line 70-74), the Welcome overlay is rendered as a sibling to `DockArea`:

```tsx
<div className="terminal-content">
  <DockArea ... />
  {showWelcome && (
    <div style={{ position: "absolute", inset: 0, zIndex: 10, background: "var(--bg-base)" }}>
      <Welcome onSelectShell={handleNewTerminal} />
    </div>
  )}
</div>
```

The Welcome overlay has `z-index: 10`. The DockLayout itself has `position: absolute; inset: 0`. rc-dock creates internal elements with various z-index values. The `.dock-fbox` (float box) in App.css is set to `z-index: 500` (line 289).

More critically, **the DockLayout's inline style sets `position: absolute`**, which creates a new stacking context. Within this stacking context, rc-dock's internal drop indicators, float panels, etc. have their own z-indexes.

The Welcome overlay is a sibling to the DockLayout div. Both are absolutely positioned children of `.terminal-content`. The DockLayout renders **after** in the DOM... wait, actually the Welcome overlay renders **after** DockArea in the JSX, so it should naturally stack on top.

This should work, but there is a subtle issue: if the DockLayout element itself establishes a stacking context (e.g., via `transform`, `opacity`, `filter`, or `will-change` in rc-dock's CSS), it could interfere. Let me note that the Welcome overlay sets `background: var(--bg-base)` which resolves to `#0c0c14` -- the same as the page background. If the Welcome IS rendering but with a transparent/invisible background due to CSS variable resolution failure, it would appear blank.

**Suggested Fix:**
Use a hardcoded background color as a fallback to rule out CSS variable issues:

```tsx
<div style={{ position: "absolute", inset: 0, zIndex: 10, background: "#0c0c14" }}>
```

---

## Issue #4 (CRITICAL) -- `rc-dock/dist/rc-dock-dark.css` import may cause Vite build/runtime failure

**Likelihood:** High
**Root Cause:**

In DockArea.tsx (line 15):

```tsx
import "rc-dock/dist/rc-dock-dark.css";
```

While the file exists on disk (`node_modules/rc-dock/dist/rc-dock-dark.css` is confirmed present), this CSS file is ~22KB and contains many rules. If Vite fails to process this import (e.g., due to CSS processing errors, PostCSS compatibility issues, or the CSS containing syntax Vite's CSS pipeline cannot handle), the **entire module** (`DockArea.tsx`) will fail to load. Since `DockArea` is imported in `App.tsx`, a module-level failure here would crash the entire React component tree silently -- React would mount but `<App />` would throw during render, resulting in a blank screen.

This is especially suspect because:
1. The app worked before rc-dock was added
2. A CSS import failure at module level is silent (no visible error, just a blank page)

**Suggested Fix:**
Test by temporarily commenting out the CSS import and adding the CSS via a `<link>` tag in `index.html` instead:

```html
<!-- In index.html <head> -->
<link rel="stylesheet" href="/node_modules/rc-dock/dist/rc-dock-dark.css" />
```

Or, move the import to `main.tsx` to isolate it:

```tsx
// main.tsx
import "rc-dock/dist/rc-dock-dark.css";
```

If the app renders after removing this import, the CSS file is the culprit.

---

## Issue #5 (MEDIUM) -- Missing `React` import in `main.tsx` for JSX

**Likelihood:** Medium
**Root Cause:**

In `main.tsx` (line 1-8):

```tsx
import ReactDOM from "react-dom/client";
import App from "./App";

document.addEventListener("contextmenu", (e) => e.preventDefault());

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <App />
);
```

There is no `import React from "react"`. With React 18 and the Vite `@vitejs/plugin-react` plugin, this is typically handled by the automatic JSX runtime (`react/jsx-runtime`). However, if the Vite config or tsconfig is misconfigured to use the "classic" JSX transform instead of "automatic", this would cause a runtime error: `React is not defined`.

**Suggested Fix:**
Check `tsconfig.json` for `"jsx": "react-jsx"` (automatic) vs `"jsx": "react"` (classic). If classic, add:

```tsx
import React from "react";
```

Or better, ensure tsconfig.json has:

```json
{
  "compilerOptions": {
    "jsx": "react-jsx"
  }
}
```

---

## Issue #6 (MEDIUM) -- `html, body, #root` use `height: 100%` but `app-layout` uses `height: 100vh` -- potential double scroll/overflow mismatch in Tauri

**Likelihood:** Medium
**Root Cause:**

In App.css:

```css
/* Line 33-41 */
html, body, #root {
  width: 100%;
  height: 100%;
  overflow: hidden;
}

/* Line 44-49 */
.app-layout {
  display: flex;
  flex-direction: column;
  height: 100vh;
}
```

`100vh` in Tauri/webview contexts can behave unexpectedly. On some platforms, `100vh` does not account for the window chrome or system bars, potentially making the `.app-layout` taller than its parent `#root` (which is `height: 100%` of the viewport). Since `#root` has `overflow: hidden`, the extra content is clipped.

In a Tauri app on Windows, `100vh` should generally equal the webview height, so this is likely not the primary issue. However, it introduces inconsistency.

**Suggested Fix:**
Use `height: 100%` instead of `100vh` for consistency:

```css
.app-layout {
  display: flex;
  flex-direction: column;
  height: 100%;
}
```

---

## Issue #7 (MEDIUM) -- `defaultLayout` is defined inside the render function, causing re-creation on every render

**Likelihood:** Medium (causes re-render loops, not blank screen directly)
**Root Cause:**

In DockArea.tsx (line 96-101), `defaultLayout` is defined inside the component body:

```tsx
const defaultLayout: LayoutData = {
  dockbox: {
    mode: "horizontal",
    children: [],
  },
};
```

Every time `DockArea` re-renders, a **new** `defaultLayout` object is created. Since `DockLayout` receives a new `defaultLayout` reference each render, it may reset its internal state, causing a render loop. rc-dock compares layout references, and a new object each render could trigger `onLayoutChange`, which calls `onEmpty()`, which calls `setShowWelcome(true)` in the parent, triggering a parent re-render, which re-renders DockArea, creating a new `defaultLayout`, ad infinitum.

While React's reconciliation should prevent an infinite loop (the state doesn't actually change since `showWelcome` is already `true`), this is still a code smell and could cause unexpected behavior.

**Suggested Fix:**
Move `defaultLayout` outside the component or memoize it:

```tsx
// Move outside the component
const DEFAULT_LAYOUT: LayoutData = {
  dockbox: {
    mode: "horizontal",
    children: [],
  },
};

export const DockArea = forwardRef<DockAreaHandle, DockAreaProps>(
  ({ onNewTerminal, onEmpty }, ref) => {
    // ... use DEFAULT_LAYOUT instead of defaultLayout
  }
);
```

---

## Issue #8 (LOW-MEDIUM) -- `dockMove(tabData, null, "middle")` with null target may not work as expected

**Likelihood:** Low-Medium
**Root Cause:**

In DockArea.tsx (line 171):

```tsx
dockRef.current.dockMove(tabData, null, "middle");
```

When no panel exists (the default state after startup), `targetPanel` is `null`, so `dockMove` is called with `null` as the target. According to rc-dock's API, passing `null` as the target panel with direction `"middle"` may not behave as expected -- the documentation suggests this is for moving a tab to the "main" area, but with an empty layout (no existing panels), it may silently fail to create a panel.

This means the first terminal created via the Welcome screen may never actually appear in the dock, though this wouldn't cause the initial blank screen.

**Suggested Fix:**
Use `"new-window"` or handle the empty case by setting a new layout directly:

```tsx
if (targetPanel) {
  dockRef.current.dockMove(tabData, targetPanel, "middle");
} else {
  // Directly set a layout with the new tab
  dockRef.current.loadLayout({
    dockbox: {
      mode: "horizontal",
      children: [
        {
          tabs: [tabData],
        },
      ],
    },
  });
}
```

---

## Issue #9 (LOW) -- No `StrictMode` wrapper, but not a cause of blank screen

**Likelihood:** Low
**Root Cause:**

`main.tsx` does not wrap `<App />` in `<React.StrictMode>`. This is not a bug per se, but it means double-render detection (useful for catching side-effect issues) is disabled. Not a cause of blank screen.

**Suggested Fix:**
Consider adding StrictMode for development:

```tsx
ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

---

## Issue #10 (LOW) -- `index.html` has `lang="ko"` which is cosmetic but potentially confusing

**Likelihood:** None (cosmetic only)

```html
<html lang="ko">
```

This sets the document language to Korean. Not a rendering issue, but worth noting.

---

## Summary: Most Likely Root Causes (ranked)

| Priority | Issue | Description |
|----------|-------|-------------|
| 1 | #4 | `rc-dock/dist/rc-dock-dark.css` import crashing module resolution, preventing entire component tree from mounting |
| 2 | #1 + #2 | DockLayout with empty children + absolute positioning = zero-height visible content, AND the Welcome overlay might not be covering it properly |
| 3 | #3 | Welcome overlay z-index / stacking context conflict with rc-dock elements |
| 4 | #7 | `defaultLayout` re-created every render causing potential layout reset loop |
| 5 | #5 | Missing React import if JSX transform is misconfigured |
| 6 | #6 | `100vh` vs `100%` mismatch in Tauri webview |

## Recommended Debugging Steps

1. **Open browser DevTools** (right-click > Inspect in Tauri dev mode) and check the Console for any JavaScript errors. A module load failure from the CSS import (#4) would show here.

2. **Inspect the DOM** to see if `#root` has any children at all. If `#root` is empty, the issue is in module loading/React mounting (#4 or #5). If `#root` has children but they are invisible, the issue is CSS-related (#1, #2, #3, #6).

3. **Temporarily comment out the rc-dock CSS import** (`import "rc-dock/dist/rc-dock-dark.css"` in DockArea.tsx) and see if the app renders. If it does, the CSS import is the problem.

4. **Add `min-height: 0`** to `.terminal-content` in App.css to fix the flex sizing issue.

5. **Move `defaultLayout` outside the component** to prevent re-creation on every render.

6. **Check Vite config and tsconfig.json** for the JSX transform setting.

---

## Quick-Fix Patch

If you want to apply the most impactful fixes at once:

**App.css** -- add `min-height: 0`:
```css
.terminal-content {
  flex: 1;
  position: relative;
  overflow: hidden;
  min-height: 0;
}
```

**DockArea.tsx** -- move `defaultLayout` outside component:
```tsx
// Before the component definition
const DEFAULT_LAYOUT: LayoutData = {
  dockbox: {
    mode: "horizontal",
    children: [],
  },
};
```

**DockArea.tsx** -- handle empty dock on first tab add:
```tsx
if (targetPanel) {
  dockRef.current.dockMove(tabData, targetPanel, "middle");
} else {
  dockRef.current.loadLayout({
    dockbox: {
      mode: "horizontal",
      children: [{ tabs: [tabData] }],
    },
  });
}
```

**App.css** -- use `height: 100%` instead of `100vh`:
```css
.app-layout {
  display: flex;
  flex-direction: column;
  height: 100%;
}
```
