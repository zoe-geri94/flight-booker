import { NextResponse } from "next/server";
import { start } from "workflow/api";
import { flightSearchWorkflow, type SearchParams } from "@/workflows/flight-search";

export async function POST(request: Request) {
  const body = await request.json() as SearchParams;

  if (!body.origin || !body.destination || !body.date) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const run = await start(flightSearchWorkflow, [body]);
  const flights = await run.returnValue;

  return NextResponse.json({ flights });
}
