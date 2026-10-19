const state = {
  home: "backend",
  backendHasKey: false,
  keyType: "team",
  keyId: "",
  issuerId: "",
  pem: "",
  privateKey: null,
  keyFileName: "",
  tokenValue: "",
  tokenExp: 0,
  apps: [],
  selectedId: "",
  catalog: null,
  versionId: "",
  locale: "",
  displayType: "",
};

const displays = {
  APP_IPHONE_67: 'iPhone 6.7"',
  APP_IPHONE_65: 'iPhone 6.5"',
  APP_IPHONE_61: 'iPhone 6.1"',
  APP_IPHONE_58: 'iPhone 5.8"',
  APP_IPHONE_55: 'iPhone 5.5"',
  APP_IPHONE_47: 'iPhone 4.7"',
  APP_IPAD_PRO_3GEN_129: 'iPad Pro 12.9"',
  APP_IPAD_PRO_3GEN_11: 'iPad Pro 11"',
  APP_IPAD_105: 'iPad 10.5"',
  APP_IPAD_97: 'iPad 9.7"',
  APP_DESKTOP: "Mac",
  APP_WATCH_ULTRA: "Apple Watch Ultra",
  APP_APPLE_TV: "Apple TV",
  APP_APPLE_VISION_PRO: "Apple Vision Pro",
};

const $ = (id) => document.getElementById(id);

document.addEventListener("DOMContentLoaded", () => {
  restoreBrowserKey();
  syncKeyType();
  $("key-home").addEventListener("change", syncHome);
  $("key-type").addEventListener("change", () => {
    syncKeyType();
    persistBrowserKey();
  });
  for (const id of ["key-id", "issuer-id"]) {
    $(id).addEventListener("input", persistBrowserKey);
  }
  $("forget").addEventListener("click", forgetBrowserKey);
  $("connect-form").addEventListener("submit", (event) => {
    event.preventDefault();
    connect();
  });
  $("reload").addEventListener("click", () => connect());
  $("filter").addEventListener("input", renderApps);
  detectServerKey();
  const file = $("key-file");
  file.addEventListener("change", () => {
    if (file.files[0]) loadKeyFile(file.files[0]);
  });
  const drop = $("drop");
  drop.addEventListener("dragover", (event) => event.preventDefault());
  drop.addEventListener("drop", (event) => {
    event.preventDefault();
    if (event.dataTransfer.files[0]) loadKeyFile(event.dataTransfer.files[0]);
  });
});

async function detectServerKey() {
  try {
    const response = await fetch("/v1/key", { headers: { Accept: "application/json" }, cache: "no-store" });
    const body = await response.json();
    state.backendHasKey = !!(body && body.backend);
  } catch {
    state.backendHasKey = false;
  }
  const backendOption = $("key-home").querySelector('option[value="backend"]');
  backendOption.disabled = !state.backendHasKey;
  if (!state.backendHasKey) $("key-home").value = "browser";
  else if (!state.pem) $("key-home").value = "backend";
  syncHome();
}

function restoreBrowserKey() {
  const saved = localStorage.getItem("fire.browserKey");
  if (!saved) return;
  try {
    const stored = JSON.parse(saved);
    $("key-id").value = stored.keyId || "";
    $("key-type").value = stored.keyType || "team";
    $("issuer-id").value = stored.issuerId || "";
    if (stored.pem) importPem(stored.pem, stored.fileName || "Saved key");
    $("key-home").value = "browser";
  } catch {
    localStorage.removeItem("fire.browserKey");
  }
}

function readForm() {
  state.home = $("key-home").value;
  state.keyId = $("key-id").value.trim();
  state.keyType = $("key-type").value;
  state.issuerId = $("issuer-id").value.trim();
}

function persistBrowserKey() {
  if (!state.pem) return;
  localStorage.setItem("fire.browserKey", JSON.stringify({
    pem: state.pem,
    fileName: state.keyFileName,
    keyId: $("key-id").value.trim(),
    keyType: $("key-type").value,
    issuerId: $("issuer-id").value.trim(),
  }));
  $("forget").hidden = false;
}

function forgetBrowserKey() {
  localStorage.removeItem("fire.browserKey");
  state.pem = "";
  state.privateKey = null;
  state.keyFileName = "";
  state.tokenValue = "";
  $("key-file-label").textContent = "Drop the AuthKey .p8 here, or browse.";
  $("drop").classList.remove("ready");
  $("forget").hidden = true;
  setStatus("Removed the key saved in this browser.");
}

