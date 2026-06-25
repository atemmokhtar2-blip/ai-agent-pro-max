import { motion } from "framer-motion";
import { Logo } from "@/components/Logo";

interface LogoLoadingScreenProps {
  message?: string;
}

export function LogoLoadingScreen({ message = "Loading…" }: LogoLoadingScreenProps) {
  return (
    <motion.div
      className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Logo size="xl" animate="pulse" variant="icon" />

      <motion.div
        className="flex flex-col items-center gap-3"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.4, ease: "easeOut" }}
      >
        <Logo size="md" animate="static" variant="wordmark" entrance={false} />

        {/* Animated progress bar */}
        <div className="h-0.5 w-32 overflow-hidden rounded-full bg-muted">
          <motion.div
            className="h-full rounded-full bg-primary"
            initial={{ x: "-100%" }}
            animate={{ x: "100%" }}
            transition={{
              duration: 1.4,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        </div>

        <p className="text-xs text-muted-foreground tracking-wide">{message}</p>
      </motion.div>
    </motion.div>
  );
}
