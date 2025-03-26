import { Component } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideDatabase,
  lucideServer,
  lucideShield,
  lucideSettings,
  lucideInfo,
  lucideLogOut,
  lucideUsers,
  lucideKey,
  lucideTerminal,
  lucideCode,
  lucideGithub,
  lucideBook,
  lucideArrowUpRight,
  lucideBox,
  lucideRocket,
  lucideGlobe,
  lucideBell,
  lucideActivity,
  lucideChartColumn,
  lucideFileText,
  lucideLock,
  lucideShieldAlert,
  lucideHistory,
  lucideBadgeAlert,
} from '@ng-icons/lucide';
import { BrnMenuTriggerDirective } from '@spartan-ng/brain/menu';
import { HlmIconDirective } from '@spartan-ng/ui-icon-helm';
import {
  HlmMenuBarComponent,
  HlmMenuBarItemDirective,
  HlmMenuComponent,
  HlmMenuGroupComponent,
  HlmMenuItemCheckComponent,
  HlmMenuItemCheckboxDirective,
  HlmMenuItemDirective,
  HlmMenuItemRadioComponent,
  HlmMenuItemRadioDirective,
  HlmMenuItemSubIndicatorComponent,
  HlmMenuSeparatorComponent,
  HlmMenuShortcutComponent,
  HlmSubMenuComponent,
} from '@spartan-ng/ui-menu-helm';

