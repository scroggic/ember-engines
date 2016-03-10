# Engine Training

This is a training excerise to help you understand how to migrate an existing, monolithic Ember application to an Engine-based, distributed Ember application.

## Getting Started

To get started with the training, simply clone down this repository:

```bash
git clone git@github.com:trentmwillis/engine-training.git
```

Next, switch into the `mobile-app` directory within the repo, install dependencies, and fire up the Ember app:

```
cd engine-training/mobile-app/
npm install && bower install
ember s
```

Make sure the application is running at `http://localhost:4200/`. It should consist of a simple "messaging" application with a clock in the upper right hand corner. After that, check the tests (`http://localhost:4200/tests`) and make sure they are all passing. If everything is green, then you are good to go!

## Step 0: Identifying Separation Points

_TODO: Fill in some info about identifying where to split up applications into Engines._

## Step 1: Creating An Addon

Now that we have identified that our Messaging route and sub-routes should be an Engine, the first, and most obvious, step is to create a new Ember addon for us to move that code into. Switch into the root of the project and run the following:

```bash
ember addon messaging
```

This will take a few moments. Once it is done running, take a moment to explore the file structure of `messaging`. If you've never worked on an addon before but have experience with Ember, then a lot of it will look familiar but there are a few new things worth highlighting.

The biggest highlight is that there is an `addon` directory and an `app` directory. These two directories both look the same and can have the same types of files in them. In fact, your `app` directory can look almost exactly like a normal application if you want! The biggest difference between the two locations is that files in the `addon` directory do _not_ get merged into your application's namespace, whereas files in the `app` directory do get merged.

This is, perhaps, the most tricky part of moving code into an addon. So, let's check out a practical example.

Inside `messaging/app` _manually_ create the files `components/search-bar.js` and `templates/components/search-bar.hbs` with the following contents:

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
<textarea placeholder="Search for something..." disabled="disabled"></textarea>
```

Then, back inside the actual application, add the following at the top of `mobile-app/app/templates/messaging/index.hbs`:

```hbs
{{search-bar}}
```

The application should reload in the browser if you still have the server up, but the `search-bar` won't show up! This is because we need to add our new addon to our application's `dependencies`, so open up the `package.json` and add the following in an appropriate location:

```json
// mobile-app/package.json
"dependencies": {
  "messaging": "*"
}
```

We've now said that we need the `messaging` addon, but we haven't installed it. Normally, you could use `npm install` or `ember install`, but since our addon is local to this project, we should instead use `npm link`. Without going into too much detail `npm link` allows you to symlink a local package (or addon) into another project so that you can test it out during development. If you're interested, you can [read more about it here](https://docs.npmjs.com/cli/link).

Now, let's link! Change into the `messaging` directory and simply run:

```bash
npm link
```

Then, change into your `mobile-app` directory and run:

```bash
npm link messaging
```

Voila! Everything should be in order, but nothing is showing up in the browser yet. Why? Well, put simply, even though you've added a new dependency, Ember-CLI isn't smart enough to automatically pull that into the build. So we need to kill our application server and restart it.

Okay, now that we're done with that sidebar about introducing local dependencies, let's get back to the original point. Let's try moving the `search-bar` component into the `addon` directory:

```bash
mv app/components addon/components
mv app/templates addon/templates
```

Since we've now introduce new folders, you might need to kill and restart your server again. Once you do, you should get an error similar to:

```bash
Addon templates were detected, but there are no template compilers registered for `messaging`. Please make sure your template precompiler (commonly `ember-cli-htmlbars`) is listed in `dependencies` (NOT `devDependencies`) in `messaging`'s `package.json`.
```

This error is pretty explicit, since your addon now has templates in the addon directory, we need to specify a dependency to build them properly. So just do what it says and add the following to your `messaging/package.json`:

```json
"dependencies": {
  "ember-cli-babel": "^5.1.5",
  "ember-cli-htmlbars": "*"
}
```

Start the server again and you should build successfully!

But, notice, the `search-bar` doesn't show up! This is becase we're running the `mobile-app` application, which means that when it tries to use that component it is looking for `mobile-app/components/search-bar`, but out component is now living at `messaging/components/search-bar`! So how do we resolve this?

The simple solution is to re-export the component from the `app` directory of our addon. So add the following:

```js
// messaging/app/components/search-bar.js
export { default } from 'messaging/components/search-bar';
```

This will then get merged into the app namespace (as we expect), but will be using the code from the addon's namespace. But, still nothing will be showing up. This is because we also need a template for the component to be exported. However, we do this in a different way.

Inside our actual component file, we import the template and specify it as the templates `layout`. This then treats the template and the component as a single unit, which saves us from having to re-export multiple files for each component. So update `messaging/addon/components/search-bar.js` to have the following:

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

And there you have it! Hopefully the difference between putting something in the `app` directory vs the `addon` directory is clear now. That about covers the basics of addons, so let's move on.

### Sidebar: `isDevelopingAddon`

Without getting too far into the weeds, Ember addons provide a series of hooks to make them more powerful and able to perform work during both build and runtime. One such hook is the `isDevelopingAddon` hook. This magical function allows your application to watch the addon's files while serving a consuming application, this means that when you make changes to the addon's code it will reload your application (assuming it is serving). You can enable this by adding the following your `messaging/index.js` file:

```js
// messaging/index.js
module.exports = {
  name: 'messaging',

  isDevelopingAddon: function() {
    return true;
  }
};
```

This is super helpful for locally linked projects and will save you the headache of constantly starting and stopping your server. But. be sure to remove this function for any addons you will be shipping to other consumers!

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

To start working with engines we need to install the [ember-engines](git@github.com:dgeb/ember-engines.git) addon in both the application and the addon. When doing this, there are two steps:

1. `ember install ember-engines` - this installs the actual Engines support
2. `rm -rf bower_components && bower install --save ember#canary && bower install` - this install Ember Canary which allows you to use the feature flags needed for Engines