function syncHome() {
  const browser = $("key-home").value === "browser";
  $("browser-fields").hidden = !browser;
  $("backend-hint").hidden = browser;
  if (browser) syncKeyType();
}

function syncKeyType() {
  $("issuer-field").hidden = $("key-type").value === "individual";
}

function setStatus(message) {
  $("status").textContent = message || "";
}

async function loadKeyFile(file) {
  try {
    const pem = await file.text();
    await importPem(pem, file.name);
    const match = file.name.match(/^AuthKey_([A-Za-z0-9]+)\.p8$/i);
    if (match && !$("key-id").value.trim()) $("key-id").value = match[1];
    persistBrowserKey();
    setStatus("");
  } catch (error) {
    state.pem = "";
    state.privateKey = null;
    state.keyFileName = "";
    setStatus(error.message || "Could not read that .p8 file.");
  }
}

async function importPem(pem, fileName) {
  if (!pem.includes("PRIVATE KEY")) throw new Error("Choose an unencrypted PKCS#8 .p8 file.");
  state.privateKey = await crypto.subtle.importKey(
    "pkcs8",
    pemToDer(pem),
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"],
  );
  state.pem = pem;
  state.keyFileName = fileName;
  state.tokenValue = "";
  $("key-file-label").textContent = fileName;
  $("drop").classList.add("ready");
  $("forget").hidden = false;
}

function pemToDer(pem) {
  const body = pem.replace(/-----BEGIN [^-]+-----/g, "").replace(/-----END [^-]+-----/g, "").replace(/\s+/g, "");
  const binary = atob(body);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function appleToken() {
  const now = Math.floor(Date.now() / 1000);
  if (state.tokenValue && state.tokenExp - 30 > now) return state.tokenValue;
  const header = { alg: "ES256", kid: state.keyId, typ: "JWT" };
  const claims = { iat: now, exp: now + 300, aud: "appstoreconnect-v1" };
  if (state.keyType === "individual") claims.sub = "user";
  else claims.iss = state.issuerId;
  const unsigned = base64url(new TextEncoder().encode(JSON.stringify(header)))
    + "."
    + base64url(new TextEncoder().encode(JSON.stringify(claims)));
  const signature = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    state.privateKey,
    new TextEncoder().encode(unsigned),
  );
  state.tokenValue = unsigned + "." + base64url(signature);
  state.tokenExp = now + 300;
  return state.tokenValue;
}

function base64url(bytes) {
  const view = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let binary = "";
  for (let i = 0; i < view.length; i += 1) binary += String.fromCharCode(view[i]);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/g, "");
}

async function connect() {
  readForm();
  if (state.home === "browser") {
    if (!state.privateKey) {
      setStatus("Choose the .p8 file for this browser.");
      return;
    }
    if (!state.keyId) {
      setStatus("Key ID is required.");
      return;
    }
    if (state.keyType === "team" && !state.issuerId) {
      setStatus("Issuer ID is required for a team key.");
      return;
    }
    persistBrowserKey();
  } else if (!state.backendHasKey) {
    setStatus("This server has no .p8. Set ASC_PRIVATE_KEY_PATH, or keep the key in this browser.");
    return;
  }
  setStatus("Loading apps…");
  try {
    const body = await api("/v1/apps");
    state.apps = body.apps || [];
    state.selectedId = "";
    state.catalog = null;
    $("library").hidden = false;
    renderApps();
    renderEmpty();
    setStatus(state.home === "browser" ? "Signed with the key saved in this browser." : "Signed with the key on this server.");
  } catch (error) {
    setStatus(error.message);
  }
}

async function api(path) {
  const headers = { Accept: "application/json" };
  if (state.home === "browser") headers["X-App-Store-Token"] = await appleToken();
  let response;
  try {
    response = await fetch(path, { headers, cache: "no-store" });
  } catch {
    throw new Error("Cannot reach Fire.");
  }
  const payload = await readPayload(response);
  if (!response.ok) {
    const message = payload && payload.error && payload.error.message
      ? payload.error.message
      : "Request failed (" + response.status + ")";
    const retry = response.headers.get("Retry-After");
    throw new Error(retry ? message + " Retry after " + retry + "s." : message);
  }
  return payload;
}

