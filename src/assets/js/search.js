import * as params from "@params";
(async () => {
  try {
    const response = await fetch(`/hugo-lyra-english.json?cache=${params.api}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const json = await response.text();
    const db = await HugoLyra.bootstrap(json);
    const res = await HugoLyra.search(db);
    if (res?.q) {
      document.getElementById("search-input").setAttribute("value", res.q);
    }
    if (res?.search?.count) {
      const searchResults = document.getElementById("results");
      let resultList = "";
      for (const hit of res.search.hits) {
        const doc = hit.document;
        resultList += "<li>";
        resultList += '<span class="date">' + doc.meta.date + "</span>";
        resultList +=
          '<a class="title" href="' + doc.uri + '">' + doc.title + "</a>";
        resultList += "</li>";
      }
      searchResults.innerHTML = resultList.length
        ? resultList
        : "No results found";
    }
  } catch (e) {
    console.error(e);
  }
})();
