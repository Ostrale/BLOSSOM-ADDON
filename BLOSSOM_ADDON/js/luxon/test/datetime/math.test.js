/* global test expect */

import { DateTime, Duration } from "../../src/luxon";

function createDateTime() {
  return DateTime.fromObject({
    year: 2010,
    month: 2,
    day: 3,

    hour: 4,
    minute: 5,
    second: 6,
    millisecond: 7,
  });
}

//------
// #plus()
//------
test("DateTime#plus({ years: 1 }) adds a year", () => {
  const i = createDateTime().plus({ years: 1 });
  expect(i.year).toBe(2011);
});

test("DateTime#plus({quarter: 1}) adds a quarter", () => {
  const i = createDateTime().plus({ quarters: 1 });
  expect(i.quarter).toBe(2);
  expect(i.month).toBe(5);
});

test("DateTime#plus({ months: 1 }) at the end of the month", () => {
  const i = DateTime.fromISO("2018-01-31T10:00"),
    later = i.plus({ months: 1 });
  expect(later.day).toBe(28);
  expect(later.month).toBe(2);
});

test("DateTime#plus({ months: 1 }) at the end of the month in a leap year", () => {
  const i = DateTime.fromISO("2016-01-31T10:00"),
    later = i.plus({ months: 1 });
  expect(later.day).toBe(29);
  expect(later.month).toBe(2);
});

test("DateTime#plus({ months: 13 }) at the end of the month", () => {
  const i = DateTime.fromISO("2015-01-31T10:00"),
    later = i.plus({ months: 13 });
  expect(later.day).toBe(29);
  expect(later.month).toBe(2);
  expect(later.year).toBe(2016);
});

test("DateTime#plus({ days: 1 }) keeps the same time across a DST", () => {
  const i = DateTime.fromISO("2016-03-12T10:00", {
      zone: "America/Los_Angeles",
    }),
    later = i.plus({ days: 1 });
  expect(later.day).toBe(13);
  expect(later.hour).toBe(10);
});

test("DateTime#plus({ hours: 24 }) gains an hour to spring forward", () => {
  const i = DateTime.fromISO("2016-03-12T10:00", {
      zone: "America/Los_Angeles",
    }),
    later = i.plus({ hours: 24 });
  expect(later.day).toBe(13);
  expect(later.hour).toBe(11);
});

// #669
test("DateTime#plus({ days:0, hours: 24 }) gains an hour to spring forward", () => {
  const i = DateTime.fromISO("2016-03-12T10:00", {
      zone: "America/Los_Angeles",
    }),
    later = i.plus({ days: 0, hours: 24 });
  expect(later.day).toBe(13);
  expect(later.hour).toBe(11);
});

test("DateTime#plus(Duration) adds the right amount of time", () => {
  const i = DateTime.fromISO("2016-03-12T10:13"),
    later = i.plus(Duration.fromObject({ day: 1, hour: 3, minute: 28 }));
  expect(later.day).toBe(13);
  expect(later.hour).toBe(13);
  expect(later.minute).toBe(41);
});

test("DateTime#plus(multiple) adds the right amount of time", () => {
  const i = DateTime.fromISO("2016-03-12T10:13"),
    later = i.plus({ days: 1, hours: 3, minutes: 28 });
  expect(later.day).toBe(13);
  expect(later.hour).toBe(13);
  expect(later.minute).toBe(41);
});

test("DateTime#plus maintains invalidity", () => {
  expect(DateTime.invalid("because").plus({ day: 1 }).isValid).toBe(false);
});

test("DateTime#plus works across the 100 barrier", () => {
  const d = DateTime.fromISO("0099-12-31").plus({ day: 2 });
  expect(d.year).toBe(100);
  expect(d.month).toBe(1);
  expect(d.day).toBe(2);
});

test("DateTime#plus renders invalid when out of max. datetime range using days", () => {
  const d = DateTime.utc(1970, 1, 1, 0, 0, 0, 0).plus({ day: 1e8 + 1 });
  expect(d.isValid).toBe(false);
});

