"use client";

import { useState, useEffect, useRef, FormEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plane, Sparkles, CalendarDays, MapPin, ArrowRight, Bot, Users, Clock3 } from "lucide-react";
import { Button } from "@/components/ui/button";

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

const WORKFLOW_STEPS = [
  { label: "Vercel Workflow triggered", detail: "Durable multi-step job started" },
  { label: "AI Gateway → Claude Haiku", detail: "Generating flight options via model" },
  { label: "Vercel Sandbox scoring", detail: "Ephemeral VM running ranking algorithm" },
  { label: "Compute function returning results", detail: "Packaging ranked flights to client" },
];

function formatDuration(mins: number) {
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
}

function FlightResultCard({ f, dark = false, index = 0 }: { f: Flight; dark?: boolean; index?: number }) {
  const badges = ["Best value", "Fastest", "Lowest fare", "Most direct", "Top rated", "Editor's pick"];
  const badge = badges[index % badges.length];
  return (
    <div className={`rounded-3xl p-4 ${dark ? "bg-white/10 text-white ring-1 ring-white/15" : "bg-white text-slate-900 shadow-sm ring-1 ring-black/5"}`}>
      <div className="mb-3 flex items-center justify-between">
        <div>
          <p className={`text-sm ${dark ? "text-white/65" : "text-slate-500"}`}>{f.airline} · {f.flightNumber}</p>
          <p className="text-lg font-semibold">{f.stops === 0 ? "Nonstop" : `${f.stops} stop`}</p>
        </div>
        <div className={`rounded-full px-3 py-1 text-xs font-medium ${dark ? "bg-white/15 text-white" : "bg-emerald-50 text-emerald-700"}`}>{badge}</div>
      </div>
      <div className="flex items-end justify-between">
        <div>
          <p className="font-medium">{f.departureTime} → {f.arrivalTime}</p>
          <p className={`text-sm ${dark ? "text-white/55" : "text-slate-500"}`}>{formatDuration(f.duration)}</p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold">${f.price.toLocaleString()}</p>
          <p className={`text-xs ${dark ? "text-white/55" : "text-slate-500"}`}>per person</p>
        </div>
      </div>
    </div>
  );
}

function SearchPill({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-white/80 px-4 py-3 shadow-sm ring-1 ring-black/5 backdrop-blur">
      <div className="rounded-xl bg-slate-100 p-2"><Icon className="h-4 w-4" /></div>
      <div>
        <p className="text-xs text-slate-500">{label}</p>
        <p className="text-sm font-semibold text-slate-900">{value}</p>
      </div>
    </div>
  );
}

