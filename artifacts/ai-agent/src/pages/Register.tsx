import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link, useLocation } from "wouter";
import { useRegister } from "@workspace/api-client-react";
import { useAuth } from "@/components/AuthProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Logo } from "@/components/Logo";
import { Loader2, Eye, EyeOff, CheckCircle2, XCircle } from "lucide-react";
import { useState } from "react";

// ── Validation schema ────────────────────────────────────────────────────────

const registerSchema = z
  .object({
    username: z
      .string()
      .min(1, "Username is required")
      .min(3, "Username must be at least 3 characters")
      .max(30, "Username must be at most 30 characters")
      .regex(
        /^[a-zA-Z0-9_]+$/,
        "Username may only contain letters, numbers, and underscores"
      ),
    email: z
      .string()
      .min(1, "Email is required")
      .email("Enter a valid email address")
      .transform((v) => v.trim().toLowerCase()),
    password: z
      .string()
      .min(1, "Password is required")
      .min(8, "Password must be at least 8 characters")
      .refine((v) => /[A-Z]/.test(v), {
        message: "Password must contain at least one uppercase letter",
      })
      .refine((v) => /[a-z]/.test(v), {
        message: "Password must contain at least one lowercase letter",
      })
      .refine((v) => /[0-9]/.test(v), {
        message: "Password must contain at least one number",
      }),
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((d) => d.password === d.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match",
  });

type RegisterFormValues = z.infer<typeof registerSchema>;

// ── Password strength indicator ───────────────────────────────────────────────

interface PasswordRule {
  label: string;
  test: (v: string) => boolean;
}

const passwordRules: PasswordRule[] = [
  { label: "At least 8 characters", test: (v) => v.length >= 8 },
  { label: "Uppercase letter (A-Z)", test: (v) => /[A-Z]/.test(v) },
  { label: "Lowercase letter (a-z)", test: (v) => /[a-z]/.test(v) },
  { label: "Number (0-9)", test: (v) => /[0-9]/.test(v) },
];

function PasswordStrength({ value }: { value: string }) {
  if (!value) return null;
  return (
    <ul className="mt-2 space-y-1">
      {passwordRules.map((rule) => {
        const ok = rule.test(value);
        return (
          <li key={rule.label} className="flex items-center gap-1.5 text-xs">
            {ok ? (
              <CheckCircle2 className="h-3.5 w-3.5 flex-shrink-0 text-green-500" />
            ) : (
              <XCircle className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground" />
            )}
            <span className={ok ? "text-green-600 dark:text-green-400" : "text-muted-foreground"}>
              {rule.label}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

// ── Field error ───────────────────────────────────────────────────────────────

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p className="flex items-center gap-1.5 text-xs text-destructive mt-1">
      <XCircle className="h-3.5 w-3.5 flex-shrink-0" />
      {message}
    </p>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function Register() {
  const [, setLocation] = useLocation();
  const { login: authenticate } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { username: "", email: "", password: "", confirmPassword: "" },
    mode: "onTouched",
  });

  const registerMutation = useRegister();

  const passwordValue = form.watch("password");

  const onSubmit = (data: RegisterFormValues) => {
    const { confirmPassword: _confirm, ...payload } = data;
    registerMutation.mutate(
      { data: payload },
      {
        onSuccess: (res) => {
          authenticate({
            access_token: res.access_token,
            refresh_token: res.refresh_token,
            token_type: res.token_type,
          });
          toast.success("Account created", { description: "Welcome to AI Agent." });
          setLocation("/chat");
        },
        onError: (err) => {
          // ApiError puts body in .data.error; err.message has "HTTP 4xx: <text>" format
          const apiMsg = (err as { data?: { error?: string } }).data?.error;
          const rawMsg = (err as Error).message ?? "";
          // Strip the "HTTP 4xx Status: " prefix from err.message
          const fallback = rawMsg.replace(/^HTTP \d+ [^:]+:\s*/i, "").trim();
          const message = apiMsg || fallback || "An error occurred. Please try again.";

          // Surface duplicate-field errors inline when possible
          if (/username.*taken|already.*username/i.test(message)) {
            form.setError("username", { message: "This username is already taken." });
            form.setFocus("username");
          } else if (/email.*taken|already.*email|email.*use/i.test(message)) {
            form.setError("email", { message: "An account with this email already exists." });
            form.setFocus("email");
          } else if (/password/i.test(message)) {
            form.setError("password", { message });
            form.setFocus("password");
          } else {
            toast.error("Registration failed", { description: message });
          }
        },
      }
    );
  };

  const { errors, isSubmitting, isValid, isDirty } = form.formState;
  const isPending = registerMutation.isPending || isSubmitting;

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="mx-auto w-full max-w-sm space-y-6">
        {/* Header */}
        <div className="flex flex-col items-center space-y-2 text-center">
          <Logo size="lg" animate="float" variant="icon" />
          <h1 className="text-2xl font-bold tracking-tight">Create an account</h1>
          <p className="text-sm text-muted-foreground">
            Enter your details below to get started
          </p>
        </div>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
          {/* Username */}
          <div className="space-y-1.5">
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              type="text"
              placeholder="john_doe"
              autoComplete="username"
              aria-invalid={!!errors.username}
              {...form.register("username")}
            />
            <FieldError message={errors.username?.message} />
            {!errors.username && (
              <p className="text-[11px] text-muted-foreground/70 mt-1">
                3–30 characters. Letters, numbers, and underscores only.
              </p>
            )}
          </div>

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
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
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
            <PasswordStrength value={passwordValue} />
          </div>

          {/* Confirm Password */}
          <div className="space-y-1.5">
            <Label htmlFor="confirmPassword">Confirm Password</Label>
            <div className="relative">
              <Input
                id="confirmPassword"
                type={showConfirm ? "text" : "password"}
                autoComplete="new-password"
                aria-invalid={!!errors.confirmPassword}
                className="pr-10"
                {...form.register("confirmPassword")}
              />
              <button
                type="button"
                tabIndex={-1}
                onClick={() => setShowConfirm((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                aria-label={showConfirm ? "Hide password" : "Show password"}
              >
                {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <FieldError message={errors.confirmPassword?.message} />
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={isPending || (isDirty && !isValid)}
          >
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isPending ? "Creating account…" : "Sign Up"}
          </Button>
        </form>

        <div className="text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-primary hover:underline">
            Log in
          </Link>
        </div>
      </div>
    </div>
  );
}
