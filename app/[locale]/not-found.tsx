import { Link } from "@/lib/i18n/navigation";

export default function NotFound() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-4 py-20 text-center">
      <h1 className="text-4xl font-bold text-white">404</h1>
      <p className="mt-4 text-slate-400">Traveler not found</p>
      <Link
        href="/"
        className="mt-8 rounded-lg bg-blue-600 px-6 py-2 text-white hover:bg-blue-500"
      >
        Go home
      </Link>
    </main>
  );
}
