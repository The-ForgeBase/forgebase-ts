import Link from 'next/link';
import { Button } from '@forgebase-ts/studio-ui/button';
import { Badge } from '@forgebase-ts/studio-ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@forgebase-ts/studio-ui/card';
import { ArrowRight } from 'lucide-react';

export default function HomePage() {
  return (
    <main className="flex flex-col items-center px-4 py-16">
      {/* Hero Section */}
      <div className="text-center mb-16">
        <Badge variant="secondary" className="mb-4">
          Enterprise Authentication
        </Badge>
        <h1 className="text-4xl font-bold mb-6">
          Comprehensive Authentication & Authorization Service
        </h1>
        <div className="mb-8">
          <pre className="bg-muted inline-block px-4 py-2 rounded-lg">
            <code>npm install @authora/sdk</code>
          </pre>
        </div>
        <div className="flex gap-4 justify-center">
          <Button asChild>
            <Link href="/docs">Get Started</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/docs/guides">View Guides</Link>
          </Button>
        </div>
      </div>

      {/* Features Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-6xl">
        {/* Framework Agnostic */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M12 18.178l-4.62-1.256-.328-3.544h2.27l.158 1.844 2.52.667 2.52-.667.26-2.866H6.96l-.635-6.678h11.35l-.227 2.21H8.822l.204 2.256h8.217l-.624 6.778L12 18.178z"
                />
              </svg>
              <span>Framework Agnostic</span>
            </div>
            <CardTitle>Supports for popular frameworks.</CardTitle>
            <CardDescription className="text-muted-foreground">
              Supports popular frameworks, including React, Vue, Svelte, Astro,
              Solid, Next.js, Nuxt, Tanstack Start, Hono, and more.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link
              href="/docs/frameworks"
              className="text-sm text-muted-foreground hover:text-primary flex items-center"
            >
              Learn more <ArrowRight className="ml-1 w-4 h-4" />
            </Link>
          </CardContent>
        </Card>

        {/* Authentication */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M12 17a2 2 0 0 0 2-2a2 2 0 0 0-2-2a2 2 0 0 0-2 2a2 2 0 0 0 2 2m6-9a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V10a2 2 0 0 1 2-2h1V6a5 5 0 0 1 5-5a5 5 0 0 1 5 5v2h1m-6-5a3 3 0 0 0-3 3v2h6V6a3 3 0 0 0-3-3Z"
                />
              </svg>
              <span>Authentication</span>
            </div>
            <CardTitle>Email & Password Authentication.</CardTitle>
            <CardDescription className="text-muted-foreground">
              Built-in support for email and password authentication, with
              session and account management features.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link
              href="/docs/guides/auth"
              className="text-sm text-muted-foreground hover:text-primary flex items-center"
            >
              Learn more <ArrowRight className="ml-1 w-4 h-4" />
            </Link>
          </CardContent>
        </Card>

        {/* Social Sign-on */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M12 2C6.477 2 2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.879V14.89h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89c1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.989C18.343 21.129 22 16.99 22 12c0-5.523-4.477-10-10-10z"
                />
              </svg>
              <span>Social Sign-on</span>
            </div>
            <CardTitle>Support multiple OAuth providers.</CardTitle>
            <CardDescription className="text-muted-foreground">
              Allow users to sign in with their accounts, including GitHub,
              Google, Discord, Twitter, and more.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link
              href="/docs/guides/oauth"
              className="text-sm text-muted-foreground hover:text-primary flex items-center"
            >
              Learn more <ArrowRight className="ml-1 w-4 h-4" />
            </Link>
          </CardContent>
        </Card>

        {/* Two Factor */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="currentColor" d="M2 7v10h20V7H2zm2 2h16v6H4V9z" />
              </svg>
              <span>Two Factor</span>
            </div>
            <CardTitle>Multi Factor Authentication.</CardTitle>
            <CardDescription className="text-muted-foreground">
              Secure your users accounts with two factor authentication with a
              few lines of code.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link
              href="/docs/guides/mfa"
              className="text-sm text-muted-foreground hover:text-primary flex items-center"
            >
              Learn more <ArrowRight className="ml-1 w-4 h-4" />
            </Link>
          </CardContent>
        </Card>

        {/* Multi Tenant */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M12 12.75c1.63 0 3.07.39 4.24.9c1.08.48 1.76 1.56 1.76 2.73V18H6v-1.61c0-1.18.68-2.26 1.76-2.73c1.17-.52 2.61-.91 4.24-.91zM4 13c1.1 0 2-.9 2-2s-.9-2-2-2s-2 .9-2 2s.9 2 2 2zm18 0c1.1 0 2-.9 2-2s-.9-2-2-2s-2 .9-2 2s.9 2 2 2zM12 12c-1.66 0-3-1.34-3-3s1.34-3 3-3s3 1.34 3 3s-1.34 3-3 3z"
                />
              </svg>
              <span>Multi Tenant</span>
            </div>
            <CardTitle>Organization Members and Invitation.</CardTitle>
            <CardDescription className="text-muted-foreground">
              Multi tenant support with members, organization, teams and
              invitation with access control.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link
              href="/docs/guides/multi-tenant"
              className="text-sm text-muted-foreground hover:text-primary flex items-center"
            >
              Learn more <ArrowRight className="ml-1 w-4 h-4" />
            </Link>
          </CardContent>
        </Card>

        {/* Plugin Ecosystem */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M20.5 11H19V7c0-1.1-.9-2-2-2h-4V3.5a2.5 2.5 0 0 0-5 0V5H4c-1.1 0-1.99.9-1.99 2v3.8H3.5c1.49 0 2.7 1.21 2.7 2.7s-1.21 2.7-2.7 2.7H2V20c0 1.1.9 2 2 2h3.8v-1.5c0-1.49 1.21-2.7 2.7-2.7s2.7 1.21 2.7 2.7V22H17c1.1 0 2-.9 2-2v-4h1.5a2.5 2.5 0 0 0 0-5z"
                />
              </svg>
              <span>Plugin Ecosystem</span>
            </div>
            <CardTitle>A lot more features with plugins.</CardTitle>
            <CardDescription className="text-muted-foreground">
              Improve your application experience with our official plugins and
              those created by the community.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link
              href="/docs/plugins"
              className="text-sm text-muted-foreground hover:text-primary flex items-center"
            >
              Learn more <ArrowRight className="ml-1 w-4 h-4" />
            </Link>
          </CardContent>
        </Card>

        {/* Package 1 */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M12 2C6.477 2 2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.879V14.89h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89c1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.989C18.343 21.129 22 16.99 22 12c0-5.523-4.477-10-10-10z"
                />
              </svg>
              <span>Package 1</span>
            </div>
            <CardTitle>Comprehensive guide and examples for using Package 1.</CardTitle>
            <CardDescription className="text-muted-foreground">
              Learn how to use Package 1 in your projects.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link
              href="/docs/package1"
              className="text-sm text-muted-foreground hover:text-primary flex items-center"
            >
              Learn more <ArrowRight className="ml-1 w-4 h-4" />
            </Link>
          </CardContent>
        </Card>

        {/* Package 2 */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M12 2C6.477 2 2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.879V14.89h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89c1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.989C18.343 21.129 22 16.99 22 12c0-5.523-4.477-10-10-10z"
                />
              </svg>
              <span>Package 2</span>
            </div>
            <CardTitle>Comprehensive guide and examples for using Package 2.</CardTitle>
            <CardDescription className="text-muted-foreground">
              Learn how to use Package 2 in your projects.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link
              href="/docs/package2"
              className="text-sm text-muted-foreground hover:text-primary flex items-center"
            >
              Learn more <ArrowRight className="ml-1 w-4 h-4" />
            </Link>
          </CardContent>
        </Card>

        {/* Package 3 */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M12 2C6.477 2 2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.879V14.89h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89c1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.989C18.343 21.129 22 16.99 22 12c0-5.523-4.477-10-10-10z"
                />
              </svg>
              <span>Package 3</span>
            </div>
            <CardTitle>Comprehensive guide and examples for using Package 3.</CardTitle>
            <CardDescription className="text-muted-foreground">
              Learn how to use Package 3 in your projects.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link
              href="/docs/package3"
              className="text-sm text-muted-foreground hover:text-primary flex items-center"
            >
              Learn more <ArrowRight className="ml-1 w-4 h-4" />
            </Link>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
