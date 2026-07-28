(function () {
  var data = window.HK_DATA || {};
  var columns = data.columns || [];
  var decks = data.decks || [];
  var tasks = data.tasks || [];
  var luckyCards = data.luckyCards || [];
  var ratCards = data.ratCards || [];
  var topics = data.topics || [];
  var glossary = data.mythGlossary || [];

  var selectedTask = null;
  var selectedTopic = null;
  var selectedRat = null;
  var players = loadPlayers();
  var roleBalance = {
    4: { normal: { hamsters: 3, rats: 1 } },
    5: { normal: { hamsters: 4, rats: 1 }, hard: { hamsters: 3, rats: 2 } },
    6: { normal: { hamsters: 4, rats: 2 } },
    7: { normal: { hamsters: 5, rats: 2 }, hard: { hamsters: 4, rats: 3 } },
    8: { normal: { hamsters: 5, rats: 3 } },
    9: { normal: { hamsters: 6, rats: 3 }, hard: { hamsters: 5, rats: 4 } },
    10: { normal: { hamsters: 7, rats: 3 } },
    11: { normal: { hamsters: 8, rats: 3 }, hard: { hamsters: 7, rats: 4 } },
    12: { normal: { hamsters: 8, rats: 4 } },
    13: { normal: { hamsters: 9, rats: 4 }, hard: { hamsters: 8, rats: 5 } },
    14: { normal: { hamsters: 9, rats: 5 } },
    15: { normal: { hamsters: 10, rats: 5 }, hard: { hamsters: 9, rats: 6 } }
  };

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function clear(node) {
    while (node && node.firstChild) node.removeChild(node.firstChild);
  }

  function pick(items) {
    return items[Math.floor(Math.random() * items.length)];
  }

  function shuffle(items) {
    var result = items.slice();
    for (var index = result.length - 1; index > 0; index -= 1) {
      var target = Math.floor(Math.random() * (index + 1));
      var current = result[index];
      result[index] = result[target];
      result[target] = current;
    }
    return result;
  }

  function makeGridCell(text, className, label, id) {
    var cell = el('div', 'grid-cell ' + (className || ''), text == null || text === '' ? '—' : String(text));
    if (label) cell.dataset.label = label;
    if (id) cell.id = id;
    return cell;
  }

  function makeGridRow(values, isHead, rowId, labels, cellIds) {
    var row = el('div', 'grid-row' + (isHead ? ' grid-header-row' : ''));
    if (rowId) row.id = rowId;
    values.forEach(function (value, index) {
      row.appendChild(makeGridCell(value, isHead ? 'grid-head' : '', labels ? labels[index] : '', cellIds ? cellIds[index] : ''));
    });
    return row;
  }

  function normalizeLookupText(value) {
    return String(value || '')
      .toLowerCase()
      .replace(/ё/g, 'е')
      .replace(/[«»"“”.,;:!?()[\]{}]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function stemLookupWord(word) {
    return word
      .replace(/(иями|ями|ами|ого|его|ому|ему|ыми|ими|ах|ях|ой|ей|ою|ею|ом|ем|ым|им|ии|ия|ью|ые|ие|ый|ий|ая|яя|ое|ее|ы|и|а|я|у|ю|е)$/u, '')
      .replace(/[ьъ]$/u, '');
  }

  function lookupSignature(value) {
    var skip = { 'в': true, 'во': true, 'на': true, 'до': true, 'из': true, 'и': true, 'по': true, 'к': true };
    return normalizeLookupText(value)
      .split(' ')
      .filter(function (word) { return word && !skip[word]; })
      .map(stemLookupWord)
      .filter(Boolean)
      .join(' ');
  }

  function wordCountForDeck(deck) {
    return deck.rows.length * columns.length;
  }

  function formatWords(count) {
    var last = count % 10;
    var lastTwo = count % 100;
    if (last === 1 && lastTwo !== 11) return count + ' слово';
    if (last >= 2 && last <= 4 && (lastTwo < 12 || lastTwo > 14)) return count + ' слова';
    return count + ' слов';
  }

  function formatCards(count) {
    var last = count % 10;
    var lastTwo = count % 100;
    if (last === 1 && lastTwo !== 11) return count + ' карта';
    if (last >= 2 && last <= 4 && (lastTwo < 12 || lastTwo > 14)) return count + ' карты';
    return count + ' карт';
  }

  function setAccordionOpen(accordion, open) {
    if (!accordion) return;
    accordion.classList.toggle('is-open', !!open);
    var button = accordion.firstElementChild;
    if (button && button.classList.contains('table-toggle')) {
      button.setAttribute('aria-expanded', open ? 'true' : 'false');
    }
  }

  function makeDetails(id, title, meta, className, open) {
    var accordion = el('section', 'deck-accordion ' + className);
    var button = el('button', 'table-toggle');
    var titleWrap = el('span', 'table-toggle-title', title);
    var metaWrap = el('span', 'deck-meta', meta);

    accordion.id = id;
    button.type = 'button';
    button.setAttribute('aria-expanded', open ? 'true' : 'false');
    button.appendChild(titleWrap);
    button.appendChild(metaWrap);
    button.addEventListener('click', function () {
      setAccordionOpen(accordion, !accordion.classList.contains('is-open'));
    });

    accordion.appendChild(button);
    setAccordionOpen(accordion, !!open);
    return accordion;
  }

  function makeDeckOpenButton(deck) {
    var button = el('button', 'deck-open-button ' + deck.className);
    var title = el('strong', 'deck-open-label', deck.label);
    var count = el('span', 'deck-open-count', formatWords(wordCountForDeck(deck)));
    button.type = 'button';
    button.dataset.deck = deck.id;
    button.setAttribute('aria-pressed', 'false');
    button.setAttribute('aria-label', 'Открыть таблицу ' + deck.label);
    button.appendChild(title);
    button.appendChild(count);
    button.addEventListener('click', function () {
      var scrollX = window.scrollX;
      var scrollY = window.scrollY;
      var panel = document.getElementById('details-answer-' + deck.id);
      if (button.classList.contains('is-active') && panel && !panel.hidden) {
        closeAnswerDecks();
        requestAnimationFrame(function () { window.scrollTo(scrollX, scrollY); });
        return;
      }
      activateAnswerDeck(deck.id, false);
      requestAnimationFrame(function () { window.scrollTo(scrollX, scrollY); });
    });
    return button;
  }

  function closeAnswerDecks() {
    document.querySelectorAll('.answer-panel').forEach(function (panel) {
      panel.hidden = true;
      panel.classList.remove('is-active');
    });
    document.querySelectorAll('.deck-open-button').forEach(function (button) {
      button.classList.remove('is-active');
      button.setAttribute('aria-pressed', 'false');
    });
  }

  function activateAnswerDeck(deckId, scrollToPanel) {
    var panelId = 'details-answer-' + deckId;
    var activePanel = document.getElementById(panelId);

    openDetails('details-answers');
    document.querySelectorAll('.answer-panel').forEach(function (panel) {
      var isActive = panel.id === panelId;
      panel.hidden = !isActive;
      panel.classList.toggle('is-active', isActive);
    });
    document.querySelectorAll('.deck-open-button').forEach(function (button) {
      var isActive = button.dataset.deck === deckId;
      button.classList.toggle('is-active', isActive);
      button.setAttribute('aria-pressed', isActive ? 'true' : 'false');
    });

    if (scrollToPanel && activePanel) {
      activePanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  function renderTables() {
    var holder = document.getElementById('deckTables');
    if (!holder) return;
    clear(holder);

    var glossaryMatches = glossary.map(function (item, index) {
      return { index: index, item: item, signature: lookupSignature(item.term) };
    }).filter(function (entry) { return entry.signature; });

    function findGlossaryMatch(value) {
      var signature = lookupSignature(value);
      if (!signature) return null;
      var padded = ' ' + signature + ' ';
      return glossaryMatches.find(function (entry) {
        return padded.indexOf(' ' + entry.signature + ' ') !== -1;
      });
    }

    function makeMythAnswerCell(value, label, id) {
      var match = findGlossaryMatch(value);
      var cell = makeGridCell(value, match ? 'has-myth-help' : '', label, id);
      if (!match) return cell;

      clear(cell);
      cell.appendChild(el('span', 'cell-text', value));

      var help = el('button', 'myth-help-button', '?');
      help.type = 'button';
      help.title = 'Открыть справку: ' + match.item.term;
      help.setAttribute('aria-label', 'Открыть справку: ' + match.item.term);
      help.addEventListener('click', function (event) {
        event.preventDefault();
        event.stopPropagation();
        goToRow('glossary-' + match.index, 'details-glossary', 'glossary-cell-' + match.index + '-term');
      });
      cell.appendChild(help);
      return cell;
    }

    var answersTotal = decks.reduce(function (sum, deck) { return sum + wordCountForDeck(deck); }, 0);
    var answersGroup = makeDetails('details-answers', 'Ответы на вопросы', formatWords(answersTotal), 'deck-answers', true);
    var answersStack = el('div', 'answer-panel-stack');
    var answerButtons = el('div', 'deck-button-grid');

    decks.forEach(function (deck, index) {
      var button = makeDeckOpenButton(deck);
      if (index === 0) {
        button.classList.add('is-active');
        button.setAttribute('aria-pressed', 'true');
      }
      answerButtons.appendChild(button);
    });
    answersGroup.appendChild(answerButtons);

    decks.forEach(function (deck, index) {
      var panel = el('section', 'answer-panel ' + deck.className + (index === 0 ? ' is-active' : ''));
      panel.id = 'details-answer-' + deck.id;
      panel.hidden = index !== 0;
      var scroll = el('div', 'grid-scroll');
      var grid = el('div', 'grid-table answer-grid');
      var answerLabels = ['№'].concat(columns.map(function (col) { return col.title; }));
      grid.appendChild(makeGridRow(answerLabels, true));
      deck.rows.forEach(function (row) {
        var cellIds = ['answer-cell-' + deck.id + '-' + row.n + '-n'].concat(columns.map(function (col) {
          return 'answer-cell-' + deck.id + '-' + row.n + '-' + col.key;
        }));
        if (deck.id === 'myths') {
          var mythRow = el('div', 'grid-row');
          mythRow.id = 'answer-' + deck.id + '-' + row.n;
          mythRow.appendChild(makeGridCell(row.n, '', answerLabels[0], cellIds[0]));
          columns.forEach(function (col, colIndex) {
            mythRow.appendChild(makeMythAnswerCell(row[col.key], answerLabels[colIndex + 1], cellIds[colIndex + 1]));
          });
          grid.appendChild(mythRow);
          return;
        }
        var values = [row.n].concat(columns.map(function (col) { return row[col.key]; }));
        grid.appendChild(makeGridRow(values, false, 'answer-' + deck.id + '-' + row.n, answerLabels, cellIds));
      });
      scroll.appendChild(grid);
      panel.appendChild(scroll);
      answersStack.appendChild(panel);
    });
    answersGroup.appendChild(answersStack);
    holder.appendChild(answersGroup);

    var topicDetails = makeDetails('details-topics', 'Карты «О чём будем говорить»', topics.length + ' стилей', 'deck-topic', false);
    var topicScroll = el('div', 'grid-scroll');
    var topicGrid = el('div', 'grid-table topic-grid');
    var topicLabels = ['№', 'Ключ подачи', 'Описание / стиль'];
    topicGrid.appendChild(makeGridRow(topicLabels, true));
    topics.forEach(function (item) {
      topicGrid.appendChild(makeGridRow(
        [item.n, item.key, item.description],
        false,
        'topic-' + item.n,
        topicLabels,
        ['topic-cell-' + item.n + '-n', 'topic-cell-' + item.n + '-key', 'topic-cell-' + item.n + '-description']
      ));
    });
    topicScroll.appendChild(topicGrid);
    topicDetails.appendChild(topicScroll);
    holder.appendChild(topicDetails);

    var ratDetails = makeDetails('details-rat', 'Карты «Ля ты крыса»', ratCards.length + ' задач', 'deck-adult', false);
    if (ratCards.length) {
      var ratScroll = el('div', 'grid-scroll');
      var ratGrid = el('div', 'grid-table rat-grid');
      var ratLabels = ['№', 'Потайная задача', 'Условие / описание', 'Награда'];
      ratGrid.appendChild(makeGridRow(ratLabels, true));
      ratCards.forEach(function (item) {
        ratGrid.appendChild(makeGridRow(
          [item.n, item.task, item.description, item.reward],
          false,
          'rat-' + item.n,
          ratLabels,
          ['rat-cell-' + item.n + '-n', 'rat-cell-' + item.n + '-task', 'rat-cell-' + item.n + '-description', 'rat-cell-' + item.n + '-reward']
        ));
      });
      ratScroll.appendChild(ratGrid);
      ratDetails.appendChild(ratScroll);
    } else {
      ratDetails.appendChild(el('div', 'empty-message', 'Потайные задачи для Крысы пока не добавлены.'));
    }
    holder.appendChild(ratDetails);

    var taskDetails = makeDetails('details-tasks', 'Карты «Терпи, то, что попало»', tasks.length + ' заданий', 'deck-task', false);
    var taskScroll = el('div', 'grid-scroll');
    var taskGrid = el('div', 'grid-table task-grid');
    var taskLabels = ['№', 'Задание', 'Круги', 'Разъяснения'];
    taskGrid.appendChild(makeGridRow(taskLabels, true));
    tasks.forEach(function (item) {
      taskGrid.appendChild(makeGridRow(
        [item.n, item.task, item.rounds, item.note],
        false,
        'task-' + item.n,
        taskLabels,
        ['task-cell-' + item.n + '-n', 'task-cell-' + item.n + '-task', 'task-cell-' + item.n + '-rounds', 'task-cell-' + item.n + '-note']
      ));
    });
    taskScroll.appendChild(taskGrid);
    taskDetails.appendChild(taskScroll);
    holder.appendChild(taskDetails);

    var luckyDetails = makeDetails('details-lucky', 'Карты «Повезло»', formatCards(luckyCards.length), 'deck-lucky', false);
    if (luckyCards.length) {
      var luckyScroll = el('div', 'grid-scroll');
      var luckyGrid = el('div', 'grid-table lucky-grid');
      var luckyLabels = ['№', 'Карта', 'Эффект'];
      luckyGrid.appendChild(makeGridRow(luckyLabels, true));
      luckyCards.forEach(function (item) {
        luckyGrid.appendChild(makeGridRow(
          [item.n, item.card, item.effect],
          false,
          'lucky-' + item.n,
          luckyLabels,
          ['lucky-cell-' + item.n + '-n', 'lucky-cell-' + item.n + '-card', 'lucky-cell-' + item.n + '-effect']
        ));
      });
      luckyScroll.appendChild(luckyGrid);
      luckyDetails.appendChild(luckyScroll);
    } else {
      luckyDetails.appendChild(el('div', 'empty-message', 'Карты «Повезло» пока не добавлены.'));
    }
    holder.appendChild(luckyDetails);

    if (glossary.length) {
      var glossaryDetails = makeDetails('details-glossary', 'Справочник по некоторым мифам', glossary.length + ' терминов', 'deck-myths deck-auxiliary', false);
      var glossaryScroll = el('div', 'grid-scroll');
      var glossaryGrid = el('div', 'grid-table glossary-grid');
      var glossaryLabels = ['Термин', 'Объяснение'];
      glossaryGrid.appendChild(makeGridRow(glossaryLabels, true));
      glossary.forEach(function (item, index) {
        glossaryGrid.appendChild(makeGridRow(
          [item.term, item.text],
          false,
          'glossary-' + index,
          glossaryLabels,
          ['glossary-cell-' + index + '-term', 'glossary-cell-' + index + '-text']
        ));
      });
      glossaryScroll.appendChild(glossaryGrid);
      glossaryDetails.appendChild(glossaryScroll);
      holder.appendChild(glossaryDetails);
    }
  }

  function openDetails(id) {
    if (id.indexOf('details-answer-') === 0) {
      activateAnswerDeck(id.replace('details-answer-', ''), false);
      return;
    }
    var accordion = document.getElementById(id);
    if (accordion) setAccordionOpen(accordion, true);
  }

  function openDetailsList(detailsIds) {
    if (Array.isArray(detailsIds)) {
      detailsIds.forEach(openDetails);
      return;
    }
    openDetails(detailsIds);
  }

  function closeTablesForJump(detailsIds) {
    var ids = Array.isArray(detailsIds) ? detailsIds : [detailsIds];
    var keep = {};
    var keepsAnswerDeck = false;

    ids.forEach(function (id) {
      keep[id] = true;
      if (id.indexOf('details-answer-') === 0) {
        keep['details-answers'] = true;
        keepsAnswerDeck = true;
      }
    });

    ['details-answers', 'details-tasks', 'details-lucky', 'details-topics', 'details-rat', 'details-glossary'].forEach(function (id) {
      var accordion = document.getElementById(id);
      if (accordion && !keep[id]) setAccordionOpen(accordion, false);
    });

    if (!keepsAnswerDeck) closeAnswerDecks();
  }

  function setToggleSectionOpen(section, toggle, content, open) {
    if (!section || !toggle || !content) return;
    toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    content.hidden = !open;
    section.classList.toggle('is-collapsed', !open);
  }

  function setCardsOpen(open) {
    setToggleSectionOpen(
      document.getElementById('cards'),
      document.querySelector('[data-cards-toggle]'),
      document.querySelector('[data-cards-content]'),
      open
    );
  }

  function preferredAnswerDeckId() {
    return 'normal';
  }

  function detailsIncludes(detailsIds, targetId) {
    var ids = Array.isArray(detailsIds) ? detailsIds : [detailsIds];
    return ids.indexOf(targetId) !== -1;
  }

  function goToTable(detailsIds, targetId) {
    var ids = Array.isArray(detailsIds) ? detailsIds : [detailsIds];
    setCardsOpen(true);
    closeTablesForJump(ids);
    openDetailsList(ids);

    if (detailsIncludes(ids, 'details-answers')) {
      activateAnswerDeck(preferredAnswerDeckId(), false);
    }

    var target = document.getElementById(targetId || ids[0]);
    if (!target) return;
    setTimeout(function () {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 80);
  }

  function goToRow(rowId, detailsIds, targetId) {
    setCardsOpen(true);
    closeTablesForJump(detailsIds);
    openDetailsList(detailsIds);
    var row = document.getElementById(rowId);
    var target = targetId ? document.getElementById(targetId) : row;
    if (!row || !target) return;
    setTimeout(function () {
      target.scrollIntoView({ behavior: 'smooth', block: 'center' });
      document.querySelectorAll('.grid-row.highlight').forEach(function (item) {
        item.classList.remove('highlight');
      });
      document.querySelectorAll('.target-cell').forEach(function (item) {
        item.classList.remove('target-cell');
      });
      void row.offsetWidth;
      row.classList.add('highlight');
      target.classList.add('target-cell');
    }, 80);
  }

  function resultContent(button, number, title, detail, className, onClick) {
    button.disabled = false;
    button.className = 'result-ticket ' + className;
    var cleanTitle = String(title || '');
    var cleanDetail = String(detail || '');
    if (cleanTitle.length > 22) button.classList.add('title-long');
    if (cleanTitle.length > 32) button.classList.add('title-very-long');
    if (cleanDetail.length > 84) button.classList.add('detail-long');
    clear(button);
    button.appendChild(el('span', 'result-category', resultCategory(className)));
    button.appendChild(el('strong', '', cleanTitle));
    button.appendChild(el('small', '', cleanDetail));
    button.onclick = onClick;
  }

  function resultCategory(className) {
    if (className === 'normal') return 'Ответы · Обычные';
    if (className === 'philosophy') return 'Ответы · Философия';
    if (className === 'adult') return 'Ответы · 18 плюс';
    if (className === 'myths') return 'Ответы · Мифы';
    if (className === 'task-ticket') return 'Терпи, то, что попало';
    if (className === 'lucky-ticket') return 'Повезло';
    if (className === 'topic-ticket') return 'О чём будем говорить';
    if (className === 'rat-ticket') return 'Ля ты крыса';
    return 'Карта';
  }

  function drawAnswer() {
    var deck = pick(decks);
    var row = pick(deck.rows);
    var column = pick(columns);
    resultContent(
      document.getElementById('answerResult'),
      '#' + row.n + ' · ' + deck.label,
      row[column.key],
      column.title + ' · строка ' + row.n,
      deck.id,
      function () { goToRow('answer-' + deck.id + '-' + row.n, ['details-answers', 'details-answer-' + deck.id], 'answer-cell-' + deck.id + '-' + row.n + '-' + column.key); }
    );
  }

  function makeAnswerClick(deckId, number, columnKey) {
    return function () {
      goToRow(
        'answer-' + deckId + '-' + number,
        ['details-answers', 'details-answer-' + deckId],
        columnKey ? 'answer-cell-' + deckId + '-' + number + '-' + columnKey : ''
      );
    };
  }

  function makeAnswerChip() {
    var deck = pick(decks);
    var row = pick(deck.rows);
    var column = pick(columns);
    var chip = el('button', 'hand-chip', column.title + ': ' + row[column.key]);
    chip.type = 'button';
    chip.title = deck.label + ', строка ' + row.n;
    chip.style.background = getDeckGradient(deck.id);
    chip.addEventListener('click', makeAnswerClick(deck.id, row.n, column.key));
    return chip;
  }

  function drawHand() {
    var holder = document.getElementById('answerHand');
    clear(holder);
    for (var i = 0; i < 4; i += 1) {
      holder.appendChild(makeAnswerChip());
    }
  }

  function drawRatHand() {
    var holder = document.getElementById('answerHand');
    clear(holder);
    for (var i = 0; i < 3; i += 1) {
      holder.appendChild(makeAnswerChip());
    }
    if (!ratCards.length) return;
    var rat = pick(ratCards);
    var chip = el('button', 'hand-chip rat-hand-chip', 'Ля ты крыса: ' + rat.task);
    chip.type = 'button';
    chip.title = 'Потайная задача, строка ' + rat.n;
    chip.addEventListener('click', function () {
      goToRow('rat-' + rat.n, 'details-rat', 'rat-cell-' + rat.n + '-task');
    });
    holder.appendChild(chip);
  }

  function getDeckGradient(id) {
    if (id === 'philosophy') return 'linear-gradient(135deg, #402060, #7928ca)';
    if (id === 'adult') return 'linear-gradient(135deg, #7b1735, #d12a6a)';
    if (id === 'myths') return 'linear-gradient(135deg, #244264, #008c95)';
    return 'linear-gradient(135deg, #59616b, #2d8a4a)';
  }

  function panOrLuckyPool() {
    var pool = [];
    tasks.forEach(function (item) {
      pool.push({
        number: '#' + item.n + ' · Терпи',
        title: item.task,
        detail: 'Количество кругов: ' + item.rounds,
        className: 'task-ticket',
        rowId: 'task-' + item.n,
        detailsId: 'details-tasks',
        targetId: 'task-cell-' + item.n + '-task'
      });
    });
    luckyCards.forEach(function (item) {
      pool.push({
        number: '#' + item.n + ' · Повезло',
        title: item.card,
        detail: item.effect,
        className: 'lucky-ticket',
        rowId: 'lucky-' + item.n,
        detailsId: 'details-lucky',
        targetId: 'lucky-cell-' + item.n + '-card'
      });
    });
    return pool;
  }

  function drawTask() {
    var pool = panOrLuckyPool();
    if (!pool.length) return;
    selectedTask = pick(pool);
    resultContent(
      document.getElementById('taskResult'),
      selectedTask.number,
      selectedTask.title,
      selectedTask.detail,
      selectedTask.className,
      function () { goToRow(selectedTask.rowId, selectedTask.detailsId, selectedTask.targetId); }
    );
  }

  function drawTopic() {
    selectedTopic = pick(topics);
    resultContent(
      document.getElementById('topicResult'),
      '#' + selectedTopic.n,
      selectedTopic.key,
      selectedTopic.description,
      'topic-ticket',
      function () { goToRow('topic-' + selectedTopic.n, 'details-topics', 'topic-cell-' + selectedTopic.n + '-key'); }
    );
  }

  function drawRat() {
    if (!ratCards.length) return;
    selectedRat = pick(ratCards);
    resultContent(
      document.getElementById('ratResult'),
      '#' + selectedRat.n,
      selectedRat.task,
      selectedRat.reward ? 'Награда: ' + selectedRat.reward : 'Потайная задача · строка ' + selectedRat.n,
      'rat-ticket',
      function () { goToRow('rat-' + selectedRat.n, 'details-rat', 'rat-cell-' + selectedRat.n + '-task'); }
    );
  }

  function loadPlayers() {
    try { return JSON.parse(localStorage.getItem('hk-dist-score') || '[]'); }
    catch (error) { return []; }
  }

  function savePlayers() {
    localStorage.setItem('hk-dist-score', JSON.stringify(players));
  }

  function renderScore() {
    var grid = document.getElementById('scoreGrid');
    clear(grid);
    var scoreLabels = ['Игрок', 'Роль', 'Баллы', 'Действия', 'Предупреждение'];
    if (!players.length) {
      var empty = el('div', 'empty-message', 'Добавь игроков, и здесь появится список партии.');
      grid.appendChild(empty);
      return;
    }
    players.forEach(function (player) {
      player.score = Number(player.score || 0);
      var warningMarks = normalizeWarningMarks(player);
      var details = normalizePlayerDetails(player);
      player.warningMarks = warningMarks;
      player.warnings = countWarnings(warningMarks);
      player.sentence = details.sentence;
      player.topicCard = details.topicCard;
      player.answerCards = details.answerCards;
      player.ratCard = details.ratCard;
      var playerBlock = el('section', 'score-player-card');
      var table = el('div', 'grid-table score-grid score-player-grid');
      var row = el('div', 'grid-row');
      var scoreCell = makeGridCell(player.score, 'score-value-cell ' + scoreTone(player.score), 'Баллы');
      var actionsCell = el('div', 'grid-cell score-actions-cell');
      var actions = el('div', 'row-actions');
      var warningCell = el('div', 'grid-cell warning-cell');
      var warningTrack = el('div', 'warning-track');
      var scoreSteps = [1, 3, 5, -1, -3, -5];

      actionsCell.dataset.label = 'Действия';
      warningCell.dataset.label = 'Предупреждение';
      scoreSteps.forEach(function (delta) {
        var button = el('button', 'mini-btn ' + (delta > 0 ? 'score-plus' : 'score-minus'), (delta > 0 ? '+' : '') + delta);
        button.type = 'button';
        button.dataset.scoreDelta = String(delta);
        button.dataset.playerId = player.id;
        actions.appendChild(button);
      });

      var resetButton = el('button', 'mini-btn score-reset', 'Обнулить');
      resetButton.type = 'button';
      resetButton.dataset.scoreReset = 'true';
      resetButton.dataset.playerId = player.id;
      actions.appendChild(resetButton);

      for (var warningIndex = 1; warningIndex <= 3; warningIndex += 1) {
        var isWarningUsed = Boolean(warningMarks[warningIndex - 1]);
        var warningButton = el('button', 'warning-btn ' + (isWarningUsed ? 'is-used' : 'is-ready'), '+');
        warningButton.type = 'button';
        warningButton.title = (isWarningUsed ? 'Снять' : 'Поставить') + ' предупреждение ' + warningIndex + ' из 3';
        warningButton.setAttribute('aria-label', 'Предупреждение ' + warningIndex + ' из 3 для игрока ' + player.name);
        warningButton.setAttribute('aria-pressed', isWarningUsed ? 'true' : 'false');
        warningButton.dataset.warningMark = 'true';
        warningButton.dataset.warningIndex = String(warningIndex - 1);
        warningButton.dataset.playerId = player.id;
        warningTrack.appendChild(warningButton);
      }

      row.appendChild(makeGridCell(player.name, '', 'Игрок'));
      row.appendChild(makeGridCell(player.role, '', 'Роль'));
      row.appendChild(scoreCell);
      actionsCell.appendChild(actions);
      row.appendChild(actionsCell);
      warningCell.appendChild(warningTrack);
      row.appendChild(warningCell);
      table.appendChild(makeGridRow(scoreLabels, true));
      table.appendChild(row);
      playerBlock.appendChild(table);
      playerBlock.appendChild(renderPlayerDetails(player, details));
      playerBlock.appendChild(renderPlayerFooter(player));
      grid.appendChild(playerBlock);
    });
    syncScoreTextareas(grid);
  }

  function scoreTone(score) {
    if (score > 0) return 'is-positive';
    if (score < 0) return 'is-negative';
    return 'is-zero';
  }

  function normalizeWarningMarks(player) {
    var marks = Array.isArray(player.warningMarks) ? player.warningMarks.slice(0, 3).map(Boolean) : null;
    if (!marks) {
      var warningCount = Math.max(0, Math.min(2, Number(player.warnings || 0)));
      marks = [0, 1, 2].map(function (index) { return index < warningCount; });
    }
    while (marks.length < 3) marks.push(false);
    return marks.slice(0, 3);
  }

  function countWarnings(marks) {
    return marks.filter(Boolean).length;
  }

  function isRatPlayer(player) {
    return normalizeLookupText(player.role).indexOf('крыса') !== -1;
  }

  function normalizePlayerDetails(player) {
    var answerCount = isRatPlayer(player) ? 3 : 4;
    var answerCards = Array.isArray(player.answerCards) ? player.answerCards.slice(0, answerCount) : [];
    while (answerCards.length < answerCount) answerCards.push('');
    return {
      sentence: String(player.sentence || ''),
      topicCard: String(player.topicCard || ''),
      answerCards: answerCards,
      ratCard: String(player.ratCard || '')
    };
  }

  function resizeScoreTextarea(textarea) {
    textarea.style.height = 'auto';
    textarea.style.height = textarea.scrollHeight + 'px';
  }

  function syncScoreTextareas(scope) {
    Array.from((scope || document).querySelectorAll('.score-detail-textarea')).forEach(function (textarea) {
      resizeScoreTextarea(textarea);
    });
  }

  function makeScoreInput(player, label, value, field, placeholder, answerIndex) {
    var wrapper = el('label', 'score-detail-field');
    var caption = el('span', '', label);
    var input = field === 'sentence' ? document.createElement('textarea') : document.createElement('input');
    input.className = 'score-detail-input' + (field === 'sentence' ? ' score-detail-textarea' : '');
    if (field === 'sentence') {
      input.rows = 2;
    } else {
      input.type = 'text';
    }
    input.value = value || '';
    input.placeholder = placeholder || '';
    input.dataset.playerId = player.id;
    input.dataset.scoreField = field;
    if (answerIndex !== undefined) input.dataset.answerIndex = String(answerIndex);
    wrapper.appendChild(caption);
    wrapper.appendChild(input);
    return wrapper;
  }

  function renderPlayerDetails(player, details) {
    var panel = el('div', 'score-detail-row');
    var sentenceField = makeScoreInput(player, 'Предложение игрока', details.sentence, 'sentence', 'Впиши фразу, которую придумал игрок');
    var cardsLine = el('div', 'score-card-fields');

    sentenceField.classList.add('score-sentence-field');
    cardsLine.appendChild(makeScoreInput(player, 'О чём будем говорить', details.topicCard, 'topicCard', 'например: как новость'));
    details.answerCards.forEach(function (value, index) {
      cardsLine.appendChild(makeScoreInput(player, 'Ответ ' + (index + 1), value, 'answerCard', 'карта ответа', index));
    });
    if (isRatPlayer(player)) {
      cardsLine.appendChild(makeScoreInput(player, 'Ля ты крыса', details.ratCard, 'ratCard', 'потаённая карта крысы'));
    }

    panel.appendChild(sentenceField);
    panel.appendChild(cardsLine);
    return panel;
  }

  function renderPlayerFooter(player) {
    var footer = el('div', 'score-player-footer');
    var removeButton = el('button', 'mini-btn score-delete-player', 'Удалить игрока');
    removeButton.type = 'button';
    removeButton.dataset.scoreRemove = 'true';
    removeButton.dataset.playerId = player.id;
    footer.appendChild(removeButton);
    return footer;
  }

  function addPlayer(name, role) {
    var answerCount = normalizeLookupText(role).indexOf('крыса') !== -1 ? 3 : 4;
    var player = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2),
      name: name,
      role: role,
      score: 0,
      warnings: 0,
      warningMarks: [false, false, false],
      sentence: '',
      topicCard: '',
      answerCards: Array(answerCount).fill(''),
      ratCard: ''
    };
    players.push(player);
    savePlayers();
    renderScore();
  }

  function changePlayerScore(playerId, delta) {
    players = players.map(function (player) {
      if (player.id !== playerId) return player;
      player.score = Number(player.score || 0) + delta;
      return player;
    });
    savePlayers();
    renderScore();
  }

  function removePlayer(playerId) {
    players = players.filter(function (player) { return player.id !== playerId; });
    savePlayers();
    renderScore();
  }

  function resetPlayerScore(playerId) {
    players = players.map(function (player) {
      if (player.id !== playerId) return player;
      player.score = 0;
      return player;
    });
    savePlayers();
    renderScore();
  }

  function markPlayerWarning(playerId, selectedIndex) {
    players = players.map(function (player) {
      if (player.id !== playerId) return player;
      var warningMarks = normalizeWarningMarks(player);
      var warningIndex = Math.max(0, Math.min(2, Number(selectedIndex || 0)));
      warningMarks[warningIndex] = !warningMarks[warningIndex];
      if (warningMarks.every(Boolean)) {
        player.score = Number(player.score || 0) - 10;
        warningMarks = [false, false, false];
      }
      player.warningMarks = warningMarks;
      player.warnings = countWarnings(warningMarks);
      return player;
    });
    savePlayers();
    renderScore();
  }

  function updatePlayerDetails(playerId, field, value, answerIndex) {
    players = players.map(function (player) {
      if (player.id !== playerId) return player;
      var details = normalizePlayerDetails(player);
      player.sentence = details.sentence;
      player.topicCard = details.topicCard;
      player.answerCards = details.answerCards;
      player.ratCard = details.ratCard;

      if (field === 'answerCard') {
        var index = Math.max(0, Number(answerIndex || 0));
        player.answerCards[index] = value;
      } else if (field === 'sentence' || field === 'topicCard' || field === 'ratCard') {
        player[field] = value;
      }
      return player;
    });
    savePlayers();
  }

  function bindCharacterCards() {
    document.querySelectorAll('.character-card').forEach(function (card) {
      card.addEventListener('click', function () {
        var shouldOpen = !card.classList.contains('is-revealed');
        document.querySelectorAll('.character-card.is-revealed').forEach(function (openCard) {
          openCard.classList.remove('is-revealed');
          openCard.setAttribute('aria-expanded', 'false');
        });
        card.classList.toggle('is-revealed', shouldOpen);
        card.setAttribute('aria-expanded', shouldOpen ? 'true' : 'false');
      });
    });
  }

  function bindProposalTimer() {
    var button = document.getElementById('proposalTimerButton');
    var value = document.getElementById('proposalTimerValue');
    var reset = document.getElementById('proposalTimerReset');
    if (!button || !value || !reset) return;

    var duration = 5 * 60;
    var remaining = duration;
    var timerId = null;

    function formatTime(seconds) {
      var minutes = Math.floor(seconds / 60);
      var rest = seconds % 60;
      return String(minutes).padStart(2, '0') + ':' + String(rest).padStart(2, '0');
    }

    function stopTimer() {
      if (!timerId) return;
      clearInterval(timerId);
      timerId = null;
    }

    function renderTimer() {
      value.textContent = formatTime(remaining);
      button.classList.toggle('is-running', !!timerId);
      button.classList.toggle('is-finished', remaining === 0);
      button.setAttribute('aria-label', timerId ? 'Остановить таймер' : 'Запустить таймер');
    }

    function startTimer() {
      if (remaining <= 0) remaining = duration;
      timerId = setInterval(function () {
        remaining = Math.max(0, remaining - 1);
        if (remaining === 0) stopTimer();
        renderTimer();
      }, 1000);
      renderTimer();
    }

    button.addEventListener('click', function () {
      if (timerId) {
        stopTimer();
        renderTimer();
        return;
      }
      startTimer();
    });

    reset.addEventListener('click', function () {
      stopTimer();
      remaining = duration;
      renderTimer();
    });

    renderTimer();
  }

  function bindRolePicker() {
    var countInput = document.getElementById('rolePlayerCount');
    var distributeButton = document.getElementById('roleDistributeButton');
    var summary = document.getElementById('rolePickerSummary');
    var list = document.getElementById('rolePickerList');
    var modeButtons = Array.prototype.slice.call(document.querySelectorAll('[data-role-mode]'));
    var activeMode = 'normal';
    var orderNames = [
      'Первый', 'Второй', 'Третий', 'Четвёртый', 'Пятый',
      'Шестой', 'Седьмой', 'Восьмой', 'Девятый', 'Десятый',
      'Одиннадцатый', 'Двенадцатый', 'Тринадцатый', 'Четырнадцатый', 'Пятнадцатый'
    ];

    if (!countInput || !distributeButton || !summary || !list || !modeButtons.length) return;

    function getPlayersCount() {
      return parseInt(countInput.value, 10);
    }

    function setMode(mode) {
      activeMode = mode;
      modeButtons.forEach(function (button) {
        var isActive = button.dataset.roleMode === activeMode;
        button.classList.toggle('is-active', isActive);
        button.setAttribute('aria-pressed', isActive ? 'true' : 'false');
      });
    }

    function syncHardMode() {
      var count = getPlayersCount();
      var config = roleBalance[count];
      var hardButton = modeButtons.find(function (button) { return button.dataset.roleMode === 'hard'; });
      var hasHardMode = Boolean(config && config.hard);
      if (hardButton) hardButton.disabled = !hasHardMode;
      if (!hasHardMode && activeMode === 'hard') setMode('normal');
    }

    function getBalanceConfig() {
      var count = getPlayersCount();
      var config = roleBalance[count];
      if (!config) return null;
      return {
        count: count,
        mode: activeMode === 'hard' && config.hard ? 'hard' : 'normal',
        roles: activeMode === 'hard' && config.hard ? config.hard : config.normal
      };
    }

    function roleEnding(count) {
      var last = count % 10;
      var lastTwo = count % 100;
      if (last === 1 && lastTwo !== 11) return 'Крыса';
      if (last >= 2 && last <= 4 && (lastTwo < 12 || lastTwo > 14)) return 'Крысы';
      return 'Крыс';
    }

    function hamsterEnding(count) {
      var last = count % 10;
      var lastTwo = count % 100;
      if (last === 1 && lastTwo !== 11) return 'Хомяк';
      if (last >= 2 && last <= 4 && (lastTwo < 12 || lastTwo > 14)) return 'Хомяка';
      return 'Хомяков';
    }

    function renderDistribution() {
      syncHardMode();
      clear(list);

      var config = getBalanceConfig();
      if (!config) {
        summary.textContent = 'Введите количество игроков от 4 до 15.';
        return;
      }

      var roles = [];
      for (var hamsterIndex = 0; hamsterIndex < config.roles.hamsters; hamsterIndex += 1) roles.push('Хомяк');
      for (var ratIndex = 0; ratIndex < config.roles.rats; ratIndex += 1) roles.push('Крыса');

      shuffle(roles).forEach(function (role, index) {
        var item = el('li', 'role-picker-item ' + (role === 'Крыса' ? 'is-rat' : 'is-hamster'));
        item.appendChild(el('span', 'role-picker-order', String(index + 1)));
        item.appendChild(el('span', 'role-picker-turn', (orderNames[index] || (index + 1) + '-й') + ' игрок'));
        item.appendChild(el('strong', '', role));
        list.appendChild(item);
      });

      summary.textContent = config.count + ' игроков: '
        + config.roles.hamsters + ' ' + hamsterEnding(config.roles.hamsters)
        + ' / '
        + config.roles.rats + ' ' + roleEnding(config.roles.rats)
        + '. Порядок хода читается сверху вниз.';
      if (activeMode === 'hard' && config.mode !== 'hard') {
        summary.textContent += ' Для этого количества игроков усложнённого состава нет, выбран основной.';
      }
    }

    modeButtons.forEach(function (button) {
      button.addEventListener('click', function () {
        if (button.disabled) return;
        setMode(button.dataset.roleMode || 'normal');
        clear(list);
        summary.textContent = 'Нажми «Распределить», чтобы получить новую раскладку ролей.';
      });
    });

    countInput.addEventListener('input', function () {
      syncHardMode();
      clear(list);
      summary.textContent = 'Нажми «Распределить», чтобы обновить роли под новое количество игроков.';
    });
    distributeButton.addEventListener('click', renderDistribution);
    syncHardMode();
  }

  function bindFeedbackForm() {
    var form = document.getElementById('feedbackForm');
    var messageField = document.getElementById('feedbackMessage');
    if (!form || !messageField) return;

    form.addEventListener('submit', function (event) {
      event.preventDefault();
      var message = messageField.value.trim();
      var subject = 'Отзыв и поддержка игры Хомяки против Крыс';
      var body = 'Здравствуйте!\n\n';
      body += message
        ? 'Мой отзыв / пожелание:\n' + message + '\n\n'
        : 'Хочу оставить отзыв по игре «Хомяки против Крыс».\n\n';
      body += '---\nОтправлено со страницы игры «Хомяки против Крыс».';

      var gmailUrl = 'https://mail.google.com/mail/?view=cm&fs=1'
        + '&to=' + encodeURIComponent('basarabalexandru1502@gmail.com')
        + '&su=' + encodeURIComponent(subject)
        + '&body=' + encodeURIComponent(body);

      window.open(gmailUrl, '_blank', 'noopener');
    });
  }

  function bindEvents() {
    bindCharacterCards();
    bindProposalTimer();
    bindRolePicker();
    bindFeedbackForm();
    document.getElementById('drawAnswerButton').addEventListener('click', drawAnswer);
    document.getElementById('drawHandButton').addEventListener('click', drawHand);
    document.getElementById('drawRatHandButton').addEventListener('click', drawRatHand);
    document.getElementById('drawTaskButton').addEventListener('click', drawTask);
    document.getElementById('drawTopicButton').addEventListener('click', drawTopic);
    document.getElementById('drawRatButton').addEventListener('click', drawRat);
    document.querySelectorAll('[data-table-jump]').forEach(function (button) {
      button.addEventListener('click', function () {
        var detailsIds = button.dataset.tableJump.split(',').map(function (id) { return id.trim(); }).filter(Boolean);
        goToTable(detailsIds, button.dataset.tableTarget || detailsIds[0]);
      });
    });
    document.querySelectorAll('[data-jump]').forEach(function (button) {
      button.addEventListener('click', function () {
        var target = document.querySelector(button.dataset.jump);
        if (target) target.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
    });
    document.getElementById('playerForm').addEventListener('submit', function (event) {
      event.preventDefault();
      var name = document.getElementById('playerName').value.trim();
      if (!name) return;
      addPlayer(name, document.getElementById('playerRole').value);
      event.currentTarget.reset();
    });
    document.getElementById('scoreGrid').addEventListener('click', function (event) {
      var target = event.target;
      if (!(target instanceof HTMLElement)) return;
      var playerId = target.dataset.playerId;
      if (!playerId) return;
      if (target.dataset.scoreDelta) {
        changePlayerScore(playerId, Number(target.dataset.scoreDelta));
      }
      if (target.dataset.scoreReset) {
        resetPlayerScore(playerId);
      }
      if (target.dataset.warningMark) {
        markPlayerWarning(playerId, Number(target.dataset.warningIndex || 0));
      }
      if (target.dataset.scoreRemove) {
        removePlayer(playerId);
      }
    });
    document.getElementById('scoreGrid').addEventListener('input', function (event) {
      var target = event.target;
      if (!(target instanceof HTMLInputElement) && !(target instanceof HTMLTextAreaElement)) return;
      var playerId = target.dataset.playerId;
      var field = target.dataset.scoreField;
      if (!playerId || !field) return;
      if (target instanceof HTMLTextAreaElement) resizeScoreTextarea(target);
      updatePlayerDetails(playerId, field, target.value, target.dataset.answerIndex);
    });
    document.getElementById('resetScoreButton').addEventListener('click', function () {
      players = [];
      savePlayers();
      renderScore();
    });
  }

  function bindToggleSection(sectionId, toggleSelector, contentSelector) {
    var section = document.getElementById(sectionId);
    var toggle = document.querySelector(toggleSelector);
    var content = document.querySelector(contentSelector);
    if (!section || !toggle || !content) return;

    toggle.addEventListener('click', function () {
      setToggleSectionOpen(section, toggle, content, toggle.getAttribute('aria-expanded') !== 'true');
    });

    setToggleSectionOpen(section, toggle, content, toggle.getAttribute('aria-expanded') === 'true');
  }

  function bindStoryComic() {
    var section = document.getElementById('story');
    var sectionToggle = document.querySelector('[data-story-toggle]');
    var body = document.querySelector('[data-story-content]');
    var button = document.querySelector('[data-story-comic-toggle]');
    var comic = document.querySelector('[data-story-comic]');
    var closeButtons = Array.from(document.querySelectorAll('[data-story-comic-close]'));
    if (!section || !sectionToggle || !body || !button || !comic) return;

    function setComicOpen(open, restoreFocus) {
      if (open && body.hidden) setToggleSectionOpen(section, sectionToggle, body, true);
      comic.hidden = !open;
      button.classList.toggle('is-active', open);
      button.setAttribute('aria-pressed', open ? 'true' : 'false');
      button.setAttribute('aria-expanded', open ? 'true' : 'false');
      document.body.classList.toggle('has-comic-modal', open);
      if (open) {
        var closeButton = comic.querySelector('.story-comic-close');
        if (closeButton) closeButton.focus();
      } else if (restoreFocus) {
        button.focus();
      }
    }

    button.addEventListener('click', function () {
      setComicOpen(true);
    });

    closeButtons.forEach(function (closeButton) {
      closeButton.addEventListener('click', function () {
        setComicOpen(false, true);
      });
    });

    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && !comic.hidden) setComicOpen(false, true);
    });

    setComicOpen(false);
  }

  function activeNavigation() {
    var links = Array.from(document.querySelectorAll('.main-nav a, .mobile-tabbar a'));
    var sectionIds = Array.from(new Set(links.map(function (link) { return link.getAttribute('href'); })));
    var sections = sectionIds.map(function (href) { return document.querySelector(href); }).filter(Boolean);
    if (!('IntersectionObserver' in window)) return;
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          links.forEach(function (link) {
            link.classList.toggle('active', link.getAttribute('href') === '#' + entry.target.id);
          });
        }
      });
    }, { rootMargin: '-40% 0px -52% 0px', threshold: .01 });
    sections.forEach(function (section) { observer.observe(section); });
  }

  renderTables();
  renderScore();
  bindEvents();
  bindToggleSection('story', '[data-story-toggle]', '[data-story-content]');
  bindToggleSection('cards', '[data-cards-toggle]', '[data-cards-content]');
  bindStoryComic();
  activeNavigation();
})();

