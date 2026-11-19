import { useEffect, useState } from "react";
import { ArrowLeft, BookOpen, Braces, Download, ExternalLink, LoaderCircle, ShieldCheck } from "lucide-react";
import { Link } from "wouter";
import CushVerifyPublicFooter from "@/components/verify/CushVerifyPublicFooter";
import CushVerifyPublicNav from "@/components/verify/CushVerifyPublicNav";

type Operation = {
  operationId: string;
  summary?: string;
  description?: string;
  tags?: string[];
  "x-required-scope"?: string;
  requestBody?: {
    content?: Record<string, { schema?: unknown }>;
  };
  parameters?: Array<ApiParameter | { $ref: string }>;
  responses?: Record<string, { description?: string }>;
};

type ApiParameter = {
  name?: string;
  in?: string;
  required?: boolean;
  description?: string;
  schema?: { type?: string; enum?: string[] };
};

type ApiSpec = {
  openapi: string;
  info: { title: string; version: string; description: string };
  servers: Array<{ url: string; description?: string }>;
  paths: Record<string, Record<string, Operation | unknown>>;
  components?: {
    parameters?: Record<string, ApiParameter>;
  };
};

const supportedMethods = new Set(["get", "post", "put", "patch", "delete"]);

export default function CushVerifyApiReference() {
  const [spec, setSpec] = useState<ApiSpec | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    fetch("/openapi/cush-verify-v1.json")
      .then(async (response) => {
        if (!response.ok) throw new Error("The API specification could not be loaded.");
        return response.json() as Promise<ApiSpec>;
      })
      .then((data) => {
        if (active) setSpec(data);
      })
      .catch((caught) => {
        if (active) setError(caught instanceof Error ? caught.message : "The API specification could not be loaded.");
      });
    return () => { active = false; };
  }, []);

  const operations = spec
    ? Object.entries(spec.paths).flatMap(([path, methods]) => Object.entries(methods)
      .filter(([method]) => supportedMethods.has(method))
      .map(([method, operation]) => ({ path, method, operation: operation as Operation })))
    : [];
  const grouped = new Map<string, typeof operations>();
  for (const item of operations) {
    const tag = item.operation.tags?.[0] ?? "Other";
    grouped.set(tag, [...(grouped.get(tag) ?? []), item]);
  }

  return (
    <main className="min-h-[100dvh] bg-[#f3f7fc] text-[#14213a]">
      <CushVerifyPublicNav currentPage="api" />
      <section className="bg-[#0c1830] text-white">
        <div className="mx-auto max-w-[1240px] px-5 py-12 sm:px-8 sm:py-16 lg:px-12">
          <Link href="/verify/api" className="inline-flex items-center gap-2 text-xs font-semibold text-blue-100/75 hover:text-white">
            <ArrowLeft className="h-4 w-4" /> Back to API overview
          </Link>
          <p className="mt-8 text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-300">Developer reference · v1</p>
          <h1 className="mt-3 max-w-4xl font-serif text-4xl tracking-[-0.05em] sm:text-6xl">Cush Verify Institutional API</h1>
          <p className="mt-5 max-w-3xl text-sm leading-6 text-blue-100/75 sm:text-base">
            Consent-led discovery, report requests and retrieval, usage, sandbox simulations, and signed webhooks. Production access remains gated by organisation approval, Cush API approval, and plan eligibility.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <a href="/openapi/cush-verify-v1.json" download className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[#3475e7] px-4 text-sm font-semibold text-white hover:bg-[#4b89f3]">
              <Download className="h-4 w-4" /> Download OpenAPI JSON
            </a>
            <a href="/verify-api-integration.md" target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center gap-2 rounded-full border border-white/20 px-4 text-sm font-semibold text-white hover:bg-white/5">
              <BookOpen className="h-4 w-4" /> Integration instructions <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>
          {spec && (
            <div className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-2 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-xs text-blue-100/80">
              <span className="inline-flex items-center gap-2"><Braces className="h-4 w-4 text-emerald-300" /> OpenAPI {spec.openapi} · {spec.info.version}</span>
              <code className="break-all">{spec.servers[0]?.url}</code>
            </div>
          )}
        </div>
      </section>

      <section className="mx-auto grid max-w-[1240px] gap-8 px-5 py-10 sm:px-8 lg:grid-cols-[260px_1fr] lg:px-12">
        <aside className="h-fit rounded-2xl border border-[#dce5f1] bg-white p-5 lg:sticky lg:top-5">
          <div className="flex items-center gap-2 text-sm font-semibold text-[#20304c]"><ShieldCheck className="h-4 w-4 text-[#16816f]" /> Before calling</div>
          <ul className="mt-4 space-y-3 text-xs leading-5 text-[#52627b]">
            <li>Send bearer keys only from trusted server-side code.</li>
            <li>Use the scope listed for each operation.</li>
            <li>Consent and expiry are rechecked before every report retrieval.</li>
            <li>Only successful authorized report returns use a report credit.</li>
            <li>Sandbox operations use synthetic data and zero credits.</li>
          </ul>
          <p className="mt-4 border-t border-[#e8edf4] pt-4 text-[11px] leading-5 text-[#71819b]">
            This reference documents implemented routes; production readiness still depends on the institution’s access status and deployment configuration.
          </p>
        </aside>

        <div className="space-y-8">
          {error && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">{error}</p>}
          {!spec && !error && <p className="flex items-center gap-2 rounded-xl border border-[#dce5f1] bg-white p-5 text-sm text-[#61728a]"><LoaderCircle className="h-4 w-4 animate-spin" /> Loading the API reference…</p>}
          {[...grouped.entries()].map(([tag, items]) => (
            <section key={tag} aria-labelledby={`tag-${tag.replace(/\W+/g, "-")}`}>
              <h2 id={`tag-${tag.replace(/\W+/g, "-")}`} className="mb-3 font-serif text-2xl tracking-[-0.03em] text-[#12213d]">{tag}</h2>
              <div className="space-y-3">
                {items.map(({ method, path, operation }) => (
                  <details key={`${method}-${path}`} className="group overflow-hidden rounded-xl border border-[#dce5f1] bg-white open:shadow-sm">
                    <summary className="flex cursor-pointer list-none flex-wrap items-center gap-3 p-4 [&::-webkit-details-marker]:hidden">
                      <span className={`min-w-[68px] rounded-md px-2 py-1 text-center text-[10px] font-bold uppercase tracking-wide ${
                        method === "get" ? "bg-blue-50 text-blue-800"
                          : method === "post" ? "bg-emerald-50 text-emerald-800"
                            : method === "delete" ? "bg-rose-50 text-rose-800"
                              : "bg-amber-50 text-amber-900"
                      }`}>{method}</span>
                      <code className="min-w-[180px] flex-1 break-all text-xs font-semibold text-[#243650]">{path}</code>
                      <span className="text-sm font-medium text-[#40516d]">{operation.summary}</span>
                      {operation["x-required-scope"] && <span className="rounded-full bg-[#f1f5fa] px-2.5 py-1 text-[10px] text-[#61728a]">{operation["x-required-scope"]}</span>}
                    </summary>
                    <div className="border-t border-[#e8edf4] px-4 py-4">
                      {operation.description && <p className="max-w-3xl text-sm leading-6 text-[#52627b]">{operation.description}</p>}
                      {operation.parameters?.length ? (
                        <div className="mt-4">
                          <h3 className="text-xs font-semibold uppercase tracking-wide text-[#61728a]">Parameters</h3>
                          <ul className="mt-2 space-y-2">
                            {operation.parameters.map((rawParameter, index) => {
                              const parameter = "$ref" in rawParameter
                                ? spec?.components?.parameters?.[rawParameter.$ref.split("/").at(-1) ?? ""]
                                : rawParameter;
                              if (!parameter) return null;
                              return (
                                <li key={`${parameter.in}-${parameter.name}-${index}`} className="rounded-lg bg-[#f8fbff] px-3 py-2 text-xs">
                                  <code className="font-semibold text-[#243650]">{parameter.name}</code>
                                  <span className="ml-2 text-[#71819b]">{parameter.in}{parameter.required ? " · required" : " · optional"}</span>
                                  {parameter.description && <p className="mt-1 text-[#61728a]">{parameter.description}</p>}
                                </li>
                              );
                            })}
                          </ul>
                        </div>
                      ) : null}
                      <div className="mt-4">
                        <h3 className="text-xs font-semibold uppercase tracking-wide text-[#61728a]">Responses</h3>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {Object.entries(operation.responses ?? {}).map(([status, response]) => (
                            <span key={status} title={response.description} className={`rounded-md px-2 py-1 text-[10px] font-semibold ${status.startsWith("2") ? "bg-emerald-50 text-emerald-800" : "bg-slate-100 text-slate-700"}`}>{status}</span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </details>
                ))}
              </div>
            </section>
          ))}
        </div>
      </section>
      <CushVerifyPublicFooter />
    </main>
  );
}
