import { Link } from "@/lib/i18n/navigation";

/** Root-level 404 (outside `[locale]`, e.g. unknown top-level paths). */
export default function RootNotFound() {
  return (
    <main className="mx-auto flex min-h-[50vh] max-w-lg flex-col items-center justify-center gap-4 px-4 py-16 text-center">
      <h1 className="text-2xl font-bold text-foreground">Page not found</h1>
      <p className="text-sm text-muted-foreground">
        The page you are looking for does not exist.
      </p>
      <Link href="/" className="text-sm font-medium text-[#2563eb] hover:underline">
        Back to home
      </Link>
    </main>
  );
}