test("DateTime#plus renders invalid when out of max. datetime range using seconds", () => {
  const d = DateTime.utc(1970, 1, 1, 0, 0, 0, 0).plus({ second: 1e8 * 24 * 60 * 60 + 1 });
  expect(d.isValid).toBe(false);
});

test("DateTime#plus renders invalid when out of max. datetime range using IANAZone", () => {
  const d = DateTime.utc(1970, 1, 1, 0, 0, 0, 0)
    .setZone("America/Los_Angeles")
    .plus({ second: 1e8 * 24 * 60 * 60 + 1 });
  expect(d.isValid).toBe(false);
});

test("DateTime#plus handles fractional days", () => {
  const d = DateTime.fromISO("2016-01-31T10:00");
  expect(d.plus({ days: 0.8 })).toEqual(d.plus({ hours: (24 * 4) / 5 }));
  expect(d.plus({ days: 6.8 })).toEqual(d.plus({ days: 6, hours: (24 * 4) / 5 }));
  expect(d.plus({ days: 6.8, milliseconds: 17 })).toEqual(
    d.plus({ days: 6, milliseconds: 0.8 * 24 * 60 * 60 * 1000 + 17 })
  );
});

test("DateTime#plus handles fractional large units", () => {
  const units = ["weeks", "months", "quarters", "years"];

  for (const unit of units) {
    const d = DateTime.fromISO("2016-01-31T10:00");
    expect(d.plus({ [unit]: 8.7 })).toEqual(
      d.plus({
        [unit]: 8,
        milliseconds: Duration.fromObject({ [unit]: 0.7 }).as("milliseconds"),
      })
    );
  }
});

// #645
test("DateTime#plus supports positive and negative duration units", () => {
  const d = DateTime.fromISO("2020-01-08T12:34");
  expect(d.plus({ months: 1, days: -1 })).toEqual(d.plus({ months: 1 }).plus({ days: -1 }));
  expect(d.plus({ years: 4, days: -1 })).toEqual(d.plus({ years: 4 }).plus({ days: -1 }));
  expect(d.plus({ years: 0.5, days: -1.5 })).toEqual(d.plus({ years: 0.5 }).plus({ days: -1.5 }));
});

//------
// #minus()
//------
test("DateTime#minus({ years: 1 }) subtracts a year", () => {
  const dt = createDateTime().minus({ years: 1 });
  expect(dt.year).toBe(2009);
});

test("DateTime#minus({ quarters: 1 }) subtracts a quarter", () => {
  const dt = createDateTime().minus({ quarters: 1 });
  expect(dt.year).toBe(2009);
  expect(dt.quarter).toBe(4);
  expect(dt.month).toBe(11);
});

test("DateTime#minus({ months: 1 }) at the end of the month", () => {
  const i = DateTime.fromISO("2018-03-31T10:00"),
    earlier = i.minus({ months: 1 });
  expect(earlier.day).toBe(28);
  expect(earlier.month).toBe(2);
});

test("DateTime#minus({ months: 1 }) at the end of the month in a leap year", () => {
  const i = DateTime.fromISO("2016-03-31T10:00"),
    earlier = i.minus({ months: 1 });
  expect(earlier.day).toBe(29);
  expect(earlier.month).toBe(2);
});

test("DateTime#minus({ months: 13 }) at the end of the month", () => {
  const i = DateTime.fromISO("2017-03-31T10:00"),
    earlier = i.minus({ months: 13 });
  expect(earlier.day).toBe(29);
  expect(earlier.month).toBe(2);
  expect(earlier.year).toBe(2016);
});

test("DateTime#minus maintains invalidity", () => {
  expect(DateTime.invalid("because").minus({ day: 1 }).isValid).toBe(false);
});

test("DateTime#minus works across the 100 barrier", () => {
  const d = DateTime.fromISO("0100-01-02").minus({ day: 2 });
  expect(d.year).toBe(99);
  expect(d.month).toBe(12);
  expect(d.day).toBe(31);
});

