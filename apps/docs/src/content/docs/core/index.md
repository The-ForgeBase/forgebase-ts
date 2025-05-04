---
title: Docs Core
description: The headless library
framework: Core
slug: 'index'
section: Overview
order: 1
icon: /icons/core.svg
---

# Docs Core

Docs Core is our headless documentation library that provides the foundation for building custom documentation experiences.

## Features

- 🛠️ Framework agnostic
- 📦 Modular architecture
- 🔌 Extensible plugin system
- 🎯 Type-safe APIs
- 🔄 Real-time updates

## Installation

```bash
npm install @docs/core
```

## Quick Example

```typescript
import { createDocs } from '@docs/core';

const docs = createDocs({
  content: './content',
  plugins: [
    /* your plugins */
  ],
});
```

Learn more about setting up Docs Core in our [getting started guide](/docs/core/getting-started).