That said, we need to support external links, which are only in RFC currently, so we will install ember-engines from a branch.

In the `package.json` for `mobile-app` and `messaging`, include the following under `dependencies`:

```json
"ember-engines": "trentmwillis/ember-engines#links"
```

And then run `npm install` again. Serve the app to make sure everything is green before continuing on.

Routeable Engines (the kind we plan to use) really only require 2 new constructs, `engine.js` and `routes.js` which roughly parallel `app.js` and `router.js` from an Ember application. We can start by introducing `engine.js` like so:

```js
// messaging/addon/engine.js
import Engine from 'ember-engines/engine';
import Resolver from 'ember-engines/resolver';

export default Engine.extend({
  modulePrefix: 'messaging',
  Resolver
});
```

Note that it is important to define a `modulePrefix` as it will be used to resolve your engine and its modules. Next, we introduce `routes.js`:

```js
// messaging/addon/routes.js
import buildRoutes from 'ember-engines/routes';

export default buildRoutes(function() {

});
```

We then fill this in with the routes from our `router.js`:

```js
// messaging/addon/routes.js
export default buildRoutes(function() {
  this.route('thread', { path: '/thread/:id' });
});
```

And replace the `messaging` route with a `mount` for our engine:

```js
// mobile-app/app/router.js
Router.map(function() {
  this.mount('messaging');
});
```

At this point, if you try to use the application you'll get an error. This is because Engines require a special resolver be used in their consuming application, so we can modify `mobile-app/app/resolver.js` to have the following:

```js
import Resolver from 'ember-engines/resolver';
```

Now the application should load just fine, but the `messaging` route is blank!

## Step 4: Wiring Up Engines

The first thing we need to do is rename the `messaging` route files to be `application`. Then, we remove the `messaging` namespace from the other route files.

