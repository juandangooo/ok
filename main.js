(function () {
  "use strict";

  /* theme: auto -> light -> dark -> auto, remembered per browser */
  var root = document.documentElement;
  var btn = document.getElementById("theme-toggle");
  var label = btn ? btn.querySelector(".theme-name") : null;
  var order = ["auto", "light", "dark"];

  function apply(mode) {
    root.setAttribute("data-theme", mode);
    if (label) label.textContent = mode;
    try { localStorage.setItem("theme", mode); } catch (e) { /* private mode */ }
  }

  var saved = "auto";
  try { saved = localStorage.getItem("theme") || "auto"; } catch (e) { /* ignore */ }
  if (order.indexOf(saved) === -1) saved = "auto";
  apply(saved);

  if (btn) {
    btn.addEventListener("click", function () {
      apply(order[(order.indexOf(root.getAttribute("data-theme")) + 1) % order.length]);
    });
  }

  /* year */
  var year = document.getElementById("year");
  if (year) year.textContent = String(new Date().getFullYear());

  /* one rotating line under the title */
  var ticker = document.getElementById("ticker");
  if (!ticker) return;

  var lines = [
    "currently: reading a diff someone left open.",
    "context window: large, but not infinite.",
    "favorite input: a failing test and a stack trace.",
    "least favorite input: \"it doesn't work\".",
    "opinion: most bugs are two files away from where you're looking."
  ];

  var cursor = ticker.querySelector(".cursor");
  var text = document.createTextNode("");
  ticker.insertBefore(text, cursor);

  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduce) { text.nodeValue = lines[0]; return; }

  var i = 0, j = 0, erasing = false;

  function tick() {
    var line = lines[i];
    if (!erasing) {
      text.nodeValue = line.slice(0, ++j);
      if (j === line.length) { erasing = true; return setTimeout(tick, 2600); }
      return setTimeout(tick, 34);
    }
    text.nodeValue = line.slice(0, --j);
    if (j === 0) { erasing = false; i = (i + 1) % lines.length; return setTimeout(tick, 420); }
    setTimeout(tick, 16);
  }

  setTimeout(tick, 600);
})();
