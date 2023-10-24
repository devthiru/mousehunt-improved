import { addUIStyles, getMhuiSetting } from '../utils';
import styles from './styles.css';

const getIgnoredGifts = () => {
  const ignored = getMhuiSetting('gift-buttons-ignore-bad-gifts-0', 'skip');

  const skipOptions = {
    skip: [
      'mozzarella_cheese',
      'stale_cheese',
      'stale_cheese_craft_item',
    ],
    'no-skip': [],
    mozzarella: [
      'mozzarella_cheese',
    ],
    stale: [
      'stale_cheese_craft_item',
    ],
    sludge: [
      'radioactive_sludge',
    ],
    'mozzarella-stale': [
      'mozzarella_cheese',
      'stale_cheese_craft_item',
    ],
    'mozzarella-sludge': [
      'mozzarella_cheese',
      'radioactive_sludge',
    ],
    'stale-sludge': [
      'stale_cheese_craft_item',
      'radioactive_sludge',
    ],
  };

  return skipOptions[ignored] || skipOptions.skip;
};

/**
 * Send the gifts.
 *
 * @param {string}  buttonClass The class of the button to click.
 * @param {number}  limit       The number of gifts to send.
 * @param {boolean} reverse     Whether to reverse the order of the clicks.
 */
const sendGifts = (buttonClass, limit = 15, reverse = false) => {
  if (hg && hg.views?.GiftSelectorView?.show) { // eslint-disable-line no-undef
    hg.views.GiftSelectorView.show(); // eslint-disable-line no-undef
  }

  // get all the gift blocks.
  const giftBlocks = document.querySelectorAll('.giftSelectorView-claimableGift');
  if (! giftBlocks.length) {
    return;
  }

  let giftButtons = [];

  // add the expanded class to all the ones that aren't ignored.
  const ignoredGifts = getIgnoredGifts();
  giftBlocks.forEach((el) => {
    const giftType = el.getAttribute('data-item-type');
    if (ignoredGifts.includes(giftType)) {
      return;
    }

    // otherwise, add the expanded class and then get all the buttons.
    el.classList.add('expanded');

    const buttons = el.querySelectorAll(`.giftSelectorView-friendRow-action.${buttonClass}:not(.disabled):not(.selected)`);
    buttons.forEach((button) => {
      giftButtons.push(button);
    });

    giftButtons = Array.prototype.slice.call(giftButtons);

    // if we're doing it in reverse order, reverse the array.
    if (getSetting('gift-buttons-send-order-0', 'reverse') || reverse) {
      giftButtons.reverse();
    }

    // send the gifts.
    let sent = 0;
    giftButtons.forEach((button) => {
      if (sent >= limit) {
        return;
      }

      sent++;
      button.click();
    });

    // confirm the gifts.
    const confirm = document.querySelector('.mousehuntActionButton.giftSelectorView-action-confirm.small');
    if (confirm) {
      confirm.click();
    }
  });
};

const makePaidGiftsButton = (buttonContainer) => {
  const hasPaidGifts = document.querySelectorAll('.giftSelectorView-friendRow-returnCost');
  if (! hasPaidGifts.length) {
    return;
  }

  const paidGiftsButton = makeElement('button', ['mh-gift-button', 'mh-gift-buttons-paid-gifts'], 'Accept & Return Paid Gifts');
  paidGiftsButton.addEventListener('click', () => {
    hg.views.GiftSelectorView.show(); // eslint-disable-line no-undef
    hg.views?.GiftSelectorView.showTab('claim_paid_gifts', 'selectClaimableGift');

    let acceptedGifts = JSON.parse(sessionStorage.getItem('mh-gift-buttons-accepted-paid-gifts'));
    if (! acceptedGifts) {
      acceptedGifts = {};
    }

    const newAcceptedGifts = {};

    const gifts = document.querySelectorAll('.giftSelectorView-friendRow.paidgift');
    gifts.forEach((gift) => {
      const friendId = gift.getAttribute('data-snuid');
      const giftId = gift.parentNode.parentNode.parentNode.getAttribute('data-item-type');

      const acceptButton = gift.querySelector('.giftSelectorView-friendRow-action.claim');
      const returnButton = gift.querySelector('.giftSelectorView-friendRow-action.return');

      if (! giftId || ! friendId || ! acceptButton || ! returnButton) {
        return;
      }

      if (! acceptedGifts[giftId] || ! acceptedGifts[giftId].includes(friendId)) {
        returnButton.click();

        // save the gift as accepted.
        if (! newAcceptedGifts[giftId]) {
          newAcceptedGifts[giftId] = [];
        }

        newAcceptedGifts[giftId].push(friendId);
      } else {
        acceptButton.click();
      }
    });

    if (newAcceptedGifts !== acceptedGifts) {
      sessionStorage.setItem('mh-gift-buttons-accepted-paid-gifts', JSON.stringify(newAcceptedGifts));
    }
  });

  buttonContainer.appendChild(paidGiftsButton);
};

const makeAcceptButton = (buttonContainer) => {
  const acceptButton = makeElement('button', ['mh-gift-button', 'mh-gift-buttons-accept'], 'Accept All');
  const acceptLimit = document.querySelector('.giftSelectorView-numClaimActionsRemaining');
  if (acceptLimit && acceptLimit.innerText === '0') {
    acceptButton.classList.add('disabled');
  } else {
    acceptButton.addEventListener('click', () => {
      sendGifts('claim', acceptLimit ? parseInt(acceptLimit.innerText, 10) : 15);
    });
  }

  buttonContainer.appendChild(acceptButton);
};

