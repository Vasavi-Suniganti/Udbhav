import { type ButtonHTMLAttributes } from 'react';
import { ArrowRight } from 'lucide-react';

interface FlowButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Label displayed inside the button */
  text: string;
}

/**
 * Animated pill button themed for JANSETU AI civic platform.
 *
 * Normal state:  forest-green border & text, transparent background, right arrow.
 * Hover state:   expanding forest-green circle, cream/paper text, left arrow enters,
 *                right arrow exits, pill → rounded-rectangle transition.
 * Active:        subtle scale press.
 * Disabled:      reduced opacity, no pointer events.
 *
 * A subtle teal → lavender bottom-right glow adds the "AI" accent on hover
 * without dominating the civic green palette.
 */
export default function FlowButton({ text, className = '', disabled, ...rest }: FlowButtonProps) {
  return (
    <button
      disabled={disabled}
      className={`
        group relative inline-flex items-center justify-center
        h-11 min-w-[140px] px-6
        rounded-full bg-transparent
        font-semibold text-sm
        overflow-hidden cursor-pointer
        transition-[border-radius] duration-500 ease-[cubic-bezier(0.76,0,0.24,1)]
        hover:rounded-xl
        active:scale-95 active:duration-150
        disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none
        ${className}
      `.trim()}
      style={{
        /* 1.5px forest-green / teal border — Tailwind border-[1.5px] may not JIT reliably */
        border: '1.5px solid #1e7048',
        color: '#124c36',
      }}
      {...rest}
    >
      {/* ── Expanding forest-green circle ── */}
      <span
        className="pointer-events-none absolute inset-0"
        aria-hidden="true"
      >
        <span
          className="
            absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2
            w-0 h-0 rounded-full
            transition-all duration-500 ease-[cubic-bezier(0.76,0,0.24,1)]
            group-hover:w-[340%] group-hover:h-[340%]
          "
          style={{ background: 'linear-gradient(135deg, #1e7048 60%, #237f76 100%)' }}
        />
      </span>

      {/* ── Subtle AI accent glow (teal→lavender) — visible only on hover ── */}
      <span
        className="
          pointer-events-none absolute bottom-0 right-0
          w-16 h-16 rounded-full
          opacity-0 blur-xl
          transition-opacity duration-500 ease-[cubic-bezier(0.76,0,0.24,1)]
          group-hover:opacity-40
        "
        style={{ background: 'radial-gradient(circle, #705ab4, #2d9188)' }}
        aria-hidden="true"
      />

      {/* ── Left arrow — enters from left on hover ── */}
      <span
        className="
          absolute left-5 top-1/2 -translate-y-1/2
          -translate-x-8 opacity-0
          transition-all duration-500 ease-[cubic-bezier(0.76,0,0.24,1)]
          group-hover:translate-x-0 group-hover:opacity-100
          z-10
        "
        style={{ color: '#fffaf0' }}
        aria-hidden="true"
      >
        <ArrowRight size={16} />
      </span>

      {/* ── Text — shifts right on hover, changes to cream ── */}
      <span
        className="
          relative z-10
          transition-all duration-500 ease-[cubic-bezier(0.76,0,0.24,1)]
          group-hover:translate-x-3
        "
        style={{ color: 'inherit' }}
      >
        <span className="group-hover:hidden">{text}</span>
        <span className="hidden group-hover:inline" style={{ color: '#fffaf0' }}>{text}</span>
      </span>

      {/* ── Right arrow — exits to the right on hover ── */}
      <span
        className="
          relative z-10 ml-2
          transition-all duration-500 ease-[cubic-bezier(0.76,0,0.24,1)]
          group-hover:translate-x-8 group-hover:opacity-0
        "
        aria-hidden="true"
      >
        <ArrowRight size={16} />
      </span>
    </button>
  );
}
