import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

type TooltipState = {
  text: string;
  left: number;
  top: number;
  placement: 'top' | 'bottom';
};

function getTooltipTarget(target: EventTarget | null) {
  return target instanceof Element ? target.closest<HTMLElement>('[data-tooltip]') : null;
}

function resolveTooltip(target: HTMLElement): TooltipState | null {
  const text = target.getAttribute('data-tooltip')?.trim();
  if (!text) {
    return null;
  }

  const rect = target.getBoundingClientRect();
  const placement = rect.top > 56 ? 'top' : 'bottom';
  const rawLeft = rect.left + rect.width / 2;
  const left = Math.min(Math.max(rawLeft, 16), window.innerWidth - 16);
  const top = placement === 'top' ? rect.top - 8 : rect.bottom + 8;

  return { text, left, top, placement };
}

export default function FloatingTooltip() {
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);

  useEffect(() => {
    let activeTarget: HTMLElement | null = null;

    function show(target: HTMLElement | null) {
      activeTarget = target;
      setTooltip(target ? resolveTooltip(target) : null);
    }

    function handlePointerOver(event: PointerEvent) {
      show(getTooltipTarget(event.target));
    }

    function handlePointerOut(event: PointerEvent) {
      const target = getTooltipTarget(event.target);
      if (target && !target.contains(event.relatedTarget as Node | null)) {
        show(null);
      }
    }

    function handleFocusIn(event: FocusEvent) {
      show(getTooltipTarget(event.target));
    }

    function handleFocusOut(event: FocusEvent) {
      const target = getTooltipTarget(event.target);
      if (target && !target.contains(event.relatedTarget as Node | null)) {
        show(null);
      }
    }

    function refreshPosition() {
      if (activeTarget) {
        setTooltip(resolveTooltip(activeTarget));
      }
    }

    function hide() {
      show(null);
    }

    document.addEventListener('pointerover', handlePointerOver);
    document.addEventListener('pointerout', handlePointerOut);
    document.addEventListener('focusin', handleFocusIn);
    document.addEventListener('focusout', handleFocusOut);
    document.addEventListener('scroll', refreshPosition, true);
    window.addEventListener('resize', refreshPosition);
    window.addEventListener('keydown', hide);

    return () => {
      document.removeEventListener('pointerover', handlePointerOver);
      document.removeEventListener('pointerout', handlePointerOut);
      document.removeEventListener('focusin', handleFocusIn);
      document.removeEventListener('focusout', handleFocusOut);
      document.removeEventListener('scroll', refreshPosition, true);
      window.removeEventListener('resize', refreshPosition);
      window.removeEventListener('keydown', hide);
    };
  }, []);

  if (!tooltip) {
    return null;
  }

  return createPortal(
    <div
      className="pointer-events-none fixed z-[9999] max-w-xs rounded-md bg-ink px-2.5 py-1.5 text-center text-xs font-semibold leading-snug text-white shadow-lg dark:bg-white dark:text-ink"
      style={{
        left: tooltip.left,
        top: tooltip.top,
        transform: tooltip.placement === 'top' ? 'translate(-50%, -100%)' : 'translate(-50%, 0)',
      }}
      role="tooltip"
    >
      {tooltip.text}
    </div>,
    document.body,
  );
}
