import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  const url = req.nextUrl;

  if (/^\/t\/[^/]+\/client$/.test(url.pathname)) {
    url.pathname = "/client";
    return NextResponse.redirect(url);
  }
  if (/^\/t\/[^/]+\/entrepreneur$/.test(url.pathname)) {
    url.pathname = "/entrepreneur";
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}
