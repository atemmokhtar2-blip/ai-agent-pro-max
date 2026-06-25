import { useAuth } from "@/components/AuthProvider";
import {
  useGetProjectStats,
  useGetRecentProjects,
  useListConversations,
} from "@workspace/api-client-react";
import type { AIConversation } from "@workspace/api-client-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Activity, Code2, Globe, Layout, ArrowRight, MessageSquare, Cpu, Clock } from "lucide-react";
import { Link } from "wouter";
import { AIPulse } from "@/components/design-system/AIPulse";

// ── Helpers ────────────────────────────────────────────────────────────────────

function relativeTime(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 172800) return "Yesterday";
  return new Date(iso).toLocaleDateString([], { month: "short", day: "numeric" });
}

function isBlueprint(conv: AIConversation): boolean {
  return conv.title != null && conv.title.length > 0 && conv.title !== "New conversation";
}

// ── Stat card ──────────────────────────────────────────────────────────────────

interface StatCardProps {
  label: string;
  value: number | string;
  icon: React.ReactNode;
  loading?: boolean;
  sub?: string;
  accent?: string;
}

function StatCard({ label, value, icon, loading, sub, accent }: StatCardProps) {
  return (
    <Card className="relative overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 pt-4 px-4">
        <CardTitle className="text-xs sm:text-sm font-medium">{label}</CardTitle>
        <span className={`h-4 w-4 flex-shrink-0 ${accent ?? "text-muted-foreground"}`}>{icon}</span>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        {loading ? (
          <>
            <Skeleton className="h-7 w-[50px]" />
            {sub && <Skeleton className="h-3 w-[80px] mt-1" />}
          </>
        ) : (
          <>
            <div className="text-2xl font-bold">{value}</div>
            {sub && <p className="text-[11px] text-muted-foreground mt-0.5">{sub}</p>}
          </>
        )}
      </CardContent>
    </Card>
  );
}

// ── Conversation row ───────────────────────────────────────────────────────────

function ConvRow({ conv }: { conv: AIConversation }) {
  return (
    <Link href="/chat">
      <div className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 cursor-pointer transition-colors gap-3 group">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-primary/10">
            <AIPulse size={14} color="#6366f1" active={false} />
          </div>
          <div className="min-w-0">
            <p className="font-medium text-sm truncate leading-snug">
              {conv.title ?? "New conversation"}
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-1">
              <Clock className="h-3 w-3 flex-shrink-0" />
              {relativeTime(conv.updated_at)}
            </p>
          </div>
        </div>
        <ArrowRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors flex-shrink-0" />
      </div>
    </Link>
  );
}

// ── Activity section ───────────────────────────────────────────────────────────

