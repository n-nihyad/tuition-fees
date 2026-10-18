// Decorative illustration only: no simulated account details or payment status.
export function TuitionSlip({ className = '' }: { className?: string }) {
  return <svg className={`tuition-slip ${className}`} viewBox="0 0 240 280" fill="none" aria-hidden="true" focusable="false">
    <g transform="rotate(7 120 140)">
      <path d="M49 35h132a10 10 0 0 1 10 10v200l-12-6-12 6-12-6-12 6-12-6-12 6-12-6-12 6-12-6-12 6-12-6-12 6V45a10 10 0 0 1 10-10Z" fill="#DDF2E3" stroke="#A2BEAA" />
    </g>
    <g transform="rotate(-7 120 140)">
      <path d="M48 27h119l25 25v181l-12-6-12 6-12-6-12 6-12-6-12 6-12-6-12 6-12-6-12 6-12-6-12 6V27Z" fill="#FFFCF7" stroke="#BBC8BA" strokeWidth="1.2" />
      <path d="M167 27v25h25" fill="#F3E7E7" /><path d="M167 27v25h25" stroke="#BBC8BA" strokeWidth="1.2" />
      <path d="M69 51h15l5 5v27l-5-3-5 3-5-3-5 3V51Z" stroke="#347653" strokeWidth="1.8" strokeLinejoin="round" /><path d="M75 62h8m-8 7h6" stroke="#347653" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M105 61h34m-34 10h19" stroke="#5B7561" strokeWidth="3" strokeLinecap="round" />
      <path d="M69 104h101M69 158h101" stroke="#D9DFD3" strokeDasharray="3 4" />
      <path d="M69 122h48m-48 15h30m42-15h29m-21 15h21" stroke="#A4B3A1" strokeWidth="3" strokeLinecap="round" />
      <rect x="69" y="175" width="101" height="26" rx="5" fill="#F8DEE6" />
      <path d="M80 188h28m23 0h28" stroke="#8A596A" strokeWidth="2.6" strokeLinecap="round" />
    </g>
  </svg>
}
