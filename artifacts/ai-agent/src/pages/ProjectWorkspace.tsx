import { useGetProject, getGetProjectQueryKey } from "@workspace/api-client-react";
import { useParams, Link } from "wouter";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { Button } from "@/components/ui/button";
import { ChevronLeft, Save, Play, Settings } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function ProjectWorkspace() {
  const { id } = useParams<{ id: string }>();
  const { data: project, isLoading } = useGetProject(id || "", { 
    query: { enabled: !!id, queryKey: getGetProjectQueryKey(id || "") } 
  });

  if (isLoading) {
    return <div className="p-8"><Skeleton className="h-8 w-[200px]" /></div>;
  }

  if (!project) return <div>Project not found</div>;

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Top Toolbar */}
      <header className="h-14 border-b border-border flex items-center justify-between px-4 bg-card">
        <div className="flex items-center gap-4">
          <Link href="/projects">
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <ChevronLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm">{project.name}</span>
            <span className="px-2 py-0.5 rounded-full bg-muted text-xs text-muted-foreground capitalize">
              {project.status}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Settings className="mr-2 h-4 w-4" /> Settings
          </Button>
          <Button variant="default" size="sm">
            <Play className="mr-2 h-4 w-4" /> Deploy
          </Button>
        </div>
      </header>

      {/* Main IDE Area */}
      <div className="flex-1 overflow-hidden">
        <ResizablePanelGroup direction="horizontal">
          <ResizablePanel defaultSize={20} minSize={15} maxSize={30} className="bg-card/50 border-r">
            <div className="p-4 h-full">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">Explorer</h3>
              <div className="space-y-1 text-sm text-muted-foreground">
                <div className="px-2 py-1 rounded cursor-pointer hover:bg-muted hover:text-foreground">index.tsx</div>
                <div className="px-2 py-1 rounded cursor-pointer hover:bg-muted hover:text-foreground">styles.css</div>
                <div className="px-2 py-1 rounded cursor-pointer hover:bg-muted hover:text-foreground">config.json</div>
              </div>
            </div>
          </ResizablePanel>
          <ResizableHandle />
          
          <ResizablePanel defaultSize={55}>
            <ResizablePanelGroup direction="vertical">
              <ResizablePanel defaultSize={70} className="bg-background">
                <div className="p-4 h-full flex flex-col">
                  <div className="flex border-b border-border mb-4">
                    <div className="px-4 py-2 border-b-2 border-primary text-sm font-medium">index.tsx</div>
                  </div>
                  <div className="flex-1 font-mono text-sm text-muted-foreground p-4 bg-muted/20 rounded-lg border border-border">
                    {`// Write your code here
export default function App() {
  return <div>Hello World</div>;
}`}
                  </div>
                </div>
              </ResizablePanel>
              <ResizableHandle />
              <ResizablePanel defaultSize={30} className="bg-card border-t">
                <div className="p-4 h-full">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">Terminal / Preview</h3>
                  <div className="font-mono text-xs text-muted-foreground space-y-1">
                    <div>$ npm run build</div>
                    <div>&gt; Building application...</div>
                    <div className="text-primary">✓ Success</div>
                  </div>
                </div>
              </ResizablePanel>
            </ResizablePanelGroup>
          </ResizablePanel>
          <ResizableHandle />
          
          <ResizablePanel defaultSize={25} minSize={20} maxSize={40} className="bg-card/50 border-l">
            <div className="p-4 h-full flex flex-col">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">AI Assistant</h3>
              <div className="flex-1 bg-background rounded-lg border border-border p-4 mb-4 overflow-y-auto space-y-4">
                <div className="bg-muted p-3 rounded-lg text-sm rounded-tl-none">
                  Hello! I'm your AI agent. I can help you build this project. What would you like to add?
                </div>
              </div>
              <div className="flex gap-2">
                <input 
                  type="text" 
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                  placeholder="Ask me to build something..."
                />
                <Button size="icon" className="h-9 w-9"><Play className="h-4 w-4" /></Button>
              </div>
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </div>
  );
}
