import { beforeEach, describe, expect, it } from "vitest";
import "../model.js";

// model.js is a classic script for the extension; it publishes on globalThis.
const TEAR = (globalThis as any).TEAR;

describe("slugify / panelLabel", () => {
  it("drops the live count from a panel title", () => {
    expect(TEAR.slugify("Personal Perks (38)")).toBe("personal-perks");
    expect(TEAR.slugify("Personal Perks (1,204)")).toBe("personal-perks");
    expect(TEAR.panelLabel("Personal Perks (38)")).toBe("Personal Perks");
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

describe("mergeOrder", () => {
  it("puts saved slugs first and new panels after, in page order", () => {
    expect(TEAR.mergeOrder(["c", "a"], ["a", "b", "c", "d"])).toEqual(["c", "a", "b", "d"]);
  });

  it("ignores saved slugs no longer on the page, and duplicates", () => {
    expect(TEAR.mergeOrder(["gone", "b", "b"], ["a", "b"])).toEqual(["b", "a"]);
  });

  it("keeps page order when nothing is saved", () => {
    expect(TEAR.mergeOrder([], ["a", "b"])).toEqual(["a", "b"]);
  });
});

describe("isTornUrl", () => {
  it("accepts only https www.torn.com", () => {
    expect(TEAR.isTornUrl("https://www.torn.com/gym.php")).toBe(true);
    expect(TEAR.isTornUrl("https://www.torn.com/page.php?sid=crimes#/cardskimming")).toBe(true);
    expect(TEAR.isTornUrl("http://www.torn.com/gym.php")).toBe(false);
    expect(TEAR.isTornUrl("https://www.torn.com.evil.example/")).toBe(false);
    expect(TEAR.isTornUrl("javascript:alert(1)")).toBe(false);
    expect(TEAR.isTornUrl("/gym.php")).toBe(false);
  });
});

describe("withDefaults", () => {
  it("fills a complete default profile from nothing", () => {
    const p = TEAR.withDefaults(undefined);
    expect(p).toMatchObject({ id: "default", name: "Default", theme: TEAR.DEFAULT_THEME, nav: [] });
    expect(p.layout).toEqual({ order: [], hidden: {}, tabs: [] });
  });

  it("keeps valid fields and replaces bad ones", () => {
    const p = TEAR.withDefaults({
      id: "x",
      name: "Mine",
      theme: { bgColor: "#000000", panelBg: "red", fontFamily: "Comic Sans", fontSize: 99, linkColor: "#ABCDEF" },
    });
    expect(p.theme).toEqual({ ...TEAR.DEFAULT_THEME, bgColor: "#000000", linkColor: "#ABCDEF" });
  });

  it("allows Torn's own font and sizes", () => {
    expect(TEAR.withDefaults({ theme: { fontFamily: "", fontSize: 0 } }).theme).toMatchObject({ fontFamily: "", fontSize: 0 });
  });

  it("drops unknown fields and non-Torn nav links", () => {
    const p = TEAR.withDefaults({
      extra: 1,
      layout: { hidden: { a: true, b: false, c: "yes" }, order: ["a", 3, "a"], tabs: [{ name: "Stats", panels: ["a"] }, "junk"] },
      nav: [{ label: "Gym", href: "https://www.torn.com/gym.php" }, { label: "Bad", href: "https://example.com" }, { href: "https://www.torn.com/" }],
    });
    expect(p).not.toHaveProperty("extra");
    expect(p.layout.hidden).toEqual({ a: true });
    expect(p.layout.order).toEqual(["a"]);
    expect(p.layout.tabs).toHaveLength(1);
    expect(p.layout.tabs[0]).toMatchObject({ name: "Stats", panels: ["a"] });
    expect(p.layout.tabs[0].id).toMatch(/^[0-9a-f]{8}$/);
    expect(p.nav).toEqual([{ label: "Gym", href: "https://www.torn.com/gym.php" }]);
  });
});

describe("exportProfile / importProfile", () => {
  it("round-trips a profile under a new id", () => {
    const original = TEAR.withDefaults({ id: "abc", name: "Night", theme: { bgColor: "#101010" } });
    const imported = TEAR.importProfile(TEAR.exportProfile(original));
    expect(imported.id).not.toBe("abc");
    expect({ ...imported, id: "abc" }).toEqual(original);
  });

  it("rejects files that aren't TEAR exports", () => {
    expect(() => TEAR.importProfile("not json")).toThrow("isn't JSON");
    expect(() => TEAR.importProfile('{"name":"x"}')).toThrow("isn't a TEAR profile");
  });
});

describe("profile storage", () => {
  let store: Record<string, unknown>;

  beforeEach(() => {
    store = {};
    const pick = (keys: string | string[] | null) =>
      keys === null ? { ...store } : Object.fromEntries([keys].flat().filter((k) => k in store).map((k) => [k, store[k]]));
    (globalThis as any).chrome = {
      storage: {
        sync: {
          get: async (keys: string | string[] | null) => structuredClone(pick(keys)),
          set: async (items: Record<string, unknown>) => void Object.assign(store, structuredClone(items)),
          remove: async (key: string) => void delete store[key],
        },
      },
    };
  });

  it("starts with an unsaved default", async () => {
    expect((await TEAR.getActiveProfile()).id).toBe("default");
    expect(await TEAR.listProfiles()).toHaveLength(1);
  });

  it("copies a profile and switches to it", async () => {
    const base = await TEAR.saveProfile({ id: "default", name: "Default", theme: { bgColor: "#222222" } });
    const copy = await TEAR.newProfile("Copy", base);
    await TEAR.setActiveProfile(copy.id);
    const active = await TEAR.getActiveProfile();
    expect(active).toMatchObject({ id: copy.id, name: "Copy" });
    expect(active.theme.bgColor).toBe("#222222");
  });

  it("won't delete the only profile, and moves off a deleted active one", async () => {
    await TEAR.saveProfile({ id: "default" });
    await expect(TEAR.deleteProfile("default")).rejects.toThrow("only profile");

    const other = await TEAR.newProfile("Other");
    await TEAR.setActiveProfile(other.id);
    await TEAR.deleteProfile(other.id);
    expect(await TEAR.getActiveId()).toBe("default");
  });
});
