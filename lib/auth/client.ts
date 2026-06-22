import {
  sendSignInLinkToEmail,
  isSignInWithEmailLink,
  signInWithEmailLink,
  signOut as firebaseSignOut,
} from "firebase/auth";
import { getClientAuth } from "../firebase/client";

/**
 * Client-side auth helpers (Client SDK) for the login UI (#9) to build on.
 * Sign-in obtains an ID token; the server exchanges it for a session cookie
 * (server is the source of truth — ADR-0011). No UI here.
 */
const EMAIL_KEY = "plm:emailForSignIn";

export async function sendSignInLink(email: string): Promise<void> {
  await sendSignInLinkToEmail(getClientAuth(), email, {
    url: `${window.location.origin}/auth/callback`,
    handleCodeInApp: true,
  });
  window.localStorage.setItem(EMAIL_KEY, email);
}

/** Completes a magic-link sign-in if the current URL is one; returns an ID token. */
export async function completeSignInFromLink(): Promise<string | null> {
  const auth = getClientAuth();
  if (!isSignInWithEmailLink(auth, window.location.href)) return null;
  const email =
    window.localStorage.getItem(EMAIL_KEY) ??
    window.prompt("Confirmá tu email") ??
    "";
  const cred = await signInWithEmailLink(auth, email, window.location.href);
  window.localStorage.removeItem(EMAIL_KEY);
  return cred.user.getIdToken();
}

/** Exchanges an ID token for a server session cookie (with CSRF). */
export async function exchangeForSession(idToken: string): Promise<Response> {
  const csrf = await fetch("/api/auth/csrf").then((r) => r.json());
  return fetch("/api/auth/session", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-csrf-token": csrf.csrfToken,
    },
    body: JSON.stringify({ idToken }),
  });
}

export async function signOut(): Promise<void> {
  await fetch("/api/auth/session", { method: "DELETE" });
  await firebaseSignOut(getClientAuth());
}
