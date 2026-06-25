/**
 * ChatWorkspace — outer shell: sidebar + PlannerWorkspace.
 * Manages conversation lifecycle; delegates all AI interaction to PlannerWorkspace.
 */
import { useState, useRef, useEffect, useCallback } from "react";
import {
  useListConversations,
  useCreateConversation,
  useGetConversation,
  useRenameConversation,
  useDeleteConversation,
  getListConversationsQueryKey,
  getGetConversationQueryKey,
} from "@workspace/api-client-react";
import type { AIConversation } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PlannerWorkspace } from "@/components/PlannerWorkspace";
import { AIPulse } from "@/components/design-system/AIPulse";
import { NeuralGrid } from "@/components/design-system/NeuralGrid";

// ── Conversation sidebar item ──────────────────────────────────────────────────

interface ConversationItemProps {
  conv: AIConversation;
  isActive: boolean;
  onSelect: () => void;
  onRename: (title: string) => void;
  onDelete: () => void;
}

function ConversationItem({ conv, isActive, onSelect, onRename, onDelete }: ConversationItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(conv.title ?? "New conversation");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (isEditing) inputRef.current?.focus(); }, [isEditing]);

  const submitRename = () => {
    const trimmed = editValue.trim();
    if (trimmed && trimmed !== conv.title) onRename(trimmed);
    setIsEditing(false);
  };

  if (confirmDelete) {
    return (
      <div className="mx-2 mb-1 rounded-lg border border-destructive/30 bg-destructive/10 p-3">
        <p className="mb-2 text-xs text-foreground">Delete this conversation?</p>
        <div className="flex gap-1">
          <Button size="sm" variant="destructive" className="h-7 flex-1 text-xs" onClick={onDelete}>Delete</Button>
          <Button size="sm" variant="ghost" className="h-7 flex-1 text-xs" onClick={() => setConfirmDelete(false)}>Cancel</Button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={[
        "group mx-2 mb-0.5 flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2.5 text-sm transition-colors min-h-[2.5rem]",
        isActive ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground",
      ].join(" ")}
      onClick={!isEditing ? onSelect : undefined}
    >
      <div className="flex-shrink-0">
        {isActive
          ? <AIPulse size={14} color="#6366f1" active />
          : <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground/30" />
        }
      </div>

      {isEditing ? (
        <div className="flex flex-1 items-center gap-1" onClick={(e) => e.stopPropagation()}>
          <Input
            ref={inputRef}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") submitRename(); if (e.key === "Escape") setIsEditing(false); }}
            className="h-6 flex-1 border-primary/40 bg-background px-1.5 text-xs text-foreground"
          />
          <button onClick={submitRename} className="text-primary hover:opacity-80 p-1" aria-label="Save">
            <svg width="11" height="11" viewBox="0 0 11 11" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="1,5.5 4,8.5 10,2.5" /></svg>
          </button>
          <button onClick={() => setIsEditing(false)} className="text-muted-foreground hover:opacity-80 p-1" aria-label="Cancel">
            <svg width="11" height="11" viewBox="0 0 11 11" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><line x1="1" y1="1" x2="10" y2="10" /><line x1="10" y1="1" x2="1" y2="10" /></svg>
          </button>
        </div>
      ) : (
        <>
          <span className="min-w-0 flex-1 truncate text-sm">{conv.title ?? "New conversation"}</span>
          <div className="flex flex-shrink-0 gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={(e) => { e.stopPropagation(); setEditValue(conv.title ?? ""); setIsEditing(true); }}
              className="rounded p-1 hover:bg-background/50"
              aria-label="Rename"
            >
              <svg width="11" height="11" viewBox="0 0 11 11" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M7.5 1.5l2 2-6 6H1.5v-2l6-6z" /></svg>
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); setConfirmDelete(true); }}
              className="rounded p-1 hover:bg-destructive/20 hover:text-destructive"
              aria-label="Delete"
            >
              <svg width="11" height="11" viewBox="0 0 11 11" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M1.5 3h8M4 3V2h3v1M2.5 3l.5 6h5l.5-6" /></svg>
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// ── No conversation selected ───────────────────────────────────────────────────

function NoConversationState({ onCreate, isCreating }: { onCreate: () => void; isCreating: boolean }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-6 p-8 text-center">
      <NeuralGrid width={120} height={80} color="#6366f1" active />
      <div className="max-w-xs">
        <h2 className="text-base font-semibold text-foreground mb-1">AI Agent Planner</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Describe the software you want to build. The AI Agent will design a complete architecture blueprint across 8 real execution stages.
        </p>
      </div>
      <Button onClick={onCreate} disabled={isCreating} size="sm" className="gap-2">
        {isCreating
          ? <AIPulse size={14} color="white" active />
          : <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><line x1="6.5" y1="1" x2="6.5" y2="12" /><line x1="1" y1="6.5" x2="12" y2="6.5" /></svg>
        }
        New Plan
      </Button>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function ChatWorkspace() {
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isFirstMessage, setIsFirstMessage] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth >= 768 : true
  );

  const { data: convList, isLoading: listLoading } = useListConversations();
  const { data: activeConv, isLoading: convLoading } = useGetConversation(selectedId!, {
    query: { enabled: !!selectedId, queryKey: getGetConversationQueryKey(selectedId ?? "") },
  });

  const createMutation = useCreateConversation();
  const renameMutation = useRenameConversation();
  const deleteMutation = useDeleteConversation();

  const handleNewChat = () => {
    createMutation.mutate(
      { data: { title: "New conversation" } },
      {
        onSuccess: (conv) => {
          queryClient.invalidateQueries({ queryKey: getListConversationsQueryKey() });
          setSelectedId(conv.id);
          setIsFirstMessage(true);
          if (window.innerWidth < 768) setSidebarOpen(false);
        },
        onError: () => toast.error("Failed to create conversation"),
      }
    );
  };

  const handleSelect = (id: string) => {
    setSelectedId(id);
    setIsFirstMessage(false);
    if (window.innerWidth < 768) setSidebarOpen(false);
  };

  const handleRename = (conversationId: string, title: string) => {
    renameMutation.mutate(
      { conversationId, data: { title } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListConversationsQueryKey() });
          if (selectedId === conversationId) queryClient.invalidateQueries({ queryKey: getGetConversationQueryKey(conversationId) });
        },
        onError: () => toast.error("Failed to rename"),
      }
    );
  };

  const handleDelete = (conversationId: string) => {
    deleteMutation.mutate(
      { conversationId },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListConversationsQueryKey() });
          if (selectedId === conversationId) setSelectedId(null);
        },
        onError: () => toast.error("Failed to delete"),
      }
    );
  };

  const handleWorkspaceSuccess = useCallback((_conversationId: string) => {
    queryClient.invalidateQueries({ queryKey: getListConversationsQueryKey() });
  }, [queryClient]);

  const conversations = convList?.items ?? [];
  const messages = activeConv?.messages ?? [];

  return (
    <div className="relative flex h-full w-full overflow-hidden">

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="absolute inset-0 z-20 bg-black/50 md:hidden" onClick={() => setSidebarOpen(false)} aria-hidden="true" />
      )}

      {/* ── Sidebar ──────────────────────────────────────────────────────── */}
      <aside
        className={[
          "flex flex-col border-r border-border bg-card",
          "absolute inset-y-0 left-0 z-30 w-72 transition-transform duration-200 ease-in-out",
          sidebarOpen ? "translate-x-0" : "-translate-x-full",
          "md:relative md:z-auto md:translate-x-0 md:transition-all md:duration-200",
          sidebarOpen ? "md:w-64 md:min-w-[16rem]" : "md:w-0 md:min-w-0 md:overflow-hidden md:border-0",
        ].join(" ")}
        aria-label="Conversations"
      >
        {/* Header */}
        <div className="flex-shrink-0 border-b border-border p-3">
          <div className="flex items-center gap-2 mb-3 px-1">
            <AIPulse size={20} color="#6366f1" active />
            <span className="text-sm font-semibold text-foreground">AI Agent</span>
          </div>
          <Button onClick={handleNewChat} disabled={createMutation.isPending} className="w-full gap-2" size="sm">
            {createMutation.isPending
              ? <AIPulse size={14} color="white" active />
              : <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><line x1="6.5" y1="1" x2="6.5" y2="12" /><line x1="1" y1="6.5" x2="12" y2="6.5" /></svg>
            }
            New Plan
          </Button>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto py-2">
          {listLoading ? (
            <div className="flex justify-center py-8"><AIPulse size={24} color="#6366f1" active /></div>
          ) : conversations.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <p className="text-xs text-muted-foreground">No plans yet</p>
              <p className="text-xs text-muted-foreground/60 mt-1">Click "New Plan" to start</p>
            </div>
          ) : (
            conversations.map((conv) => (
              <ConversationItem
                key={conv.id}
                conv={conv}
                isActive={conv.id === selectedId}
                onSelect={() => handleSelect(conv.id)}
                onRename={(title) => handleRename(conv.id, title)}
                onDelete={() => handleDelete(conv.id)}
              />
            ))
          )}
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 border-t border-border/50 p-3">
          <p className="text-[10px] text-muted-foreground/40 text-center">Planner · Architecture Engine</p>
        </div>
      </aside>

      {/* ── Main content ─────────────────────────────────────────────────── */}
      <div className="flex flex-1 flex-col overflow-hidden min-w-0">
        {/* Top bar */}
        <div className="flex flex-shrink-0 items-center gap-3 border-b border-border px-3 py-2.5 bg-card/50 sm:px-4">
          <button
            className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors flex-shrink-0"
            onClick={() => setSidebarOpen((o) => !o)}
            aria-label={sidebarOpen ? "Close sidebar" : "Open sidebar"}
          >
            {sidebarOpen
              ? <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><polyline points="9,1 3,7 9,13" /></svg>
              : <svg width="16" height="14" viewBox="0 0 16 14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><line x1="1" y1="2" x2="15" y2="2" /><line x1="1" y1="7" x2="15" y2="7" /><line x1="1" y1="12" x2="15" y2="12" /></svg>
            }
          </button>
          <h1 className="truncate text-sm font-medium text-foreground">
            {selectedId && activeConv ? (activeConv.title ?? "New conversation") : "AI Agent Planner"}
          </h1>
        </div>

        {/* Workspace */}
        <div className="flex-1 overflow-hidden min-h-0">
          {!selectedId ? (
            <NoConversationState onCreate={handleNewChat} isCreating={createMutation.isPending} />
          ) : convLoading ? (
            <div className="flex h-full items-center justify-center"><AIPulse size={32} color="#6366f1" active /></div>
          ) : (
            <PlannerWorkspace
              key={selectedId}
              conversationId={selectedId}
              messages={messages}
              isFirstMessage={isFirstMessage}
              onSuccess={handleWorkspaceSuccess}
            />
          )}
        </div>
      </div>
    </div>
  );
}
