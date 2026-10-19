(function () {
  'use strict';
  var HOLD_MS = 1500;
  var FIRST_EIGHT = 'ADIMNPST';
  var QUESTIONS = [
    {prompt: 'What is eight plus five?', choices: ['Eleven', 'Thirteen', 'Three'], answer: 'Thirteen'},
    {prompt: 'What is four plus seven?', choices: ['Eleven', 'Nine', 'Fifteen'], answer: 'Eleven'},
    {prompt: 'What is six plus six?', choices: ['Ten', 'Twelve', 'Eight'], answer: 'Twelve'},
    {prompt: 'What is nine minus four?', choices: ['Five', 'Three', 'Thirteen'], answer: 'Five'}
  ];
  var NAMES = {post: 'Lucy’s Letter Post', space: 'Lucy’s Moonboat', silk: 'Lucy’s Silk Thread'};
  var settings = GrownUps.load();
  var questionAt = Math.floor(Math.random() * QUESTIONS.length);
  var holding = false;
  var holdDone = false;
  var holdStart = 0;
  var holdFrame = 0;
  var holdTimer = 0;
  var status = document.querySelector('#status');
  var gate = document.querySelector('#gate');
  var sheet = document.querySelector('#sheet');
  var holdButton = document.querySelector('#hold');
  var holdBar = document.querySelector('#hold-bar');
  var questionBox = document.querySelector('#gate-question');
  var prompt = document.querySelector('#gate-prompt');
  var choices = document.querySelector('#gate-choices');
  var grid = document.querySelector('#letter-grid');
  var dot = document.querySelector('#cursor-dot');

  function motionAllowed() {
    var mode = document.documentElement.dataset.motion;
    if (mode === 'calm') return false;
    if (mode === 'full') return true;
    return !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  function note(message) {
    status.textContent = message;
  }

  function paint() {
    document.querySelectorAll('input[name="sound"]').forEach(function (input) {
      input.checked = input.value === settings.sound;
    });
    document.querySelectorAll('input[name="motion"]').forEach(function (input) {
      input.checked = input.value === settings.motion;
    });
    document.querySelectorAll('input[name="hint"]').forEach(function (input) {
      input.checked = input.value === String(settings.hintAfter);
    });
    document.querySelectorAll('input[name="game"]').forEach(function (input) {
      input.checked = settings.games[input.value] !== false;
    });
    document.querySelector('#letters-all').setAttribute('aria-pressed', String(settings.letters === GrownUps.ALL));
    document.querySelector('#letters-first').setAttribute('aria-pressed', String(settings.letters === FIRST_EIGHT));
    grid.querySelectorAll('button').forEach(function (button) {
      button.setAttribute('aria-pressed', String(settings.letters.indexOf(button.dataset.letter) >= 0));
    });
    if (!motionAllowed()) dot.hidden = true;
  }

  function commit(message) {
    var stored = GrownUps.save(settings);
    settings = GrownUps.load();
    GrownUps.applyMotion(document);
    paint();
    note(stored ? message : 'This browser did not store the change.');
  }

  function showSettings() {
    gate.hidden = true;
    sheet.hidden = false;
    document.body.dataset.screen = 'settings';
    document.querySelector('.skip').setAttribute('href', '#sound');
    paint();
  }

  function showGate() {
    sheet.hidden = true;
    gate.hidden = false;
    document.body.dataset.screen = 'gate';
  }

  function finishHold() {
    if (holdDone) return;
    holdDone = true;
    holding = false;
    window.cancelAnimationFrame(holdFrame);
    window.clearTimeout(holdTimer);
    holdBar.style.transform = 'scaleX(1)';
    ask();
  }

  function cancelHold() {
    if (holdDone) return;
    holding = false;
    window.cancelAnimationFrame(holdFrame);
    window.clearTimeout(holdTimer);
    holdBar.style.transform = 'scaleX(0)';
    holdButton.textContent = 'Hold to continue';
  }

  function beginHold(event) {
    if (holdDone || holding) return;
    if (event && event.button > 0) return;
    holding = true;
    holdStart = performance.now();
    holdButton.textContent = 'Keep holding';
    var tick = function (now) {
      var amount = Math.min(1, (now - holdStart) / HOLD_MS);
      if (motionAllowed()) holdBar.style.transform = 'scaleX(' + amount + ')';
      if (amount >= 1) {
        finishHold();
        return;
      }
      holdFrame = window.requestAnimationFrame(tick);
    };
    holdFrame = window.requestAnimationFrame(tick);
    holdTimer = window.setTimeout(finishHold, HOLD_MS);
  }

  function ask() {
    var question = QUESTIONS[questionAt];
    var order = question.choices.slice();
    prompt.textContent = question.prompt;
    choices.replaceChildren();
    order.sort(function () { return Math.random() - 0.5; }).forEach(function (label) {
      var button = document.createElement('button');
      button.type = 'button';
      button.textContent = label;
      button.addEventListener('click', function () { choose(question, label); });
      choices.appendChild(button);
    });
    questionBox.hidden = false;
    holdButton.hidden = true;
    prompt.focus();
  }

  function choose(question, label) {
    if (label === question.answer) {
      GrownUps.unlock();
      showSettings();
      note('You can change the game on this device.');
      document.querySelector('#sound-title').focus();
      return;
    }
    questionAt = (questionAt + 1) % QUESTIONS.length;
    questionBox.hidden = true;
    holdButton.hidden = false;
    holdDone = false;
    cancelHold();
    note('That answer did not open it. Hold the button and try the next question.');
    holdButton.focus();
  }

  function toggleLetter(letter) {
    var on = settings.letters.indexOf(letter) >= 0;
    if (on && settings.letters.length === 1) {
      note('Choose at least one letter.');
      return;
    }
    var next = on ? settings.letters.replace(letter, '') : settings.letters + letter;
    settings.letters = GrownUps.parse(Object.assign({}, settings, {letters: next})).letters;
    commit(letter + (settings.letters.indexOf(letter) >= 0 ? ' is on the shelf.' : ' is off the shelf.'));
  }

  GrownUps.ALL.split('').forEach(function (letter) {
    var button = document.createElement('button');
    button.type = 'button';
    button.dataset.letter = letter;
    button.textContent = letter;
    button.addEventListener('click', function () { toggleLetter(letter); });
    grid.appendChild(button);
  });

  document.querySelectorAll('input[name="sound"]').forEach(function (input) {
    input.addEventListener('change', function () {
      if (!input.checked) return;
      settings.sound = input.value;
      commit(input.value === 'off' ? 'Sound is off.' : 'Sound is on.');
    });
  });
  document.querySelectorAll('input[name="motion"]').forEach(function (input) {
    input.addEventListener('change', function () {
      if (!input.checked) return;
      settings.motion = input.value;
      commit(input.value === 'calm' ? 'Motion is calm.' : input.value === 'full' ? 'Motion is allowed.' : 'Motion follows this device.');
    });
  });
  document.querySelectorAll('input[name="hint"]').forEach(function (input) {
    input.addEventListener('change', function () {
      if (!input.checked) return;
      settings.hintAfter = Number(input.value);
      commit(input.value === '1' ? 'The picture is outlined after one miss.' : 'The picture is outlined after two misses.');
    });
  });
  document.querySelectorAll('input[name="game"]').forEach(function (input) {
    input.addEventListener('change', function () {
      var next = GrownUps.copy(settings);
      next.games[input.value] = input.checked;
      if (!next.games.post && !next.games.space && !next.games.silk) {
        input.checked = true;
        note('Leave at least one adventure on the shelf.');
        return;
      }
      settings.games[input.value] = input.checked;
      commit((input.checked ? 'Showing ' : 'Hiding ') + NAMES[input.value] + '.');
    });
  });
  document.querySelector('#letters-all').addEventListener('click', function () {
    settings.letters = GrownUps.ALL;
    commit('All 26 letters are on the shelf.');
  });
  document.querySelector('#letters-first').addEventListener('click', function () {
    settings.letters = 'SATPINMD';
    commit('The first eight letters are on the shelf, in A to Z order.');
  });
  document.querySelector('#hand-back').addEventListener('click', function () {
    GrownUps.lock();
    window.location.href = '../index.html';
  });
  document.querySelector('#sound-title').tabIndex = -1;

  holdButton.addEventListener('pointerdown', function (event) {
    if (holdButton.setPointerCapture) holdButton.setPointerCapture(event.pointerId);
    beginHold(event);
  });
  holdButton.addEventListener('pointerup', cancelHold);
  holdButton.addEventListener('pointercancel', cancelHold);
  holdButton.addEventListener('keydown', function (event) {
    if (event.key !== ' ' && event.key !== 'Enter') return;
    event.preventDefault();
    if (event.repeat) return;
    beginHold(event);
  });
  holdButton.addEventListener('keyup', function (event) {
    if (event.key !== ' ' && event.key !== 'Enter') return;
    cancelHold();
  });

  function hash(x, y) {
    var n = Math.imul(x, 374761393) + Math.imul(y, 668265263);
    n = Math.imul(n ^ (n >>> 13), 1274126177);
    return ((n ^ (n >>> 16)) >>> 0) / 4294967295;
  }

  var canvas = document.querySelector('#paper');
  var context = canvas.getContext('2d');
  if (context) {
    var image = context.createImageData(160, 160);
    for (var y = 0; y < 160; y++) {
      for (var x = 0; x < 160; x++) {
        if (hash(x, y) < 0.86) continue;
        var pixel = (y * 160 + x) * 4;
        image.data[pixel] = 37;
        image.data[pixel + 1] = 63;
        image.data[pixel + 2] = 101;
        image.data[pixel + 3] = 28;
      }
    }
    context.putImageData(image, 0, 0);
    document.body.style.backgroundImage = 'url("' + canvas.toDataURL() + '")';
  }

  var mast = document.querySelector('.mast');
  if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
    mast.addEventListener('pointermove', function (event) {
      if (!motionAllowed()) {
        dot.hidden = true;
        return;
      }
      var box = mast.getBoundingClientRect();
      dot.hidden = false;
      dot.style.transform = 'translate(' + (event.clientX - box.left) + 'px, ' + (event.clientY - box.top) + 'px)';
    });
    mast.addEventListener('pointerleave', function () { dot.hidden = true; });
  }

  if (GrownUps.unlocked()) showSettings();
  else showGate();
})();
