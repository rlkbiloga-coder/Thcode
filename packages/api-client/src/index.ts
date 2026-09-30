/** Read-only typed readiness client. No credentials stored or logged. */
export interface Readiness {
  status: "ready" | "not_ready";
  httpStatus: 200 | 503;
}

export class ThcodeClient {
  private readonly base: URL;
  constructor(baseUrl: string, private readonly request: typeof fetch = fetch) {
    this.base = new URL(baseUrl);
    const local = ["localhost", "127.0.0.1", "[::1]"].includes(this.base.hostname);
    if (this.base.protocol !== "https:" && !(this.base.protocol === "http:" && local)) {
      throw new Error("HTTPS required outside localhost");
    }
    if (this.base.username || this.base.password || this.base.search || this.base.hash || this.base.pathname !== "/") {
      throw new Error("Use a base URL without credentials, paths or query parameters");
    }
  }
  async readiness(): Promise<Readiness> {
    const response = await this.request(new URL("/api/ready", this.base), {
      method: "GET", redirect: "error", signal: AbortSignal.timeout(15000)
    });
    if (response.status !== 200 && response.status !== 503) {
      throw new Error(`Unexpected readiness HTTP ${response.status}`);
    }
    const body: unknown = await response.json();
    if (!body || typeof body !== "object" || !("status" in body)) {
      throw new Error("Invalid readiness response");
    }
    const status = (body as {status: unknown}).status;
    if ((response.status === 200 && status !== "ready") || (response.status === 503 && status !== "not_ready")) {
      throw new Error("Inconsistent readiness response");
    }
    return {status: status as Readiness["status"], httpStatus: response.status};
  }
}
