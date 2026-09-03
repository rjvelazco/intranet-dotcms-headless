import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
      <p className="text-sm font-medium text-zinc-500">404</p>
      <h1 className="text-2xl font-semibold">Page not found</h1>
      <p className="max-w-sm text-sm text-zinc-500">
        dotCMS has no published page at this URL.
      </p>
      <Link href="/" className="text-sm font-medium underline underline-offset-4">
        Back home
      </Link>
    </main>
  );
}
