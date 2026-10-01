---
name: web-design-guidelines
description: Review interface accessibility, navigation, forms, responsive layout, and motion. Use when implementing or reviewing web UI.
---

# Web Design Guidelines

Review the affected routes at desktop and mobile widths. Check semantic landmarks, one primary heading, accessible names, keyboard operation, visible focus, readable contrast in both themes, and touch targets. Preserve native modified-click behavior on links. Keep skip links working and avoid fixed controls obscuring content or safe areas.

For this starter, navigation stays top-right above 768px and bottom-center below it. Its opaque background uses the page token. Keep the theme control outside the transition wrapper. Respect prefers-reduced-motion and system theme, and verify direct URLs and browser Back.

Consult current https://www.w3.org/WAI/ARIA/apg/ for interaction patterns and https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md for UI review guidance. Report actionable findings with file and line references.

Adapted from the fleet's web-design-guidelines workflow.
