import Ember from 'ember';

const { run } = Ember;

function formatTime(value) {
  return value < 10 ? '0' + value : value;
}

export default Ember.Service.extend({
  init() {
    this._super(...arguments);
    this._tick();
  },

  _tick() {
    const now = new Date();
    const h = now.getHours();
    const m = formatTime(now.getMinutes());
    const s = formatTime(now.getSeconds());

    this.setProperties({
      clock: `${h}:${m}:${s}`,
      _timer: Ember.testing || run.later(this, '_tick', 500)
    });
  },

  clock: undefined,

  getCurrentTime() {
    return this.get('clock');
  },

  willDestroy() {
    this._super(...arguments);
    run.cancel(this.get('_timer'));
  }
});
