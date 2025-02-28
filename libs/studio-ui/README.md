# ForgeBase Studio UI

The ForgeBase Studio UI library provides a comprehensive set of UI components specifically designed for building the ForgeBase Studio admin interface. These components follow modern design principles and are built with accessibility and usability in mind.

## Purpose

This library serves as the foundation for the ForgeBase Studio application's user interface, providing consistent, reusable components that streamline the development of admin panels and dashboards. It offers a cohesive design language that ensures a professional and intuitive user experience across all ForgeBase administrative interfaces.

## Core Features

- Authentication & Authorization: Fine-grained role, table, and namespace-level permissions.
- Database Integration: Compatibility with modern real-time databases like RethinkDB, SurrealDB, etc.
- Object Storage: Built-in support for object storage solutions.
- Extendability: Easy to add custom routes and extend functionality beyond the BaaS features.
- Real-time Features: Full real-time support for db, presence, etc.

## Why This Framework?

Our mission is to simplify backend development by providing a highly flexible, language-agnostic BaaS framework that developers can plug into their existing server setup. While we are 70% inspired by Pocketbase, we recognized its limitations—particularly its dependency on SQLite and its inability to scale horizontally. To overcome these challenges, we are building a better alternative that not only supports horizontal scaling but also integrates with more robust databases like PostgreSQL, SurrealDB, etc. This approach ensures that our framework is scalable, versatile, and suitable for a wide range of applications, from small projects to large, distributed systems.

## Table of Contents