test("DateTime#minus renders invalid when out of max. datetime range using days", () => {
  const d = DateTime.utc(1970, 1, 1, 0, 0, 0, 0).minus({ day: 1e8 + 1 });
  expect(d.isValid).toBe(false);
});

test("DateTime#minus renders invalid when out of max. datetime range using seconds", () => {
  const d = DateTime.utc(1970, 1, 1, 0, 0, 0, 0).minus({ second: 1e8 * 24 * 60 * 60 + 1 });
  expect(d.isValid).toBe(false);
});

test("DateTime#plus renders invalid when out of max. datetime range using IANAZone", () => {
  const d = DateTime.utc(1970, 1, 1, 0, 0, 0, 0)
    .setZone("America/Los_Angeles")
    .minus({ second: 1e8 * 24 * 60 * 60 + 1 });
  expect(d.isValid).toBe(false);
});

test("DateTime#minus handles fractional days", () => {
  const d = DateTime.fromISO("2016-01-31T10:00");
  expect(d.minus({ days: 0.8 })).toEqual(d.minus({ hours: (24 * 4) / 5 }));
  expect(d.minus({ days: 6.8 })).toEqual(d.minus({ days: 6, hours: (24 * 4) / 5 }));
  expect(d.minus({ days: 6.8, milliseconds: 17 })).toEqual(
    d.minus({ days: 6, milliseconds: 0.8 * 24 * 60 * 60 * 1000 + 17 })
  );
});

test("DateTime#minus handles fractional large units", () => {
  const units = ["weeks", "months", "quarters", "years"];

  for (const unit of units) {
    const d = DateTime.fromISO("2016-01-31T10:00");
    expect(d.minus({ [unit]: 8.7 })).toEqual(
      d.minus({
        [unit]: 8,
        milliseconds: Duration.fromObject({ [unit]: 0.7 }).as("milliseconds"),
      })
    );
  }
});

// #645
test("DateTime#minus supports positive and negative duration units", () => {
  const d = DateTime.fromISO("2020-01-08T12:34");
  expect(d.minus({ months: 1, days: -1 })).toEqual(d.minus({ months: 1 }).minus({ days: -1 }));
  expect(d.minus({ years: 4, days: -1 })).toEqual(d.minus({ years: 4 }).minus({ days: -1 }));
  expect(d.minus({ years: 0.5, days: -1.5 })).toEqual(
    d.minus({ years: 0.5 }).minus({ days: -1.5 })
  );
});

//------
// #startOf()
//------
test("DateTime#startOf('year') goes to the start of the year", () => {
  const dt = createDateTime().startOf("year");

  expect(dt.year).toBe(2010);
  expect(dt.month).toBe(1);
  expect(dt.day).toBe(1);
  expect(dt.hour).toBe(0);
  expect(dt.minute).toBe(0);
  expect(dt.second).toBe(0);
  expect(dt.millisecond).toBe(0);
});

test("DateTime#startOf('quarter') goes to the start of the quarter", () => {
  const monthToQuarterStart = (month, quarterStart) => {
    const dt = DateTime.fromObject({
      year: 2017,
      month,
      day: 10,
      hour: 4,
      minute: 5,
      second: 6,
      millisecond: 7,
    }).startOf("quarter");

    expect(dt.year).toBe(2017);
    expect(dt.month).toBe(quarterStart);
    expect(dt.day).toBe(1);
    expect(dt.hour).toBe(0);
    expect(dt.minute).toBe(0);
    expect(dt.second).toBe(0);
    expect(dt.millisecond).toBe(0);
  };

  monthToQuarterStart(1, 1);
  monthToQuarterStart(2, 1);
  monthToQuarterStart(3, 1);
  monthToQuarterStart(4, 4);
  monthToQuarterStart(5, 4);
  monthToQuarterStart(6, 4);
  monthToQuarterStart(7, 7);
  monthToQuarterStart(8, 7);
  monthToQuarterStart(9, 7);
  monthToQuarterStart(10, 10);
  monthToQuarterStart(11, 10);
  monthToQuarterStart(12, 10);
});

