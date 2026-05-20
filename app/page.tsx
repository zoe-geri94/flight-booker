"use client";

import { useState, FormEvent } from "react";

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

  async function handleSearch(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setFlights(null);

    try {
      const res = await fetch("/api/search-flights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ origin, destination, date, passengers }),
      });

      if (!res.ok) throw new Error("Search failed");
      const data = await res.json();
      setFlights(data.flights);
    } catch (err) {
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

  return (
    <main className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">✈️ Flight Booker</h1>
        <p className="text-gray-500 mb-8 text-sm">
          Powered by Vercel Workflows · AI Gateway · Sandbox
        </p>

        <form
          onSubmit={handleSearch}
          className="bg-white rounded-xl shadow p-6 mb-8 grid grid-cols-2 gap-4"
        >
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">From</label>
            <input
              className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={origin}
              onChange={(e) => setOrigin(e.target.value.toUpperCase())}
              placeholder="SFO"
              maxLength={3}
              required
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">To</label>
            <input
              className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={destination}
              onChange={(e) => setDestination(e.target.value.toUpperCase())}
              placeholder="JFK"
              maxLength={3}
              required
            />
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
                  {n}
                </option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="col-span-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold rounded-lg py-2.5 transition-colors cursor-pointer"
          >
            {loading ? "Searching via Vercel Workflow..." : "Search Flights"}
          </button>
        </form>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 mb-6 text-sm">
            {error}
          </div>
        )}

        {flights && (
          <div className="space-y-3">
            <p className="text-sm text-gray-500">
              {flights.length} flights found — ranked by score (AI Gateway + Sandbox)
            </p>
            {flights.map((f, i) => (
              <div
                key={i}
                className="bg-white rounded-xl shadow p-5 flex items-center justify-between hover:shadow-md transition-shadow"
              >
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-gray-900">{f.airline}</span>
                    <span className="text-xs text-gray-400">{f.flightNumber}</span>
                    {f.stops === 0 ? (
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                        Nonstop
                      </span>
                    ) : (
                      <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">
                        {f.stops} stop{f.stops > 1 ? "s" : ""}
                      </span>
                    )}
                    {i === 0 && (
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                        Best value
                      </span>
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
