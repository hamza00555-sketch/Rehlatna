import { describe, expect, it } from "vitest";
import { ageWord, count, days, m, months, weeks } from "./index";

describe("Arabic count agreement", () => {
  it("handles singular, dual, few and many", () => {
    expect(days(1)).toBe("يوم واحد");
    expect(days(2)).toBe("يومان");
    expect(days(2, true)).toBe("يومين");
    expect(days(3)).toBe("3 أيام");
    expect(days(11)).toBe("11 يوماً");
    expect(weeks(2)).toBe("أسبوعان");
    expect(months(3)).toBe("3 أشهر");
  });

  it("count() applies custom forms", () => {
    const forms = { one: "محطة واحدة", two: "محطتان", twoGen: "محطتين", few: "محطات", many: "محطة" };
    expect(count(1, forms)).toBe("محطة واحدة");
    expect(count(2, forms, true)).toBe("محطتين");
    expect(count(6, forms)).toBe("6 محطات");
    expect(count(20, forms)).toBe("20 محطة");
  });

  it("age wording follows the baby's gender without assuming one", () => {
    expect(ageWord("girl")).toBe("عمرها");
    expect(ageWord("boy")).toBe("عمره");
    expect(ageWord("unknown")).not.toBe("عمره");
  });

  it("postpartum age reads naturally", () => {
    expect(m.postpartum.ageDays(0, "عمره")).toBe("يوم الولادة");
    expect(m.postpartum.ageDays(12, "عمرها")).toBe("عمرها 12 يوماً");
    expect(m.common.inDays(2)).toContain("يومين");
  });
});
