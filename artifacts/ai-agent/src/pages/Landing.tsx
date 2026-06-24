import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ChevronRight, Code2, Cpu, Globe, Layout, Shield, Zap } from "lucide-react";

export default function Landing() {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 max-w-screen-2xl items-center justify-between mx-auto px-4">
          <div className="flex items-center gap-2">
            <Cpu className="h-6 w-6 text-primary" />
            <span className="font-bold text-lg tracking-tight">AI Agent</span>
          </div>
          <nav className="flex items-center gap-6 text-sm font-medium">
            <a href="#features" className="transition-colors hover:text-foreground/80 text-foreground/60">Features</a>
            <a href="#how-it-works" className="transition-colors hover:text-foreground/80 text-foreground/60">How it Works</a>
            <a href="#pricing" className="transition-colors hover:text-foreground/80 text-foreground/60">Pricing</a>
          </nav>
          <div className="flex items-center gap-4">
            <Link href="/login">
              <Button variant="ghost" size="sm">Log in</Button>
            </Link>
            <Link href="/register">
              <Button size="sm">Get Started</Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <section className="space-y-6 pb-8 pt-6 md:pb-12 md:pt-10 lg:py-32">
          <div className="container flex max-w-[64rem] flex-col items-center gap-4 text-center mx-auto px-4">
            <div className="inline-flex items-center rounded-lg bg-muted px-3 py-1 text-sm font-medium">
              <Zap className="mr-2 h-4 w-4 text-primary" />
              <span className="text-muted-foreground">Introducing AI Agent 2.0</span>
            </div>
            <h1 className="font-bold text-3xl sm:text-5xl md:text-6xl lg:text-7xl">
              Ship software <span className="text-primary">faster</span> with AI.
            </h1>
            <p className="max-w-[42rem] leading-normal text-muted-foreground sm:text-xl sm:leading-8">
              A command-center for the future of AI-powered development. Build, deploy, and scale websites and bots with unprecedented precision.
            </p>
            <div className="space-x-4 mt-4">
              <Link href="/register">
                <Button size="lg" className="h-12 px-8 text-base">
                  Start Building <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link href="/login">
                <Button variant="outline" size="lg" className="h-12 px-8 text-base">
                  View Demo
                </Button>
              </Link>
            </div>
          </div>
        </section>

        <section id="features" className="container space-y-6 bg-slate-50 dark:bg-transparent py-8 md:py-12 lg:py-24 mx-auto px-4 border-t border-border">
          <div className="mx-auto flex max-w-[58rem] flex-col items-center space-y-4 text-center">
            <h2 className="font-bold text-3xl leading-[1.1] sm:text-3xl md:text-6xl">Features</h2>
            <p className="max-w-[85%] leading-normal text-muted-foreground sm:text-lg sm:leading-7">
              Everything you need to build at enterprise scale.
            </p>
          </div>
          <div className="mx-auto grid justify-center gap-4 sm:grid-cols-2 md:max-w-[64rem] md:grid-cols-3 mt-8">
            <div className="relative overflow-hidden rounded-lg border border-border bg-card p-2">
              <div className="flex h-[180px] flex-col justify-between rounded-md p-6">
                <Layout className="h-10 w-10 text-primary" />
                <div className="space-y-2">
                  <h3 className="font-bold">Websites</h3>
                  <p className="text-sm text-muted-foreground">Generate full-stack web applications in seconds.</p>
                </div>
              </div>
            </div>
            <div className="relative overflow-hidden rounded-lg border border-border bg-card p-2">
              <div className="flex h-[180px] flex-col justify-between rounded-md p-6">
                <Code2 className="h-10 w-10 text-primary" />
                <div className="space-y-2">
                  <h3 className="font-bold">Bots</h3>
                  <p className="text-sm text-muted-foreground">Build complex AI agents and Discord/Slack bots.</p>
                </div>
              </div>
            </div>
            <div className="relative overflow-hidden rounded-lg border border-border bg-card p-2">
              <div className="flex h-[180px] flex-col justify-between rounded-md p-6">
                <Shield className="h-10 w-10 text-primary" />
                <div className="space-y-2">
                  <h3 className="font-bold">Enterprise Grade</h3>
                  <p className="text-sm text-muted-foreground">Secure, compliant, and ready for production.</p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border py-6 md:py-0 bg-card">
        <div className="container flex flex-col items-center justify-between gap-4 md:h-24 md:flex-row mx-auto px-4 text-sm text-muted-foreground">
          <p>
            Built by AI Agent Inc. The source code is available on <a href="#" className="font-medium underline underline-offset-4">GitHub</a>.
          </p>
        </div>
      </footer>
    </div>
  );
}
