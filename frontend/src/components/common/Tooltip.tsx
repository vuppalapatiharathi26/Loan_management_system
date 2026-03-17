import type { ReactNode } from "react";

type Props = {
  content: string;
  children: ReactNode;
  className?: string;
  disabled?: boolean;
};

const Tooltip = ({ content, children, className = "", disabled = false }: Props) => {
  if (disabled || !content) return <>{children}</>;

  return (
    <span className={`relative inline-flex group ${className}`} tabIndex={0}>
      {children}
      <span
        className={[
          "pointer-events-none absolute left-1/2 top-full mt-2 -translate-x-1/2",
          "z-50 w-max max-w-[18rem] rounded-xl px-3 py-2 text-xs",
          "bg-white/90 text-gray-900 border border-gray-200 shadow-lg",
          "backdrop-blur-md",
          "opacity-0 scale-95 translate-y-1",
          "transition duration-150 ease-out",
          "group-hover:opacity-100 group-hover:scale-100 group-hover:translate-y-0",
          "group-focus-within:opacity-100 group-focus-within:scale-100 group-focus-within:translate-y-0",
        ].join(" ")}
      >
        {content}
      </span>
    </span>
  );
};

export default Tooltip;

