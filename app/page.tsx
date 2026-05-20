"use client";

import { useState, useEffect, useRef, FormEvent } from "react";

interface Flight {
  airline: string;
  flightNumber: string;
  departureTime: string;
  arrivalTime: string;
  duration: number;
  price: number;
  stops: number;
  score?: number;
}

type StepStatus = "idle" | "running" | "done" | "error";

interface WorkflowStep {
  id: string;
  label: string;
  detail: string;
  color: string;
}

const WORKFLOW_STEPS: WorkflowStep[] = [
  {
    id: "workflow",
    label: "Vercel Workflow triggered",
    detail: "Durable multi-step job started — survives crashes & deploys",
    color: "blue",
  },
  {
    id: "gateway",
    label: "AI Gateway → Claude Haiku",
    detail: "Routing model call through Vercel AI Gateway, generating flight options",
    color: "purple",
  },
  {
    id: "sandbox",
    label: "Vercel Sandbox scoring flights",
    detail: "Spinning up ephemeral Linux VM — running scoring algorithm in isolation",
    color: "orange",
  },
  {
    id: "function",
    label: "Compute function returning results",
    detail: "Serverless function packaging ranked flights back to the client",
    color: "green",
  },
];

const AIRPORTS = [
  { code: "SFO", name: "San Francisco" },
  { code: "JFK", name: "New York (JFK)" },
  { code: "LAX", name: "Los Angeles" },
  { code: "ORD", name: "Chicago O'Hare" },
  { code: "MIA", name: "Miami" },
  { code: "SEA", name: "Seattle" },
  { code: "BOS", name: "Boston" },
  { code: "DEN", name: "Denver" },
  { code: "ATL", name: "Atlanta" },
  { code: "DFW", name: "Dallas/Fort Worth" },
  { code: "LAS", name: "Las Vegas" },
  { code: "AUS", name: "Austin" },
  { code: "PDX", name: "Portland" },
  { code: "MSP", name: "Minneapolis" },
  { code: "PHL", name: "Philadelphia" },
];

const STEP_DELAYS = [0, 1200, 3500, 6000];

