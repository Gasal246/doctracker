"use client";

import {
  forwardRef,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

type ClassValue = false | null | undefined | string;

function cn(...values: ClassValue[]) {
  return values.filter(Boolean).join(" ");
}

type ButtonTone = "active" | "danger" | "muted" | "primary";

type SketchButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  tone?: ButtonTone;
};

export function SketchButton({
  className,
  tone = "primary",
  type = "button",
  ...props
}: SketchButtonProps) {
  return (
    <button
      className={cn(
        "sketch-button",
        tone === "active" && "sketch-button-active",
        tone === "muted" && "sketch-button-muted",
        tone === "danger" && "sketch-button-danger",
        className,
      )}
      type={type}
      {...props}
    />
  );
}

export const SketchInput = forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(function SketchInput({ className, ...props }, ref) {
  return <input className={cn("sketch-input", className)} ref={ref} {...props} />;
});

export function SketchSelect({
  className,
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={cn("sketch-input", "appearance-none", className)} {...props}>
      {children}
    </select>
  );
}

type SketchSelectMenuOption = {
  label: string;
  value: string;
};

export function SketchSelectMenu({
  className,
  id,
  onChange,
  options,
  placeholder,
  value,
}: {
  className?: string;
  id?: string;
  onChange: (value: string) => void;
  options: SketchSelectMenuOption[];
  placeholder: string;
  value: string;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (containerRef.current?.contains(event.target as Node)) {
        return;
      }

      setIsOpen(false);
    }

    window.addEventListener("mousedown", handlePointerDown);

    return () => {
      window.removeEventListener("mousedown", handlePointerDown);
    };
  }, []);

  const selectedOption = options.find((option) => option.value === value);

  return (
    <div className={cn("relative", className)} ref={containerRef}>
      <button
        aria-expanded={isOpen}
        className={cn(
          "sketch-input flex items-center justify-between gap-3 text-left",
          !selectedOption && "text-[rgba(78,72,65,0.72)]",
        )}
        id={id}
        onClick={() => setIsOpen((current) => !current)}
        type="button"
      >
        <span className="truncate">{selectedOption?.label || placeholder}</span>
        <span className={cn("shrink-0 transition", isOpen && "rotate-180")}>⌄</span>
      </button>

      {isOpen ? (
        <div className="sketch-context-menu absolute left-0 right-0 top-[calc(100%+10px)] z-30 max-h-64 overflow-y-auto">
          {options.map((option) => (
            <button
              className={cn(
                "flex w-full rounded-[14px] px-3 py-2 text-left text-xl transition hover:bg-[rgba(89,126,160,0.14)]",
                option.value === value && "bg-[rgba(89,126,160,0.16)]",
              )}
              key={option.value}
              onClick={() => {
                onChange(option.value);
                setIsOpen(false);
              }}
              type="button"
            >
              {option.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function SketchCard({
  children,
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
}) {
  return (
    <div className={cn("sketch-card", className)} {...props}>
      {children}
    </div>
  );
}

export function SketchBadge({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <span className={cn("sketch-badge", className)}>{children}</span>;
}

export function StatusBanner({
  message,
  tone = "primary",
}: {
  message: string;
  tone?: "danger" | "primary";
}) {
  return (
    <div
      className={cn(
        "rounded-[20px] border-[3px] px-4 py-3 text-lg shadow-[2px_2px_0_rgba(34,31,28,0.65)]",
        tone === "danger"
          ? "border-[var(--sketch-ink)] bg-[rgba(210,120,120,0.82)] text-[var(--sketch-ink)]"
          : "border-[var(--sketch-ink)] bg-[rgba(89,126,160,0.2)] text-[var(--sketch-ink)]",
      )}
    >
      {message}
    </div>
  );
}

export function ModalShell({
  children,
  closeOnBackdrop = true,
  onClose,
  title,
}: {
  children: ReactNode;
  closeOnBackdrop?: boolean;
  onClose: () => void;
  title: string;
}) {
  return (
    <div
      className="sketch-modal-backdrop fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={() => {
        if (closeOnBackdrop) {
          onClose();
        }
      }}
    >
      <div
        className="sketch-panel max-h-[90vh] w-full max-w-2xl overflow-y-auto p-6 md:p-8"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-6 flex items-start justify-between gap-4">
          <h2 className="text-3xl leading-none md:text-4xl">{title}</h2>
          <SketchButton className="min-w-0 px-4 py-2 text-lg" onClick={onClose} tone="muted">
            Close
          </SketchButton>
        </div>
        {children}
      </div>
    </div>
  );
}

export function AvatarMark({
  className,
  size = "md",
}: {
  className?: string;
  size?: "md" | "lg";
}) {
  const sizeClass = size === "lg" ? "h-32 w-32" : "h-14 w-14";

  return (
    <div
      className={cn(
        "flex items-center justify-center rounded-full border-[3px] border-[var(--sketch-ink)] bg-white shadow-[2px_2px_0_rgba(34,31,28,0.65)]",
        sizeClass,
        className,
      )}
    >
      <svg
        aria-hidden="true"
        className="h-[70%] w-[70%] text-[var(--sketch-ink)]"
        viewBox="0 0 100 100"
      >
        <circle cx="50" cy="32" r="22" fill="currentColor" />
        <path
          d="M18 88c4-22 18-34 32-34s28 12 32 34"
          fill="currentColor"
          stroke="currentColor"
          strokeWidth="8"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
}

export function BrandMark() {
  return (
    <div className="flex h-12 w-12 items-center justify-center rounded-[14px] bg-[var(--sketch-blue)] text-2xl text-white shadow-[2px_2px_0_rgba(34,31,28,0.65)]">
      DT
    </div>
  );
}
