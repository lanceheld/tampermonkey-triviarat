// ==UserScript==
// @name         Sunset Trivia
// @namespace    https://sniff.org/
// @version      0.2
// @description  Keeping trivia easy
// @author       Lance Held
// @match        https://triviarat.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=triviarat.com
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_getResourceText
// @grant        GM_addStyle
// @grant        GM_setClipboard
// @require      https://cdnjs.cloudflare.com/ajax/libs/jquery/3.6.0/jquery.min.js
// @require      https://cdnjs.cloudflare.com/ajax/libs/semantic-ui/2.4.1/semantic.min.js
// @require      https://cdn.jsdelivr.net/combine/gh/lodash/lodash@4.17.11/dist/lodash.min.js,gh/lodash/lodash@4.17.11/dist/lodash.fp.min.js
// @require      https://cdnjs.cloudflare.com/ajax/libs/uuid/8.3.2/uuidv4.min.js
// @resource     SEMANTIC_UI_CSS https://cdnjs.cloudflare.com/ajax/libs/semantic-ui/2.4.1/semantic.min.css
// @updateURL    https://github.com/lanceheld/tampermonkey-triviarat/raw/main/Sunset%20Trivia.user.js
// @downloadURL  https://github.com/lanceheld/tampermonkey-triviarat/raw/main/Sunset%20Trivia.user.js
// ==/UserScript==

var $ = window.jQuery;

const upToHalf = 'upToHalf';

const points = [
    { round: 'round 1', points: [1,2,3], bonus: 2 },
    { round: 'round 2', points: [2,3,4], bonus: 3 },
    { round: 'social media', points: [2] },
    { round: 'round 3', points: [2,4,6], bonus: 4 },
    { round: 'intermission', points: _.times(_.constant(1), 10) },
    { round: 'round 4', points: [2,4,6], bonus: 2 },
    { round: 'round 5', points: [3,5,7], bonus: 3 },
    { round: 'round 6', points: [4,6,8], bonus: 4 },
    { round: 'final round', points: [upToHalf], losePoints: true },
];

const getDefaultWager = (questionType) => {
    switch (questionType) {
        case 'social media':
            return 2;
        case 'intermission':
            return 1;
        default:
            return null;
    }
};
const q = (questionType) => (index) => ({
    id: uuidv4(),
    category: (questionType === 'intermission') ? index + 1 : '',
    notes: '',
    wager: getDefaultWager(questionType)
});
const qs = (count, questionType) => _.times(q(questionType), count);

const initStore = {
    sidebar: true,
    rounds: [
        { round: 'round 1', questions: qs(3) },
        { round: 'round 2', questions: qs(3) },
        { round: 'social media', questions: qs(1, 'social media') },
        { round: 'round 3', questions: qs(3) },
        { round: 'intermission', questions: qs(10, 'intermission') },
        { round: 'round 4', questions: qs(3) },
        { round: 'round 5', questions: qs(3) },
        { round: 'round 6', questions: qs(3) },
        { round: 'final round', questions: qs(1) },
    ]
};

const score = (round, asNumber) => {
    const roundScore = _.sumBy(_.get('wager'), _.filter({ correct: true }, round.questions)) || 0;
    const bonus = _.find((q) => !q.correct, round.questions) ? 0 :
      _.get('bonus', _.find({ round: round.round }, points)) || 0;
    if (asNumber) {
        return roundScore + bonus;
    }
    return (bonus) ? `(${roundScore} + ${bonus})` : `(${roundScore})`;
};

const totalScore = (store) => {
    return _.sum(_.filter(_.isNumber, _.map((round) => score(round, true), store.rounds)));
};

const getStore = () => {
    const storeJson = GM_getValue('trivia');
    return (storeJson) ? JSON.parse(storeJson) : initStore;
};
const setStore = (obj) => GM_setValue('trivia', JSON.stringify(obj || initStore));
const clearStore = () => setStore();

const showCurrentRound = (store) => {
    const index = _.findIndex(
        (round) => !_.every(_.has('correct'), round.questions),
        store.rounds
    );
    $('.ui.accordion').accordion('close others');
    $('.ui.accordion').accordion('open', index);
};

const updateCategory = (value, questionId, store) => {
    for (const round of store.rounds) {
        for (const q of round.questions) {
            if (q.id === questionId) {
                q.category = value;
                setStore(store);
                return;
            }
        }
    }
};

const updateNotes = (value, questionId, store) => {
    for (const round of store.rounds) {
        for (const q of round.questions) {
            if (q.id === questionId) {
                q.notes = value;
                setStore(store);
                return;
            }
        }
    }
};

const updateWager = (value, questionId, store) => {
    for (const round of store.rounds) {
        for (const q of round.questions) {
            if (q.id === questionId) {
                q.wager = _.toNumber(value);
                setStore(store);
                return;
            }
        }
    }
};

const updateCorrect = (value, questionId, store) => {
    for (const round of store.rounds) {
        for (const q of round.questions) {
            if (q.id === questionId) {
                q.correct = value;
                setStore(store);
                return;
            }
        }
    }
};

