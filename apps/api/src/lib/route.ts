import type { Request } from "express";

export function routeParam(req: Request, name: string): string {
  const value = req.params[name];
  if (typeof value !== "string")
    throw new Error(`missing route param: ${name}`);
  return value;
}

export function queryString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

export function slugify(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "dashboard"
  );
}
