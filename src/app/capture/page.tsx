import { connection } from "next/server";
import { aiEnabled } from "@/lib/ai";
import { PageHeader } from "@/components/ui";
import { CaptureClient } from "./CaptureClient";

export default async function CapturePage() {
  await connection();
  return (
    <>
      <PageHeader
        title="Quick Capture"
        subtitle="Paste raw notes, an email or a Slack thread. Commitments become owned, dated follow-ups — review them, then add them to the tracker in one click."
      />
      <CaptureClient aiOn={aiEnabled()} />
    </>
  );
}
