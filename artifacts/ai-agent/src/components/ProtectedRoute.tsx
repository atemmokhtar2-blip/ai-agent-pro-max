import { useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "./AuthProvider";
import { Loader2 } from "lucide-react";

export function ProtectedRoute({ children, requireAdmin = false }: { children: React.ReactNode, requireAdmin?: boolean }) {
  const { user, isAuthenticated, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      setLocation("/login");
    } else if (!isLoading && isAuthenticated && requireAdmin && user?.role !== "admin" && user?.role !== "super_admin") {
      setLocation("/dashboard");
    }
  }, [isLoading, isAuthenticated, user, requireAdmin, setLocation]);

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated || (requireAdmin && user?.role !== "admin" && user?.role !== "super_admin")) {
    return null; // Will redirect
  }

  return <>{children}</>;
}
