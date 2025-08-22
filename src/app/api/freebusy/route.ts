// src/app/api/freebusy/route.ts
import { NextRequest, NextResponse } from "next/server";

type ReqBody = {
  timeMin: string;
  timeMax: string;
  timeZone?: string;
  calendars?: string[];
};

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization") || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!token) return NextResponse.json({ error: "Missing access token" }, { status: 401 });

  const body = (await req.json()) as ReqBody;
  const items = (body.calendars?.length ? body.calendars : ["primary"]).map((id) => ({ id }));

  const gRes = await fetch("https://www.googleapis.com/calendar/v3/freeBusy", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      timeMin: body.timeMin,
      timeMax: body.timeMax,
      timeZone: body.timeZone ?? "Asia/Tokyo",
      items,
    }),
  });

  if (!gRes.ok) {
    const err = await gRes.text();
    return NextResponse.json({ error: err }, { status: gRes.status });
  }
  const data = await gRes.json();
  return NextResponse.json(data);
}
