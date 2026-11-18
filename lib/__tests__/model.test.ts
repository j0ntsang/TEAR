import { readdirSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { beforeEach, describe, expect, it } from "vitest";
import "../model.js";

// model.js is a classic script for the extension; it publishes on globalThis.
const TEAR = (globalThis as any).TEAR;
const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

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

describe("features", () => {
  it("starts with only the theme on; a saved list decides after that", () => {
    expect([...TEAR.enabledFeatures(undefined)]).toEqual(["theme"]);
    expect(TEAR.enabledFeatures([]).size).toBe(0);
    expect([...TEAR.enabledFeatures(["theme", "card", "unknown"])]).toEqual(["theme", "card"]);
    expect([...TEAR.enabledFeatures(TEAR.FEATURE_IDS)]).toEqual(TEAR.FEATURE_IDS);
  });

  it("keeps a feature off while what it requires is off", () => {
    expect(TEAR.requiresOf("card")).toEqual(["theme"]);
    expect([...TEAR.enabledFeatures(["card", "sprites", "tornChat"])]).toEqual(["sprites", "tornChat"]);
  });

  it("brings a feature's requirements on with it, and leaves them on when it goes off", () => {
    expect(TEAR.switchFeature([], "card", true)).toEqual(["theme", "card"]);
    expect(TEAR.switchFeature(["theme", "card"], "card", false)).toEqual(["theme"]);
    // Theme off keeps the card stored on, so it comes back with Theme.
    expect(TEAR.switchFeature(["theme", "card"], "theme", false)).toEqual(["card"]);
  });

  it("has no TEAR chat features, only Torn's own chat", () => {
    expect(TEAR.FEATURE_IDS.filter((id: string) => /chat/i.test(id))).toEqual(["tornChat"]);
  });

  it("has unique ids", () => {
    expect(new Set(TEAR.FEATURE_IDS).size).toBe(TEAR.FEATURE_IDS.length);
  });

  it("loads and hot-reloads each feature's stylesheet", () => {
    const manifest = JSON.parse(readFileSync(resolve(root, "manifest.json"), "utf8"));
    const css: string[] = manifest.content_scripts.flatMap((s: { css?: string[] }) => s.css ?? []);
    const watched = readFileSync(resolve(root, "dev-reload.js"), "utf8");
    const files = readdirSync(resolve(root, "content/features")).map((f) => `content/features/${f}`);
    expect(files.sort()).toEqual(css.filter((f) => f.startsWith("content/features/")).sort());
    for (const file of files) {
      expect(watched).toContain(`"${file}"`);
      const id = file.match(/(\w+)\.css$/)![1];
      expect(TEAR.FEATURE_IDS).toContain(id);
      // Gated with :where() so specificity stays what it was under html.tear-enabled.
      expect(readFileSync(resolve(root, file), "utf8")).toContain(`html.tear-enabled:where(.tear-f-${id}) {`);
    }
  });
});

describe("normalizePanelSize", () => {
  it("defaults what's missing or bad", () => {
    expect(TEAR.normalizePanelSize(undefined)).toEqual(TEAR.DEFAULT_PANEL_SIZE);
    expect(TEAR.normalizePanelSize({ width: "wide", height: 400 })).toEqual({ width: TEAR.DEFAULT_PANEL_SIZE.width, height: 400 });
  });

  it("keeps sizes in range, in whole pixels", () => {
    expect(TEAR.normalizePanelSize({ width: 10, height: 99999 })).toEqual({ width: TEAR.PANEL_SIZE.width.min, height: TEAR.PANEL_SIZE.height.max });
    expect(TEAR.normalizePanelSize({ width: 350.6, height: 500 })).toEqual({ width: 351, height: 500 });
  });
});
