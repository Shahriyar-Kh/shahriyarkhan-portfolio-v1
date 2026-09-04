import { describe, expect, it } from "vitest";
import { formatDateRange, formatMonthYear, hostnameOf, isDistinctRepoUrl, truncate } from "@/lib/format";
import { GITHUB_PROFILE_URL } from "@/content/site";

describe("formatMonthYear", () => {
  it("formats a date-only ISO string without a timezone day-shift", () => {
    expect(formatMonthYear("2024-01-01")).toBe("Jan 2024");
  });
});

describe("formatDateRange", () => {
  it("renders an end date when present, even if current_role is also true", () => {
    expect(formatDateRange("2023-01-01", "2024-06-01", true)).toBe("Jan 2023 — Jun 2024");
  });

  it("renders Present for a current role with no end date", () => {
    expect(formatDateRange("2023-01-01", null, true)).toBe("Jan 2023 — Present");
  });

  it("renders only the start date for a past role with no end date on record", () => {
    expect(formatDateRange("2023-01-01", null, false)).toBe("Jan 2023");
  });
});

describe("hostnameOf", () => {
  it("strips a leading www.", () => {
    expect(hostnameOf("https://www.example.com/path")).toBe("example.com");
  });

  it("returns empty string for an empty input", () => {
    expect(hostnameOf("")).toBe("");
  });

  it("falls back to the raw input for an unparseable URL", () => {
    expect(hostnameOf("not a url")).toBe("not a url");
  });
});

describe("truncate", () => {
  it("leaves short text untouched", () => {
    expect(truncate("hello", 10)).toBe("hello");
  });

  it("truncates and appends an ellipsis", () => {
    expect(truncate("hello world", 8)).toBe("hello w…");
  });
});

describe("isDistinctRepoUrl", () => {
  it("returns false for an empty github_url", () => {
    expect(isDistinctRepoUrl("")).toBe(false);
  });

  it("returns false for the generic profile URL", () => {
    expect(isDistinctRepoUrl(GITHUB_PROFILE_URL)).toBe(false);
  });

  it("is case- and trailing-slash-insensitive against the profile URL", () => {
    expect(isDistinctRepoUrl(`${GITHUB_PROFILE_URL.toUpperCase()}/`)).toBe(false);
  });

  it("returns true for a project-specific repository URL", () => {
    expect(isDistinctRepoUrl("https://github.com/Shahriyar-Kh/some-project")).toBe(true);
  });
});
