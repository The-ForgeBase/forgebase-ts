import { Component } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideCirclePlus,
  lucideDatabase,
  lucideServer,
  lucideShield,
  lucideSettings,
  lucideCode,
  lucideBox,
  lucideRocket,
  lucideZap,
  lucideGlobe,
  lucideCpu,
  lucideUsers,
  lucideTerminal,
  lucideBookOpen,
  lucideGithub,
} from '@ng-icons/lucide';
import { HlmSeparatorDirective } from '@spartan-ng/ui-separator-helm';
import {
  HlmTabsComponent,
  HlmTabsContentDirective,
  HlmTabsListComponent,
  HlmTabsTriggerDirective,
} from '@spartan-ng/ui-tabs-helm';
import { HlmButtonDirective } from '@spartan-ng/ui-button-helm';
import { HlmCardDirective } from '@spartan-ng/ui-card-helm';
import { BrnContextMenuTriggerDirective } from '@spartan-ng/brain/menu';
import {
  HlmMenuComponent,
  HlmMenuGroupComponent,
  HlmMenuItemDirective,
  HlmMenuSeparatorComponent,
} from '@spartan-ng/ui-menu-helm';
import img from '/assets/music_img_fallback.svg';
import { HlmIconDirective } from '@spartan-ng/ui-icon-helm';
import { NgScrollbarModule } from 'ngx-scrollbar';
import { HlmScrollAreaDirective } from '@spartan-ng/ui-scrollarea-helm';
import { RouteMeta, injectRouter } from '@analogjs/router';
import { injectResponse } from '@analogjs/router/tokens';

export const routeMeta: RouteMeta = {
  title: 'Studio',
  canActivate: [
    () => {
      const router = injectRouter();
      const response = injectResponse();
      console.log('response', response);
      console.log('ssr', import.meta.env.SSR);
      if (import.meta.env.SSR && response) {
        const status = response.statusCode;
        if (status === 401) {
          router.navigate(['/login']);
          return false;
        }
      }
      return true;
    },
  ],
};

@Component({
  standalone: true,
  host: {
    class: 'block w-full h-svh pb-[5rem] overflow-hidden',
  },
  imports: [
    HlmTabsComponent,
    HlmTabsListComponent,
    HlmTabsTriggerDirective,
    HlmTabsContentDirective,
    HlmButtonDirective,
    HlmSeparatorDirective,
    BrnContextMenuTriggerDirective,
    HlmCardDirective,
    NgIcon,
    HlmIconDirective,
    HlmScrollAreaDirective,
    NgScrollbarModule,
    HlmMenuComponent,
    HlmMenuGroupComponent,
    HlmMenuItemDirective,
    HlmMenuSeparatorComponent,
  ],
  providers: [
    provideIcons({
      lucideCirclePlus,
      lucideDatabase,
      lucideServer,
      lucideShield,
      lucideSettings,
      lucideCode,
      lucideBox,
      lucideRocket,
      lucideZap,
      lucideGlobe,
      lucideCpu,
      lucideUsers,
      lucideTerminal,
      lucideBookOpen,
      lucideGithub,
    }),
  ],
  templateUrl: './index.page.html',
})
export default class StudioHomePageComponent {
  public imageFallback = img;

  public docTabs = {
    webApp: {
      name: 'webApp',
      title: 'Web App Integration',
      description: 'SDK usage for CRUD and real-time operations',
      icon: 'lucideCode',
      code: `// Initialize ForgeBase SDK
import { DatabaseSDK } from '@forgebase-ts/sdk/client';

const db = new DatabaseSDK('http://localhost:3000');

// Basic CRUD Operations
const users = await db
  .table('users')
  .select('id', 'name', 'email')
  .where('status', 'active')
  .execute();

// Create a new record
const newUser = await db.table('users').create({
  name: 'John Doe',
  email: 'john@example.com',
});

// Real-time Subscriptions
const unsubscribe = await db
  .table('users')
  .subscribe({
    onAdd: (user) => console.log('New user:', user),
    onChange: (user) => console.log('User updated:', user),
    onDelete: (id) => console.log('User deleted:', id),
  });`,
    },
    server: {
      name: 'server',
      title: 'Server Setup',
      description: 'ForgeBase API initialization for Node.js',
      icon: 'lucideServer',
      code: `// Initialize ForgeBase Server
import { forgeApi } from '@forgebase-ts/api';

const api = forgeApi({
  prefix: '/api',
  services: {
    db: {
      provider: 'postgres',
      config: {
        connection: process.env.DATABASE_URL,
      },
      enforceRls: true,
    },
    storage: {
      provider: 'local',
      config: {},
    },
  },
});

// Add custom routes
api.get('/custom', async (ctx) => {
  ctx.res.body = { message: 'Hello World' };
});`,
    },
    schema: {
      name: 'schema',
      title: 'Database Schema',
      description: 'Schema and permissions configuration',
      icon: 'lucideDatabase',
      code: `// Create table schema
await db.createSchema('posts', [
  {
    name: 'id',
    type: 'increments',
    primaryKey: true,
  },
  {
    name: 'title',
    type: 'string',
    nullable: false,
  },
  {
    name: 'content',
    type: 'text',
  },
  {
    name: 'author_id',
    type: 'integer',
    references: 'users.id',
  },
]);

// Set permissions
await db.setPermissions('posts', {
  read: {
    roles: ['user', 'admin'],
    rule: 'author_id = :user_id',
  },
  write: {
    roles: ['admin'],
  },
});`,
    },
  };