const makeReturnButton = (buttonContainer) => {
  // Return button.
  const returnWrapper = makeElement('div', 'mh-gift-buttons-return-wrapper');
  const returnButton = makeElement('button', ['mh-gift-button', 'mh-gift-buttons-return'], 'Accept & Return All');
  const returnLimit = document.querySelector('.giftSelectorView-numSendActionsRemaining');
  if (returnLimit && returnLimit.innerText === '0') {
    returnButton.classList.add('disabled');
  } else {
    returnButton.addEventListener('click', () => {
      sendGifts('return', returnLimit ? parseInt(returnLimit.innerText, 10) : 25);
    });
  }

  returnWrapper.appendChild(returnButton);
  buttonContainer.appendChild(returnWrapper);
};

const fixTypo = () => {
  const template = hg.utils.TemplateUtil.getTemplate('ViewGiftSelector')
    .replace('You can send 1 free gifts', 'You can send 1 free gift')
    .replace('<b>1</b> free gifts', '<b>1</b> free gift');

  hg.utils.TemplateUtil.addTemplate('ViewGiftSelector', template);
};

/**
 * Make the buttons and add them to the page.
 */
const makeButtons = () => {
  if (document.getElementById('bulk-gifting-gift-buttons')) {
    return;
  }

  const buttonContainer = document.createElement('div');
  buttonContainer.id = 'bulk-gifting-gift-buttons';

  makePaidGiftsButton(buttonContainer);
  makeAcceptButton(buttonContainer);
  makeReturnButton(buttonContainer);

  // Add the buttons to the page.
  const giftFooter = document.querySelector('.giftSelectorView-inbox-footer');
  if (giftFooter && giftFooter.firstChild) {
    giftFooter.insertBefore(buttonContainer, giftFooter.firstChild);
  }
};

/**
 * On a sucessful send, close the modal.
 *
 * @param {Object} request The request.
 */
const checkForSuccessfulGiftSend = (request) => {
  const enabled = getMhuiSetting('gift-buttons-close-on-send', true);
  if (! enabled) {
    return;
  }

  if (! (request && 'undefined' !== request.friends_sent_gifts && request.friends_sent_gifts.length > 1)) {
    return;
  }

  const okayBtn = document.querySelector('.giftSelectorView-confirmPopup-submitConfirmButton');
  if (! okayBtn) {
    return;
  }

  setTimeout(() => {
    okayBtn.click();

    if ('undefined' === typeof activejsDialog || ! activejsDialog || ! activejsDialog.hide) { // eslint-disable-line no-undef
      return;
    }

    activejsDialog.hide(); // eslint-disable-line no-undef
  }, 2000);
};

const pickFriends = (friends, limit) => {
  const selected = [];
  let sent = 1;

  // fake the first "random" selection to be in the first 35 friends so that
  // you can see that it's working.
  const firstRandom = Math.floor(Math.random() * 35);
  selected.push(firstRandom);

  while (sent < limit) {
    const random = Math.floor(Math.random() * friends.length);
    if (selected.includes(random)) {
      continue;
    }

    selected.push(random);
    sent++;
  }

  selected.forEach((index) => {
    friends[index].click();
  });
};

const addRandomSendButton = () => {
  const _selectGift = hg.views.GiftSelectorView.selectGift; // eslint-disable-line no-undef
  hg.views.GiftSelectorView.selectGift = (gift) => { // eslint-disable-line no-undef
    _selectGift(gift);

    const title = document.querySelector('.giftSelectorView-tabContent.active .selectFriends .giftSelectorView-content-title');
    if (! title) {
      return false;
    }

    const existing = document.querySelector('.mh-gift-buttons-send-random');
    if (existing) {
      existing.remove();
    }

    const sendButton = makeElement('button', ['mousehuntActionButton', 'tiny', 'mh-gift-buttons-send-random']);
    makeElement('span', 'mousehuntActionButton-text', 'Select Random Friends', sendButton);

    const sendToFaves = makeElement('button', ['mousehuntActionButton', 'tiny', 'mh-gift-buttons-send-faves']);
    makeElement('span', 'mousehuntActionButton-text', 'Select Frequent Gifters', sendToFaves);

    const limitEl = document.querySelector('.giftSelectorView-tabContent.active .giftSelectorView-actionLimit.giftSelectorView-numSendActionsRemaining');
    const limit = limitEl ? parseInt(limitEl.innerText, 10) : 0;

    if (limit < 1) {
      sendButton.classList.add('disabled');
      sendToFaves.classList.add('disabled');
    }

    sendButton.addEventListener('click', () => {
      const friends = document.querySelectorAll('.giftSelectorView-tabContent.active .giftSelectorView-friend:not(.disabled)');
      if (! friends.length) {
        return;
      }

      pickFriends(friends, limit);
    });

    sendToFaves.addEventListener('click', () => {
      const faves = document.querySelectorAll('.giftSelectorView-tabContent.active .giftSelectorView-friend.favorite:not(.disabled)');
      if (! faves.length) {
        return;
      }

      pickFriends(faves, limit);
    });

    title.appendChild(sendButton);
    title.appendChild(sendToFaves);
  };
};

const main = () => {
  onAjaxRequest(makeButtons, '/managers/ajax/users/socialGift.php');
  onAjaxRequest(checkForSuccessfulGiftSend, '/managers/ajax/users/socialGift.php');

  const buttonLink = document.querySelector('#hgbar_freegifts');
  if (buttonLink) {
    buttonLink.addEventListener('click', function () {
      makeButtons();
    });
  }

  addRandomSendButton();

  fixTypo();
};

export default () => {
  addUIStyles(styles);
  main();
};
