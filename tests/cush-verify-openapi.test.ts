import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { CUSH_VERIFY_API_ENDPOINTS, CUSH_VERIFY_API_SCOPES } from "@shared/cush-verify-api";
import { requiredCushVerifyApiScopeForRequest } from "../server/cush-verify-api-key-service";

const specificationPath = "public/openapi/cush-verify-v1.json";
const specification = JSON.parse(readFileSync(specificationPath, "utf8")) as {
  openapi: string;
  info: { version: string };
  servers: Array<{ url: string }>;
  security: Array<Record<string, unknown>>;
  paths: Record<string, Record<string, unknown>>;
  components: { securitySchemes: Record<string, unknown> };
};

function resolveJsonPointer(pointer: string): unknown {
  if (!pointer.startsWith("#/")) throw new Error(`Unsupported OpenAPI reference: ${pointer}`);
  return pointer.slice(2).split("/").map((part) => part.replace(/~1/g, "/").replace(/~0/g, "~"))
    .reduce<unknown>((current, part) => {
      if (!current || typeof current !== "object" || !(part in current)) {
        throw new Error(`Unresolved OpenAPI reference: ${pointer}`);
      }
      return (current as Record<string, unknown>)[part];
    }, specification);
}

function collectLocalReferences(value: unknown, output: string[] = []): string[] {
  if (Array.isArray(value)) {
    value.forEach((item) => collectLocalReferences(item, output));
  } else if (value && typeof value === "object") {
    for (const [key, child] of Object.entries(value)) {
      if (key === "$ref" && typeof child === "string") output.push(child);
      else collectLocalReferences(child, output);
    }
  }
  return output;
}

function pathFromSharedEndpoint(endpoint: string) {
  return endpoint.replace(/^\/api\/v1/, "").replace(/:([a-zA-Z][a-zA-Z0-9]*)/g, "{}");
}

function normalizeOpenApiPath(path: string) {
  return path.replace(/\{[^}]+\}/g, "{}");
}

const registeredOperations = [
  "server/cush-verify-report-routes.ts",
  "server/cush-verify-api-routes.ts",
  "server/cush-verify-webhook-routes.ts",
].flatMap((file) => {
  const source = readFileSync(file, "utf8");
  const operations: Array<{ method: string; path: string }> = [];
  const registration = /app\.(get|post|put|patch|delete)\(\s*(\[[\s\S]*?\]|"(?:\\.|[^"])*")/g;
  for (const match of source.matchAll(registration)) {
    const method = match[1]!.toLowerCase();
    const routeArgument = match[2]!;
    for (const routeMatch of routeArgument.matchAll(/["'](\/api\/v1\/[^"']+)["']/g)) {
      const path = normalizeOpenApiPath(routeMatch[1]!.replace(/^\/api\/v1/, "").replace(/:([a-zA-Z][a-zA-Z0-9]*)/g, "{}"));
      operations.push({ method, path });
    }
  }
  return operations;
});

describe("Cush Verify OpenAPI contract", () => {
  it("is valid JSON for OpenAPI 3 and declares its bearer-key server", () => {
    expect(specification.openapi).toMatch(/^3\.\d+\.\d+$/);
    expect(specification.info.version).toBe("1.0.0");
    expect(specification.servers[0]?.url).toBe("https://verify.we-cush.com/api/v1");
    expect(specification.security).toEqual([{ CushVerifyBearerKey: [] }]);
    expect(specification.components.securitySchemes.CushVerifyBearerKey).toMatchObject({
      type: "http",
      scheme: "bearer",
    });
  });

  it("documents every shared versioned endpoint path and actual registered method", () => {
    for (const endpoint of CUSH_VERIFY_API_ENDPOINTS) {
      const path = pathFromSharedEndpoint(endpoint);
      const matchingPath = Object.keys(specification.paths).find((item) => normalizeOpenApiPath(item) === path);
      expect(matchingPath, `${endpoint} must be in the OpenAPI file`).toBeDefined();
    }

    for (const operation of registeredOperations) {
      const matchingPath = Object.entries(specification.paths)
        .find(([path]) => normalizeOpenApiPath(path) === operation.path)?.[1];
      const specPath = Object.entries(specification.paths)
        .find(([path]) => normalizeOpenApiPath(path) === operation.path)?.[0] ?? operation.path;
      expect(
        matchingPath?.[operation.method],
        `${operation.method.toUpperCase()} ${operation.path} must have an OpenAPI operation`,
      ).toBeDefined();
      const originalUrl = `/api/v1${specPath
        .replace(/\{requestId\}/g, "b70fa5c4-0f68-4cc8-b7b7-2f4db5af59a1")
        .replace(/\{reportId\}/g, "17")
        .replace(/\{destinationId\}/g, "3")}`;
      const documentedScope = (matchingPath?.[operation.method] as Record<string, unknown>)?.["x-required-scope"];
      expect(requiredCushVerifyApiScopeForRequest({
        originalUrl,
        method: operation.method.toUpperCase(),
      } as never)).toBe(documentedScope);
    }
  });

  it("gives each operation a unique ID, a declared scope, and documented responses", () => {
    const operationIds = new Set<string>();
    for (const [path, pathItem] of Object.entries(specification.paths)) {
      const item = pathItem as Record<string, unknown>;
      const pathParameters = Array.isArray(item.parameters)
        ? item.parameters as Array<{ name?: string; in?: string }>
        : [];
      for (const [method, rawOperation] of Object.entries(item)) {
        if (!["get", "post", "put", "patch", "delete"].includes(method)) continue;
        const operation = rawOperation as Record<string, unknown>;
        const operationId = operation.operationId;
        expect(typeof operationId, `${method} ${path} needs operationId`).toBe("string");
        expect(operationIds.has(operationId as string), `duplicate operationId ${operationId}`).toBe(false);
        operationIds.add(operationId as string);
        expect(operation.summary, `${operationId} needs a summary`).toBeTruthy();
        expect(operation.responses, `${operationId} needs responses`).toBeTruthy();
        expect((operation.responses as Record<string, unknown>)["200"]
          || (operation.responses as Record<string, unknown>)["201"]
          || (operation.responses as Record<string, unknown>)["204"],
        `${operationId} needs a success response`).toBeTruthy();
        const scope = operation["x-required-scope"];
        expect(CUSH_VERIFY_API_SCOPES).toContain(scope);
        const pathParameterNames = [
          ...pathParameters,
          ...(Array.isArray(operation.parameters) ? operation.parameters as Array<Record<string, unknown>> : []),
        ].map((parameter) => "$ref" in parameter && typeof parameter.$ref === "string"
          ? resolveJsonPointer(parameter.$ref) as { name?: string; in?: string }
          : parameter as { name?: string; in?: string })
          .filter((parameter) => parameter.in === "path").map((parameter) => parameter.name);
        for (const [, name] of path.matchAll(/\{([^}]+)\}/g)) {
          expect(pathParameterNames).toContain(name);
        }
      }
    }
    expect(operationIds.size).toBeGreaterThanOrEqual(20);
  });

  it("resolves every local reference and keeps the published and source integration guides in sync", () => {
    for (const reference of collectLocalReferences(specification)) {
      expect(resolveJsonPointer(reference)).toBeDefined();
    }
    expect(readFileSync("docs/cush-verify-api-integration.md", "utf8"))
      .toBe(readFileSync("public/verify-api-integration.md", "utf8"));
  });
});
