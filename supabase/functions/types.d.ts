/// <reference types="https://deno.land/x/types/deno.d.ts" />

declare global {
  namespace Deno {
    interface Env {
      get(key: string): string | undefined;
    }
    const env: Env;
  }
}

export {};