test("DateTime#startOf('month') goes to the start of the month", () => {
  const dt = createDateTime().startOf("month");

  expect(dt.year).toBe(2010);
  expect(dt.month).toBe(2);
  expect(dt.day).toBe(1);
  expect(dt.hour).toBe(0);
  expect(dt.minute).toBe(0);
  expect(dt.second).toBe(0);
  expect(dt.millisecond).toBe(0);
});

test("DateTime#startOf('day') goes to the start of the day", () => {
  const dt = createDateTime().startOf("day");

  expect(dt.year).toBe(2010);
  expect(dt.month).toBe(2);
  expect(dt.day).toBe(3);
  expect(dt.hour).toBe(0);
  expect(dt.minute).toBe(0);
  expect(dt.second).toBe(0);
  expect(dt.millisecond).toBe(0);
});

test("DateTime#startOf('hour') goes to the start of the hour", () => {
  const dt = createDateTime().startOf("hour");

  expect(dt.year).toBe(2010);
  expect(dt.month).toBe(2);
  expect(dt.day).toBe(3);
  expect(dt.hour).toBe(4);
  expect(dt.minute).toBe(0);
  expect(dt.second).toBe(0);
  expect(dt.millisecond).toBe(0);
});

test("DateTime#startOf('minute') goes to the start of the minute", () => {
  const dt = createDateTime().startOf("minute");

  expect(dt.year).toBe(2010);
  expect(dt.month).toBe(2);
  expect(dt.day).toBe(3);
  expect(dt.hour).toBe(4);
  expect(dt.minute).toBe(5);
  expect(dt.second).toBe(0);
  expect(dt.millisecond).toBe(0);
});

test("DateTime#startOf('second') goes to the start of the second", () => {
  const dt = createDateTime().startOf("second");

  expect(dt.year).toBe(2010);
  expect(dt.month).toBe(2);
  expect(dt.day).toBe(3);
  expect(dt.hour).toBe(4);
  expect(dt.minute).toBe(5);
  expect(dt.second).toBe(6);
  expect(dt.millisecond).toBe(0);
});

test("DateTime#startOf('week') goes to the start of the week", () => {
  // using a different day so that it doesn't end up as the first of the month
  const dt = DateTime.fromISO("2016-03-12T10:00").startOf("week");

  expect(dt.year).toBe(2016);
  expect(dt.month).toBe(3);
  expect(dt.day).toBe(7);
  expect(dt.hour).toBe(0);
  expect(dt.minute).toBe(0);
  expect(dt.second).toBe(0);
  expect(dt.millisecond).toBe(0);
});

test("DateTime#startOf maintains invalidity", () => {
  expect(DateTime.invalid("because").startOf("day").isValid).toBe(false);
});

test("DateTime#startOf throws on invalid units", () => {
  expect(() => DateTime.fromISO("2016-03-12T10:00").startOf("splork")).toThrow();
  expect(() => DateTime.fromISO("2016-03-12T10:00").startOf("")).toThrow();
});

//------
// #endOf()
//------
test("DateTime#endOf('year') goes to the start of the year", () => {
  const dt = createDateTime().endOf("year");

  expect(dt.year).toBe(2010);
  expect(dt.month).toBe(12);
  expect(dt.day).toBe(31);
  expect(dt.hour).toBe(23);
  expect(dt.minute).toBe(59);
  expect(dt.second).toBe(59);
  expect(dt.millisecond).toBe(999);
});

test("DateTime#endOf('quarter') goes to the end of the quarter", () => {
  const dt = createDateTime().endOf("quarter");

  expect(dt.year).toBe(2010);
  expect(dt.month).toBe(3);
  expect(dt.day).toBe(31);
  expect(dt.hour).toBe(23);
  expect(dt.minute).toBe(59);
  expect(dt.second).toBe(59);
  expect(dt.millisecond).toBe(999);
});

