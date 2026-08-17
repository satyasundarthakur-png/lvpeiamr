import { createFileRoute, ClientOnly } from "@tanstack/react-router";
import { lazy, Suspense } from "react";

const AmrApp = lazy(() => import("@/amr/App.jsx"));

const title = "AMR Surveillance — Ophthalmic Antibiotic Policy Tracker";
const description =
  "Upload lab data to build antibiograms, flag resistance patterns, and generate antibiotic stewardship reports for ophthalmic infections.";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
    ],
  }),
  component: Index,
});

function Loading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-surface">
      <p className="text-sm text-muted-foreground">Loading surveillance dashboard…</p>
    </div>
  );
}

function Index() {
  return (
    <ClientOnly fallback={<Loading />}>
      <Suspense fallback={<Loading />}>
        <AmrApp />
      </Suspense>
    </ClientOnly>
  );
}
