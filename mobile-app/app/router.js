import Ember from 'ember';
import config from './config/environment';

const Router = Ember.Router.extend({
  location: config.locationType
});

Router.map(function() {
  this.route('messaging', function() {
    this.route('thread', { path: '/thread/:id' });
  });
});

export default Router;