  public quickStartDocs = [
    {
      title: 'Web App Integration',
      description: 'Integrate ForgeBase with your web application',
      icon: 'lucideCode',
      code: `// Initialize ForgeBase SDK
import { DatabaseSDK } from '@forgebase-ts/sdk/client';

const db = new DatabaseSDK('http://localhost:3000');

// Basic CRUD Operations
const users = await db
  .table('users')
  .select('id', 'name', 'email')
  .where('status', 'active')
  .execute();

// Real-time Subscriptions
const unsubscribe = await db
  .table('users')
  .subscribe({
    onAdd: (user) => console.log('New user:', user),
    onChange: (user) => console.log('User updated:', user),
    onDelete: (id) => console.log('User deleted:', id),
  });`,
      language: 'typescript',
    },
    {
      title: 'Node.js Server Setup',
      description: 'Set up a ForgeBase server with Node.js',
      icon: 'lucideTerminal',
      code: `// Initialize ForgeBase Server
import { forgeApi } from '@forgebase-ts/api';

const api = forgeApi({
  prefix: '/api',
  services: {
    db: {
      provider: 'postgres',
      config: {
        connection: process.env.DATABASE_URL,
      },
      enforceRls: true,
    },
    storage: {
      provider: 'local',
      config: {},
    },
  },
});

// Add custom routes
api.get('/custom', async (ctx) => {
  ctx.res.body = { message: 'Hello World' };
});`,
      language: 'typescript',
    },
    {
      title: 'Database Schema',
      description: 'Define your database schema and permissions',
      icon: 'lucideDatabase',
      code: `// Create table schema
await db.createSchema('posts', [
  {
    name: 'id',
    type: 'increments',
    primaryKey: true,
  },
  {
    name: 'title',
    type: 'string',
    nullable: false,
  },
  {
    name: 'content',
    type: 'text',
  },
  {
    name: 'author_id',
    type: 'integer',
    references: 'users.id',
  },
]);

// Set permissions
await db.setPermissions('posts', {
  read: {
    roles: ['user', 'admin'],
    rule: 'author_id = :user_id',
  },
  write: {
    roles: ['admin'],
  },
});`,
      language: 'typescript',
    },
  ];

  public metrics = {
    overview: [
      {
        title: 'Total Requests',
        value: '2.4M',
        change: '+12.5%',
        trend: 'up',
        icon: 'lucideZap',
      },
      {
        title: 'Active Users',
        value: '38.2K',
        change: '+8.2%',
        trend: 'up',
        icon: 'lucideUsers',
      },
      {
        title: 'Database Size',
        value: '1.2GB',
        change: '+5.1%',
        trend: 'up',
        icon: 'lucideDatabase',
      },
      {
        title: 'Avg Response Time',
        value: '85ms',
        change: '-3.2%',
        trend: 'down',
        icon: 'lucideCpu',
      },
    ],
    chartData: {
      requests: {
        labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
        data: [320, 420, 380, 450, 480, 360, 420],
      },
      users: {
        today: 2845,
        week: 18234,
        month: 38200,
      },
    },
  };

  public sectionData = {
    quickStart: [
      {
        img: 'assets/dashboard/database.svg',
        title: 'Database Management',
        subtitle: 'Configure tables, schemas, and queries',
        icon: 'lucideDatabase',
      },
      {
        img: 'assets/dashboard/api.svg',
        title: 'API Services',
        subtitle: 'REST and Real-time endpoints',
        icon: 'lucideServer',
      },
      {
        img: 'assets/dashboard/auth.svg',
        title: 'Authentication',
        subtitle: 'User management and security',
        icon: 'lucideShield',
      },
      {
        img: 'assets/dashboard/storage.svg',
        title: 'Storage',
        subtitle: 'File and object storage',
        icon: 'lucideBox',
      },
    ],
    features: [
      {
        img: 'assets/dashboard/performance.svg',
        title: 'Performance Metrics',
        subtitle: 'Monitor system health',
        icon: 'lucideZap',
      },
      {
        img: 'assets/dashboard/deploy.svg',
        title: 'Deployment',
        subtitle: 'Production ready setup',
        icon: 'lucideRocket',
      },
      {
        img: 'assets/dashboard/edge.svg',
        title: 'Edge Computing',
        subtitle: 'Global edge deployment',
        icon: 'lucideGlobe',
      },
      {
        img: 'assets/dashboard/integrations.svg',
        title: 'Integrations',
        subtitle: 'Connect with other services',
        icon: 'lucideCode',
      },
      {
        img: 'assets/dashboard/realtime.svg',
        title: 'Real-time',
        subtitle: 'Live updates and subscriptions',
        icon: 'lucideCpu',
      },
      {
        img: 'assets/dashboard/settings.svg',
        title: 'Settings',
        subtitle: 'Configure your workspace',
        icon: 'lucideSettings',
      },
    ],
  };

  public contextMenuActions = [
    'View Details',
    'Edit Configuration',
    'View Logs',
    'View Documentation',
    'Create Backup',
    'Share Access',
    'Delete',
  ];
}
