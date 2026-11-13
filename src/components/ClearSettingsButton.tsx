'use client';

import { useState } from 'react';

// Removes everything this site has saved in the browser (every entry starts with "fdb:"): the light or dark choice, the list
// views and the favourites. It asks first, because favourites cannot be brought back.
export default function ClearSettingsButton() {
  const [step, setStep] = useState<'idle' | 'confirm' | 'done'>('idle');

  const clear = () => {
    try {
      const keys: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith('fdb:')) keys.push(k);
      }
      keys.forEach((k) => localStorage.removeItem(k));
    } catch {
      /* storage is not available, so nothing was saved */
    }
    document.documentElement.removeAttribute('data-theme');
    setStep('done');
    window.setTimeout(() => window.location.reload(), 1200);
  };

  if (step === 'done') return <p style={{ marginTop: 12, fontWeight: 600 }}>Cleared. Reloading the page with the standard settings…</p>;
  if (step === 'confirm') {
    return (
      <div style={{ marginTop: 12 }}>
        <p>This removes your light or dark choice, your list views and all your favourites from this browser. Favourites cannot be brought back.</p>
        <div className="row" style={{ gap: 12, marginTop: 10, flexWrap: 'wrap' }}>
          <button className="btn" onClick={clear}>Yes, clear them</button>
          <button className="btn" onClick={() => setStep('idle')}>Cancel</button>
        </div>
      </div>
    );
  }
  return <button className="btn" style={{ marginTop: 12 }} onClick={() => setStep('confirm')}>Clear my saved settings</button>;
}
