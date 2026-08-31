/* Dev-only route: 404s in production builds (NODE_ENV is inlined at
   build time, so the Vercel production/preview bundle never serves it). */

import { notFound } from "next/navigation";
import OrcaDev from "./OrcaDev";

export default function Page() {
  if (process.env.NODE_ENV === "production") notFound();
  return <OrcaDev />;
}
