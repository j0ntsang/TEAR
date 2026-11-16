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

  it("keeps known hex colors per mode and drops everything else", () => {
    const theme = TEAR.normalizeTheme({
      fontFamily: "Comic Sans",
      colors: { light: { link: "#ABCDEF", shadow: "#00000080", bogus: "#123456" }, dark: { text: "red" }, sepia: {} },
      extra: 1,
    });
    expect(theme).toEqual({
      fontFamily: TEAR.DEFAULT_THEME.fontFamily,
      colors: { light: { link: "#abcdef", shadow: "#00000080" }, dark: {} },
    });
  });

  it("carries an old single background color into both modes", () => {
    expect(TEAR.normalizeTheme({ bgColor: "#222222" }).colors).toEqual({ light: { bg: "#222222" }, dark: { bg: "#222222" } });
    expect(TEAR.normalizeTheme({ bgColor: "#1a1a1a" }).colors).toEqual({ light: {}, dark: {} });
  });

  it("allows Torn's own font", () => {
    expect(TEAR.normalizeTheme({ fontFamily: "" }).fontFamily).toBe("");
  });
});

describe("colorCss", () => {
  it("is empty without overrides", () => {
    expect(TEAR.colorCss({ light: {}, dark: {} })).toBe("");
  });

  it("sets each mode's overrides on body, scoped tokens on their element", () => {
    const css = TEAR.colorCss({ light: { link: "#111111", text: "#222222" }, dark: { energy: "#333333" } });
    expect(css).toBe(
      [
        "body.body:not(.dark-mode) { --tear-text: #222222 !important; --tear-link: #111111 !important; }",
        'body.body.dark-mode [data-tear-ring="energy"] { --ring-color: #333333 !important; }',
      ].join("\n"),
    );
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
    await TEAR.saveTheme({ fontFamily: "nope", colors: { dark: { money: "#00ff00" } } });
    expect(await TEAR.getTheme()).toEqual({
      fontFamily: TEAR.DEFAULT_THEME.fontFamily,
      colors: { light: {}, dark: { money: "#00ff00" } },
    });
  });
});
