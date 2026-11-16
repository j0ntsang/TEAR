import { beforeEach, describe, expect, it } from "vitest";
import "../model.js";

// model.js is a classic script for the extension; it publishes on globalThis.
const TEAR = (globalThis as any).TEAR;

describe("slugify", () => {
  it("drops the live count from a panel title", () => {
    expect(TEAR.slugify("Personal Perks (38)")).toBe("personal-perks");
    expect(TEAR.slugify("Personal Perks (1,204)")).toBe("personal-perks");
  });

  it("spells out & and joins words with dashes", () => {
    expect(TEAR.slugify("Equipped Weapons & Armor")).toBe("equipped-weapons-and-armor");
    expect(TEAR.slugify("  Latest Events ")).toBe("latest-events");
  });

  it("is empty for a title with no letters or digits", () => {
    expect(TEAR.slugify("")).toBe("");
    expect(TEAR.slugify(" (3) ")).toBe("");
  });
});

describe("pageName / routeName", () => {
  it("names the page by its file", () => {
    expect(TEAR.pageName("/index.php")).toBe("index");
    expect(TEAR.pageName("/page.php")).toBe("page");
    expect(TEAR.pageName("/")).toBe("");
  });

  it("takes the first segment of a hash route", () => {
    expect(TEAR.routeName("#/market/view=1")).toBe("market");
    expect(TEAR.routeName("#/cardskimming")).toBe("cardskimming");
    expect(TEAR.routeName("")).toBe("");
  });
});

describe("normalizeTheme", () => {
  it("fills defaults from nothing", () => {
    expect(TEAR.normalizeTheme(undefined)).toEqual(TEAR.DEFAULT_THEME);
  });

  it("keeps valid fields, replaces bad ones, drops unknown ones", () => {
    expect(TEAR.normalizeTheme({ bgColor: "#ABCDEF", fontFamily: "Comic Sans", extra: 1 })).toEqual({
      bgColor: "#ABCDEF",
      fontFamily: TEAR.DEFAULT_THEME.fontFamily,
    });
    expect(TEAR.normalizeTheme({ bgColor: "red" }).bgColor).toBe(TEAR.DEFAULT_THEME.bgColor);
  });

  it("allows Torn's own font", () => {
    expect(TEAR.normalizeTheme({ fontFamily: "" }).fontFamily).toBe("");
  });
});

describe("theme storage", () => {
  let store: Record<string, unknown>;

  beforeEach(() => {
    store = {};
    (globalThis as any).chrome = {
      storage: {
        sync: {
          get: async (key: string) => structuredClone(key in store ? { [key]: store[key] } : {}),
          set: async (items: Record<string, unknown>) => void Object.assign(store, structuredClone(items)),
        },
      },
    };
  });

  it("reads defaults before anything is saved", async () => {
    expect(await TEAR.getTheme()).toEqual(TEAR.DEFAULT_THEME);
  });

  it("saves a cleaned theme", async () => {
    await TEAR.saveTheme({ bgColor: "#222222", fontFamily: "nope" });
    expect(await TEAR.getTheme()).toEqual({ bgColor: "#222222", fontFamily: TEAR.DEFAULT_THEME.fontFamily });
  });
});
