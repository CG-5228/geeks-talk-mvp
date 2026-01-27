"use client";
import { useState } from 'react';

export default function UsernameEditor({ initialUsername }: { initialUsername: string }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(initialUsername);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSave = async () => {
    setPending(true); setError(null);
    const res = await fetch('/api/user/profile', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: value })
    });
    if (res.ok) setEditing(false);
    else {
      const data = await res.json().catch(() => ({}));
      // Handle both string errors and error objects (defensive)
      let errorText = 'Failed to update';
      if (data.error) {
        if (typeof data.error === 'string') {
          errorText = data.error;
        } else if (typeof data.error === 'object' && data.error !== null) {
          if (data.error.formErrors && Array.isArray(data.error.formErrors) && data.error.formErrors.length > 0) {
            errorText = data.error.formErrors[0];
          } else if (data.error.fieldErrors?.username && Array.isArray(data.error.fieldErrors.username) && data.error.fieldErrors.username.length > 0) {
            errorText = data.error.fieldErrors.username[0];
          }
        }
      }
      setError(errorText);
    }
    setPending(false);
  };

  return (
    <div>
      <div className="flex items-center gap-2">
        <input
          className={`rounded-md px-3 py-2 bg-white/5 ring-1 ring-[color:var(--nav-border)]/20 ${editing ? '' : 'pointer-events-none opacity-80'}`}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          disabled={!editing}
        />
        {!editing ? (
          <button className="btn rounded-md px-3 py-2" onClick={() => setEditing(true)}>Edit</button>
        ) : (
          <>
            <button className="btn-primary rounded-md px-3 py-2" onClick={onSave} disabled={pending}>Save</button>
            <button className="btn rounded-md px-3 py-2" onClick={() => { setValue(initialUsername); setEditing(false); }}>Cancel</button>
          </>
        )}
      </div>
      {error && <div className="mt-2 text-sm text-red-400">{error}</div>}
    </div>
  );
}
