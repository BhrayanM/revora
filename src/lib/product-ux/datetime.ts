import { isValidIanaTimeZone } from "@/lib/product-ux/preferences";

const LOCAL_DATE_TIME_PATTERN = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/;

type DateTimeParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
};

function partsInTimeZone(date: Date, timeZone: string): DateTimeParts {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
  const values = new Map(
    formatter
      .formatToParts(date)
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, Number(part.value)]),
  );
  return {
    year: values.get("year") ?? Number.NaN,
    month: values.get("month") ?? Number.NaN,
    day: values.get("day") ?? Number.NaN,
    hour: values.get("hour") ?? Number.NaN,
    minute: values.get("minute") ?? Number.NaN,
  };
}

function sameParts(left: DateTimeParts, right: DateTimeParts): boolean {
  return (
    left.year === right.year &&
    left.month === right.month &&
    left.day === right.day &&
    left.hour === right.hour &&
    left.minute === right.minute
  );
}

export function zonedLocalDateTimeToIso(
  value: unknown,
  timeZone: unknown,
): string {
  if (typeof value !== "string" || typeof timeZone !== "string") {
    throw new Error("Appointment date and time are invalid.");
  }
  const match = LOCAL_DATE_TIME_PATTERN.exec(value);
  if (!match || !isValidIanaTimeZone(timeZone)) {
    throw new Error("Appointment date and time are invalid.");
  }
  const target: DateTimeParts = {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
    hour: Number(match[4]),
    minute: Number(match[5]),
  };
  const targetEpoch = Date.UTC(
    target.year,
    target.month - 1,
    target.day,
    target.hour,
    target.minute,
  );
  const normalizedUtc = new Date(targetEpoch);
  if (
    normalizedUtc.getUTCFullYear() !== target.year ||
    normalizedUtc.getUTCMonth() + 1 !== target.month ||
    normalizedUtc.getUTCDate() !== target.day ||
    normalizedUtc.getUTCHours() !== target.hour ||
    normalizedUtc.getUTCMinutes() !== target.minute
  ) {
    throw new Error("Appointment date and time are invalid.");
  }

  let instant = targetEpoch;
  for (let iteration = 0; iteration < 4; iteration += 1) {
    const represented = partsInTimeZone(new Date(instant), timeZone);
    const representedEpoch = Date.UTC(
      represented.year,
      represented.month - 1,
      represented.day,
      represented.hour,
      represented.minute,
    );
    const adjustment = targetEpoch - representedEpoch;
    if (adjustment === 0) break;
    instant += adjustment;
  }

  const result = new Date(instant);
  if (!sameParts(partsInTimeZone(result, timeZone), target)) {
    throw new Error("Appointment time does not exist in the selected zone.");
  }
  return result.toISOString();
}
