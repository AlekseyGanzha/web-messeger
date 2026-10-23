import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex h-screen flex-col items-center justify-center gap-4 bg-panel">
      <h1 className="text-2xl font-semibold">Страница не найдена</h1>
      <Link href="/chat" className="text-primary">
        Перейти в чат
      </Link>
    </div>
  );
}
