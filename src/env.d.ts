/// <reference types="astro/client" />

type AuthUser = import('./server/auth').Auth['$Infer']['Session']['user'];
type AuthSession = import('./server/auth').Auth['$Infer']['Session']['session'];

declare namespace App {
  interface Locals {
    /** Set by src/middleware.ts on /admin/ pages; null when signed out. */
    user: AuthUser | null;
    session: AuthSession | null;
  }
}
