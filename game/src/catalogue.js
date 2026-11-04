// Build accessible links and validate paths on the host site.
import { resolve, matchingItems, newest } from "./assets.js";
export function siteURL(path) {
  if (
    typeof path !== "string" ||
    !path.startsWith("/") ||
    path.startsWith("//")
  )
    throw new Error("Site paths must start with a single slash.");
  const url = resolve(path, location.origin + "/");
  if (new URL(url).origin !== location.origin)
    throw new Error("Site paths must stay on the page origin.");
  return url;
}

export function link(label, url) {
  const element = document.createElement(url ? "a" : "span");
  element.textContent = label;
  if (url) {
    element.href = url;
    element.target = "_blank";
    element.rel = "noopener noreferrer";
  }
  return element;
}

export function openLink(url) {
  const element = link("", url);
  document.body.append(element);
  element.click();
  element.remove();
}

export function catalogue(game) {
  const catalogue = document.createElement("nav");
  catalogue.className = "adventure-catalogue";
  catalogue.setAttribute("aria-label", "Books and posts");
  for (const book of [
    ...Object.values(game.books),
    ...Object.values(game.boards),
  ]) {
    const title = document.createElement("h2");
    title.textContent = book.title;
    const list = document.createElement("ul");
    if (book.site) {
      const row = document.createElement("li");
      row.append(link(`${book.title} on the site`, siteURL(book.site)));
      list.append(row);
    }
    for (const item of book.items) {
      const row = document.createElement("li");
      row.append(link(item.title, item.link || item.url));
      list.append(row);
    }
    catalogue.append(title, list);
  }
  const hotspotLinks = document.createElement("ul");
  for (const room of Object.values(game.world.rooms))
    for (const [id, binding] of Object.entries(room.hotspots || {})) {
      if (!binding.content || !binding.site) continue;
      const row = document.createElement("li");
      const item = newest(matchingItems(game.items, binding.content))[0];
      row.append(
        link(`${item?.title || id} on the site`, siteURL(binding.site)),
      );
      hotspotLinks.append(row);
    }
  catalogue.append(hotspotLinks);
  return catalogue;
}
