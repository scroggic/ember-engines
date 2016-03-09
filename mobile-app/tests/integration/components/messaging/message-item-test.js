import { moduleForComponent, test } from 'ember-qunit';
import hbs from 'htmlbars-inline-precompile';

moduleForComponent('messaging/message-item', 'Integration | Component | messaging/message item', {
  integration: true
});

test('it renders', function(assert) {
  // Set any properties with this.set('myProperty', 'value');
  // Handle any actions with this.on('myAction', function(val) { ... });

  this.render(hbs`{{messaging/message-item}}`);

  assert.equal(this.$().text().trim(), '');

  // Template block usage:
  this.render(hbs`
    {{#messaging/message-item}}
      template block text
    {{/messaging/message-item}}
  `);

  assert.equal(this.$().text().trim(), 'template block text');
});