```bash
mv messaging/addon/routes/messaging.js messaging/addon/routes/application.js
mv messaging/addon/routes/messaging/thread.js messaging/addon/routes/thread.js
mv messaging/addon/routes/messaging/index.js messaging/addon/routes/index.js
```

We do the same thing with the route templates:

```bash
mv messaging/addon/templates/messaging.hbs messaging/addon/templates/application.hbs
mv messaging/addon/templates/messaging/thread.hbs messaging/addon/templates/thread.hbs
mv messaging/addon/templates/messaging/index.hbs messaging/addon/templates/index.hbs
```

You'll then get errors like:

```bash
Error: Assertion Failed: A helper named 'messaging/thread-summary' could not be found
```

This is because we are now isolated. So we need to switch to working with local components (e.g., remove the `messaging` namespace). The only locations you should need to update are in `index.hbs` and `thread.hbs`.

Similarly, you will now get errors such as:

```bash
Error: There is no route named messaging.messaging.thread
```

This is because our linking is now scoped as well. So in `thread-summary.hbs` we need to remove the `messaging.` part of the `link-to`.

## Step 5: Working With Dependencies

At this stage you should have the Messaging index page loading fine, but there are two errors:

1. The "back" arrow doesn't take you to the home page any longer, and
2. The message "thread" page doesn't work.

These are both "dependency" issues, so let's work them out.

First, remember that links are now "scoped" to the Engine. This means that when we try to link to `index` from the Messaging page, we're actually linking to the `index` route of the Engine and not the overall application.

We refer to links outside the Engine as "external links" and there is currently an [RFC](https://github.com/emberjs/rfcs/pull/122) to standardize how those links are implemented. Here, we use the current iteration of that RFC.

To get started, update the `link-to` in the `application.hbs` for `messaging` to use `link-to-external`

```hbs
{{#link-to-external "index" class="back-link"}}
  &laquo;
{{/link-to-external}}
```

This lets Ember now we are trying to link to an external route. Then, declare the `externalRoute` in your `engine.js` file:

```js
export default Engine.extend({
  modulePrefix: 'messaging',
  Resolver,

  dependencies: {
    externalRoutes: [
      'index'
    ]
  }
});
```

Next, you need to provide values for the `externalRoutes` in your `app.js`:

```js
App = Ember.Application.extend({
  modulePrefix: config.modulePrefix,
  podModulePrefix: config.podModulePrefix,
  Resolver,

  engines: {
    messaging: {
      dependencies: {
        externalRoutes: {
          index: 'index'
        }
      }
    }
  }
});
```

The "back" arrow should now properly link to the application "index".

The second issue of the "thread" page not loading is a bit more sneaky. The error reads:

```bash
Cannot read property 'getCurrentTime' of undefined
```

The `getCurrentTime` is a function of the `time` service from the `mobile-app`; our `message-item` component depends on that `service`, so we need to set up a way for the application to give us that service. The process is similar to the one for external routes, we start in the `engine.js` file:

```js
export default Engine.extend({
  modulePrefix: 'messaging',
  Resolver,

  dependencies: {
    externalRoutes: [
      'index'
    ],
    services: [
      'time'
    ]
  }
});
```

And then set it up in the `app.js`:

```js
App = Ember.Application.extend({
  modulePrefix: config.modulePrefix,
  podModulePrefix: config.podModulePrefix,
  Resolver,

  engines: {
    messaging: {
      dependencies: {
        externalRoutes: {
          index: 'index'
        },
        services: [
          'time'
        ]
      }
    }
  }
});
```

The thread page should now load!

## Step 6: Cleaning Up

We now have everything working. But, there is still some work to be done. You can now remove the entire `messaging/app` directory, because it is no longer being used within the main application.

```bash
rm -rf messaging/app
rm -rf mobile-app/tests/integration/components/messaging/
rm -rf mobile-app/tests/unit/routes/
```

There are also some failing tests

## Sidebar: Testing


