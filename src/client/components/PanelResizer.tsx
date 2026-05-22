import React, { useRef, useCallback } from "react";

interface Props {
  side: "left" | "right";
  target: string;
}

export function PanelResizer({ side, target }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const panel = document.querySelector(target) as HTMLElement;
    if (!panel) return;

    const startX = e.clientX;
    const startWidth = panel.offsetWidth;
    ref.current?.classList.add("dragging");

    function onMove(e: MouseEvent) {
      const dx = e.clientX - startX;
      const newWidth = side === "left" ? startWidth + dx : startWidth - dx;
      panel.style.width = Math.max(160, Math.min(600, newWidth)) + "px";
    }

    function onUp() {
      ref.current?.classList.remove("dragging");
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
      try { localStorage.setItem("differ-panel-" + side, panel.style.width); } catch {}
    }

    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }, [side, target]);

  return <div ref={ref} className="panel-divider" onMouseDown={onMouseDown} />;
}
