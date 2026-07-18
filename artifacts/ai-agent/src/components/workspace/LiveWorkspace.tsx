/**
 * LiveWorkspace — واجهة محادثة نظيفة
 *
 * كل منطق الـ AI/streaming/execution محفوظ بالكامل.
 * تم استبدال ExecutionCard / HistoryCard / LiveStatusBar
 * بفقاعات بسيطة (UserBubble / AssistantBubble / TypingBubble).
 */

import { useState, useRef, useEffect, useCallback } from "react";
import React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  useRenameConversation,
  getListConversationsQueryKey,
  getGetConversationQueryKey,
} from "@workspace/api-client-react";
import type { AIMessage } from "@workspace/api-client-react";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";
import { streamToPlannerEngine, PLANNER_STAGES } from "@/lib/planner-stream";
import type { PlannerStreamEvent } from "@/lib/planner-stream";
import { streamToExecutionEngine } from "@/lib/execution-stream";
import type { ExecutionStreamEvent } from "@/lib/execution-stream";
import { repositoriesApi } from "@/lib/repo-api";
import {
  useTaskActions,
  useTaskStore,
  DEFAULT_EXEC_PHASES,
} from "@/lib/task-store";
import type { VerificationCheck, HealthReport, ProductionGate } from "@/lib/task-store";
import { MarkdownRenderer } from "@/components/chat/MarkdownRenderer";

// ── Helpers ────────────────────────────────────────────────────────────────────

function autoTitle(content: string) {
  return content.slice(0, 60).trim() || "محادثة جديدة";
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" });
}

// ── Icons ──────────────────────────────────────────────────────────────────────

function SendIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12.5 1.5L6.5 7.5M12.5 1.5L8.5 12.5L6.5 7.5M12.5 1.5L1.5 5.5L6.5 7.5" />
    </svg>
  );
}

function StopIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <rect x="2.5" y="2.5" width="8" height="8" rx="1.5" fill="currentColor" opacity="0.18" />
      <rect x="2.5" y="2.5" width="8" height="8" rx="1.5" />
    </svg>
  );
}

function CopyIconSm() {
  return (
    <svg width="11" height="11" viewBox="0 0 11 11" fill="none" stroke="currentColor" strokeWidth="1.3">
      <rect x="3.5" y="3.5" width="6.5" height="6.5" rx="1" />
      <path d="M2.5 7.5H1.5a1 1 0 01-1-1V1.5a1 1 0 011-1h5a1 1 0 011 1v1" />
    </svg>
  );
}

function EditIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 11 11" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7.5 1.5l2 2-6 6H1.5v-2l6-6z" />
    </svg>
  );
}

function RefreshIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 11 11" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <path d="M9.5 2A5 5 0 1 0 9.8 6.5" />
      <polyline points="9.5,0 9.5,2.5 7,2.5" />
    </svg>
  );
}

function AssistantAvatar() {
  return (
    <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-primary/12 border border-primary/20 mt-0.5">
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" className="text-primary">
        <path d="M8 2L9.8 6.2L14 8L9.8 9.8L8 14L6.2 9.8L2 8L6.2 6.2L8 2Z" fill="currentColor" opacity="0.9" />
      </svg>
    </div>
  );
}

// ── User bubble ────────────────────────────────────────────────────────────────

