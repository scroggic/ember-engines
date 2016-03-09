import { test } from 'qunit';
import moduleForAcceptance from 'mobile-app/tests/helpers/module-for-acceptance';

moduleForAcceptance('Acceptance | End-To-End', {
  beforeEach() {
    this.originalDate = window.Date;
    window.Date = function() {};
    window.Date.prototype = {
      getHours: () => 'hours',
      getMinutes: () => 'minutes',
      getSeconds: () => 'seconds',
    };
  },

  afterEach() {
    window.Date = this.originalDate;
  }
});

test('end-to-end flow for messaging', function(assert) {
  visit('/');

  // Test basic rendering
  click('.main-nav a:first-child');
  andThen(() => {
    assert.equal(currentURL(), '/messaging', 'on the messaging index');

    const summaries = find('.thread-list .thread-summary');
    const firstSummary = summaries.first();

    assert.equal(summaries.length, 14, 'renders all of the thread summaries');
    assert.equal(firstSummary.find('h4').text().trim(), 'Claus Valca', 'renders the sender\'s name');
    assert.equal(firstSummary.find('p').text().trim(), 'Hey Lavie! Did you see that awesome gunship yesterday?', 'renders the excerpt');
  });

  // Test service integration
  click('.thread-summary:first-child a');
  andThen(() => {
    assert.equal(currentURL(), '/messaging/thread/1', 'on the first message thread');

    const message = find('.message-item');
    assert.notEqual(message.find('.from').text().trim().indexOf('Claus Valca'), -1, 'render the correct from');
    assert.equal(message.find('.time').text().trim(), 'hours:minutes:seconds', 'render the correct time');
    assert.equal(message.find('.message').text().trim(), 'Hey Lavie! Did you see that awesome gunship yesterday?', 'renders the message');
  });

  // Test external links
  click('.back-link');
  andThen(() => assert.equal(currentURL(), '/', 'on the home page'));
});
