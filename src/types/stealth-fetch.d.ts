// Type declaration for stealth-fetch package
// This package uses cloudflare:sockets to bypass cf-* header injection

declare module "stealth-fetch" {
  export interface StealthFetchOptions {
    method?: string;
    headers?: Record<string, string>;
    body?: string | ArrayBuffer | Uint8Array;
    redirect?: "follow" | "manual" | "error";
  }

  export function request(
    url: string,
    options?: StealthFetchOptions
  ): Promise<Response>;

  const stealthFetch: typeof request;
  export default stealthFetch;
}
