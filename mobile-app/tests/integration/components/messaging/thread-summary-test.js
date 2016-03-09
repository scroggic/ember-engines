import { moduleForComponent, test } from 'ember-qunit';
import hbs from 'htmlbars-inline-precompile';

moduleForComponent('messaging/thread-summary', 'Integration | Component | messaging/thread summary', {
  integration: true
});

test('it renders', function(assert) {
  // Set any properties with this.set('myProperty', 'value');
  // Handle any actions with this.on('myAction', function(val) { ... });

  this.render(hbs`{{messaging/thread-summary}}`);

  assert.ok(this.$());

  // Template block usage:
  this.render(hbs`
    {{#messaging/thread-summary}}
      template block text
    {{/messaging/thread-summary}}
  `);

  assert.ok(this.$());
});
