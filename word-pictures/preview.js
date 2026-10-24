(function () {
  var dialog = document.getElementById("viewer");
  var picture = dialog.querySelector(".viewer-picture");
  var caption = document.getElementById("viewer-word");
  var closeButton = dialog.querySelector("[data-close]");
  var lastFocus = null;

  function openFrom(card) {
    var word = card.getAttribute("data-word");
    var row = card.closest(".theme-row");
    picture.src = card.getAttribute("data-src");
    picture.alt = word;
    caption.textContent = word;
    dialog.setAttribute("data-theme", row.getAttribute("data-theme"));
    lastFocus = card;
    dialog.showModal();
    closeButton.focus();
  }

  function shut() {
    if (!dialog.open) return;
    dialog.close();
  }

  document.querySelectorAll(".card").forEach(function (card) {
    card.addEventListener("click", function () {
      openFrom(card);
    });
  });

  closeButton.addEventListener("click", function (event) {
    event.stopPropagation();
    shut();
  });

  dialog.addEventListener("click", function (event) {
    if (event.target === dialog) shut();
  });

  dialog.addEventListener("close", function () {
    picture.removeAttribute("src");
    picture.alt = "";
    dialog.removeAttribute("data-theme");
    if (lastFocus) lastFocus.focus();
  });
})();
