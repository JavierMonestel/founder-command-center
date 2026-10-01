import { describe, expect, it } from "vitest";
import { heuristicCapture, parseLine } from "../capture";

const TODAY = "2026-10-01"; // a Thursday

describe("parseLine", () => {
  it("detects the clinical line, explicit owner and relative date", () => {
    const item = parseLine("Chase Cedar Valley counsel on the IRB amendment @clinical-lead by tomorrow", TODAY);
    expect(item.vertical).toBe("clinical");
    expect(item.owner).toBe("Clinical Lead");
    expect(item.due_date).toBe("2026-10-02");
    expect(item.title).toBe("Chase Cedar Valley counsel on the IRB amendment");
  });

  it("resolves weekdays to the next occurrence", () => {
    expect(parseLine("Book the consultant for friday", TODAY).due_date).toBe("2026-10-02");
    expect(parseLine("Review deck on thursday", TODAY).due_date).toBe("2026-10-08");
  });

  it("maps urgency words and priority flags", () => {
    expect(parseLine("urgent: reply to the athlete club", TODAY).priority).toBe("p0");
    expect(parseLine("Refresh the case study !p2", TODAY).priority).toBe("p2");
    expect(parseLine("Send the update", TODAY).priority).toBe("p1");
  });

  it("does not assign ownership just because a role is mentioned", () => {
    expect(parseLine("Collect strap results from the CTO", TODAY).owner).toBe("Founder");
    expect(parseLine("Collect strap results @cto", TODAY).owner).toBe("CTO");
  });

  it("honours an explicit #vertical tag over keywords", () => {
    expect(parseLine("Pilot budget review #company", TODAY).vertical).toBe("company");
  });
});

describe("heuristicCapture on realistic inputs", () => {
  it("parses meeting notes with leading owners and skips the heading", () => {
    const items = heuristicCapture(
      `Leadership sync notes
- CTO to send the strap firmware workaround to support by Thursday
- Clinical lead: chase Cedar Valley counsel on the DUA redlines, urgent
- We should refresh the athlete case study at some point (low priority)`,
      TODAY,
    );
    expect(items).toHaveLength(3);
    expect(items[0]).toMatchObject({ owner: "CTO", title: "Send the strap firmware workaround to support", due_date: "2026-10-08", vertical: "performance" });
    expect(items[1]).toMatchObject({ owner: "Clinical Lead", priority: "p0", title: "Chase Cedar Valley counsel on the DUA redlines" });
    expect(items[2]).toMatchObject({ priority: "p2", title: "Refresh the athlete case study" });
  });

  it("splits a run-on Slack message into separate asks", () => {
    const items = heuristicCapture(
      "can you remind me to send the investor update draft next week, and book the regulatory consultant for friday? also the podcast guest list is whenever",
      TODAY,
    );
    expect(items.map((i) => [i.title, i.due_date, i.priority])).toEqual([
      ["Send the investor update draft", "2026-10-08", "p1"],
      ["Book the regulatory consultant", "2026-10-02", "p1"],
      ["The podcast guest list", null, "p2"],
    ]);
  });

  it("ignores greetings and sign-offs in emails and prefers the specific date", () => {
    const items = heuristicCapture(
      "Hi team — great call today. As discussed, the CMIO needs the security questionnaire before the committee meets next Friday. Can someone own that? Thanks, Dana",
      TODAY,
    );
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({ title: "The CMIO needs the security questionnaire before the committee meets", due_date: "2026-10-09" });
  });
});

describe("heuristicCapture", () => {
  it("splits bullets and numbered lines into separate items", () => {
    const items = heuristicCapture("- first task here\n2. second task next week\n\n* third one", TODAY);
    expect(items.map((i) => i.title)).toEqual(["First task here", "Second task", "Third one"]);
    expect(items[1].due_date).toBe("2026-10-08");
  });
});