- [Installation](#installation)
- [Basic Usage](#basic-usage)
- [Components](#components)
  - [Alert](#alert)
  - [Avatar](#avatar)
  - [Badge](#badge)
  - [Breadcrumb](#breadcrumb)
  - [Button](#button)
  - [Card](#card)
  - [Checkbox](#checkbox)
  - [Collapsible](#collapsible)
  - [Dropdown Menu](#dropdown-menu)
  - [Input](#input)
  - [Label](#label)
  - [Scroll Area](#scroll-area)
  - [Select](#select)
  - [Separator](#separator)
  - [Sheet](#sheet)
  - [Sidebar](#sidebar)
  - [Skeleton](#skeleton)
  - [Switch](#switch)
  - [Toast](#toast)
  - [Toaster](#toaster)
  - [Tooltip](#tooltip)
- [Building](#building)
- [Running Tests](#running-tests)

## Installation

To install the ForgeBase Studio UI library, run the following command:

```bash
pnpm add @forgebase/studio-ui
```

## Basic Usage

Here's an example of how to use the components provided by the ForgeBase Studio UI library:

```typescript
import { Button } from '@forgebase/studio-ui';

function App() {
  return <Button>Click me</Button>;
}
```

## Components

### Alert

The `Alert` component is used to display important messages to the user.

```typescript
import { Alert, AlertTitle, AlertDescription } from '@forgebase/studio-ui';

function App() {
  return (
    <Alert>
      <AlertTitle>Alert Title</AlertTitle>
      <AlertDescription>This is an alert description.</AlertDescription>
    </Alert>
  );
}
```

### Avatar

The `Avatar` component is used to display a user's avatar.

```typescript
import { Avatar, AvatarImage, AvatarFallback } from '@forgebase/studio-ui';

function App() {
  return (
    <Avatar>
      <AvatarImage src="path/to/image.jpg" alt="User Avatar" />
      <AvatarFallback>U</AvatarFallback>
    </Avatar>
  );
}
```

### Badge

The `Badge` component is used to display a small badge.

```typescript
import { Badge } from '@forgebase/studio-ui';

function App() {
  return <Badge>Badge</Badge>;
}
```

### Breadcrumb

The `Breadcrumb` component is used to display a breadcrumb navigation.

```typescript
import { Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbSeparator } from '@forgebase/studio-ui';

function App() {
  return (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink href="/">Home</BreadcrumbLink>
          <BreadcrumbSeparator />
        </BreadcrumbItem>
        <BreadcrumbItem>
          <BreadcrumbLink href="/section">Section</BreadcrumbLink>
          <BreadcrumbSeparator />
        </BreadcrumbItem>
        <BreadcrumbItem>
          <BreadcrumbLink href="/section/page">Page</BreadcrumbLink>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  );
}
```

### Button

The `Button` component is used to display a button.

```typescript
import { Button } from '@forgebase/studio-ui';

function App() {
  return <Button>Click me</Button>;
}
```

### Card

The `Card` component is used to display a card.

```typescript
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@forgebase/studio-ui';

function App() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Card Title</CardTitle>
        <CardDescription>Card Description</CardDescription>
      </CardHeader>
      <CardContent>
        Card Content
      </CardContent>
    </Card>
  );
}
```

### Checkbox

The `Checkbox` component is used to display a checkbox.

```typescript
import { Checkbox } from '@forgebase/studio-ui';

function App() {
  return <Checkbox />;
}
```

### Collapsible

The `Collapsible` component is used to display a collapsible section.

```typescript
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@forgebase/studio-ui';

function App() {
  return (
    <Collapsible>
      <CollapsibleTrigger>Toggle</CollapsibleTrigger>
      <CollapsibleContent>Content</CollapsibleContent>
    </Collapsible>
  );
}
```

### Dropdown Menu

The `DropdownMenu` component is used to display a dropdown menu.

```typescript
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@forgebase/studio-ui';

function App() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger>Open Menu</DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem>Item 1</DropdownMenuItem>
        <DropdownMenuItem>Item 2</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
```

### Input

The `Input` component is used to display an input field.

```typescript
import { Input } from '@forgebase/studio-ui';

function App() {
  return <Input placeholder="Enter text" />;
}
```

### Label

The `Label` component is used to display a label.

```typescript
import { Label } from '@forgebase/studio-ui';

function App() {
  return <Label>Label</Label>;
}
```

### Scroll Area

The `ScrollArea` component is used to display a scrollable area.

```typescript
import { ScrollArea } from '@forgebase/studio-ui';

function App() {
  return (
    <ScrollArea>
      Content
    </ScrollArea>
  );
}
```

### Select

The `Select` component is used to display a select dropdown.

```typescript
import { Select, SelectTrigger, SelectContent, SelectItem } from '@forgebase/studio-ui';

function App() {
  return (
    <Select>
      <SelectTrigger>Select an option</SelectTrigger>
      <SelectContent>
        <SelectItem value="option1">Option 1</SelectItem>
        <SelectItem value="option2">Option 2</SelectItem>
      </SelectContent>
    </Select>
  );
}
```

### Separator

The `Separator` component is used to display a separator.

```typescript
import { Separator } from '@forgebase/studio-ui';

function App() {
  return <Separator />;
}
```

### Sheet

The `Sheet` component is used to display a sheet.

```typescript
import { Sheet, SheetTrigger, SheetContent } from '@forgebase/studio-ui';

function App() {
  return (
    <Sheet>
      <SheetTrigger>Open Sheet</SheetTrigger>
      <SheetContent>Content</SheetContent>
    </Sheet>
  );
}
```

### Sidebar

The `Sidebar` component is used to display a sidebar.

```typescript
import { Sidebar } from '@forgebase/studio-ui';

function App() {
  return <Sidebar>Content</Sidebar>;
}
```

### Skeleton

The `Skeleton` component is used to display a skeleton loader.

```typescript
import { Skeleton } from '@forgebase/studio-ui';

function App() {
  return <Skeleton />;
}
```

### Switch

The `Switch` component is used to display a switch.

```typescript
import { Switch } from '@forgebase/studio-ui';

function App() {
  return <Switch />;
}
```

### Toast

The `Toast` component is used to display a toast notification.

```typescript
import { Toast, ToastTitle, ToastDescription } from '@forgebase/studio-ui';

function App() {
  return (
    <Toast>
      <ToastTitle>Toast Title</ToastTitle>
      <ToastDescription>Toast Description</ToastDescription>
    </Toast>
  );
}
```

### Toaster

The `Toaster` component is used to display a toaster container.

```typescript
import { Toaster } from '@forgebase/studio-ui';

function App() {
  return <Toaster />;
}
```

### Tooltip

The `Tooltip` component is used to display a tooltip.

```typescript
import { Tooltip, TooltipTrigger, TooltipContent } from '@forgebase/studio-ui';

function App() {
  return (
    <Tooltip>
      <TooltipTrigger>Hover me</TooltipTrigger>
      <TooltipContent>Tooltip Content</TooltipContent>
    </Tooltip>
  );
}
```

## Building

Run `nx build studio-ui` to build the library.

## Running Tests

Run `nx test studio-ui` to execute the unit tests via [Jest](https://jestjs.io).
