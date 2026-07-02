'use client';

const steps = [
  { label: 'Matching the Caroma range to your answers', delay: '0s' },
  { label: 'Validating in-wall compatibility (EasySwitch)', delay: '0.5s' },
  { label: 'Pulling live RRP pricing', delay: '1s' },
  { label: 'Confirming stock', delay: '1.5s' },
];

export default function ValidatingPanel() {
  return (
    <div className="validating-panel">
      <div className="validating-spinner" />
      <div className="validating-steps">
        {steps.map(s => (
          <div
            key={s.label}
            className="validating-step"
            style={{ animationDelay: s.delay }}
          >
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" fill="#17140F" />
              <path d="M7 12.5l3 3 7-7" stroke="#C6A060" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {s.label}
          </div>
        ))}
      </div>
    </div>
  );
}
