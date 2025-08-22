import { PropsWithChildren } from "react";
import clsx from "clsx";

type Props = PropsWithChildren<{ className?: string; as?: keyof JSX.IntrinsicElements }>;

export default function Card({ children, className, as: Tag = "section" }: Props) {
  return (
    <Tag className={clsx("rounded-lg border border-gray-200 bg-white p-4 shadow-sm", className)}>
      {children}
    </Tag>
  );
}
