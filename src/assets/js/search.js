import * as hugoParams from "@params";
(async () => {
  try {
    const params = new URLSearchParams(window.location.search);
    const query = params.get("q");
    if (query) {
      const db = await HugoLyra.fetchDb(
        `/search/hugo-lyra-english.json?cache=${hugoParams.cur}`
      );
      const res = await HugoLyra.search(db, { term: query, properties: "*" });
      document
        .getElementById("search-input")
        .setAttribute("value", res.options.term);
      let resultList = "";
      const searchResults = document.getElementById("results");
      if (res?.search?.count) {
        for (const hit of res.search.hits) {
          const doc = hit.document;
          resultList += "<li>";
          resultList += '<span class="date">' + doc.meta.date + "</span>";
          resultList +=
            '<a class="title" href="' + doc.uri + '">' + doc.title + "</a>";
          resultList += "</li>";
        }
      }
      searchResults.innerHTML = resultList.length
        ? resultList
        : "No results found";
    }
  } catch (e) {
    console.error(e);
  }
})();
