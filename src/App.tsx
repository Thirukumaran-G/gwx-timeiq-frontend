import { useState, useEffect } from "react";

const API_BASE = process.env.REACT_APP_API_BASE ?? "/api";
const POLL_INTERVAL_MS = parseInt(process.env.REACT_APP_POLL_INTERVAL_MS ?? "0", 10);

interface Item {
  id: string;
  name: string;
  notes: string | null;
}

export default function App() {
  const [items, setItems]     = useState<Item[]>([]);
  const [name, setName]       = useState("");
  const [notes, setNotes]     = useState("");
  const [redis, setRedis]     = useState<string | null>(null);
  const [error, setError]     = useState("");
  const [loading, setLoading] = useState(false);

  const load = async () => {
    const r = await fetch(`${API_BASE}/items`);
    if (r.ok) setItems(await r.json());
  };

  const pingRedis = async () => {
    try {
      const r = await fetch(`${API_BASE}/ping-redis`);
      const d = await r.json();
      setRedis(d.redis === "ok" ? "✅ Redis connected" : "❌ Redis error");
    } catch {
      setRedis("❌ Redis unreachable");
    }
  };

  useEffect(() => {
    load();
    pingRedis();
    if (POLL_INTERVAL_MS > 0) {
      const id = setInterval(load, POLL_INTERVAL_MS);
      return () => clearInterval(id);
    }
  }, []);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    setError("");
    try {
      const r = await fetch(`${API_BASE}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, notes: notes || null }),
      });
      if (!r.ok) throw new Error(`Failed: ${r.status}`);
      setName("");
      setNotes("");
      await load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  const remove = async (id: string) => {
    await fetch(`${API_BASE}/items/${id}`, { method: "DELETE" });
    setItems(prev => prev.filter(i => i.id !== id));
  };

  return (
    <div style={{ maxWidth: 560, margin: "48px auto", padding: "0 16px", fontFamily: "system-ui, sans-serif" }}>
      <h1 style={{ fontSize: 22, fontWeight: 600, marginBottom: 4 }}>timeiq</h1>
      <p style={{ fontSize: 13, color: "#888", marginBottom: 24 }}>{redis ?? "checking redis…"}</p>

      {error && (
        <p style={{ background: "#fee", color: "#c0392b", padding: "8px 12px", borderRadius: 6, fontSize: 13, marginBottom: 16 }}>
          {error}
        </p>
      )}

      <form onSubmit={add} style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 32 }}>
        <input
          required
          placeholder="Item name"
          value={name}
          onChange={e => setName(e.target.value)}
          style={{ padding: "10px 12px", border: "1px solid #ddd", borderRadius: 6, fontSize: 14 }}
        />
        <input
          placeholder="Notes (optional)"
          value={notes}
          onChange={e => setNotes(e.target.value)}
          style={{ padding: "10px 12px", border: "1px solid #ddd", borderRadius: 6, fontSize: 14 }}
        />
        <button
          type="submit"
          disabled={loading}
          style={{ padding: "10px 0", background: "#4361ee", color: "#fff", border: "none", borderRadius: 6, fontSize: 14, fontWeight: 600, cursor: "pointer" }}
        >
          {loading ? "Adding…" : "Add item"}
        </button>
      </form>

      {items.length === 0 && <p style={{ color: "#aaa", fontSize: 14 }}>No items yet.</p>}

      {items.map(item => (
        <div key={item.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 0", borderBottom: "1px solid #f0f0f0" }}>
          <div style={{ flex: 1 }}>
            <p style={{ margin: 0, fontWeight: 500 }}>{item.name}</p>
            {item.notes && <p style={{ margin: "2px 0 0", fontSize: 12, color: "#888" }}>{item.notes}</p>}
          </div>
          <button
            onClick={() => remove(item.id)}
            style={{ background: "none", border: "none", cursor: "pointer", color: "#ccc", fontSize: 18 }}
          >✕</button>
        </div>
      ))}
    </div>
  );
}