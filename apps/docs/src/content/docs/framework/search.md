---
title: Search
description: Add powerful search capabilities to your docs
framework: Framework
slug: 'search'
section: Features
order: 3
---

# Search

Our framework includes a powerful search system out of the box.

## Basic Setup

Search is enabled by default. Just add the search component to your layout:

```typescript
import { SearchBar } from '@docs/components';

@Component({
  template: ` <SearchBar placeholder="Search docs..." /> `,
})
export class DocsLayout {}
```

## Configuration

Customize search behavior in your config:

```json
{
  "search": {
    "minCharacters": 3,
    "maxResults": 10,
    "includeContent": true,
    "highlightMatches": true
  }
}
```

## Advanced Features

### Algolia Integration

Use Algolia for enhanced search capabilities:

```typescript
import { AlgoliaSearch } from '@docs/search/algolia';

const search = new AlgoliaSearch({
  appId: 'YOUR_APP_ID',
  apiKey: 'YOUR_API_KEY',
  index: 'YOUR_INDEX',
});
```

### Custom Search Provider

Create your own search provider:

```typescript
import { createSearchProvider } from '@docs/search';

const mySearch = createSearchProvider({
  // Your custom search implementation
});
```

## Search Shortcuts

- Press `⌘K` (Mac) or `Ctrl+K` (Windows) to focus search
- Use arrow keys to navigate results
- Press `Enter` to select a result
- Press `Esc` to close search
