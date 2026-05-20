import { generateObject } from "ai";
import { Sandbox } from "@vercel/sandbox";
import { z } from "zod";

export interface SearchParams {
  origin: string;
  destination: string;
  date: string;
  passengers: number;
}

export interface Flight {
  airline: string;
  flightNumber: string;
  departureTime: string;
  arrivalTime: string;
  duration: number;
  price: number;
  stops: number;
  score?: number;
}

export async function flightSearchWorkflow(params: SearchParams): Promise<Flight[]> {
  "use workflow";

  // Step 1: AI Gateway generates realistic mock flights
  const flights = await generateFlightOptions(params);

  // Step 2: Sandbox runs scoring algorithm
  const ranked = await rankFlightsInSandbox(flights);

  return ranked;
}

async function generateFlightOptions(params: SearchParams): Promise<Flight[]> {
  "use step";

  const { object } = await generateObject({
    model: "anthropic/claude-haiku-4-5-20251001",
    schema: z.object({
      flights: z.array(
        z.object({
          airline: z.string(),
          flightNumber: z.string(),
          departureTime: z.string(),
          arrivalTime: z.string(),
          duration: z.number().describe("duration in minutes"),
          price: z.number().describe("price in USD"),
          stops: z.number(),
        })
      ),
    }),
    prompt: `Generate exactly 6 realistic flight options from ${params.origin} to ${params.destination} on ${params.date} for ${params.passengers} passenger(s).
Include a mix of direct and connecting flights from airlines like United, Delta, American, Southwest, JetBlue, Alaska.
Vary prices from $150 to $900, durations from 90 to 480 minutes.
Use realistic flight numbers and times (HH:MM format).`,
  });

  return object.flights;
}

async function rankFlightsInSandbox(flights: Flight[]): Promise<Flight[]> {
  "use step";

  const sandbox = await Sandbox.create({ runtime: "node24" });

  try {
    const script = `
const flights = ${JSON.stringify(flights)};

// Score each flight: lower price and shorter duration = higher score
const maxPrice = Math.max(...flights.map(f => f.price));
const maxDuration = Math.max(...flights.map(f => f.duration));

const ranked = flights
  .map(f => ({
    ...f,
    score: Math.round(
      ((1 - f.price / maxPrice) * 60) +
      ((1 - f.duration / maxDuration) * 30) +
      ((f.stops === 0 ? 10 : 0))
    )
  }))
  .sort((a, b) => b.score - a.score);

console.log(JSON.stringify(ranked));
`;

    await sandbox.writeFiles([
      { path: "rank.js", content: Buffer.from(script) },
    ]);

    const result = await sandbox.runCommand("node", ["rank.js"]);
    const output = await result.stdout();
    return JSON.parse(output) as Flight[];
  } finally {
    await sandbox.stop();
  }
}
