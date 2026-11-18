// The settings and info panels' styles, adopted by their shadow roots: kept in a script so no
// extension file has to be web-accessible (a page could probe for one to detect TEAR).
globalThis.TEAR.panelStyles = new CSSStyleSheet();
TEAR.panelStyles.replaceSync(`
:host {
  --bg: #f7f7f7;
  --surface: #ffffff;
  --fg: #222222;
  --muted: #666666;
  --line: #d6d6d6;
  --accent: #6e3a9c;
  --focus: #0a58ca;
  all: initial;
  /* Placed over its dock button by dock.css: anchor names are matched in the page's scope. */
  position: fixed;
  z-index: 2147483645;
  color-scheme: light;
}

:host([data-mode="dark"]) {
  --bg: #1f1f1f;
  --surface: #2a2a2a;
  --fg: #e6e6e6;
  --muted: #a0a0a0;
  --line: #3d3d3d;
  --accent: #b48ee0;
  --focus: #93c5fd;
  color-scheme: dark;
}

* {
  box-sizing: border-box;
}

.panel {
  display: flex;
  flex-direction: column;
  /* From the Settings tab's sliders, set on the host; never past the window. */
  width: min(var(--panel-w, 340px), calc(100vw - 16px));
  height: min(var(--panel-h, 560px), calc(100vh - 64px));
  border: 1px solid var(--line);
  border-radius: 8px;
  background: var(--bg);
  color: var(--fg);
  font: 13px/1.4 Arial, Helvetica, sans-serif;
  box-shadow: 0 8px 28px rgba(0, 0, 0, 0.35);
  overflow: hidden;
}

[hidden]:not(.panel) {
  display: none !important;
}

.panel {
  transform-origin: bottom right;
  transition: opacity 160ms cubic-bezier(0.2, 0.8, 0.2, 1), scale 160ms cubic-bezier(0.2, 0.8, 0.2, 1),
    translate 160ms cubic-bezier(0.2, 0.8, 0.2, 1), display 110ms allow-discrete;
}

.panel[hidden] {
  display: none;
  opacity: 0;
  scale: 0.96;
  translate: 0 6px;
  transition-duration: 110ms;
  transition-timing-function: cubic-bezier(0.4, 0, 1, 1);
}

@starting-style {
  .panel:not([hidden]) {
    opacity: 0;
    scale: 0.96;
    translate: 0 6px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .panel {
    transition: none;
  }
}

header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 8px 8px 12px;
  border-bottom: 1px solid var(--line);
}

h2 {
  margin: 0;
  font-size: 14px;
  letter-spacing: 0.08em;
}

/* Sections: each context is a boxed block with a title band, so groups never run together. */
.group {
  margin: 0;
  border: 1px solid var(--line);
  border-radius: 6px;
  background: var(--surface);
  overflow: hidden;
}

.group + .group,
#features > .group + .group,
#features {
  margin-top: 12px;
}

.group > :not(.group-head) {
  margin-inline: 10px;
}

.group > :last-child {
  margin-bottom: 10px;
}

.group-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  min-height: 30px;
  margin-bottom: 6px;
  padding: 4px 6px 4px 10px;
  border-bottom: 1px solid var(--line);
  border-left: 3px solid var(--accent);
  background: color-mix(in srgb, var(--accent) 10%, var(--bg));
}

h3 {
  margin: 0;
  color: var(--fg);
  font-size: 11px;
  font-weight: bold;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

/* A sub-group inside a section (colour groups): a quieter heading with a rule under it. */
h4 {
  margin: 14px 10px 4px;
  padding-bottom: 3px;
  border-bottom: 1px dashed var(--line);
  color: var(--muted);
  font-size: 10px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.group-reset {
  padding: 2px 8px;
  border: 1px solid var(--accent);
  border-radius: 4px;
  background: transparent;
  color: var(--accent);
  font-size: 11px;
}

.group-reset:hover {
  background: color-mix(in srgb, var(--accent) 12%, transparent);
}

.slider {
  display: grid;
  grid-template-columns: 4rem minmax(0, 1fr) 3.5rem;
  align-items: center;
  gap: 8px;
  padding: 4px 0;
}

.slider input {
  width: 100%;
  accent-color: var(--accent);
}

.slider output {
  color: var(--muted);
  font-variant-numeric: tabular-nums;
  text-align: right;
}

.hint {
  margin-block: 4px 8px;
  color: var(--muted);
  font-size: 11px;
  line-height: 1.4;
}

.group.danger .group-head {
  border-left-color: #c62828;
  background: color-mix(in srgb, #c62828 10%, var(--bg));
}

.reset-all {
  width: calc(100% - 20px);
  padding: 7px 10px;
  border: 1px solid #c62828;
  border-radius: 4px;
  background: transparent;
  color: #e53935;
  font-weight: bold;
}

.reset-all:hover,
.reset-all.armed {
  background: #c62828;
  color: #fff;
}

button,
select,
input {
  font: inherit;
  color: inherit;
}

button {
  cursor: pointer;
}

:is(button, select, input):focus-visible {
  outline: 2px solid var(--focus);
  outline-offset: 1px;
}

.close {
  width: 26px;
  height: 26px;
  border: 0;
  border-radius: 4px;
  background: transparent;
  font-size: 18px;
  line-height: 1;
}

.power {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin: 0 4px 0 auto;
  padding: 4px 10px 4px 8px;
  border: 1px solid var(--line);
  border-radius: 999px;
  background: var(--surface);
  color: var(--fg);
  font: bold 11px/1.2 Arial, Helvetica, sans-serif;
  cursor: pointer;
}

.power::before {
  content: "";
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--muted);
}

.power[aria-pressed="true"]::before {
  background: #4caf50;
  box-shadow: 0 0 6px #4caf50;
}

.power:hover {
  background: color-mix(in srgb, var(--fg) 8%, var(--surface));
}

.power:focus-visible {
  outline: 2px solid var(--focus);
  outline-offset: 2px;
}

.power:disabled {
  cursor: progress;
  opacity: 0.6;
}

.close:hover {
  background: color-mix(in srgb, var(--fg) 10%, transparent);
}

.tabs {
  display: flex;
  gap: 4px;
  padding: 8px 12px 0;
  border-bottom: 1px solid var(--line);
}

[role="tab"] {
  padding: 6px 10px;
  border: 1px solid transparent;
  border-bottom: 0;
  border-radius: 6px 6px 0 0;
  background: transparent;
  color: var(--muted);
  margin-bottom: -1px;
}

[role="tab"]:hover {
  color: var(--fg);
}

[role="tab"][aria-selected="true"] {
  border-color: var(--line);
  background: var(--surface);
  color: var(--fg);
  font-weight: 600;
  box-shadow: inset 0 2px 0 var(--accent);
}

.pane {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 10px 12px 12px;
  background: var(--bg);
}

.field {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

select {
  max-width: 170px;
  padding: 3px 6px;
  border: 1px solid var(--line);
  border-radius: 4px;
  background: var(--bg);
}

.row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 3px 0;
}

.row label {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
}

.changed {
  display: none;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--accent);
}

.row.is-changed .changed {
  display: inline-block;
  order: -1;
}

.controls {
  display: flex;
  align-items: center;
  gap: 6px;
}

input[type="color"] {
  width: 32px;
  height: 22px;
  padding: 0 2px;
  border: 1px solid var(--line);
  border-radius: 4px;
  background: var(--bg);
  cursor: pointer;
}

input[type="range"] {
  width: 64px;
  accent-color: var(--accent);
}

.undo {
  width: 24px;
  height: 24px;
  padding: 0;
  border: 0;
  border-radius: 4px;
  background: transparent;
  color: var(--muted);
  visibility: hidden;
}

.row.is-changed .undo {
  visibility: visible;
}

.undo:hover {
  background: color-mix(in srgb, var(--fg) 10%, transparent);
  color: var(--fg);
}

.sample {
  margin: 12px 0 0;
  padding: 10px;
  border: 1px dashed var(--line);
  border-radius: 6px;
}

.notice {
  margin: 0 0 8px;
  padding: 6px 8px;
  border-radius: 4px;
  background: color-mix(in srgb, var(--accent) 12%, transparent);
  font-size: 12px;
}

.bulk {
  display: flex;
  gap: 6px;
}

.bulk button {
  flex: 1;
  padding: 4px 8px;
  border: 1px solid var(--line);
  border-radius: 4px;
  background: var(--bg);
  font-size: 12px;
}

.bulk button:hover:not(:disabled) {
  background: color-mix(in srgb, var(--fg) 8%, var(--bg));
}

.bulk button:disabled {
  cursor: default;
  opacity: 0.5;
}

.feature {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
  padding: 6px 0;
}

.feature + .feature {
  border-top: 1px solid color-mix(in srgb, var(--line) 60%, transparent);
}

.feature-label {
  font-weight: 600;
}

.feature-desc,
.feature-note {
  display: block;
  color: var(--muted);
  font-size: 11px;
  line-height: 1.3;
}

.feature-note {
  margin-top: 2px;
  font-style: italic;
}

.switch {
  flex: none;
  position: relative;
  width: 30px;
  height: 18px;
  margin-top: 1px;
  padding: 0;
  border: 0;
  border-radius: 999px;
  background: var(--line);
  transition: background-color 120ms;
}

.switch::after {
  content: "";
  position: absolute;
  top: 2px;
  left: 2px;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
  transition: translate 120ms;
}

.switch:disabled {
  cursor: not-allowed;
  opacity: 0.4;
}

.switch[aria-checked="true"] {
  background: var(--accent);
}

.switch[aria-checked="true"]::after {
  translate: 12px 0;
}

@media (prefers-reduced-motion: reduce) {
  .switch,
  .switch::after {
    transition: none;
  }
}

.panel.info {
  /* Styled like TEAR's profile page cards; its own colours stand in while TEAR is off. */
  transform-origin: bottom center;
  width: auto;
  border: 1px solid var(--tear-line, var(--line));
  border-radius: var(--tear-radius, 8px);
  background: var(--tear-panel-bg, var(--surface));
  color: var(--tear-text-strong, var(--fg));
  box-shadow: 0 8px 24px var(--tear-shadow, rgba(0, 0, 0, 0.35));
}

.info header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 16px;
  padding: 7px 12px 6px;
  border-bottom: 1px solid var(--tear-line, var(--line));
  color: var(--tear-muted, var(--muted));
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.info .now {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 12px;
}

.info .clock {
  font-size: 20px;
  font-weight: 600;
  line-height: 1;
  font-variant-numeric: tabular-nums;
}

/* The colon ticks with the seconds, like a bedside clock. */
.info .tick {
  animation: tear-tick 1s steps(1) infinite;
}

@keyframes tear-tick {
  50% {
    opacity: 0.25;
  }
}

@media (prefers-reduced-motion: reduce) {
  .info .tick {
    animation: none;
  }
}

.info .date {
  display: flex;
  flex-direction: column;
  padding-left: 12px;
  border-left: 1px solid var(--tear-line, var(--line));
  color: var(--tear-muted, var(--muted));
  font-size: 11px;
  line-height: 1.25;
  white-space: nowrap;
}

.info .date b {
  color: var(--tear-text-strong, var(--fg));
  font-weight: 600;
}

.info .server {
  color: inherit;
  letter-spacing: 0.02em;
  text-decoration: none;
  text-transform: none;
}

.info .server::before {
  content: "";
  display: inline-block;
  width: 6px;
  height: 6px;
  margin-right: 5px;
  border-radius: 50%;
  background: #4caf50;
  vertical-align: 1px;
}

.info .server:hover,
.info .server:focus-visible {
  color: var(--tear-link, var(--focus));
  text-decoration: underline;
}

.info .server:focus-visible {
  outline: 2px solid var(--tear-link, var(--focus));
  outline-offset: 2px;
  border-radius: 2px;
}

.panel.info:focus {
  outline: none;
}

.panel.info:focus-visible {
  outline: 2px solid var(--focus);
  outline-offset: 2px;
}
`);
