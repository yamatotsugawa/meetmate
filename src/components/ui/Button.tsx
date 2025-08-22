import clsx from "clsx";
import { ButtonHTMLAttributes } from "react";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "outline" | "danger";
  size?: "sm" | "md";
};

export default function Button({ variant = "primary", size = "sm", className, ...rest }: Props) {
  const base = "rounded-md transition focus:outline-none focus:ring-2 focus:ring-black/15";
  const sizes = {
    sm: "px-3 py-1.5 text-sm",
    md: "px-4 py-2 text-sm",
  }[size];
  const styles = {
    primary: "bg-black text-white hover:bg-black/90",
    outline: "border border-gray-300 hover:bg-gray-50",
    danger: "bg-red-600 text-white hover:bg-red-600/90",
  }[variant];
  return <button className={clsx(base, sizes, styles, className)} {...rest} />;
}