function ActivitySection({ convs, loading }: { convs: AIConversation[]; loading: boolean }) {
  if (loading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-14 w-full rounded-lg" />
        <Skeleton className="h-14 w-full rounded-lg" />
        <Skeleton className="h-14 w-full rounded-lg" />
      </div>
    );
  }

  if (convs.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border/50 py-8 text-center">
        <div className="flex justify-center mb-3">
          <AIPulse size={32} color="#6366f1" active />
        </div>
        <p className="text-sm text-muted-foreground">No AI plans yet</p>
        <p className="text-xs text-muted-foreground/60 mt-1">
          Start a new plan in the <Link href="/chat"><span className="text-primary hover:underline cursor-pointer">Planner</span></Link>
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {convs.slice(0, 5).map((conv) => (
        <ConvRow key={conv.id} conv={conv} />
      ))}
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function Dashboard() {
  const { user } = useAuth();

  const { data: stats, isLoading: statsLoading } = useGetProjectStats();
  const { data: recent, isLoading: recentLoading } = useGetRecentProjects({ limit: 5 });
  const { data: convList, isLoading: convLoading } = useListConversations({ per_page: 20 });

  const conversations = convList?.items ?? [];
  const totalConvs = convList?.total ?? 0;

  // Count blueprints: conversations with non-default titles
  const blueprintCount = conversations.filter(isBlueprint).length;

  // This week: conversations updated in the last 7 days
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const thisWeek = conversations.filter(
    (c) => new Date(c.updated_at).getTime() > weekAgo
  ).length;

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h2 className="page-title">Dashboard</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Welcome back, <span className="font-medium text-foreground">{user?.username}</span>
          </p>
        </div>
      </div>

      {/* ── Stat grid ────────────────────────────────────────────────────── */}
      <div className="grid gap-3 grid-cols-2 sm:gap-4 lg:grid-cols-4">
        <StatCard
          label="AI Plans"
          value={totalConvs}
          icon={<MessageSquare className="h-4 w-4" />}
          loading={convLoading}
          sub={`${thisWeek} this week`}
          accent="text-primary"
        />
        <StatCard
          label="Blueprints"
          value={blueprintCount}
          icon={<Cpu className="h-4 w-4" />}
          loading={convLoading}
          sub="generated"
          accent="text-indigo-400"
        />
        <StatCard
          label="Projects"
          value={stats?.total || 0}
          icon={<Layout className="h-4 w-4" />}
          loading={statsLoading}
          sub={`${stats?.by_status?.active || 0} active`}
        />
        <StatCard
          label="Active"
          value={stats?.by_status?.active || 0}
          icon={<Activity className="h-4 w-4" />}
          loading={statsLoading}
          sub="running now"
        />
      </div>

      {/* ── Two-column layout ─────────────────────────────────────────────── */}
      <div className="mt-4 sm:mt-6 grid gap-4 lg:grid-cols-2">

        {/* Recent AI Plans */}
        <Card className="w-full">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm sm:text-base">Recent AI Plans</CardTitle>
                <CardDescription className="mt-0.5">
                  Your latest architecture sessions
                </CardDescription>
              </div>
              <Link href="/chat">
                <span className="text-xs text-primary hover:underline cursor-pointer flex items-center gap-1">
                  Open Planner <ArrowRight className="h-3 w-3" />
                </span>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <ActivitySection convs={conversations} loading={convLoading} />
          </CardContent>
        </Card>

        {/* Recent Projects */}
        <Card className="w-full">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm sm:text-base">Recent Projects</CardTitle>
                <CardDescription className="mt-0.5">
                  Projects you've worked on
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {recentLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-14 w-full rounded-lg" />
                <Skeleton className="h-14 w-full rounded-lg" />
                <Skeleton className="h-14 w-full rounded-lg" />
              </div>
            ) : (recent?.length ?? 0) === 0 ? (
              <div className="rounded-lg border border-dashed border-border/50 py-8 text-center">
                <p className="text-sm text-muted-foreground">No projects yet</p>
                <p className="text-xs text-muted-foreground/60 mt-1">Generate a blueprint to get started</p>
              </div>
            ) : (
              <div className="space-y-2">
                {recent?.map((project) => (
                  <Link key={project.id} href={`/projects/${project.id}`}>
                    <div className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 cursor-pointer transition-colors gap-3 group">
                      <div className="flex items-center gap-3 min-w-0">
                        {project.project_type === "website" ? (
                          <Globe className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                        ) : (
                          <Code2 className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                        )}
                        <div className="min-w-0">
                          <p className="font-medium text-sm truncate">{project.name}</p>
                          <p className="text-[11px] text-muted-foreground capitalize">{project.status}</p>
                        </div>
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors flex-shrink-0" />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Platform info ─────────────────────────────────────────────────── */}
      {(stats?.by_type?.website || stats?.by_type?.bot) ? (
        <div className="mt-4 grid gap-3 grid-cols-2 sm:grid-cols-3 sm:mt-6">
          {stats?.by_type?.website ? (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 pt-4 px-4">
                <CardTitle className="text-xs sm:text-sm font-medium">Websites</CardTitle>
                <Globe className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <div className="text-2xl font-bold">{stats.by_type.website}</div>
              </CardContent>
            </Card>
          ) : null}
          {stats?.by_type?.bot ? (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 pt-4 px-4">
                <CardTitle className="text-xs sm:text-sm font-medium">Bots</CardTitle>
                <Code2 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <div className="text-2xl font-bold">{stats.by_type.bot}</div>
              </CardContent>
            </Card>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