@Component({
  selector: 'studio-top-menu',
  standalone: true,
  host: {
    class: 'block',
  },
  imports: [
    BrnMenuTriggerDirective,
    HlmMenuComponent,
    HlmMenuBarComponent,
    HlmSubMenuComponent,
    HlmMenuItemDirective,
    HlmMenuItemSubIndicatorComponent,
    HlmMenuShortcutComponent,
    HlmMenuSeparatorComponent,
    HlmMenuBarItemDirective,
    HlmMenuItemCheckComponent,
    HlmMenuItemRadioComponent,
    HlmMenuGroupComponent,
    HlmMenuItemCheckboxDirective,
    HlmMenuItemRadioDirective,
    NgIcon,
    HlmIconDirective,
  ],
  providers: [
    provideIcons({
      lucideDatabase,
      lucideServer,
      lucideShield,
      lucideSettings,
      lucideInfo,
      lucideLogOut,
      lucideUsers,
      lucideKey,
      lucideTerminal,
      lucideCode,
      lucideGithub,
      lucideBook,
      lucideArrowUpRight,
      lucideBox,
      lucideRocket,
      lucideGlobe,
      lucideBell,
      lucideActivity,
      lucideChartColumn,
      lucideFileText,
      lucideLock,
      lucideShieldAlert,
      lucideHistory,
      lucideBadgeAlert,
    }),
  ],
  template: `
    <hlm-menu-bar class="w-fill border-0">
      <button hlmMenuBarItem [brnMenuTriggerFor]="main" class="px-3 font-bold">
        ForgeBase Studio
      </button>
      <button
        hlmMenuBarItem
        [brnMenuTriggerFor]="services"
        class="px-3 font-medium"
      >
        Services
      </button>
      <button
        hlmMenuBarItem
        [brnMenuTriggerFor]="monitoring"
        class="px-3 font-medium"
      >
        Monitoring
      </button>
      <button
        hlmMenuBarItem
        [brnMenuTriggerFor]="security"
        class="px-3 font-medium"
      >
        Security
      </button>
      <button
        hlmMenuBarItem
        [brnMenuTriggerFor]="tools"
        class="px-3 font-medium"
      >
        Tools
      </button>
      <button
        hlmMenuBarItem
        [brnMenuTriggerFor]="view"
        class="px-3 font-medium"
      >
        View
      </button>
      <button
        hlmMenuBarItem
        [brnMenuTriggerFor]="help"
        class="px-3 font-medium"
      >
        Help
      </button>
    </hlm-menu-bar>

    <ng-template #main>
      <hlm-menu variant="menubar" class="w-48">
        <hlm-menu-group>
          <button hlmMenuItem>
            About ForgeBase
            <hlm-menu-shortcut
              ><ng-icon hlm size="sm" name="lucideInfo"
            /></hlm-menu-shortcut>
          </button>
          <hlm-menu-separator />

          <button hlmMenuItem>
            Preferences
            <hlm-menu-shortcut
              ><ng-icon hlm size="sm" name="lucideSettings"
            /></hlm-menu-shortcut>
          </button>
          <hlm-menu-separator />

          <button hlmMenuItem>
            Sign Out
            <hlm-menu-shortcut
              ><ng-icon hlm size="sm" name="lucideLogOut"
            /></hlm-menu-shortcut>
          </button>
        </hlm-menu-group>
      </hlm-menu>
    </ng-template>

    <ng-template #services>
      <hlm-menu variant="menubar" class="w-56">
        <hlm-menu-group>
          <button hlmMenuItem [brnMenuTriggerFor]="database">
            Database
            <hlm-menu-item-sub-indicator />
            <hlm-menu-shortcut
              ><ng-icon hlm size="sm" name="lucideDatabase"
            /></hlm-menu-shortcut>
            <ng-template #database>
              <hlm-sub-menu>
                <button hlmMenuItem>Create Table</button>
                <button hlmMenuItem>Manage Schema</button>
                <button hlmMenuItem>Import Data</button>
                <hlm-menu-separator />
                <button hlmMenuItem>Query Browser</button>
                <button hlmMenuItem>Backups</button>
              </hlm-sub-menu>
            </ng-template>
          </button>

          <button hlmMenuItem [brnMenuTriggerFor]="api">
            API
            <hlm-menu-item-sub-indicator />
            <hlm-menu-shortcut
              ><ng-icon hlm size="sm" name="lucideServer"
            /></hlm-menu-shortcut>
            <ng-template #api>
              <hlm-sub-menu>
                <button hlmMenuItem>API Explorer</button>
                <button hlmMenuItem>Endpoints</button>
                <button hlmMenuItem>WebHooks</button>
                <hlm-menu-separator />
                <button hlmMenuItem>API Keys</button>
                <button hlmMenuItem>Documentation</button>
              </hlm-sub-menu>
            </ng-template>
          </button>

          <button hlmMenuItem [brnMenuTriggerFor]="auth">
            Authentication
            <hlm-menu-item-sub-indicator />
            <hlm-menu-shortcut
              ><ng-icon hlm size="sm" name="lucideShield"
            /></hlm-menu-shortcut>
            <ng-template #auth>
              <hlm-sub-menu>
                <button hlmMenuItem>Users</button>
                <button hlmMenuItem>Roles</button>
                <button hlmMenuItem>Providers</button>
                <hlm-menu-separator />
                <button hlmMenuItem>Security Rules</button>
                <button hlmMenuItem>Audit Logs</button>
              </hlm-sub-menu>
            </ng-template>
          </button>

          <button hlmMenuItem [brnMenuTriggerFor]="storage">
            Storage
            <hlm-menu-item-sub-indicator />
            <hlm-menu-shortcut
              ><ng-icon hlm size="sm" name="lucideBox"
            /></hlm-menu-shortcut>
            <ng-template #storage>
              <hlm-sub-menu>
                <button hlmMenuItem>File Browser</button>
                <button hlmMenuItem>Buckets</button>
                <button hlmMenuItem>Settings</button>
              </hlm-sub-menu>
            </ng-template>
          </button>
        </hlm-menu-group>
      </hlm-menu>
    </ng-template>

    <ng-template #monitoring>
      <hlm-menu variant="menubar" class="w-56">
        <hlm-menu-group>
          <button hlmMenuItem [brnMenuTriggerFor]="metrics">
            Metrics & Analytics
            <hlm-menu-item-sub-indicator />
            <hlm-menu-shortcut
              ><ng-icon hlm size="sm" name="lucideBarChart2"
            /></hlm-menu-shortcut>
            <ng-template #metrics>
              <hlm-sub-menu>
                <button hlmMenuItem>System Metrics</button>
                <button hlmMenuItem>API Usage</button>
                <button hlmMenuItem>Database Performance</button>
                <button hlmMenuItem>Storage Stats</button>
                <hlm-menu-separator />
                <button hlmMenuItem>Custom Dashboards</button>
              </hlm-sub-menu>
            </ng-template>
          </button>

          <button hlmMenuItem [brnMenuTriggerFor]="logs">
            Logs
            <hlm-menu-item-sub-indicator />
            <hlm-menu-shortcut
              ><ng-icon hlm size="sm" name="lucideFileText"
            /></hlm-menu-shortcut>
            <ng-template #logs>
              <hlm-sub-menu>
                <button hlmMenuItem>System Logs</button>
                <button hlmMenuItem>API Logs</button>
                <button hlmMenuItem>Database Logs</button>
                <button hlmMenuItem>Access Logs</button>
                <hlm-menu-separator />
                <button hlmMenuItem>Log Settings</button>
              </hlm-sub-menu>
            </ng-template>
          </button>

          <button hlmMenuItem [brnMenuTriggerFor]="alerts">
            Alerts
            <hlm-menu-item-sub-indicator />
            <hlm-menu-shortcut
              ><ng-icon hlm size="sm" name="lucideBell"
            /></hlm-menu-shortcut>
            <ng-template #alerts>
              <hlm-sub-menu>
                <button hlmMenuItem>Alert Rules</button>
                <button hlmMenuItem>Notifications</button>
                <button hlmMenuItem>Alert History</button>
                <hlm-menu-separator />
                <button hlmMenuItem>Configure Channels</button>
              </hlm-sub-menu>
            </ng-template>
          </button>

          <button hlmMenuItem [brnMenuTriggerFor]="activity">
            Activity
            <hlm-menu-item-sub-indicator />
            <hlm-menu-shortcut
              ><ng-icon hlm size="sm" name="lucideActivity"
            /></hlm-menu-shortcut>
            <ng-template #activity>
              <hlm-sub-menu>
                <button hlmMenuItem>System Activity</button>
                <button hlmMenuItem>User Activity</button>
                <button hlmMenuItem>API Activity</button>
                <hlm-menu-separator />
                <button hlmMenuItem>Audit Logs</button>
              </hlm-sub-menu>
            </ng-template>
          </button>
        </hlm-menu-group>
      </hlm-menu>
    </ng-template>

    <ng-template #security>
      <hlm-menu variant="menubar" class="w-56">
        <hlm-menu-group>
          <button hlmMenuItem [brnMenuTriggerFor]="access">
            Access Control
            <hlm-menu-item-sub-indicator />
            <hlm-menu-shortcut
              ><ng-icon hlm size="sm" name="lucideLock"
            /></hlm-menu-shortcut>
            <ng-template #access>
              <hlm-sub-menu>
                <button hlmMenuItem>Roles & Permissions</button>
                <button hlmMenuItem>User Groups</button>
                <button hlmMenuItem>Access Policies</button>
                <hlm-menu-separator />
                <button hlmMenuItem>Policy Templates</button>
              </hlm-sub-menu>
            </ng-template>
          </button>

          <button hlmMenuItem [brnMenuTriggerFor]="securityRules">
            Security Rules
            <hlm-menu-item-sub-indicator />
            <hlm-menu-shortcut
              ><ng-icon hlm size="sm" name="lucideShieldAlert"
            /></hlm-menu-shortcut>
            <ng-template #securityRules>
              <hlm-sub-menu>
                <button hlmMenuItem>Database Rules</button>
                <button hlmMenuItem>API Rules</button>
                <button hlmMenuItem>Storage Rules</button>
                <hlm-menu-separator />
                <button hlmMenuItem>Rule Templates</button>
              </hlm-sub-menu>
            </ng-template>
          </button>

          <button hlmMenuItem [brnMenuTriggerFor]="apiKeys">
            API Keys
            <hlm-menu-item-sub-indicator />
            <hlm-menu-shortcut
              ><ng-icon hlm size="sm" name="lucideKey"
            /></hlm-menu-shortcut>
            <ng-template #apiKeys>
              <hlm-sub-menu>
                <button hlmMenuItem>Generate Key</button>
                <button hlmMenuItem>View Keys</button>
                <button hlmMenuItem>Key Permissions</button>
                <hlm-menu-separator />
                <button hlmMenuItem>Usage Analytics</button>
              </hlm-sub-menu>
            </ng-template>
          </button>

          <hlm-menu-separator />

          <button hlmMenuItem [brnMenuTriggerFor]="audit">
            Audit
            <hlm-menu-item-sub-indicator />
            <hlm-menu-shortcut
              ><ng-icon hlm size="sm" name="lucideHistory"
            /></hlm-menu-shortcut>
            <ng-template #audit>
              <hlm-sub-menu>
                <button hlmMenuItem>Security Events</button>
                <button hlmMenuItem>Access History</button>
                <button hlmMenuItem>Change History</button>
                <hlm-menu-separator />
                <button hlmMenuItem>Export Reports</button>
              </hlm-sub-menu>
            </ng-template>
          </button>
        </hlm-menu-group>
      </hlm-menu>
    </ng-template>

    <ng-template #tools>
      <hlm-menu variant="menubar" class="w-56">
        <hlm-menu-group>
          <button hlmMenuItem>
            Terminal
            <hlm-menu-shortcut
              ><ng-icon hlm size="sm" name="lucideTerminal"
            /></hlm-menu-shortcut>
          </button>
          <button hlmMenuItem>
            SDK Generator
            <hlm-menu-shortcut
              ><ng-icon hlm size="sm" name="lucideCode"
            /></hlm-menu-shortcut>
          </button>
          <hlm-menu-separator />
          <button hlmMenuItem>
            Deployment
            <hlm-menu-shortcut
              ><ng-icon hlm size="sm" name="lucideRocket"
            /></hlm-menu-shortcut>
          </button>
          <button hlmMenuItem>
            Monitoring
            <hlm-menu-shortcut
              ><ng-icon hlm size="sm" name="lucideGlobe"
            /></hlm-menu-shortcut>
          </button>
        </hlm-menu-group>
      </hlm-menu>
    </ng-template>

    <ng-template #view>
      <hlm-menu variant="menubar" class="w-56">
        <hlm-menu-group>
          <button hlmMenuItemCheckbox checked>
            <hlm-menu-item-check />
            Show Terminal
          </button>
          <button hlmMenuItemCheckbox checked>
            <hlm-menu-item-check />
            Show Query Panel
          </button>
          <hlm-menu-separator />
          <button hlmMenuItemRadio checked>
            <hlm-menu-item-radio />
            Standard View
          </button>
          <button hlmMenuItemRadio>
            <hlm-menu-item-radio />
            Compact View
          </button>
          <hlm-menu-separator />
          <button hlmMenuItem>Reset Layout</button>
        </hlm-menu-group>
      </hlm-menu>
    </ng-template>

    <ng-template #help>
      <hlm-menu variant="menubar" class="w-56">
        <hlm-menu-group>
          <button hlmMenuItem>
            Documentation
            <hlm-menu-shortcut
              ><ng-icon hlm size="sm" name="lucideBook"
            /></hlm-menu-shortcut>
          </button>
          <button hlmMenuItem>
            GitHub
            <hlm-menu-shortcut
              ><ng-icon hlm size="sm" name="lucideGithub"
            /></hlm-menu-shortcut>
          </button>
          <hlm-menu-separator />
          <button hlmMenuItem>
            API Reference
            <hlm-menu-shortcut
              ><ng-icon hlm size="sm" name="lucideArrowUpRight"
            /></hlm-menu-shortcut>
          </button>
          <button hlmMenuItem>
            Examples
            <hlm-menu-shortcut
              ><ng-icon hlm size="sm" name="lucideCode"
            /></hlm-menu-shortcut>
          </button>
          <hlm-menu-separator />
          <button hlmMenuItem>Keyboard Shortcuts</button>
          <button hlmMenuItem>Send Feedback</button>
        </hlm-menu-group>
      </hlm-menu>
    </ng-template>
  `,
})
export class TopStudioMenuComponent {}
