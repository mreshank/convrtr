import { describe, expect, it } from "vitest";
import { icsToCsvEngine } from "../index";
import { convertIcsToCsv, parseIcs } from "../parser";

const ICS = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Test//Test//EN
BEGIN:VEVENT
UID:evt-1@example.com
DTSTAMP:20240607T000000Z
DTSTART:20240610T100000Z
DTEND:20240610T110000Z
SUMMARY:Planning\\, Q3
LOCATION:Room 4\\; North
DESCRIPTION:Inter
 national meeting.
RRULE:FREQ=WEEKLY;COUNT=4
END:VEVENT
BEGIN:VEVENT
UID:evt-2@example.com
DTSTART;TZID=Europe/Berlin:20240611T090000
DTEND;TZID=Europe/Berlin:20240611T093000
SUMMARY:Standup
END:VEVENT
END:VCALENDAR
`;

function bytes(s: string = ICS): Uint8Array {
	return new TextEncoder().encode(s);
}

describe("iCalendar (.ics) Parser & Engine", () => {
	it("unfolds lines, unescapes text and keeps dates verbatim", () => {
		const events = parseIcs(bytes());
		expect(events).toHaveLength(2);
		expect(events[0]).toMatchObject({
			uid: "evt-1@example.com",
			start: "20240610T100000Z",
			end: "20240610T110000Z",
			summary: "Planning, Q3",
			location: "Room 4; North",
			recurrence: "FREQ=WEEKLY;COUNT=4",
		});
		expect(events[0]?.description).toBe("International meeting.");
		expect(events[1]?.start).toBe("20240611T090000");
	});

	it("emits BOM-headed CSV through the engine", async () => {
		expect(await icsToCsvEngine.probe()).toBe(true);
		const out = await convertIcsToCsv(
			bytes().buffer.slice(0) as ArrayBuffer,
			() => {},
		);
		const raw = new Uint8Array(out);
		expect([raw[0], raw[1], raw[2]]).toEqual([0xef, 0xbb, 0xbf]);
		const csv = new TextDecoder().decode(out);
		expect(csv).toContain(
			"uid,start,end,summary,location,description,recurrence",
		);
		expect(csv).toContain('"Planning, Q3"');
	});

	it("rejects non-calendars and eventless files", () => {
		expect(() => parseIcs(bytes("hello"))).toThrow("BEGIN:VCALENDAR");
		expect(() => parseIcs(bytes("BEGIN:VCALENDAR\nEND:VCALENDAR\n"))).toThrow(
			"No VEVENTs",
		);
	});
});
