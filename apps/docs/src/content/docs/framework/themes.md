---
title: Themes
description: Customize the look and feel of your documentation
framework: Framework
slug: 'themes'
section: Customization
order: 4
---

# Themes

Make your documentation site unique with our powerful theming system.

## Theme Configuration

Themes are configured in your `content/config.json`:

```json
{
  "theme": {
    "colors": {
      "primary": "#0066cc",
      "secondary": "#4c9aff",
      "background": "#ffffff",
      "text": "#1a1a1a"
    },
    "fonts": {
      "body": "system-ui, sans-serif",
      "code": "Monaco, monospace"
    },
    "spacing": {
      "content": "80ch",
      "sidebar": "250px"
    }
  }
}
```

## Dark Mode

Dark mode is supported out of the box. Add dark theme colors:

```json
{
  "theme": {
    "dark": {
      "colors": {
        "background": "#1a1a1a",
        "text": "#ffffff"
      }
    }
  }
}
```

## Custom CSS

Create `src/theme/custom.css` to add custom styles:

```css
.docs-content {
  /* Your custom styles */
}
```

## Components

You can also customize individual components:

```typescript
// src/theme/components/Sidebar.ts
import { createComponent } from '@docs/theme';

export const Sidebar = createComponent({
  // Component customization
});
```