const renderQuestion = (store) => (round) => (q) => {
    const pointWagers = _.get('points', _.find({ round: round.round }, points));
    const roundWagers = _.map(_.get('wager'), round.questions);
    const currentWager = _.get('wager', q);
    const disabledWagers = _.filter((wager) => wager != currentWager, roundWagers);
    const hideCategory = round.round === 'social media';
    const hideWager = _.includes(round.round, ['social media', 'intermission']);

    // <button tabindex="-1" type="button" class="active btn btn-primary" style="width: 100%; display: inline-block;">1</button>
    //
    return `
<div class="item trivia-question" id="${q.id}">
  <div class="content">
    ${hideCategory ? '' : `
    <div class="meta">
      <div class="ui transparent inverted input">
        <input type="text" placeholder="???" class="trivia-category" data-category-id="${q.id}" value="${q.category}" />
      </div>
    </div>
    `}
    <div class="description" style="display: flex; justify-content: space-between; align-items: center;">
      <div class="field">
        <label></label>
        <textarea rows="2" cols="35" placeholder="Notes..." class="trivia-notes" data-notes-id="${q.id}">${q.notes}</textarea>
      </div>
      ${hideWager ? '' : `
      <div class="ui compact selection dropdown">
        <input type="hidden" class="trivia-wager" data-wager-id="${q.id}" value="${currentWager || ''}" />
        <div class="default text">Wager</div>
        <div class="menu">
          <div class="item"></div>
          ${
            _.join(
              '\n',
              _.map((pointWager) => {
                const disabled = (_.includes(pointWager, disabledWagers)) ? 'disabled' : '';
                return `<div class="item ${disabled}" data-value="${pointWager}">${pointWager}</div>`;
              }, (_.head(pointWagers) === upToHalf) ? _.range(0, Math.floor(totalScore(store) / 2) + 1) : pointWagers)
            )
          }
        </div>
      </div>
      `}
      <div class="ui checkbox ${(q.correct === true) ? 'checked' : ''}">
        <input type="checkbox" class="trivia-correct" data-correct-id="${q.id}" ${(q.correct === true) ? 'checked=""' : ''} />
        <label style="color: white">Correct</label>
      </div>
    </div>
  </div>
</div>
    `;
};

const renderRound = (store) => (round) => {
    return `
<div class="item trivia-round" id="${round.round}">
  <div class="title">
    <i class="dropdown icon"></i>
    ${round.round} ${score(round)}
  </div>
  <div class="content">
    <div class="ui items">
      ${round.round !== 'intermission' ? '' : `
      <div class="item">
        <div class="content">
          <div class="meta">
            <div class="ui transparent inverted input">
              <input type="text" placeholder="???" />
            </div>
          </div>
        </div>
      </div>
      `}
      ${_.join('\n', _.map(renderQuestion(store)(round), round.questions), '\n')}
    </div>
  </div>
</div>
    `;
};

const renderForm = (store) => {
    $('.trivia-helper').remove();
    $('body').append(
`
<div class="ui visible right very wide sidebar inverted accordion vertical menu trivia-helper">
  <div class="item">
    <b>Score: ${totalScore(store)}</b>
  </div>
  ${_.join('\n', _.map(renderRound(store), store.rounds))}
  <div class="item">
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path fill-rule="evenodd" clip-rule="evenodd" d="M6 3C6 1.34315 7.34315 0 9 0H14C14.2652 0 14.5196 0.105357 14.7071 0.292893L21.7071 7.29289C21.8946 7.48043 22 7.73478 22 8V17C22 18.6569 20.6569 20 19 20H18V21C18 22.6569 16.6569 24 15 24H5C3.34315 24 2 22.6569 2 21V7C2 5.34315 3.34315 4 5 4H6V3ZM6 6H5C4.44772 6 4 6.44772 4 7V21C4 21.5523 4.44772 22 5 22H15C15.5523 22 16 21.5523 16 21V20H9C7.34315 20 6 18.6569 6 17V6ZM9 2C8.44772 2 8 2.44772 8 3V17C8 17.5523 8.44771 18 9 18H19C19.5523 18 20 17.5523 20 17V9H16C14.3431 9 13 7.65685 13 6V2H9ZM15 3.41421L18.5858 7H16C15.4477 7 15 6.55228 15 6V3.41421Z" fill="#293644"/>
    </svg>  
  </div>
  <div class="item">
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" height="20" width="20" class="trivia-clear" style="cursor: pointer">
      <path d="M0 0h24v24H0z" fill="none"/>
      <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" fill="#ffffff" />
    </svg>
  </div>
</div>
`
    );
};

const renderToggle = (store) => {
    $('.trivia-helper-toggle').remove();
    $('body').append(
`
<button class="trivia-helper-toggle" style="position: fixed; top: 0; right: 0; z-index: 9999999999999">+/-</button>
`
    );
};

const initForm = () => {
    let store = getStore();
    renderForm(store);
    renderToggle();
    $('.ui.accordion').accordion();
    $('.ui.dropdown').dropdown();
    showCurrentRound(store);

    $(document).on('click', '.trivia-helper-toggle', () => {
        $('.ui.sidebar').sidebar('toggle');
    });

    $('.trivia-clear').on('click', () => {
        clearStore();
        initForm();
    });

    $('.trivia-copy').on('click', () => {
      GM_setClipboard(store, 'json');
    });

    $('.trivia-category').on('input', function() {
        updateCategory($(this).val(), $(this).attr('data-category-id'), store);
    });

    $('.trivia-notes').on('input', function() {
        updateNotes($(this).val(), $(this).attr('data-notes-id'), store);
    });

    $('.trivia-wager').on('change', function() {
        updateWager($(this).val(), $(this).attr('data-wager-id'), store);
        initForm();
    });

    $('.trivia-correct').on('change', function() {
        updateCorrect(this.checked, $(this).attr('data-correct-id'), store);
        initForm()
    });
};

$(document).ready(function () {
  'use strict';

    GM_addStyle(GM_getResourceText("SEMANTIC_UI_CSS"));

    initForm();
});