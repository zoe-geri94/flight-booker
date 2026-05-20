import * as React from "react";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "secondary" | "outline" | "ghost";
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = "", variant = "default", ...props }, ref) => {
    const base =
      "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none cursor-pointer px-4 py-2";
    const variants: Record<string, string> = {
      default: "bg-slate-900 text-white hover:bg-slate-800",
      secondary: "bg-slate-100 text-slate-900 hover:bg-slate-200",
      outline: "border border-slate-200 hover:bg-slate-100",
      ghost: "hover:bg-slate-100",
    };
    return (
      <button ref={ref} className={`${base} ${variants[variant]} ${className}`} {...props} />
    );
  }
);
Button.displayName = "Button";