async function readPayload(response) {
  const text = await response.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return { error: { message: "The backend returned a non-JSON response." } };
  }
}

function renderApps() {
  const query = $("filter").value.trim().toLowerCase();
  const apps = state.apps.filter((app) => {
    const haystack = (app.name + " " + (app.bundleId || "") + " " + app.id).toLowerCase();
    return haystack.includes(query);
  });
  $("app-count").textContent = state.apps.length + (state.apps.length === 1 ? " app" : " apps") + " for this key";
  const list = $("app-list");
  list.replaceChildren();
  if (apps.length === 0) {
    list.append(el("li", null, [text("p", "hint", "No apps match.")]));
    return;
  }
  for (const app of apps) {
    const button = el("button", {
      class: "app",
      type: "button",
      onclick: () => selectApp(app.id),
    });
    if (app.id === state.selectedId) button.setAttribute("aria-current", "true");
    button.append(text("strong", null, app.name || app.id));
    button.append(text("span", null, app.bundleId || app.id));
    list.append(el("li", null, [button]));
  }
}

async function selectApp(id) {
  state.selectedId = id;
  state.catalog = null;
  renderApps();
  const detail = $("detail");
  detail.replaceChildren(text("p", "loading", "Reading listing, screenshots, and builds…"));
  try {
    state.catalog = await api("/v1/apps/" + encodeURIComponent(id) + "/catalog");
    chooseDefaults(state.catalog);
    renderDetail();
  } catch (error) {
    detail.replaceChildren(text("p", "status", error.message));
  }
}

function chooseDefaults(catalog) {
  const ready = (catalog.versions || []).find((version) => version.state === "READY_FOR_SALE");
  state.versionId = (ready || catalog.versions[0] || {}).id || "";
  const locales = localesFor(catalog, state.versionId);
  state.locale = locales.includes(catalog.app.primaryLocale) ? catalog.app.primaryLocale : (locales[0] || "");
  const version = (catalog.versions || []).find((item) => item.id === state.versionId);
  const localization = version && version.localizations.find((item) => item.locale === state.locale);
  state.displayType = localization && localization.screenshotSets[0] ? localization.screenshotSets[0].displayType : "";
}

function localesFor(catalog, versionId) {
  const locales = new Set();
  for (const info of catalog.appInfos || []) {
    for (const localization of info.localizations || []) locales.add(localization.locale);
  }
  const version = (catalog.versions || []).find((item) => item.id === versionId);
  if (version) {
    for (const localization of version.localizations || []) locales.add(localization.locale);
  }
  return [...locales].sort((a, b) => {
    if (a === catalog.app.primaryLocale) return -1;
    if (b === catalog.app.primaryLocale) return 1;
    return a.localeCompare(b);
  });
}

function renderEmpty() {
  const detail = $("detail");
  const section = el("section", { class: "empty" });
  section.append(text("p", "eyebrow", "Listing"));
  section.append(text("h2", null, "Select an app."));
  section.append(text("p", null, "Title, subtitle, description, keywords, screenshots, and every uploaded build appear here."));
  detail.replaceChildren(section);
}

function renderDetail() {
  const catalog = state.catalog;
  if (!catalog) return;
  const app = catalog.app;
  const detail = $("detail");
  const mast = el("header", { class: "mast" });
  const titles = el("div");
  titles.append(text("p", "eyebrow", app.primaryLocale || "App"));
  titles.append(text("h2", null, app.name || app.id));
  titles.append(text("p", "meta", [app.bundleId, app.sku && "SKU " + app.sku, app.id].filter(Boolean).join(" · ")));
  const pills = el("div", { class: "pills" });
  pills.append(text("span", "pill", (catalog.versions || []).length + " versions"));
  pills.append(text("span", "pill", (catalog.builds || []).length + " builds"));
  mast.append(titles, pills);

  detail.replaceChildren(mast, renderInfos(catalog), renderVersion(catalog), renderBuilds(catalog));
}

