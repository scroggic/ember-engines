# Engine Training

This is a training excerise to help you understand how to migrate an existing, monolith-style Ember application to an Engine-based, distributed Ember application.

## Getting Started

To get started with the training, simply clone down this repository:

```bash
git clone git@github.com:trentmwillis/engine-training.git
```

Next, change into the `mobile-app` directory, install dependencies, and fire up the Ember app:

```
cd engine-training/mobile-app/
npm install && bower install
ember s
```

Make sure the application is running at `http://localhost:4200/`. It should consist of a simple "messaging" application with a clock in the upper right hand corner. After that, check the tests (`http://localhost:4200/tests`) and make sure they are all passing. If everything is green, then you are good to go!

## Step 0: Identifying Separation Points

## Step 1: Creating An Addon

The first, and most obvious, step is to create a new Ember addon for us to move our Messaging code into. Switch into the root of the project and run the following:

```bash
ember addon messaging
```

This will take a few moments. Once it is done running, take a moment to explore the file structure of `messaging`; a lot of it will look familiar but I want to highlight a couple things.

First, there is an `addon` directory and an `app` directory. These two directories both look the same and can have the same types of files in them. In fact, your `app` directory can look almost exactly like a normal application if you want! The biggest difference, however, is that files in the `addon` directory do _not_ get merged into your application's namespace, whereas files in the `app` directory do get merged. Let's check out a practical example.

Inside `messaging/app` manually create the files `components/search-bar.js` and `templates/components/search-bar.hbs` with the following contents:

```js
// messaging/app/components/search-bar.js
import Ember from 'ember';

export default Ember.Component.extend({
  classNames: [
    'search-bar'
  ],
  click() {
    alert('Search has not been implemented yet!');
  }
});

```

```hbs
{! messaging/app/templates/components/search-bar.hbs !}
<textarea placeholder="Search for something..." disabled=disabled></textarea>
```

Then, back inside the actual application, add the following at the top of `mobile-app/app/templates/messaging/index.hbs`:

```hbs
{{search-bar}}
```

The application should reload in the browser if you still have the server up, but the `search-bar` won't show up. We need to add our new addon to our applications `dependencies`, so open up the `package.json` and add the following in an appropriate location:

```json
// mobile-app/package.json
"dependencies": {
  "messaging": "*"
}
```

Use npm link and restart the server.

Now, to get back to the original point, let's try moving the `search-bar` component into the `addon` directory.

```bash
mv app/components addon/components
mv app/templates addon/templates
```

```bash
Addon templates were detected, but there are no template compilers registered for `messaging`. Please make sure your template precompiler (commonly `ember-cli-htmlbars`) is listed in `dependencies` (NOT `devDependencies`) in `messaging`'s `package.json`.
```

```json
"dependencies": {
  "ember-cli-babel": "^5.1.5",
  "ember-cli-htmlbars": "*"
}
```

Notice, the `search-bar` doesn't show up! This is becase we're running the `mobile-app` application, which means that when it tries to use that component it is looking for `mobile-app/components/search-bar`, but out component is now living at `messaging/components/search-bar`! So how do we resolve this?

```js
export { default } from 'messaging/components/search-bar';
```

Then inside the component we need:

```js
import Ember from 'ember';
import layout from 'messaging/templates/components/search-bar';

export default Ember.Component.extend({
  layout,
  classNames: [
    'search-bar'
  ],
  click() {
    alert('Search has not been implemented yet!');
  }
});
```

### Sidebar: `isDevelopingAddon`

Without getting too far into the weeds, Ember addons provide a series of hooks to make them more powerful and able to perform work during both build and runtime. One such hook is the `isDevelopingAddon` hook. This magical function allows your application to watch the addons files while serving a consuming application, this means that when you make changes to the addon's code it will reload your application (assuming it is serving). You can enable this by adding the following your `messaging/index.js` file:

```js
// messaging/index.js
module.exports = {
  name: 'messaging',

  isDevelopingAddon: function() {
    return true;
  }
};
```

Be sure to remove this function for any addons you will be shipping to other consumers!

## Step 2: Migrating Existing Code To An Addon

Now that we've covered the basics of addons, migrating your existing code to one should be relatively straightforward. You can begin by just moving any file with `messaging` in the name/path to the `messaging/addon` directory. The following should get you there (but it is important to pay attention to what you're moving):

```bash
mv mobile-app/app/components/messaging messaging/addon/components/messaging
mv mobile-app/app/data/messaging.js messaging/addon/data/messaging.js
mv mobile-app/app/routes/messaging.js messaging/addon/routes/messaging.js
mv mobile-app/app/routes/messaging messaging/addon/routes/messaging
mv mobile-app/app/templates/messaging.js messaging/addon/templates/messaging.js
mv mobile-app/app/templates/messaging messaging/addon/templates/messaging
```

_Note: in general, you would not define application-specific constructs (such as mock data and routes) in an addon, but since these will eventually become Engines, it is okay._

After you're done moving the Messaging files into the `messaging/addon` directory, everything will be broken.

So, at this point you might be wondering why we use the `addon` directory instead of using the `app` directory (where everything "just works"). The big reason is that Engines assume their code is in the `addon` directory, so we will eventually need to have it all in there anyway. The secondary reason is that this is the pattern advocated by the Ember community; addons should define all their modules in their own namespace and export a specific API to the application namespace.

With that reasoning out of the way, let's fix things.

Starting at the top of the `addon` directory, we have `components` to fix. The procedure here is roughly the same as what we did in **Step 1**, with one exception. Having the `messaging` namespace inside the `messaging` addon is now redundant, so we should move those paths. In other words:

```bash
mv messaging/addon/components/messaging/thread-summary messaging/addon/components/thread-summary
mv messaging/addon/components/messaging/message-item messaging/addon/components/message-item
```

You should also do a similar move the components templates. With that said, we still want that namespace when we use the components in our application, so when we re-export those files we should leave them in their original paths. Here's what that looks like for `thread-summary`:

```js
// messaging/app/components/messaging/thread-summary.js
export { default } from 'messaging/components/thread-summary';
```

Hopefully everything seems straightforward.

Now that `components` are done, we can work on `routes`.

Doing this for routes is kind of magical.

## Step 3: Introducing Engines


