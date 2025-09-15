"use client";

import { useMemo, useState } from "react";

type Item = { id: string; label: string; code?: string | null; category?: string | null };

type Props = {
  items: Item[];
};

export default function ProductPickers({ items }: Props) {
  const [qName, setQName] = useState("");
  const [qCode, setQCode] = useState("");
  const [selected, setSelected] = useState<string[]>([]);

  const norm = (s: string) => s.normalize("NFKD").toLowerCase();

  const namePool = useMemo(() => {
    const q = norm(qName.trim());
    return q ? items.filter((i) => norm(i.label).startsWith(q)) : items;
  }, [items, qName]);

  const codePool = useMemo(() => {
    const q = norm(qCode.trim());
    return q
      ? items.filter((i) => norm(i.code ?? "").startsWith(q))
      : items.filter((i) => (i.code ?? "") !== "");
  }, [items, qCode]);

  const nameSize = useMemo(() => Math.min(10, Math.max(6, namePool.length)), [namePool.length]);
  const codeSize = useMemo(() => Math.min(10, Math.max(6, codePool.length)), [codePool.length]);

  const onNameChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const ids = Array.from(e.currentTarget.selectedOptions).map((o) => o.value);
    setSelected((prev) => Array.from(new Set([...prev, ...ids])));
  };

  const onCodeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const ids = Array.from(e.currentTarget.selectedOptions).map((o) => o.value);
    setSelected((prev) => Array.from(new Set([...prev, ...ids])));
  };

  const remove = (id: string) => setSelected((prev) => prev.filter((x) => x !== id));

  const selectedItems = selected
    .map((id) => items.find((i) => i.id === id))
    .filter(Boolean) as Item[];

  const namePoolIds = new Set(namePool.map((i) => i.id));
  const codePoolIds = new Set(codePool.map((i) => i.id));

  return (
    <div className="w-full">
      <div className="grid gap-6 sm:grid-cols-2">
        <div>
          <label htmlFor="search-name" className="block text-sm font-medium text-gray-700">
            Search by name
          </label>
          <input
            id="search-name"
            type="text"
            value={qName}
            onChange={(e) => setQName(e.target.value)}
            placeholder="Type name..."
            className="mt-2 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 shadow-sm focus:border-gray-400 focus:outline-none"
          />
          {qName.trim() ? (
            <select
              aria-label="Results by name"
              multiple
              size={nameSize}
              className="mt-2 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 shadow-sm focus:border-gray-400 focus:outline-none"
              value={selected.filter((id) => namePoolIds.has(id))}
              onChange={onNameChange}
            >
              {namePool.map((it) => (
                <option key={it.id} value={it.id}>
                  {it.label}
                </option>
              ))}
            </select>
          ) : null}
        </div>
        <div>
          <label htmlFor="search-code" className="block text-sm font-medium text-gray-700">
            Search by barcode
          </label>
          <input
            id="search-code"
            type="text"
            value={qCode}
            onChange={(e) => setQCode(e.target.value)}
            placeholder="Type barcode..."
            className="mt-2 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 shadow-sm focus:border-gray-400 focus:outline-none"
          />
          {qCode.trim() ? (
            <select
              aria-label="Results by barcode"
              multiple
              size={codeSize}
              className="mt-2 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 shadow-sm focus:border-gray-400 focus:outline-none"
              value={selected.filter((id) => codePoolIds.has(id))}
              onChange={onCodeChange}
            >
              {codePool.map((it) => (
                <option key={it.id} value={it.id}>
                  {(it.code ? `${it.code} — ` : "") + it.label}
                </option>
              ))}
            </select>
          ) : null}
        </div>
      </div>

      <div className="mt-6">
        <h2 className="text-sm font-semibold text-gray-800">Selected products</h2>
        {selectedItems.length === 0 ? (
          <p className="mt-2 text-sm text-gray-600">No products selected</p>
        ) : (
          <ul className="mt-2 divide-y divide-gray-200 rounded-md border border-gray-200">
            {selectedItems.map((it) => (
              <li key={it.id} className="flex items-center justify-between px-4 py-2">
                <span className="truncate text-sm text-gray-900">
                  {it.label}
                  {it.category ? <span className="text-gray-500"> [{it.category}] (Category)</span> : null}
                  {it.code ? <span className="text-gray-500"> — {it.code}</span> : null}
                </span>
                <button
                  type="button"
                  onClick={() => remove(it.id)}
                  className="ml-4 inline-flex items-center rounded-md border border-gray-300 px-2 py-1 text-xs text-gray-700 hover:bg-gray-50"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