function renderInfos(catalog) {
  const block = el("section", { class: "block" });
  block.append(text("h3", null, "Title and subtitle"));
  const infos = catalog.appInfos || [];
  if (infos.length === 0) {
    block.append(text("p", "hint", "This app has no app-info localizations."));
    return block;
  }
  const grid = el("div", { class: "info-grid" });
  for (const info of infos) {
    const card = el("article", { class: "info-card" });
    const bits = [labelize(info.state) || "App info"];
    if (info.ageRating) bits.push(info.ageRating);
    card.append(text("p", "kicker", bits.join(" · ")));
    const localization = (info.localizations || []).find((item) => item.locale === state.locale) || info.localizations[0];
    if (!localization) {
      card.append(text("p", null, "No localization."));
    } else {
      card.append(text("p", null, localization.title || "Untitled"));
      card.append(text("p", "hint", localization.subtitle || "No subtitle"));
      const link = safeLink(localization.privacyPolicyUrl, "Privacy policy");
      if (link) card.append(el("p", null, [link]));
    }
    grid.append(card);
  }
  block.append(grid);
  return block;
}

function renderVersion(catalog) {
  const block = el("section", { class: "block" });
  block.append(text("h3", null, "Version metadata"));
  const versions = catalog.versions || [];
  if (versions.length === 0) {
    block.append(text("p", "hint", "This app has no App Store versions."));
    return block;
  }
  const versionBar = el("div", { class: "toolbar" });
  for (const version of versions) {
    const label = [version.version || "Version", platforms(version.platform), labelize(version.state)].filter(Boolean).join(" · ");
    versionBar.append(chip(label, version.id === state.versionId, () => {
      state.versionId = version.id;
      const locales = localesFor(catalog, version.id);
      if (!locales.includes(state.locale)) state.locale = locales[0] || "";
      const localization = version.localizations.find((item) => item.locale === state.locale);
      state.displayType = localization && localization.screenshotSets[0] ? localization.screenshotSets[0].displayType : "";
      renderDetail();
    }));
  }
  block.append(versionBar);

  const locales = localesFor(catalog, state.versionId);
  if (locales.length > 1) {
    const localeBar = el("div", { class: "toolbar" });
    for (const locale of locales) {
      localeBar.append(chip(locale, locale === state.locale, () => {
        state.locale = locale;
        renderDetail();
      }));
    }
    block.append(localeBar);
  }

  const version = versions.find((item) => item.id === state.versionId) || versions[0];
  const facts = [version.copyright, labelize(version.releaseType), formatDate(version.createdDate)].filter(Boolean);
  if (facts.length) block.append(text("p", "hint", facts.join(" · ")));
  const localization = (version.localizations || []).find((item) => item.locale === state.locale);
  if (!localization) {
    block.append(text("p", null, "No " + (state.locale || "locale") + " localization on this version."));
    return block;
  }
  addCopy(block, "Description", localization.description);
  addKeywords(block, localization.keywords);
  addCopy(block, "Promotional text", localization.promotionalText);
  addCopy(block, "What's new", localization.whatsNew);
  const links = el("div", { class: "links" });
  const support = safeLink(localization.supportUrl, "Support URL");
  const marketing = safeLink(localization.marketingUrl, "Marketing URL");
  if (support) links.append(support);
  if (marketing) links.append(marketing);
  if (links.childNodes.length) {
    block.append(text("p", "kicker", "Links"));
    block.append(links);
  }
  block.append(renderShots(localization));
  return block;
}

function renderShots(localization) {
  const wrap = el("div");
  wrap.append(text("p", "kicker", "Screenshots"));
  const sets = localization.screenshotSets || [];
  if (sets.length === 0) {
    wrap.append(text("p", "hint", "No screenshots for this localization."));
    return wrap;
  }
  if (!sets.some((set) => set.displayType === state.displayType)) state.displayType = sets[0].displayType;
  if (sets.length > 1) {
    const bar = el("div", { class: "toolbar" });
    for (const set of sets) {
      bar.append(chip(displays[set.displayType] || labelize(set.displayType), set.displayType === state.displayType, () => {
        state.displayType = set.displayType;
        renderDetail();
      }));
    }
    wrap.append(bar);
  }
  const set = sets.find((item) => item.displayType === state.displayType) || sets[0];
  const film = el("div", { class: "film" });
  if ((set.screenshots || []).length === 0) {
    wrap.append(text("p", "hint", "This screenshot set is empty."));
    return wrap;
  }
  for (const shot of set.screenshots) {
    const figure = el("figure", { class: "frame" });
    if (shot.url && shot.url.startsWith("https://")) {
      const button = el("button", {
        type: "button",
        class: "shot",
        onclick: () => openShot(shot),
      });
      const image = el("img", { alt: shot.fileName || "Screenshot", src: shot.url });
      button.append(image);
      figure.append(button);
    }
    const caption = [shot.fileName, shot.width && shot.height ? shot.width + "×" + shot.height : ""].filter(Boolean).join(" · ");
    figure.append(text("figcaption", null, caption || "Screenshot"));
    film.append(figure);
  }
  wrap.append(film);
  return wrap;
}

