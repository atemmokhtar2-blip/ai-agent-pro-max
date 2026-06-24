import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link, useLocation } from "wouter";
import { useLogin } from "@workspace/api-client-react";
import { useAuth } from "@/components/AuthProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Cpu, Loader2, Eye, EyeOff, CheckCircle2, XCircle } from "lucide-react";
import { useState } from "react";

const loginSchema = z.object({
  email: z
    .string()
    .min(1, "Email is required")
    .email("Enter a valid email address"),
  password: z
    .string()
    .min(1, "Password is required")
    .min(8, "Password must be at least 8 characters"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p className="flex items-center gap-1.5 text-xs text-destructive mt-1">
      <XCircle className="h-3.5 w-3.5 flex-shrink-0" />
      {message}
    </p>
  );
}

export default function Login() {
  const [, setLocation] = useLocation();
  const { login: authenticate } = useAuth();
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
    mode: "onTouched",
  });

  const loginMutation = useLogin();

  const onSubmit = (data: LoginFormValues) => {
    loginMutation.mutate(
      { data },
      {
        onSuccess: (res) => {
          authenticate({
            access_token: res.access_token,
            refresh_token: res.refresh_token,
            token_type: res.token_type,
          });
          toast.success("Welcome back", { description: "Successfully logged in." });
          setLocation("/chat");
        },
        onError: (err) => {
          const message =
            (err as { data?: { error?: string } }).data?.error ||
            "Please check your credentials and try again.";
          toast.error("Login failed", { description: message });
          form.setFocus("email");
        },
      }
    );
  };

  const { errors, isSubmitting } = form.formState;
  const isPending = loginMutation.isPending || isSubmitting;

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="mx-auto w-full max-w-sm space-y-6">
        <div className="flex flex-col items-center space-y-2 text-center">
          <Cpu className="h-10 w-10 text-primary" />
          <h1 className="text-2xl font-bold tracking-tight">Log in to your account</h1>
          <p className="text-sm text-muted-foreground">
            Enter your email below to log in to AI Agent
          </p>
        </div>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
          {/* Email */}
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="m@example.com"
              autoComplete="email"
              aria-invalid={!!errors.email}
              {...form.register("email")}
            />
            <FieldError message={errors.email?.message} />
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Password</Label>
              <Link
                href="/forgot-password"
                className="text-sm font-medium text-primary hover:underline"
              >
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                aria-invalid={!!errors.password}
                className="pr-10"
                {...form.register("password")}
              />
              <button
                type="button"
                tabIndex={-1}
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <FieldError message={errors.password?.message} />
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={isPending}
          >
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isPending ? "Logging in…" : "Log In"}
          </Button>
        </form>

        <div className="text-center text-sm text-muted-foreground">
          Don&apos;t have an account?{" "}
          <Link href="/register" className="font-medium text-primary hover:underline">
            Sign up
          </Link>
        </div>
      </div>
    </div>
  );
}