test("DateTime#endOf('quarter') goes to the end of the quarter in December", () => {
  const monthToQuarterEnd = (month, endMonth) => {
    const dt = DateTime.fromObject({
      year: 2017,
      month,
      day: 10,
      hour: 4,
      minute: 5,
      second: 6,
      millisecond: 7,
    }).endOf("quarter");

    expect(dt.year).toBe(2017);
    expect(dt.month).toBe(endMonth);
    expect(dt.day).toBe(dt.endOf("month").day);
    expect(dt.hour).toBe(23);
    expect(dt.minute).toBe(59);
    expect(dt.second).toBe(59);
    expect(dt.millisecond).toBe(999);
  };

  monthToQuarterEnd(1, 3);
  monthToQuarterEnd(2, 3);
  monthToQuarterEnd(3, 3);
  monthToQuarterEnd(4, 6);
  monthToQuarterEnd(5, 6);
  monthToQuarterEnd(6, 6);
  monthToQuarterEnd(7, 9);
  monthToQuarterEnd(8, 9);
  monthToQuarterEnd(9, 9);
  monthToQuarterEnd(10, 12);
  monthToQuarterEnd(11, 12);
  monthToQuarterEnd(12, 12);
});

test("DateTime#endOf('month') goes to the start of the month", () => {
  const dt = createDateTime().endOf("month");

  expect(dt.year).toBe(2010);
  expect(dt.month).toBe(2);
  expect(dt.day).toBe(28);
  expect(dt.hour).toBe(23);
  expect(dt.minute).toBe(59);
  expect(dt.second).toBe(59);
  expect(dt.millisecond).toBe(999);
});

test("DateTime#endOf('day') goes to the start of the day", () => {
  const dt = createDateTime().endOf("day");

  expect(dt.year).toBe(2010);
  expect(dt.month).toBe(2);
  expect(dt.day).toBe(3);
  expect(dt.hour).toBe(23);
  expect(dt.minute).toBe(59);
  expect(dt.second).toBe(59);
  expect(dt.millisecond).toBe(999);
});

test("DateTime#endOf('hour') goes to the start of the hour", () => {
  const dt = createDateTime().endOf("hour");

  expect(dt.year).toBe(2010);
  expect(dt.month).toBe(2);
  expect(dt.day).toBe(3);
  expect(dt.hour).toBe(4);
  expect(dt.minute).toBe(59);
  expect(dt.second).toBe(59);
  expect(dt.millisecond).toBe(999);
});

test("DateTime#endOf('minute') goes to the start of the minute", () => {
  const dt = createDateTime().endOf("minute");

  expect(dt.year).toBe(2010);
  expect(dt.month).toBe(2);
  expect(dt.day).toBe(3);
  expect(dt.hour).toBe(4);
  expect(dt.minute).toBe(5);
  expect(dt.second).toBe(59);
  expect(dt.millisecond).toBe(999);
});

test("DateTime#endOf('second') goes to the start of the second", () => {
  const dt = createDateTime().endOf("second");

  expect(dt.year).toBe(2010);
  expect(dt.month).toBe(2);
  expect(dt.day).toBe(3);
  expect(dt.hour).toBe(4);
  expect(dt.minute).toBe(5);
  expect(dt.second).toBe(6);
  expect(dt.millisecond).toBe(999);
});

test("DateTime#endOf('week') goes to the end of the week", () => {
  // using a different day so that it doesn't end up as the first of the month
  const dt = DateTime.fromISO("2016-03-12T10:00").endOf("week");

  expect(dt.year).toBe(2016);
  expect(dt.month).toBe(3);
  expect(dt.day).toBe(13);
  expect(dt.hour).toBe(23);
  expect(dt.minute).toBe(59);
  expect(dt.second).toBe(59);
  expect(dt.millisecond).toBe(999);
});

test("DateTime#endOf maintains invalidity", () => {
  expect(DateTime.invalid("because").endOf("day").isValid).toBe(false);
});

test("DateTime#endOf throws on invalid units", () => {
  expect(() => DateTime.fromISO("2016-03-12T10:00").endOf("splork")).toThrow();
});