export default function Home() {
  const [origin, setOrigin] = useState("SFO");
  const [destination, setDestination] = useState("JFK");
  const [date, setDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().split("T")[0];
  });
  const [passengers, setPassengers] = useState(1);
  const [flights, setFlights] = useState<Flight[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stepStatuses, setStepStatuses] = useState<StepStatus[]>(["idle", "idle", "idle", "idle"]);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  function clearTimers() {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
  }

  useEffect(() => () => clearTimers(), []);

  function setStep(index: number, status: StepStatus) {
    setStepStatuses((prev) => {
      const next = [...prev];
      next[index] = status;
      return next;
    });
  }

  async function handleSearch(e: FormEvent) {
    e.preventDefault();
    clearTimers();
    setLoading(true);
    setError(null);
    setFlights(null);
    setStepStatuses(["idle", "idle", "idle", "idle"]);

    // Animate steps on a timer while the real request is in flight
    STEP_DELAYS.forEach((delay, i) => {
      const t = setTimeout(() => {
        setStep(i, "running");
        if (i > 0) setStep(i - 1, "done");
      }, delay);
      timersRef.current.push(t);
    });

    try {
      const res = await fetch("/api/search-flights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ origin, destination, date, passengers }),
      });

      clearTimers();

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Search failed");
      }

      const data = await res.json();
      setStepStatuses(["done", "done", "done", "done"]);
      setFlights(data.flights);
    } catch (err) {
      clearTimers();
      setStepStatuses((prev) => prev.map((s) => (s === "running" ? "error" : s)));
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  function formatDuration(mins: number) {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${h}h ${m}m`;
  }

  const colorMap: Record<string, Record<string, string>> = {
    blue:   { ring: "ring-blue-400",   bg: "bg-blue-50",   dot: "bg-blue-500",   text: "text-blue-700",   badge: "bg-blue-100 text-blue-700" },
    purple: { ring: "ring-purple-400", bg: "bg-purple-50", dot: "bg-purple-500", text: "text-purple-700", badge: "bg-purple-100 text-purple-700" },
    orange: { ring: "ring-orange-400", bg: "bg-orange-50", dot: "bg-orange-500", text: "text-orange-700", badge: "bg-orange-100 text-orange-700" },
    green:  { ring: "ring-green-400",  bg: "bg-green-50",  dot: "bg-green-500",  text: "text-green-700",  badge: "bg-green-100 text-green-700" },
  };

  const showPipeline = loading || stepStatuses.some((s) => s !== "idle");

  return (
    <main className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">✈️ Flight Booker</h1>
        <p className="text-gray-500 mb-8 text-sm">
          Powered by Vercel Workflows · AI Gateway · Sandbox · Compute
        </p>

        <form
          onSubmit={handleSearch}
          className="bg-white rounded-xl shadow p-6 mb-6 grid grid-cols-2 gap-4"
        >
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">From</label>
            <input
              list="airports-from"
              className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={origin}
              onChange={(e) => setOrigin(e.target.value.toUpperCase())}
              placeholder="e.g. SFO or LHR"
              required
            />
            <datalist id="airports-from">
              {AIRPORTS.map((a) => (
                <option key={a.code} value={a.code}>{a.name}</option>
              ))}
            </datalist>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">To</label>
            <input
              list="airports-to"
              className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={destination}
              onChange={(e) => setDestination(e.target.value.toUpperCase())}
              placeholder="e.g. JFK or CDG"
              required
            />
            <datalist id="airports-to">
              {AIRPORTS.map((a) => (
                <option key={a.code} value={a.code}>{a.name}</option>
              ))}
            </datalist>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Date</label>
            <input
              type="date"
              className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Passengers</label>
            <select
              className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={passengers}
              onChange={(e) => setPassengers(Number(e.target.value))}
            >
              {[1, 2, 3, 4, 5].map((n) => (
                <option key={n} value={n}>
                  {n} passenger{n > 1 ? "s" : ""}
                </option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="col-span-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold rounded-lg py-2.5 transition-colors cursor-pointer"
          >
            {loading ? "Searching…" : "Search Flights"}
          </button>
        </form>

        {/* Workflow pipeline visualizer */}
        {showPipeline && (
          <div className="bg-white rounded-xl shadow p-5 mb-6">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">
              What&apos;s happening behind the scenes
            </p>
            <div className="flex flex-col gap-3">
              {WORKFLOW_STEPS.map((step, i) => {
                const status = stepStatuses[i];
                const c = colorMap[step.color];
                return (
                  <div
                    key={step.id}
                    className={`flex items-start gap-3 rounded-lg p-3 transition-all duration-500 ${
                      status === "running" ? `${c.bg} ring-1 ${c.ring}` :
                      status === "done"    ? "bg-gray-50" :
                      status === "error"   ? "bg-red-50 ring-1 ring-red-300" :
                      "opacity-40"
                    }`}
                  >
                    {/* Status icon */}
                    <div className="mt-0.5 flex-shrink-0 w-5 h-5 flex items-center justify-center">
                      {status === "running" && (
                        <svg className={`animate-spin w-4 h-4 ${c.text}`} viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                        </svg>
                      )}
                      {status === "done" && (
                        <svg className="w-4 h-4 text-green-500" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414L8.414 15 3.293 9.879a1 1 0 011.414-1.414L8.414 12.172l6.879-6.879a1 1 0 011.414 0z" clipRule="evenodd"/>
                        </svg>
                      )}
                      {status === "error" && (
                        <svg className="w-4 h-4 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v4a1 1 0 102 0V7zm-1 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd"/>
                        </svg>
                      )}
                      {status === "idle" && (
                        <div className="w-3 h-3 rounded-full border-2 border-gray-300"/>
                      )}
                    </div>

                    {/* Text */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-sm font-medium ${status === "idle" ? "text-gray-400" : "text-gray-800"}`}>
                          {step.label}
                        </span>
                        {status === "running" && (
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${c.badge}`}>
                            running
                          </span>
                        )}
                        {status === "done" && (
                          <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-green-100 text-green-700">
                            done
                          </span>
                        )}
                      </div>
                      {status !== "idle" && (
                        <p className="text-xs text-gray-500 mt-0.5">{step.detail}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 mb-6 text-sm font-mono break-all">
            {error}
          </div>
        )}

        {flights && (
          <div className="space-y-3">
            <p className="text-sm text-gray-500">
              {flights.length} flights found — ranked by value score
            </p>
            {flights.map((f, i) => (
              <div
                key={i}
                className="bg-white rounded-xl shadow p-5 flex items-center justify-between hover:shadow-md transition-shadow"
              >
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-gray-900">{f.airline}</span>
                    <span className="text-xs text-gray-400">{f.flightNumber}</span>
                    {f.stops === 0 ? (
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Nonstop</span>
                    ) : (
                      <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">
                        {f.stops} stop{f.stops > 1 ? "s" : ""}
                      </span>
                    )}
                    {i === 0 && (
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">Best value</span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-sm text-gray-600">
                    <span className="font-medium">{f.departureTime}</span>
                    <span className="text-gray-300">→</span>
                    <span className="font-medium">{f.arrivalTime}</span>
                    <span className="text-gray-400">·</span>
                    <span>{formatDuration(f.duration)}</span>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-1">
                  <span className="text-2xl font-bold text-gray-900">
                    ${(f.price * passengers).toLocaleString()}
                  </span>
                  {passengers > 1 && (
                    <span className="text-xs text-gray-400">${f.price}/person</span>
                  )}
                  {f.score !== undefined && (
                    <span className="text-xs text-gray-400">Score: {f.score}</span>
                  )}
                  <button className="mt-1 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-1.5 rounded-lg transition-colors cursor-pointer">
                    Select
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
