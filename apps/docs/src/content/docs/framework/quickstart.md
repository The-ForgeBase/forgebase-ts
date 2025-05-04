---
title: Quickstart
description: Get started with the docs framework in minutes
framework: Framework
slug: 'quickstart'
section: Getting Started
order: 2
---

# Quickstart Guide

Get your documentation site up and running in minutes.

## Prerequisites

- Node.js 16 or later
- npm or yarn
- Basic knowledge of Markdown

## Installation

```bash
# Create a new docs site
npm create docs@latest my-docs

# Navigate to the project
cd my-docs

# Install dependencies
npm install
```

## Project Structure

```
my-docs/
├── content/
│   ├── docs/
│   │   └── getting-started.md
│   └── config.json
├── public/
│   └── assets/
├── src/
│   └── theme/
└── package.json
```

## Configuration

Edit `content/config.json`:

```json
{
  "title": "My Docs",
  "description": "My awesome documentation site",
  "theme": {
    "primary": "#0066cc",
    "sidebar": {
      "width": "250px"
    }
  }
}
```

## Adding Content

Create a new file in `content/docs/`:

```markdown
---
title: Introduction
description: Welcome to my docs
order: 1
---

# Introduction

Welcome to my documentation site!
```

## Running Locally

```bash
npm run dev
```

Visit `http://localhost:3000` to see your site.