function UserBubble({
  content,
  timestamp,
  onEdit,
}: {
  content: string;
  timestamp?: string;
  onEdit?: (v: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(content);
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => { if (editing) ref.current?.focus(); }, [editing]);

  const submit = () => {
    const t = editValue.trim();
    if (t && t !== content && onEdit) onEdit(t);
    setEditing(false);
  };

  return (
    <div className="flex justify-end group">
      <div className="max-w-[80%] sm:max-w-[70%]">
        {editing ? (
          <div className="flex flex-col gap-2">
            <textarea
              ref={ref}
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(); }
                if (e.key === "Escape") { setEditing(false); setEditValue(content); }
              }}
              className="w-full resize-none rounded-2xl border border-border bg-muted/40 px-4 py-3 text-sm text-foreground leading-relaxed focus:outline-none focus:border-primary/50 min-h-[60px]"
              rows={3}
              dir="auto"
            />
            <div className="flex gap-1.5 justify-end">
              <button onClick={() => { setEditing(false); setEditValue(content); }} className="rounded-lg border border-border px-2.5 py-1 text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">إلغاء</button>
              <button onClick={submit} className="rounded-lg bg-primary px-2.5 py-1 text-xs text-primary-foreground hover:bg-primary/90 transition-colors">إرسال</button>
            </div>
          </div>
        ) : (
          <>
            <div className="relative group/bubble rounded-[18px] rounded-tr-[6px] bg-zinc-800 border border-zinc-700/50 px-4 py-3 text-[0.875rem] text-zinc-100 leading-[1.75] shadow-sm">
              <p className="whitespace-pre-wrap" dir="auto">{content}</p>
              {onEdit && (
                <button
                  onClick={() => { setEditValue(content); setEditing(true); }}
                  className="absolute -left-7 top-2 rounded p-1 opacity-0 group-hover/bubble:opacity-40 hover:!opacity-90 transition-opacity text-muted-foreground hover:text-foreground"
                  aria-label="تعديل"
                >
                  <EditIcon />
                </button>
              )}
            </div>
            {timestamp && (
              <p className="mt-1.5 text-right text-[10px] text-muted-foreground/25 pr-1">{formatTime(timestamp)}</p>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ── Assistant bubble ───────────────────────────────────────────────────────────

function AssistantBubble({
  children,
  timestamp,
  onCopy,
}: {
  children: React.ReactNode;
  timestamp?: string;
  onCopy?: () => void;
}) {
  return (
    <div className="flex gap-3 items-start group">
      <AssistantAvatar />
      <div className="flex-1 min-w-0 relative pt-0.5">
        {onCopy && (
          <button
            onClick={onCopy}
            className="absolute -right-1 top-0 rounded p-1 opacity-0 group-hover:opacity-40 hover:!opacity-90 transition-opacity text-muted-foreground hover:text-foreground"
            aria-label="نسخ"
          >
            <CopyIconSm />
          </button>
        )}
        <div className="text-[0.875rem] text-foreground leading-[1.75] pr-5">
          {children}
        </div>
        {timestamp && (
          <p className="mt-1.5 text-[10px] text-muted-foreground/25">{formatTime(timestamp)}</p>
        )}
      </div>
    </div>
  );
}

// ── Typing indicator ───────────────────────────────────────────────────────────

function TypingBubble() {
  return (
    <div className="flex gap-3 items-start">
      <AssistantAvatar />
      <div className="flex items-center gap-[5px] pt-[10px]">
        {[0, 200, 400].map((delay) => (
          <span
            key={delay}
            className="h-[7px] w-[7px] rounded-full bg-foreground/20 animate-bounce"
            style={{ animationDelay: `${delay}ms`, animationDuration: "1.3s" }}
          />
        ))}
      </div>
    </div>
  );
}

// ── Conversation bubble ────────────────────────────────────────────────────────

function ConversationBubble({ content, timestamp }: { content: string; timestamp?: string }) {
  const handleCopy = () => navigator.clipboard.writeText(content).then(() => toast.success("تم النسخ"));
  return (
    <AssistantBubble timestamp={timestamp} onCopy={handleCopy}>
      <MarkdownRenderer content={content} />
    </AssistantBubble>
  );
}

// ── Error bubble ───────────────────────────────────────────────────────────────

function ErrorBubble({
  message,
  retryable,
  onRetry,
}: {
  message: string;
  retryable?: boolean;
  onRetry?: () => void;
}) {
  return (
    <AssistantBubble>
      <div className="flex flex-col gap-3">
        <div className="flex items-start gap-2.5">
          <div className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-red-500/15 border border-red-500/20">
            <svg width="9" height="9" viewBox="0 0 9 9" fill="none" className="text-red-400">
              <line x1="4.5" y1="1" x2="4.5" y2="5.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              <circle cx="4.5" cy="7.5" r="0.7" fill="currentColor" />
            </svg>
          </div>
          <p className="text-[0.875rem] text-red-400/90 leading-relaxed">{message}</p>
        </div>
        {retryable && onRetry && (
          <button
            onClick={onRetry}
            className="flex items-center gap-1.5 self-start rounded-lg border border-border/50 px-3 py-1.5 text-[11px] font-medium text-muted-foreground/70 hover:text-foreground hover:bg-muted/20 transition-colors"
          >
            <RefreshIcon />
            إعادة المحاولة
          </button>
        )}
      </div>
    </AssistantBubble>
  );
}

// ── Empty state ────────────────────────────────────────────────────────────────

const EXAMPLE_PROMPTS = [
  "ساعدني في بناء تطبيق SaaS لإدارة المشاريع مع الفرق والفواتير",
  "أنشئ بوت تيليغرام لتنبيهات أسعار العملات المشفرة",
  "صمم REST API لسوق إلكتروني مع البائعين والمشترين",
  "ابنِ تطبيق دردشة فوري مع غرف ورسائل مباشرة",
];

function EmptyState({ onPrompt }: { onPrompt: (p: string) => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-7 py-16 px-4 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 border border-primary/20">
        <svg width="24" height="24" viewBox="0 0 16 16" fill="none" className="text-primary">
          <path d="M8 1.5L10 6L14.5 8L10 10L8 14.5L6 10L1.5 8L6 6L8 1.5Z" fill="currentColor" opacity="0.85" />
        </svg>
      </div>
      <div className="max-w-xs">
        <h2 className="text-base font-semibold text-foreground mb-2">ماذا تريد أن تبني؟</h2>
        <p className="text-[0.8rem] text-muted-foreground/60 leading-relaxed">
          صف فكرتك البرمجية وسيقوم المساعد بتحليلها وبناء خطة معمارية شاملة.
        </p>
      </div>
      <div className="grid grid-cols-1 gap-2 w-full max-w-sm">
        {EXAMPLE_PROMPTS.map((p) => (
          <button
            key={p}
            onClick={() => onPrompt(p)}
            className="rounded-xl border border-border/50 bg-muted/15 px-4 py-2.5 text-[0.8rem] text-right text-muted-foreground/70 hover:text-foreground hover:border-primary/30 hover:bg-muted/30 transition-all leading-relaxed"
            dir="rtl"
          >
            {p}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Phase ──────────────────────────────────────────────────────────────────────

type Phase =
  | { kind: "idle" }
  | { kind: "streaming";  userMessage: string; taskId: string }
  | { kind: "executing";  userMessage: string; taskId: string; blueprintContent?: string }
  | { kind: "verifying";  userMessage: string; taskId: string; blueprintContent?: string }
  | { kind: "done";       userMessage: string; result: string; previewUrl?: string; allPassed?: boolean; taskId: string; blueprintContent?: string }
  | { kind: "error";      userMessage: string; message: string; retryable?: boolean; taskId?: string; blueprintContent?: string };

// ── Props ──────────────────────────────────────────────────────────────────────

interface LiveWorkspaceProps {
  conversationId: string;
  messages: AIMessage[];
  onSuccess: (conversationId: string) => void;
  isFirstMessage: boolean;
  isWaitingForRepo?: boolean;
  autoStartMessage?: string | null;
  initialRepoId?: string;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function LiveWorkspace({
  conversationId,
  messages,
  onSuccess,
  isFirstMessage,
  isWaitingForRepo,
  autoStartMessage,
  initialRepoId,
}: LiveWorkspaceProps) {
  const queryClient = useQueryClient();
  const renameMutation = useRenameConversation();

  // ── Repo ─────────────────────────────────────────────────────────────────────
  const [selectedRepoId, setSelectedRepoId] = useState(initialRepoId ?? "");
  const { data: reposData } = useQuery({
    queryKey: ["repositories"],
    queryFn: () => repositoriesApi.list(),
    staleTime: 60_000,
  });
  const repositories = (reposData as Array<{ id: string; full_name: string }> | undefined) ?? [];

  // ── Task store ────────────────────────────────────────────────────────────────
  const { tasks } = useTaskStore();
  const {
    createTask, stageStart, stageComplete, completeTask, failTask,
    startExecution, execPhaseStart, execPhaseComplete, execPhaseFail,
    setVerifyCheck, setVerifyFixing, setVerified, setHealthReport, setExecError,
    retryExecution,
  } = useTaskActions();

  // ── UI state ──────────────────────────────────────────────────────────────────
  const [phase, setPhase] = useState<Phase>({ kind: "idle" });
  const [streamingContent, setStreamingContent] = useState("");
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [execActive, setExecActive] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  // ── Refs ──────────────────────────────────────────────────────────────────────
  const abortRef = useRef<AbortController | null>(null);
  const execAbortRef = useRef<AbortController | null>(null);
  const feedEndRef = useRef<HTMLDivElement>(null);
  const feedRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const userScrolledRef = useRef(false);
  const wasFirstRef = useRef(isFirstMessage);
  const plannerStartRef = useRef(0);
  const blueprintRef = useRef("");
  const taskIdRef = useRef("");
  const handleSendRef = useRef<(override?: string) => void>(() => {});
  const priorMessageCountRef = useRef(messages.length);

  // ── Auto-scroll ───────────────────────────────────────────────────────────────
  const scrollToBottom = useCallback((force = false) => {
    if (!force && userScrolledRef.current) return;
    feedEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => { scrollToBottom(); }, [phase, streamingContent, scrollToBottom]);

  const handleFeedScroll = useCallback(() => {
    const el = feedRef.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    userScrolledRef.current = !atBottom;
  }, []);

  // ── Textarea auto-resize ──────────────────────────────────────────────────────
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 180)}px`;
  }, [input]);

  // ── Preview URL tracking ──────────────────────────────────────────────────────
  useEffect(() => {
    if (phase.kind === "done" && phase.previewUrl) {
      setPreviewUrl(phase.previewUrl);
      setShowPreview(true);
    }
  }, [phase]);

  // ── Execution pipeline ────────────────────────────────────────────────────────

  const runExecution = useCallback(async (taskId: string, blueprint: string, convId: string) => {
    setExecActive(true);
    const controller = new AbortController();
    execAbortRef.current = controller;
    startExecution(taskId, DEFAULT_EXEC_PHASES.map((p) => ({ ...p })));

    const handleExecEvent = (event: ExecutionStreamEvent) => {
      switch (event.type) {
        case "exec_stage_start":
          execPhaseStart(taskId, event.stage);
          setPhase((prev) => {
            if (prev.kind === "executing" || prev.kind === "verifying") {
              return { ...prev, kind: event.stage >= 10 ? "verifying" : "executing" };
            }
            return prev;
          });
          break;

        case "exec_stage_complete":
          execPhaseComplete(taskId, event.stage, event.duration ?? 0);
          break;

        case "exec_stage_fail":
          execPhaseFail(taskId, event.stage, event.error ?? "Stage failed");
          break;

        case "verify_check":
          setVerifyCheck(taskId, {
            id: event.check ?? "",
            name: event.checkName ?? "",
            domain: event.checkDomain,
            status: ({ checking: "checking", pass: "pass", fail: "fail", skip: "skip", fixing: "fixing", fixed: "fixed" } as Record<string, VerificationCheck["status"]>)[event.status ?? "checking"] ?? "checking",
            detail: event.detail,
          });
          setPhase((prev) =>
            prev.kind === "executing" ? { ...prev, kind: "verifying" } : prev
          );
          break;

        case "fix_attempt":
          setVerifyFixing(taskId, event.check ?? "", event.strategy ?? "");
          break;

        case "fix_result":
          setVerifyCheck(taskId, {
            id: event.check ?? "",
            name: "",
            status: event.status === "fixed" ? "fixed" : "fail",
            detail: event.strategy,
          });
          break;

        case "health_report":
          if (event.healthReport) setHealthReport(taskId, event.healthReport);
          break;

        case "production_gate":
          break;

        case "exec_done": {
          const checks: VerificationCheck[] = (event.checks ?? []).map((c) => ({
            id: c.id, name: c.name, domain: c.domain,
            status: (c.status === "pass" ? "pass" : c.status === "skip" ? "skip" : "fail") as VerificationCheck["status"],
            detail: c.detail, duration: c.duration,
          }));
          const url = event.previewUrl;
          if (url) setPreviewUrl(url);

          setVerified(taskId, {
            phases: DEFAULT_EXEC_PHASES.map((p) => ({ ...p, status: "complete" })),
            checks,
            healthReport: event.healthReport ?? undefined,
            allPassed: event.allPassed ?? false,
            completedAt: new Date().toISOString(),
          }, url, event.productionGate);

          setExecActive(false);
          setPhase((prev) => ({
            kind: "done",
            userMessage: (prev as { userMessage?: string }).userMessage ?? "",
            result: blueprintRef.current,
            previewUrl: url,
            allPassed: event.allPassed ?? false,
            taskId,
            blueprintContent: blueprintRef.current,
          }));
          break;
        }

        case "exec_error":
          setExecError(taskId, event.message ?? "Execution error");
          setExecActive(false);
          setPhase((prev) => ({
            kind: "error",
            userMessage: (prev as { userMessage?: string }).userMessage ?? "",
            message: event.message ?? "Execution failed",
            retryable: event.retryable ?? true,
            taskId,
            blueprintContent: blueprintRef.current,
          }));
          break;
      }
    };

    try {
      await streamToExecutionEngine(convId, blueprint, handleExecEvent, controller.signal);
    } catch (err) {
      if (controller.signal.aborted) return;
      const msg = err instanceof Error ? err.message : "Execution failed";
      setExecError(taskId, msg);
      setExecActive(false);
    }
  }, [
    startExecution, execPhaseStart, execPhaseComplete, execPhaseFail,
    setVerifyCheck, setVerifyFixing, setVerified, setHealthReport, setExecError,
  ]);

  // ── Retry execution ───────────────────────────────────────────────────────────

  const handleRetry = useCallback((taskId: string, blueprint: string) => {
    retryExecution(taskId);
    setPhase((prev) => ({
      kind: "executing",
      userMessage: (prev as { userMessage?: string }).userMessage ?? "",
      taskId,
      blueprintContent: blueprint,
    }));
    void runExecution(taskId, blueprint, conversationId);
  }, [retryExecution, runExecution, conversationId]);

  // ── Stop ──────────────────────────────────────────────────────────────────────

  const handleStop = useCallback(() => {
    abortRef.current?.abort();
    execAbortRef.current?.abort();
    setIsStreaming(false);
    setExecActive(false);
    setStreamingContent("");
    setPhase({ kind: "idle" });
    toast.info("توقف التوليد");
  }, []);

  // ── Send ──────────────────────────────────────────────────────────────────────

  const handleSend = useCallback(async (overrideContent?: string) => {
    const content = overrideContent !== undefined ? overrideContent : input.trim();
    if (!content || isStreaming) return;

    setInput("");
    setIsStreaming(true);
    setStreamingContent("");
    userScrolledRef.current = false;
    wasFirstRef.current = isFirstMessage;
    priorMessageCountRef.current = messages.length;
    plannerStartRef.current = Date.now();
    blueprintRef.current = "";

    abortRef.current?.abort();
    execAbortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    const taskId = `${conversationId}-${Date.now()}`;
    taskIdRef.current = taskId;
    const taskTitle = content.length > 50 ? content.slice(0, 50) + "…" : content;

    createTask({
      id: taskId,
      conversationId,
      title: taskTitle,
      userPrompt: content,
      stages: PLANNER_STAGES.map((s) => ({ id: s.id, name: s.name, action: s.action, status: "pending" as const })),
      startedAt: new Date().toISOString(),
    });

    setPhase({ kind: "streaming", userMessage: content, taskId });

    let capturedBlueprint = "";

    const handleEvent = (event: PlannerStreamEvent) => {
      switch (event.type) {
        case "thinking_start":
        case "thinking_chunk":
        case "thinking_complete":
        case "model_switch":
        case "provider_status":
          // Internal — not displayed
          break;

        case "stage_start":
          stageStart(taskId, event.stage);
          break;

        case "stage_complete":
          stageComplete(taskId, event.stage);
          break;

        case "content_chunk":
          setStreamingContent((prev) => prev + event.text);
          break;

        case "section_detected":
          break;

        case "done": {
          capturedBlueprint = event.content;
          blueprintRef.current = event.content;
          completeTask(taskId, event.content, event.model);
          setStreamingContent("");
          setIsStreaming(false);
          setPhase({ kind: "executing", userMessage: content, taskId, blueprintContent: event.content });

          queryClient.invalidateQueries({ queryKey: getGetConversationQueryKey(conversationId) });
          queryClient.invalidateQueries({ queryKey: getListConversationsQueryKey() });
          onSuccess(conversationId);

          if (wasFirstRef.current) {
            renameMutation.mutate(
              { conversationId, data: { title: autoTitle(content) } },
              { onSuccess: () => queryClient.invalidateQueries({ queryKey: getListConversationsQueryKey() }) }
            );
          }

          void runExecution(taskId, capturedBlueprint, conversationId);
          break;
        }

        case "conversation": {
          setStreamingContent("");
          setIsStreaming(false);
          setPhase({ kind: "done", userMessage: content, result: event.content, taskId });

          queryClient.invalidateQueries({ queryKey: getGetConversationQueryKey(conversationId) });
          queryClient.invalidateQueries({ queryKey: getListConversationsQueryKey() });
          onSuccess(conversationId);

          if (wasFirstRef.current) {
            renameMutation.mutate(
              { conversationId, data: { title: autoTitle(content) } },
              { onSuccess: () => queryClient.invalidateQueries({ queryKey: getListConversationsQueryKey() }) }
            );
          }
          break;
        }

        case "error":
          failTask(taskId, event.message);
          setStreamingContent("");
          setIsStreaming(false);
          setPhase({ kind: "error", userMessage: content, message: event.message, taskId });
          break;
      }
    };

    try {
      await streamToPlannerEngine(content, conversationId, handleEvent, controller.signal, selectedRepoId || undefined);
    } catch (err) {
      if (controller.signal.aborted) return;
      const msg = err instanceof Error ? err.message : "Connection failed";
      failTask(taskId, msg);
      setStreamingContent("");
      setPhase({ kind: "error", userMessage: content, message: msg, taskId });
      toast.error(msg);
    } finally {
      if (!controller.signal.aborted) setIsStreaming(false);
    }
  }, [
    input, isStreaming, conversationId, isFirstMessage, messages.length, selectedRepoId,
    queryClient, renameMutation, onSuccess,
    createTask, stageStart, stageComplete, completeTask, failTask,
    runExecution,
  ]);

  useEffect(() => { handleSendRef.current = handleSend; }, [handleSend]);

  // ── Auto-start ────────────────────────────────────────────────────────────────
  const autoStartSentRef = useRef(false);
  useEffect(() => {
    if (!autoStartMessage || autoStartSentRef.current) return;
    autoStartSentRef.current = true;
    const timer = setTimeout(() => {
      if (!isStreaming && messages.length === 0) {
        void handleSendRef.current(autoStartMessage);
      }
    }, 600);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoStartMessage]);

  const isBusy = isStreaming || execActive;

  // ── Render history ────────────────────────────────────────────────────────────

  const renderHistory = () => {
    const limit = phase.kind === "idle" ? messages.length : priorMessageCountRef.current;
    const visible = messages.slice(0, limit);
    if (visible.length === 0) return null;

    return visible.map((msg, idx) => {
      if (msg.role === "user") {
        const isLastUser = visible.slice(idx + 1).every((m) => m.role !== "user");
        return (
          <UserBubble
            key={msg.id}
            content={msg.content}
            timestamp={msg.created_at}
            onEdit={isLastUser && phase.kind === "idle" ? (v) => void handleSend(v) : undefined}
          />
        );
      }
      if (msg.role === "assistant") {
        return <ConversationBubble key={msg.id} content={msg.content} timestamp={msg.created_at} />;
      }
      return null;
    });
  };

  // ── Render phase ──────────────────────────────────────────────────────────────

  const renderPhase = () => {
    switch (phase.kind) {
      case "streaming":
        return (
          <>
            <UserBubble content={phase.userMessage} />
            {streamingContent ? (
              <AssistantBubble>
                <MarkdownRenderer content={streamingContent} />
                <span className="inline-block w-[2px] h-[1em] bg-foreground/35 ml-0.5 animate-pulse align-text-bottom rounded-sm" />
              </AssistantBubble>
            ) : (
              <TypingBubble />
            )}
          </>
        );

      case "executing":
      case "verifying": {
        const task = tasks.find((t) => t.id === phase.taskId);
        return (
          <>
            <UserBubble content={phase.userMessage} />
            {task?.result && <ConversationBubble content={task.result.content} />}
            <TypingBubble />
          </>
        );
      }

      case "done": {
        const task = tasks.find((t) => t.id === phase.taskId);
        const blueprint = phase.blueprintContent || task?.result?.content || phase.result || "";
        return (
          <>
            <UserBubble content={phase.userMessage} />
            <ConversationBubble content={phase.result || task?.result?.content || ""} />
            {phase.previewUrl && (
              <AssistantBubble>
                <p className="text-[0.875rem] text-muted-foreground/80 leading-relaxed">
                  المشروع جاهز.{" "}
                  <a href={phase.previewUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:text-primary/75 underline underline-offset-[3px] transition-colors">
                    افتح المعاينة ↗
                  </a>
                </p>
              </AssistantBubble>
            )}
            {phase.allPassed === false && (
              <ErrorBubble
                message="اكتملت العملية مع بعض التنبيهات."
                retryable
                onRetry={() => handleRetry(phase.taskId, blueprint)}
              />
            )}
          </>
        );
      }

      case "error":
        return (
          <>
            <UserBubble content={phase.userMessage} />
            <ErrorBubble
              message={phase.message}
              retryable={phase.retryable}
              onRetry={phase.taskId ? () => handleRetry(phase.taskId!, phase.blueprintContent || blueprintRef.current) : undefined}
            />
          </>
        );

      case "idle":
      default:
        return null;
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className="flex h-full overflow-hidden bg-background">

      {/* ── Chat column ──────────────────────────────────────────────────────── */}
      <div className="flex flex-1 min-w-0 flex-col overflow-hidden">

        {/* Feed */}
        <div
          ref={feedRef}
          onScroll={handleFeedScroll}
          className="flex-1 overflow-y-auto scroll-smooth"
        >
          <div className="mx-auto max-w-2xl px-4 py-8 flex flex-col gap-7">

            {/* History */}
            {renderHistory()}

            {/* Active phase */}
            {renderPhase()}

            {/* Empty / waiting states */}
            {messages.length === 0 && phase.kind === "idle" && (
              isWaitingForRepo ? (
                <div className="flex flex-col items-center justify-center gap-5 py-16 px-4 text-center">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 border border-primary/20">
                    <svg className="text-primary animate-spin" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                    </svg>
                  </div>
                  <div className="max-w-xs">
                    <h2 className="text-base font-semibold text-foreground mb-2">جاري تحليل المستودع…</h2>
                    <p className="text-[0.8rem] text-muted-foreground/60 leading-relaxed">
                      يتم استنساخ المشروع وفهم بنيته. قد يستغرق ذلك 30–60 ثانية.
                    </p>
                  </div>
                </div>
              ) : (
                <EmptyState onPrompt={(p) => { setInput(p); textareaRef.current?.focus(); }} />
              )
            )}

            <div ref={feedEndRef} className="h-2" />
          </div>
        </div>

        {/* Input area */}
        <div
          className="flex-shrink-0 px-4 pt-3 pb-4 border-t border-border/25 bg-background/60 backdrop-blur-sm"
          style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom, 1rem))" }}
        >
          <div className="mx-auto max-w-2xl">

            {/* Repository selector */}
            {repositories.length > 0 && (
              <div className="mb-2.5 flex items-center gap-2">
                <svg width="11" height="11" viewBox="0 0 11 11" fill="none" stroke="currentColor" strokeWidth="1.4" className="text-muted-foreground/50 flex-shrink-0">
                  <rect x="1" y="1" width="9" height="9" rx="1" />
                  <path d="M3.5 1v9M7.5 1v9M1 4h9M1 7.5h9" />
                </svg>
                <select
                  value={selectedRepoId}
                  onChange={(e) => setSelectedRepoId(e.target.value)}
                  disabled={isBusy}
                  className="flex-1 rounded-lg border border-border/50 bg-muted/20 px-2.5 py-1 text-[11px] text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/30 disabled:opacity-50 transition-colors"
                >
                  <option value="">بدون سياق مستودع</option>
                  {repositories.map((r) => (
                    <option key={r.id} value={r.id}>{r.full_name}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Input box */}
            <div className="relative flex items-end gap-2 rounded-2xl border border-border/60 bg-card/80 shadow-sm focus-within:border-primary/40 focus-within:ring-2 focus-within:ring-primary/10 transition-all duration-150">
              <Textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void handleSend(); }
                }}
                placeholder={isBusy ? "يعمل المساعد…" : "اكتب رسالتك…"}
                className="min-h-[50px] max-h-[200px] flex-1 resize-none border-0 bg-transparent px-4 py-3.5 text-[0.875rem] shadow-none focus-visible:ring-0 placeholder:text-muted-foreground/35 leading-relaxed"
                rows={1}
                disabled={isBusy}
                dir="auto"
              />
              <div className="mb-2.5 mr-2.5 flex flex-shrink-0 items-center gap-1.5">
                {isBusy && (
                  <button
                    onClick={handleStop}
                    className="flex h-8 w-8 items-center justify-center rounded-xl border border-border/60 bg-muted/50 text-muted-foreground hover:text-foreground hover:border-destructive/40 hover:bg-destructive/10 transition-colors"
                    aria-label="إيقاف"
                  >
                    <StopIcon />
                  </button>
                )}
                <button
                  onClick={() => void handleSend()}
                  disabled={!input.trim() || isBusy}
                  className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  aria-label="إرسال"
                >
                  <SendIcon />
                </button>
              </div>
            </div>

            {/* Hint + preview toggle */}
            <div className="mt-1.5 flex items-center justify-between px-0.5">
              <p className="text-[10px] text-muted-foreground/20 hidden sm:block select-none">
                Enter للإرسال · Shift+Enter لسطر جديد
              </p>
              {previewUrl && (
                <button
                  onClick={() => setShowPreview((p) => !p)}
                  className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-[10px] transition-colors ml-auto ${showPreview ? "text-primary bg-primary/10 border border-primary/20" : "text-muted-foreground/40 hover:text-foreground hover:bg-muted/30"}`}
                >
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.3">
                    <rect x="1" y="1.5" width="8" height="7" rx="1" />
                    <line x1="1" y1="3.5" x2="9" y2="3.5" />
                  </svg>
                  معاينة
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Preview panel ─────────────────────────────────────────────────────── */}
      {showPreview && previewUrl && (
        <div className="flex-shrink-0 w-[420px] border-l border-border/40 bg-card/20 flex flex-col overflow-hidden">
          <div className="flex-shrink-0 border-b border-border/30 px-3.5 py-2.5 flex items-center gap-2.5">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/40">معاينة</span>
            <a href={previewUrl} target="_blank" rel="noopener noreferrer" className="ml-auto text-[10px] text-primary/50 hover:text-primary transition-colors">فتح ↗</a>
            <button onClick={() => setShowPreview(false)} className="text-muted-foreground/30 hover:text-foreground transition-colors" aria-label="إغلاق">
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                <line x1="1" y1="1" x2="9" y2="9" /><line x1="9" y1="1" x2="1" y2="9" />
              </svg>
            </button>
          </div>
          <div className="flex-1 overflow-hidden bg-white">
            <iframe
              src={previewUrl}
              className="w-full h-full border-0"
              title="معاينة المشروع"
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
            />
          </div>
        </div>
      )}
    </div>
  );
}
