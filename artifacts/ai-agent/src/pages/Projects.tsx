import { useState } from "react";
import { useListProjects } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { FolderGit2, Search, Globe, Code2 } from "lucide-react";
import { Link } from "wouter";
import { CreateProjectDialog } from "@/components/CreateProjectDialog";
import { ProjectActionsDropdown } from "@/components/ProjectActionsDropdown";

export default function Projects() {
  const [search, setSearch] = useState("");
  const { data: projects, isLoading } = useListProjects({ page: 1, per_page: 20, search: search || undefined });

  return (
    <div className="flex-1 space-y-6 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Projects</h2>
          <p className="text-muted-foreground">Manage your websites and bots.</p>
        </div>
        <div className="flex items-center space-x-2">
          <CreateProjectDialog />
        </div>
      </div>

      <div className="flex items-center space-x-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input 
            type="search" 
            placeholder="Search projects..." 
            className="pl-8" 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {isLoading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="flex flex-col">
              <CardHeader className="pb-2">
                <Skeleton className="h-5 w-[150px]" />
              </CardHeader>
              <CardContent className="flex-1 pb-2">
                <Skeleton className="h-4 w-[200px]" />
              </CardContent>
            </Card>
          ))
        ) : projects?.items.length === 0 ? (
          <div className="col-span-full flex flex-col items-center justify-center p-8 text-center border rounded-lg border-dashed">
            <FolderGit2 className="h-10 w-10 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">No projects found</h3>
            <p className="text-sm text-muted-foreground mt-1 mb-4">You don't have any projects yet.</p>
            <CreateProjectDialog />
          </div>
        ) : (
          projects?.items.map(project => (
            <Link key={project.id} href={`/projects/${project.id}`}>
              <Card className="flex flex-col cursor-pointer hover:border-primary/50 transition-colors h-[160px]">
                <CardHeader className="pb-2 flex flex-row items-start justify-between space-y-0">
                  <CardTitle className="text-base font-medium flex items-center gap-2">
                    {project.project_type === 'website' ? <Globe className="h-4 w-4" /> : <Code2 className="h-4 w-4" />}
                    {project.name}
                  </CardTitle>
                  <div onClick={(e) => e.preventDefault()}>
                    <ProjectActionsDropdown project={project} />
                  </div>
                </CardHeader>
                <CardContent className="flex-1 pb-2 flex flex-col justify-between">
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {project.description || "No description provided."}
                  </p>
                  <div className="flex items-center justify-between mt-4">
                    <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-secondary text-secondary-foreground capitalize">
                      {project.status}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(project.updated_at).toLocaleDateString()}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
