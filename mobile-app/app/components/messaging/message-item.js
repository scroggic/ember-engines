import Ember from 'ember';

export default Ember.Component.extend({
  time: Ember.inject.service(),
  tagName: 'li',
  classNames: [
    'message-item'
  ],

  init() {
    this._super(...arguments);
    this.set('readTime', this.get('time').getCurrentTime());
  }
});
