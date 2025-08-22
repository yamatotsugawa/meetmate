import { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";
import clsx from "clsx";

export function Label(props: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return <label {...props} className={clsx("text-xs text-gray-600", props.className)} />;
}

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={clsx(
        "w-full rounded-md border border-gray-300 px-3 py-2 text-sm",
        "outline-none focus:ring-2 focus:ring-black/15",
        props.className
      )}
    />
  );
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={clsx(
        "w-full rounded-md border border-gray-300 px-3 py-2 text-sm",
        "outline-none focus:ring-2 focus:ring-black/15",
        props.className
      )}
    />
  );
}

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={clsx(
        "w-full rounded-md border border-gray-300 px-3 py-2 text-sm",
        "outline-none focus:ring-2 focus:ring-black/15",
        props.className
      )}
    />
  );
}
