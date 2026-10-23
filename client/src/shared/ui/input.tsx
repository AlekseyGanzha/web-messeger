import { cn } from "@/shared/lib/cn";

export function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "rounded-lg border border-line bg-surface px-3 py-2 text-fg outline-none focus:border-primary",
        className,
      )}
      {...props}
    />
  );
}
