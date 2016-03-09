import Ember from 'ember';
import MessagingData from 'mobile-app/data/messaging';

export default Ember.Route.extend({
  model() {
    return {
      threads: [].concat(MessagingData, MessagingData)
    };
  }
});
