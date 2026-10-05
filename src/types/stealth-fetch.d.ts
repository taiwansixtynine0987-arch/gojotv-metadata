// Type declarations for stealth-fetch package
// Bypasses cf-* header injection via cloudflare:sockets

declare module "stealth-fetch" {
  export interface HttpResponse {
    status: number;
    statusText: string;
    headers: Record<string, string>;
    rawHeaders: ReadonlyArray<[string, string]>;
    protocol: "h2" | "http/1.1";
    body: ReadableStream<Uint8Array>;
    text(): Promise<string>;
    json(): Promise<unknown>;
    arrayBuffer(): Promise<ArrayBuffer>;
    getSetCookie(): string[];
  }

  export interface StealthRequestOptions {
    method?: string;
    headers?: Record<string, string>;
    body?: string | Uint8Array | ReadableStream<Uint8Array> | null;
    protocol?: "h2" | "http/1.1" | "auto";
    timeout?: number;
    redirect?: "follow" | "manual";
    maxRedirects?: number;
    decompress?: boolean;
    retry?: boolean | number;
  }

  export function request(
    url: string,
    options?: StealthRequestOptions
  ): Promise<HttpResponse>;

  export function toWebResponse(
    response: HttpResponse,
    options?: { tee?: boolean }
  ): Response;

  export default request;
}