function openShot(shot) {
  $("lightbox-image").src = shot.url;
  $("lightbox-image").alt = shot.fileName || "Screenshot";
  $("lightbox-caption").textContent = shot.fileName || "";
  $("lightbox").showModal();
}

function renderBuilds(catalog) {
  const block = el("section", { class: "block" });
  const builds = catalog.builds || [];
  block.append(text("h3", null, "Builds"));
  if (builds.length === 0) {
    block.append(text("p", "hint", "No builds have been uploaded."));
    return block;
  }
  const table = el("table");
  const head = el("tr");
  for (const label of ["Build", "Uploaded", "Expires", "State", "Minimum OS"]) {
    head.append(text("th", null, label));
  }
  table.append(el("thead", null, [head]));
  const body = el("tbody");
  for (const build of builds) {
    const row = el("tr");
    row.append(text("td", null, build.version || build.id));
    row.append(text("td", null, formatDate(build.uploadedDate)));
    row.append(text("td", null, build.expired ? "Expired" : formatDate(build.expirationDate)));
    const stateLabel = [labelize(build.processingState) || "—", build.expired ? "expired" : ""].filter(Boolean).join(" · ");
    const stateCell = text("td", "state", stateLabel);
    stateCell.dataset.tone = tone(build);
    row.append(stateCell);
    const encryption = build.usesNonExemptEncryption == null ? "" : build.usesNonExemptEncryption ? " · encryption" : " · exempt";
    row.append(text("td", null, (build.minOsVersion || "—") + encryption));
    body.append(row);
  }
  table.append(body);
  block.append(el("div", { class: "table-scroll" }, [table]));
  return block;
}

function addCopy(parent, label, value) {
  if (!value) return;
  parent.append(text("p", "kicker", label));
  parent.append(text("p", "copy", value));
}

function addKeywords(parent, value) {
  const words = (value || "").split(",").map((word) => word.trim()).filter(Boolean);
  if (words.length === 0) return;
  parent.append(text("p", "kicker", "Keywords"));
  const row = el("div", { class: "keywords" });
  for (const word of words) row.append(text("span", "keyword", word));
  parent.append(row);
}

function chip(label, pressed, onClick) {
  const button = el("button", { class: "chip", type: "button", onclick: onClick });
  button.textContent = label;
  button.setAttribute("aria-pressed", pressed ? "true" : "false");
  return button;
}

function tone(build) {
  if (build.expired || build.processingState === "FAILED" || build.processingState === "INVALID") return "bad";
  if (build.processingState === "PROCESSING") return "warn";
  if (build.processingState === "VALID") return "good";
  return "";
}

function platforms(value) {
  return { IOS: "iOS", MAC_OS: "macOS", TV_OS: "tvOS", VISION_OS: "visionOS" }[value] || labelize(value);
}

function labelize(value) {
  if (!value) return "";
  return value.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

function safeLink(href, label) {
  if (!href) return null;
  let url;
  try {
    url = new URL(href);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return null;
  const link = el("a", { href: url.toString(), target: "_blank", rel: "noopener noreferrer" });
  link.textContent = label;
  return link;
}

function el(tag, props, children) {
  const node = document.createElement(tag);
  if (props) {
    for (const [key, value] of Object.entries(props)) {
      if (key === "class") node.className = value;
      else if (key.startsWith("on") && typeof value === "function") node.addEventListener(key.slice(2).toLowerCase(), value);
      else if (value != null) node.setAttribute(key, value);
    }
  }
  for (const child of children || []) node.append(child);
  return node;
}

function text(tag, className, value) {
  const node = el(tag, className ? { class: className } : null);
  node.textContent = value == null ? "" : String(value);
  return node;
}