export default function FlightBooker() {
  const [origin, setOrigin] = useState("SFO");
  const [destination, setDestination] = useState("JFK");
  const [date, setDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().split("T")[0];
  });
  const [passengers, setPassengers] = useState(1);
  const [timePreference, setTimePreference] = useState("any");
  const [flights, setFlights] = useState<Flight[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stepStatuses, setStepStatuses] = useState<StepStatus[]>(["idle", "idle", "idle", "idle"]);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  function clearTimers() { timersRef.current.forEach(clearTimeout); timersRef.current = []; }
  useEffect(() => () => clearTimers(), []);

  function setStep(i: number, s: StepStatus) {
    setStepStatuses((prev) => { const n = [...prev]; n[i] = s; return n; });
  }

  async function handleSearch(e?: FormEvent) {
    e?.preventDefault();
    clearTimers();
    setLoading(true);
    setError(null);
    setFlights(null);
    setStepStatuses(["idle", "idle", "idle", "idle"]);

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
        body: JSON.stringify({ origin, destination, date, passengers, timePreference }),
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

  const showPipeline = loading || stepStatuses.some((s) => s !== "idle");
  const dateLabel = date ? new Date(date + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "Pick a date";
  const originName = AIRPORTS.find((a) => a.code === origin)?.name ?? origin;
  const destName = AIRPORTS.find((a) => a.code === destination)?.name ?? destination;

  return (
    <main className="min-h-screen bg-slate-100 p-4 md:p-8">
      <div className="mx-auto max-w-7xl space-y-8">

        <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }}>
          <section className="rounded-[2rem] bg-[#f6f0e8] p-6 text-slate-950 shadow-xl">
            <nav className="mb-8 flex items-center justify-between">
              <div className="flex items-center gap-2 text-xl font-bold"><Plane className="h-6 w-6" /> Aerra</div>
            </nav>
            <div className="grid gap-8 md:grid-cols-[1.05fr_.95fr]">
              {/* Left — search form */}
              <div className="pt-4">
                <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-white/70 px-4 py-2 text-sm shadow-sm">
                  <Sparkles className="h-4 w-4" /> AI flight planning
                </div>
                <h2 className="max-w-2xl text-4xl font-semibold leading-tight tracking-tight">
                  Book the smarter route, not just the cheapest one.
                </h2>
                <p className="mt-4 max-w-xl text-base text-slate-600">
                  Tell Aerra where you&apos;re going. It routes through Vercel Workflows, scores options via Sandbox, and calls Claude via AI Gateway.
                </p>

                {/* Search pills / inputs */}
                <form onSubmit={handleSearch} className="mt-7 space-y-4">
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="flex flex-col gap-1 rounded-2xl bg-white/80 px-4 py-3 shadow-sm ring-1 ring-black/5">
                      <div className="flex items-center gap-2">
                        <div className="rounded-xl bg-slate-100 p-2"><MapPin className="h-4 w-4" /></div>
                        <p className="text-xs text-slate-500">From</p>
                      </div>
                      <input
                        list="airports-from"
                        className="bg-transparent text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none mt-1"
                        value={origin}
                        onChange={(e) => setOrigin(e.target.value.toUpperCase())}
                        placeholder="e.g. SFO or LHR"
                        required
                      />
                      <datalist id="airports-from">
                        {AIRPORTS.map((a) => <option key={a.code} value={a.code}>{a.name}</option>)}
                      </datalist>
                    </div>

                    <div className="flex flex-col gap-1 rounded-2xl bg-white/80 px-4 py-3 shadow-sm ring-1 ring-black/5">
                      <div className="flex items-center gap-2">
                        <div className="rounded-xl bg-slate-100 p-2"><MapPin className="h-4 w-4" /></div>
                        <p className="text-xs text-slate-500">To</p>
                      </div>
                      <input
                        list="airports-to"
                        className="bg-transparent text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none mt-1"
                        value={destination}
                        onChange={(e) => setDestination(e.target.value.toUpperCase())}
                        placeholder="e.g. JFK or CDG"
                        required
                      />
                      <datalist id="airports-to">
                        {AIRPORTS.map((a) => <option key={a.code} value={a.code}>{a.name}</option>)}
                      </datalist>
                    </div>

                    <div className="flex flex-col gap-1 rounded-2xl bg-white/80 px-4 py-3 shadow-sm ring-1 ring-black/5">
                      <div className="flex items-center gap-2">
                        <div className="rounded-xl bg-slate-100 p-2"><CalendarDays className="h-4 w-4" /></div>
                        <p className="text-xs text-slate-500">Date</p>
                      </div>
                      <input
                        type="date"
                        className="bg-transparent text-sm font-semibold text-slate-900 focus:outline-none mt-1"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        required
                      />
                    </div>

                    <div className="flex flex-col gap-1 rounded-2xl bg-white/80 px-4 py-3 shadow-sm ring-1 ring-black/5">
                      <div className="flex items-center gap-2">
                        <div className="rounded-xl bg-slate-100 p-2"><Users className="h-4 w-4" /></div>
                        <p className="text-xs text-slate-500">Travelers</p>
                      </div>
                      <select
                        className="bg-transparent text-sm font-semibold text-slate-900 focus:outline-none mt-1"
                        value={passengers}
                        onChange={(e) => setPassengers(Number(e.target.value))}
                      >
                        {[1,2,3,4,5].map((n) => <option key={n} value={n}>{n} adult{n > 1 ? "s" : ""}</option>)}
                      </select>
                    </div>

                    {/* Time preference — full width */}
                    <div className="col-span-2 flex flex-col gap-2 rounded-2xl bg-white/80 px-4 py-3 shadow-sm ring-1 ring-black/5">
                      <div className="flex items-center gap-2">
                        <div className="rounded-xl bg-slate-100 p-2"><Clock3 className="h-4 w-4" /></div>
                        <p className="text-xs text-slate-500">Departure time</p>
                      </div>
                      <div className="flex gap-2 flex-wrap mt-1">
                        {[
                          { value: "any",       label: "Any time" },
                          { value: "morning",   label: "🌅 Morning",   sub: "5am – 12pm" },
                          { value: "afternoon", label: "☀️ Afternoon", sub: "12pm – 6pm" },
                          { value: "evening",   label: "🌙 Evening",   sub: "6pm – 12am" },
                        ].map((opt) => (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => setTimePreference(opt.value)}
                            className={`rounded-xl px-3 py-1.5 text-sm font-medium transition-colors cursor-pointer ${
                              timePreference === opt.value
                                ? "bg-slate-900 text-white"
                                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                            }`}
                          >
                            {opt.label}
                            {opt.sub && <span className="ml-1 text-xs opacity-60">{opt.sub}</span>}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={loading}
                    className="h-12 rounded-2xl bg-[#dc6d4f] px-7 text-base hover:bg-[#c95f44] disabled:opacity-60"
                  >
                    {loading ? "Searching…" : <>Ask agent to search <ArrowRight className="ml-2 h-4 w-4" /></>}
                  </Button>
                </form>
              </div>

              {/* Right — workflow pipeline + results */}
              <div className="relative overflow-hidden rounded-[2rem] bg-slate-950 p-5 text-white">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(255,255,255,.22),transparent_35%),radial-gradient(circle_at_80%_30%,rgba(220,109,79,.45),transparent_35%)]" />
                <div className="relative">
                  <div className="mb-5 flex items-center justify-between">
                    <div>
                      <p className="text-sm text-white/60">Agent recommendation</p>
                      <p className="text-2xl font-semibold">
                        {flights ? `${origin} → ${destination}` : "Waiting for search…"}
                      </p>
                    </div>
                    <Bot className="h-8 w-8" />
                  </div>

                  {/* Pipeline steps */}
                  {showPipeline && (
                    <div className="mb-4 space-y-2">
                      {WORKFLOW_STEPS.map((step, i) => {
                        const s = stepStatuses[i];
                        return (
                          <div key={step.label} className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-sm transition-all duration-500 ${
                            s === "running" ? "bg-white/20 ring-1 ring-white/30" :
                            s === "done"    ? "bg-white/10" :
                            s === "error"   ? "bg-red-500/20 ring-1 ring-red-400/40" :
                            "opacity-30 bg-white/5"
                          }`}>
                            <span className="flex-shrink-0 w-4">
                              {s === "running" && (
                                <svg className="animate-spin h-4 w-4 text-[#dc6d4f]" viewBox="0 0 24 24" fill="none">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                                </svg>
                              )}
                              {s === "done" && <svg className="h-4 w-4 text-emerald-400" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414L8.414 15 3.293 9.879a1 1 0 011.414-1.414L8.414 12.172l6.879-6.879a1 1 0 011.414 0z" clipRule="evenodd"/></svg>}
                              {s === "error" && <span className="text-red-400">✕</span>}
                              {s === "idle" && <div className="w-3 h-3 rounded-full border border-white/30 mx-auto"/>}
                            </span>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-white/90 truncate">{step.label}</p>
                              {s !== "idle" && <p className="text-xs text-white/50">{step.detail}</p>}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Error */}
                  {error && (
                    <div className="mb-4 rounded-2xl bg-red-500/20 p-4 text-sm text-red-300 font-mono break-all ring-1 ring-red-400/30">
                      {error}
                    </div>
                  )}

                  {/* Results */}
                  <AnimatePresence>
                    {flights && (
                      <motion.div
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="space-y-3"
                      >
                        {flights.slice(0, 3).map((f, i) => (
                          <FlightResultCard key={i} f={f} dark index={i} />
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {!showPipeline && !flights && (
                    <div className="space-y-3 opacity-40 pointer-events-none">
                      {[
                        { airline: "—", flightNumber: "—", departureTime: "--:--", arrivalTime: "--:--", duration: 0, price: 0, stops: 0 },
                        { airline: "—", flightNumber: "—", departureTime: "--:--", arrivalTime: "--:--", duration: 0, price: 0, stops: 0 },
                      ].map((f, i) => (
                        <div key={i} className="rounded-3xl bg-white/10 p-4 h-24 animate-pulse" />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>
        </motion.div>


      </div>
    </main>
  );
}
