/**
 * GeneratedFilesPanel — full-featured file browser for generated project files.
 *
 * Features:
 *  - Live folder tree (expand/collapse) from /tmp/projects/<conversationId>
 *  - Search / filter by filename
 *  - File preview with copy-to-clipboard
 *  - Rename files inline
 *  - Delete files (with confirm)
 *  - Download individual file
 *  - Download all as ZIP (via jszip)
 */
import { useState, useEffect, useCallback, useRef } from "react";
import JSZip from "jszip";

interface RemoteFile {
  path: string;
  content: string;
  size: number;
  extension: string;
}

interface GeneratedFilesPanelProps {
  conversationId: string;
  onClose?: () => void;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function extIcon(ext: string): string {
  const m: Record<string, string> = {
    ts: "TS", tsx: "⚛", js: "JS", jsx: "⚛",
    css: "CS", scss: "CS", html: "HT", json: "{}",
    md: "MD", sql: "DB", py: "PY", go: "GO",
    rs: "RS", env: "EN", sh: "SH", yml: "YM", yaml: "YM",
    txt: "TX", png: "IM", svg: "SV", toml: "TM",
  };
  return m[ext?.toLowerCase()] ?? "FI";
}

function extColor(ext: string): string {
  const m: Record<string, string> = {
    ts: "bg-sky-500/20 text-sky-400",
    tsx: "bg-violet-500/20 text-violet-400",
    js: "bg-yellow-500/20 text-yellow-400",
    jsx: "bg-yellow-500/20 text-yellow-400",
    css: "bg-pink-500/20 text-pink-400",
    scss: "bg-pink-500/20 text-pink-400",
    html: "bg-orange-500/20 text-orange-400",
    json: "bg-amber-500/20 text-amber-400",
    sql: "bg-blue-500/20 text-blue-400",
    py: "bg-green-500/20 text-green-400",
    go: "bg-cyan-500/20 text-cyan-400",
    md: "bg-zinc-500/20 text-zinc-400",
    sh: "bg-emerald-500/20 text-emerald-400",
    env: "bg-orange-500/20 text-orange-400",
    yml: "bg-purple-500/20 text-purple-400",
    yaml: "bg-purple-500/20 text-purple-400",
    toml: "bg-red-500/20 text-red-400",
  };
  return m[ext?.toLowerCase()] ?? "bg-zinc-600/20 text-zinc-400";
}

function humanSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

function downloadBlob(content: string, filename: string) {
  const blob = new Blob([content], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function authHeaders(): Record<string, string> {
  const tok = localStorage.getItem("access_token");
  return tok ? { Authorization: `Bearer ${tok}` } : {};
}

// ── Tree types ──────────────────────────────────────────────────────────────────

interface TreeNode {
  name: string;
  path: string;
  type: "file" | "dir";
  ext?: string;
  size?: number;
  content?: string;
  children?: TreeNode[];
}

function buildTree(files: RemoteFile[]): TreeNode[] {
  const root: TreeNode = { name: "", path: "", type: "dir", children: [] };
  for (const file of files) {
    const parts = file.path.split("/");
    let node = root;
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i]!;
      const isLast = i === parts.length - 1;
      node.children = node.children ?? [];
      if (isLast) {
        node.children.push({
          name: part, path: file.path, type: "file",
          ext: file.extension, size: file.size, content: file.content,
        });
      } else {
        let dir = node.children.find((c) => c.name === part && c.type === "dir");
        if (!dir) {
          dir = { name: part, path: parts.slice(0, i + 1).join("/"), type: "dir", children: [] };
          node.children.push(dir);
        }
        node = dir;
      }
    }
  }
  return sortNodes(root.children ?? []);
}

function sortNodes(nodes: TreeNode[]): TreeNode[] {
  return nodes
    .map((n) => n.type === "dir" ? { ...n, children: sortNodes(n.children ?? []) } : n)
    .sort((a, b) => {
      if (a.type !== b.type) return a.type === "dir" ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
}

function flattenTree(nodes: TreeNode[]): TreeNode[] {
  const result: TreeNode[] = [];
  for (const n of nodes) {
    if (n.type === "file") result.push(n);
    else if (n.children) result.push(...flattenTree(n.children));
  }
  return result;
}

// ── Tree node ──────────────────────────────────────────────────────────────────

function TreeNodeRow({
  node, depth, selected, renamingPath, onSelect, onRenameStart, onDelete,
}: {
  node: TreeNode;
  depth: number;
  selected: string | null;
  renamingPath: string | null;
  onSelect: (n: TreeNode) => void;
  onRenameStart: (n: TreeNode) => void;
  onDelete: (n: TreeNode) => void;
}) {
  const [expanded, setExpanded] = useState(depth < 2);
  const [hovered, setHovered] = useState(false);

  const pl = depth * 12 + 8;

  if (node.type === "dir") {
    return (
      <div>
        <button
          className="flex w-full items-center gap-1.5 rounded px-2 py-[3px] text-left hover:bg-muted/20 transition-colors"
          style={{ paddingLeft: `${pl}px` }}
          onClick={() => setExpanded((v) => !v)}
        >
          <svg width="8" height="8" viewBox="0 0 8 8" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"
            className={`flex-shrink-0 text-muted-foreground/40 transition-transform duration-100 ${expanded ? "rotate-90" : ""}`}>
            <polyline points="2,1 6,4 2,7" />
          </svg>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.2" className="flex-shrink-0 text-yellow-500/60">
            <path d="M1 3a1 1 0 011-1h3l1 1h5a1 1 0 011 1v5a1 1 0 01-1 1H2a1 1 0 01-1-1V3z" fill="currentColor" opacity="0.15" />
            <path d="M1 3a1 1 0 011-1h3l1 1h5a1 1 0 011 1v5a1 1 0 01-1 1H2a1 1 0 01-1-1V3z" />
          </svg>
          <span className="min-w-0 flex-1 truncate text-[11px] font-medium text-foreground/60">{node.name}</span>
          <span className="mr-1 text-[9px] text-muted-foreground/30">{node.children?.length ?? 0}</span>
        </button>
        {expanded && node.children?.map((child) => (
          <TreeNodeRow key={child.path} node={child} depth={depth + 1}
            selected={selected} renamingPath={renamingPath}
            onSelect={onSelect} onRenameStart={onRenameStart} onDelete={onDelete} />
        ))}
      </div>
    );
  }

  const isSelected = selected === node.path;
  const ic = extColor(node.ext ?? "");

  return (
    <div
      className={`group flex w-full items-center gap-1.5 rounded px-2 py-[3px] transition-colors cursor-pointer ${
        isSelected ? "bg-primary/10" : "hover:bg-muted/20"
      }`}
      style={{ paddingLeft: `${pl}px` }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => onSelect(node)}
    >
      <span className={`flex-shrink-0 flex h-4 w-5 items-center justify-center rounded text-[8px] font-bold ${ic}`}>
        {extIcon(node.ext ?? "")}
      </span>
      <span className={`min-w-0 flex-1 truncate text-[11px] font-mono ${isSelected ? "text-primary" : "text-foreground/70"}`}>
        {node.name}
      </span>
      {node.size != null && !hovered && (
        <span className="flex-shrink-0 text-[9px] text-muted-foreground/25">{humanSize(node.size)}</span>
      )}
      {hovered && (
        <div className="flex flex-shrink-0 items-center gap-0.5" onClick={(e) => e.stopPropagation()}>
          <button
            title="Rename"
            className="rounded p-0.5 text-muted-foreground/40 hover:text-foreground hover:bg-muted/30 transition-colors"
            onClick={() => onRenameStart(node)}
          >
            <svg width="9" height="9" viewBox="0 0 9 9" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 1l2 2-5 5H1V6l5-5z" />
            </svg>
          </button>
          <button
            title="Delete"
            className="rounded p-0.5 text-muted-foreground/40 hover:text-red-400 hover:bg-red-500/10 transition-colors"
            onClick={() => onDelete(node)}
          >
            <svg width="9" height="9" viewBox="0 0 9 9" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
              <polyline points="1,2 8,2" />
              <path d="M3 2V1.5a.5.5 0 01.5-.5h2a.5.5 0 01.5.5V2M2 2l.5 6h4L7 2" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}

// ── Rename inline modal ─────────────────────────────────────────────────────────

function RenameModal({
  node,
  onConfirm,
  onCancel,
}: {
  node: TreeNode;
  onConfirm: (newName: string) => void;
  onCancel: () => void;
}) {
  const [value, setValue] = useState(node.name);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.select();
  }, []);

  const commit = () => {
    const trimmed = value.trim();
    if (trimmed && trimmed !== node.name) onConfirm(trimmed);
    else onCancel();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50">
      <div className="w-80 rounded-xl border border-border bg-card p-4 shadow-2xl">
        <p className="mb-3 text-sm font-medium text-foreground">Rename file</p>
        <p className="mb-3 truncate text-[11px] font-mono text-muted-foreground">{node.path}</p>
        <input
          ref={inputRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") commit(); if (e.key === "Escape") onCancel(); }}
          className="w-full rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm font-mono text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
        <div className="mt-3 flex justify-end gap-2">
          <button onClick={onCancel} className="rounded-lg px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors">
            Cancel
          </button>
          <button onClick={commit} className="rounded-lg bg-primary px-3 py-1.5 text-xs text-primary-foreground hover:bg-primary/90 transition-colors">
            Rename
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Delete confirm modal ────────────────────────────────────────────────────────

function DeleteModal({
  node,
  onConfirm,
  onCancel,
}: {
  node: TreeNode;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50">
      <div className="w-80 rounded-xl border border-border bg-card p-4 shadow-2xl">
        <p className="mb-2 text-sm font-medium text-foreground">Delete file?</p>
        <p className="mb-4 truncate text-[11px] font-mono text-muted-foreground">{node.path}</p>
        <div className="flex justify-end gap-2">
          <button onClick={onCancel} className="rounded-lg px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors">
            Cancel
          </button>
          <button onClick={onConfirm} className="rounded-lg bg-red-500/90 px-3 py-1.5 text-xs text-white hover:bg-red-500 transition-colors">
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main panel ─────────────────────────────────────────────────────────────────

export function GeneratedFilesPanel({ conversationId, onClose }: GeneratedFilesPanelProps) {
  const [files, setFiles] = useState<RemoteFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<TreeNode | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<"tree" | "preview">("tree");
  const [copied, setCopied] = useState(false);
  const [renamingNode, setRenamingNode] = useState<TreeNode | null>(null);
  const [deletingNode, setDeletingNode] = useState<TreeNode | null>(null);

  const fetchFiles = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/v1/ai/projects/${conversationId}/files/download`, {
        headers: authHeaders(),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: "Failed to load" })) as { error?: string };
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }
      const data = await res.json() as { files?: RemoteFile[] };
      setFiles(data.files ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load files");
    } finally {
      setLoading(false);
    }
  }, [conversationId]);

  useEffect(() => { void fetchFiles(); }, [fetchFiles]);

  const handleDownloadAll = async () => {
    if (files.length === 0) return;
    setDownloading(true);
    try {
      const zip = new JSZip();
      for (const file of files) zip.file(file.path, file.content);
      const blob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `project-${conversationId.slice(0, 8)}.zip`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setDownloading(false);
    }
  };

  const handleCopyContent = async () => {
    if (!selected?.content) return;
    await navigator.clipboard.writeText(selected.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRenameConfirm = async (newName: string) => {
    if (!renamingNode) return;
    const dirPart = renamingNode.path.includes("/")
      ? renamingNode.path.slice(0, renamingNode.path.lastIndexOf("/") + 1)
      : "";
    const newPath = dirPart + newName;
    try {
      const res = await fetch(`/api/v1/ai/projects/${conversationId}/files/rename`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ oldPath: renamingNode.path, newPath }),
      });
      if (!res.ok) throw new Error("Rename failed");
      setRenamingNode(null);
      if (selected?.path === renamingNode.path) setSelected(null);
      await fetchFiles();
    } catch {
      setRenamingNode(null);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deletingNode) return;
    try {
      const res = await fetch(`/api/v1/ai/projects/${conversationId}/files`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ path: deletingNode.path }),
      });
      if (!res.ok) throw new Error("Delete failed");
      setDeletingNode(null);
      if (selected?.path === deletingNode.path) setSelected(null);
      await fetchFiles();
    } catch {
      setDeletingNode(null);
    }
  };

  const totalSize = files.reduce((s, f) => s + f.size, 0);
  const tree = buildTree(files);

  const filteredFiles = search.trim()
    ? flattenTree(tree).filter((n) => n.name.toLowerCase().includes(search.toLowerCase()))
    : null;

  const showTree = !filteredFiles;

  return (
    <div className="flex flex-col h-full">
      {/* ── Header ─────────────────────────────────────────────────────────────── */}
      <div className="flex flex-shrink-0 items-center gap-2 border-b border-border px-4 py-3 bg-card/50">
        <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.3" className="text-primary flex-shrink-0">
          <path d="M1 2a1 1 0 011-1h4l1.5 1.5H12a1 1 0 011 1V11a1 1 0 01-1 1H2a1 1 0 01-1-1V2z" />
        </svg>
        <span className="flex-1 text-sm font-semibold text-foreground">Generated Files</span>
        {files.length > 0 && (
          <span className="text-[10px] text-muted-foreground/40">
            {files.length} file{files.length !== 1 ? "s" : ""} · {humanSize(totalSize)}
          </span>
        )}
        <button
          onClick={() => void handleDownloadAll()}
          disabled={files.length === 0 || downloading}
          className="flex items-center gap-1.5 rounded-md border border-border bg-card px-2.5 py-1 text-[11px] text-muted-foreground hover:text-foreground hover:border-primary/30 disabled:opacity-40 transition-colors"
        >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
            <path d="M5 1v6M2 7l3 2 3-2M1 9h8" />
          </svg>
          {downloading ? "Zipping…" : "ZIP"}
        </button>
        <button
          onClick={() => void fetchFiles()}
          disabled={loading}
          title="Refresh"
          className="rounded p-1 text-muted-foreground/50 hover:text-foreground hover:bg-muted/30 transition-colors"
        >
          <svg width="11" height="11" viewBox="0 0 11 11" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
            <path d="M9.5 2A5 5 0 1 0 9.8 6.5" />
            <polyline points="9.5,0 9.5,2.5 7,2.5" />
          </svg>
        </button>
        {onClose && (
          <button onClick={onClose} className="rounded p-1 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
              <line x1="1" y1="1" x2="11" y2="11" /><line x1="11" y1="1" x2="1" y2="11" />
            </svg>
          </button>
        )}
      </div>

      {/* ── Search ──────────────────────────────────────────────────────────────── */}
      {files.length > 0 && (
        <div className="flex-shrink-0 border-b border-border/50 px-3 py-2 bg-card/20">
          <div className="relative">
            <svg width="11" height="11" viewBox="0 0 11 11" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground/40 pointer-events-none">
              <circle cx="4.5" cy="4.5" r="3" />
              <line x1="7" y1="7" x2="9.5" y2="9.5" />
            </svg>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter files…"
              className="w-full rounded-lg border border-border/50 bg-muted/20 py-1.5 pl-7 pr-3 text-[11px] text-foreground placeholder:text-muted-foreground/30 focus:outline-none focus:ring-1 focus:ring-primary/30"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground/40 hover:text-foreground"
              >
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
                  <line x1="1" y1="1" x2="9" y2="9" /><line x1="9" y1="1" x2="1" y2="9" />
                </svg>
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── Tabs ──────────────────────────────────────────────────────────────────  */}
      {selected && !search && (
        <div className="flex flex-shrink-0 border-b border-border bg-card/30 px-4">
          {(["tree", "preview"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`relative px-3 py-2 text-xs font-medium capitalize transition-colors ${
                activeTab === tab ? "text-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab}
              {activeTab === tab && <span className="absolute inset-x-0 bottom-0 h-0.5 bg-primary rounded-t" />}
            </button>
          ))}
        </div>
      )}

      {/* ── Body ─────────────────────────────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden min-h-0">
        {/* Tree / search results */}
        <div className={`overflow-y-auto py-2 ${selected && !search && activeTab === "preview" ? "hidden" : "flex-1"} ${selected && !search && activeTab === "tree" ? "border-r border-border w-56 flex-shrink-0" : ""}`}>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="flex gap-1">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="h-1.5 w-1.5 rounded-full bg-primary/50 animate-bounce" style={{ animationDelay: `${i * 0.1}s` }} />
                ))}
              </div>
            </div>
          ) : error ? (
            <div className="px-4 py-8 text-center">
              <p className="text-xs text-red-400">{error}</p>
              <button onClick={() => void fetchFiles()} className="mt-2 text-xs text-primary hover:underline">Retry</button>
            </div>
          ) : files.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl border border-border bg-muted/20">
                <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="1.2" className="text-muted-foreground/40">
                  <path d="M2 4a2 2 0 012-2h7l3 3h6a2 2 0 012 2v11a2 2 0 01-2 2H4a2 2 0 01-2-2V4z" />
                  <line x1="8" y1="11" x2="14" y2="11" strokeDasharray="2 1.5" />
                </svg>
              </div>
              <p className="text-xs font-medium text-foreground/50">No generated files yet</p>
              <p className="mt-1 text-[10px] text-muted-foreground/40">Files appear here after execution completes</p>
            </div>
          ) : filteredFiles ? (
            <div className="min-w-0 px-2 py-1">
              {filteredFiles.length === 0 ? (
                <p className="px-2 py-4 text-center text-[11px] text-muted-foreground/40">No files match</p>
              ) : (
                filteredFiles.map((node) => (
                  <button
                    key={node.path}
                    onClick={() => { setSelected(node); setSearch(""); setActiveTab("preview"); }}
                    className="flex w-full items-center gap-1.5 rounded px-2 py-1 text-left hover:bg-muted/20 transition-colors"
                  >
                    <span className={`flex-shrink-0 flex h-4 w-5 items-center justify-center rounded text-[8px] font-bold ${extColor(node.ext ?? "")}`}>
                      {extIcon(node.ext ?? "")}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-[11px] font-mono text-foreground/70">{node.path}</span>
                    {node.size != null && <span className="text-[9px] text-muted-foreground/30">{humanSize(node.size)}</span>}
                  </button>
                ))
              )}
            </div>
          ) : showTree ? (
            <div className="min-w-0">
              {tree.map((node) => (
                <TreeNodeRow
                  key={node.path}
                  node={node}
                  depth={0}
                  selected={selected?.path ?? null}
                  renamingPath={renamingNode?.path ?? null}
                  onSelect={(n) => { setSelected(n); setActiveTab("preview"); }}
                  onRenameStart={setRenamingNode}
                  onDelete={setDeletingNode}
                />
              ))}
            </div>
          ) : null}
        </div>

        {/* Preview pane */}
        {selected && (!search) && activeTab === "preview" && (
          <div className="flex flex-1 flex-col overflow-hidden min-w-0">
            <div className="flex flex-shrink-0 items-center gap-2 border-b border-border px-3 py-2 bg-card/30">
              <span className={`flex h-4 w-5 items-center justify-center rounded text-[8px] font-bold flex-shrink-0 ${extColor(selected.ext ?? "")}`}>
                {extIcon(selected.ext ?? "")}
              </span>
              <span className="flex-1 min-w-0 truncate text-[11px] font-mono text-foreground/70">{selected.path}</span>
              {selected.size != null && (
                <span className="text-[10px] text-muted-foreground/40">{humanSize(selected.size)}</span>
              )}
              <button
                onClick={() => void handleCopyContent()}
                className="flex items-center gap-1 rounded px-2 py-0.5 text-[10px] text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                {copied ? (
                  <svg width="9" height="9" viewBox="0 0 9 9" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="1.5,4.5 3.5,7 7.5,2" />
                  </svg>
                ) : (
                  <svg width="9" height="9" viewBox="0 0 9 9" fill="none" stroke="currentColor" strokeWidth="1.3">
                    <rect x="3" y="3" width="5.5" height="5.5" rx="0.8" />
                    <path d="M1.5 6H1a1 1 0 01-1-1V1a1 1 0 011-1h4a1 1 0 011 1v1.5" />
                  </svg>
                )}
                {copied ? "Copied!" : "Copy"}
              </button>
              <button
                onClick={() => { if (selected.content != null) downloadBlob(selected.content, selected.name); }}
                className="flex items-center gap-1 rounded px-2 py-0.5 text-[10px] text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                <svg width="9" height="9" viewBox="0 0 9 9" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
                  <path d="M4.5 1v5M2 6l2.5 2 2.5-2M1 8h7" />
                </svg>
                Save
              </button>
            </div>
            <pre className="flex-1 overflow-auto p-4 text-[11px] font-mono text-zinc-300 leading-relaxed bg-zinc-950/60 whitespace-pre-wrap break-words">
              {selected.content ?? "(empty)"}
            </pre>
          </div>
        )}
      </div>

      {/* ── Rename modal ─────────────────────────────────────────────────────────── */}
      {renamingNode && (
        <RenameModal
          node={renamingNode}
          onConfirm={(newName) => void handleRenameConfirm(newName)}
          onCancel={() => setRenamingNode(null)}
        />
      )}

      {/* ── Delete modal ─────────────────────────────────────────────────────────── */}
      {deletingNode && (
        <DeleteModal
          node={deletingNode}
          onConfirm={() => void handleDeleteConfirm()}
          onCancel={() => setDeletingNode(null)}
        />
      )}
    </div>
  );
}
