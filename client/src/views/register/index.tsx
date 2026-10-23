import { AuthForm } from "@/widgets/auth-form";
import { ThemeToggle } from "@/widgets/theme-toggle";

export default function RegisterPage() {
  return (
    <div className="relative flex h-screen items-center justify-center bg-panel">
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>
      <AuthForm mode="register" />
    </div>
  );
}
