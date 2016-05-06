# Engine Training

This is a training excerise to help you understand how to migrate an existing, monolithic Ember application to an Engine-based, distributed Ember application.

Throughout this exercise we will cover a lot of topics, including:

* How to create an addon,
* How addon files are included in the app build,
* The difference between addons, engines, and applications,
* Scoping semantics of engines,
* How to set up engines,
* Handling namespace issues,
* And more!

## Getting Started

To get started with the training, simply clone down this repository:

```bash
git clone https://github.com/trentmwillis/engine-training.git
```

Next, switch into the `mobile-app` directory within the repo, install dependencies, and fire up the Ember app:

```
cd engine-training/mobile-app/
npm install && bower install
ember s
```

Make sure the application is running at `http://localhost:4200/`. It should consist of a simple "messaging" application with a clock in the upper right hand corner. After that, check the tests (`http://localhost:4200/tests`) and make sure they are all passing. If everything is green, then you are good to go!

## Working Through The Steps

Throughout this training, it is recommended that you do work on your own branch from beginning to end, as this will give you the most complete view of how to do this migration. However, if at any point you get stuck, you can checkout a specific step's branch by using the following:

```bash
git fetch
git checkout step-<#>
```

_Note: the entire tutorial takes place in the `messaging` route of this dummy application, so be sure you're looking at the `/messaging` url when you're working through it._

## Step 0: Identifying Separation Points

Before diving into the code, let's have a brief chat about how to identify areas of an application that are candidates for use as an Engine.

First, _what is an Engine_? In a simplistic sense, Engines are a specific type of addon that are application-like. They are addons in construction and must be consumed by an application in order to actuall be used, but they are like applications in that they have a container and thus are given an isolated nature. Due to this isolation, Engines have a single-entry point, also known as a mount point.

Given the above criteria, we can say that a candidate for an Engine is any portion of an application that is reasonably self-contained and only needs a single entry-point. So looking at the `mobile-app` in this repo, we can see that the `messaging` route meets these criteria. The single entry-point is the route it exists on and it is self-contained because it only uses components that exist on the `messaging` routes. Since the entry-point is a route, we would say this is a "routable engine".

Another type of Engine would be a "route-less engine". A commone example of this would be a "chat" widget. This might consist of some complex user flows (such as sending real-time messages), but it is relatively isolated from the rest of the page. It would have a single-entry point being the location in which it is "mounted" on the page. Chances are you wouldn't be mounting the same chat widget in multiple, different locations on an application.

Hopefully this is clear, if not, take a look at the [Engines RFC](https://github.com/emberjs/rfcs/pull/10) for further details on what defines an Engine.

## Step 1: Creating An Addon

Now that we have identified that our `messaging` route should be an Engine, the first, and most obvious, step is to create a new Ember addon for us to move that code into. Switch into the root of the project and run the following:

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

We've now let our application know that we need the `messaging` addon, but we haven't installed it. Normally, you could use `npm install` or `ember install`, but since our addon is local to this project, we should instead use `npm link`.

Without going into too much detail `npm link` allows you to symlink a local package (or addon) into another project so that you can test it out during development. If you're interested, you can [read more about it here](https://docs.npmjs.com/cli/link).

Now, let's link! Change into the `messaging` directory and simply run:

```bash
npm link
```

Then, change into your `mobile-app` directory and run:

```bash
npm link messaging
```

Voila! Everything should be in order, but nothing is showing up in the browser yet. Why? Well, put simply, even though you've added a new dependency, Ember-CLI isn't smart enough to automatically pull that into the build. So we need to kill our application server and restart it.

At this point you should see a nice little search bar on the messaging page. So, let's get back to the original point. Let's try moving the `search-bar` component into the `addon` directory:

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

But, notice, the `search-bar` doesn't show up! This is becase we're running the `mobile-app` application, which means that when it tries to use that component it is looking for `mobile-app/components/search-bar`, but our component is now living at `messaging/components/search-bar`! So how do we resolve this?

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

This is super helpful for locally linked projects and will save you the headache of constantly starting and stopping your server. But be sure to remove this function for any addons you will be shipping to other consumers!

## Step 2: Migrating Existing Code To An Addon

Now that we've covered the basics of addons, migrating your existing code to one should be relatively straightforward. You can begin by just moving any file with `messaging` in the name/path to the `messaging/addon` directory. The following should get you there (but it is important to pay attention to what you're moving):

```bash
mkdir -p messaging/addon/components/ && mv mobile-app/app/components/messaging $_
mkdir -p messaging/addon/data/ && mv mobile-app/app/data/messaging.js $_
mkdir -p messaging/addon/routes/ && mv mobile-app/app/routes/messaging.js $_
mkdir -p messaging/addon/routes/ && mv mobile-app/app/routes/messaging $_
mkdir -p messaging/addon/templates/ && mv mobile-app/app/templates/messaging.hbs $_
mkdir -p messaging/addon/templates/ && mv mobile-app/app/templates/messaging $_
mkdir -p messaging/addon/templates/components/ && mv mobile-app/app/templates/components/messaging $_
```

_Note: in general, you would not define application-specific constructs (such as mock data and routes) in an addon, but since these will eventually become Engines, it is okay._

After you're done moving the Messaging files into the `messaging/addon` directory, everything will be broken.

So, at this point you might be wondering why we use the `addon` directory instead of using the `app` directory (where everything "just works"). The big reason is that Engines assume their code is in the `addon` directory, so we will eventually need to have it all in there anyway. The secondary reason is that this is the pattern advocated by the Ember community; addons should define all their modules in their own namespace and export a specific API to the application namespace.

With that reasoning out of the way, let's fix things.

Starting at the top of the `addon` directory, we have `components` to fix. The procedure here is roughly the same as what we did in **Step 1**, with one exception. Having the `messaging` namespace inside the `messaging` addon is now redundant, so we should move those paths. In other words:

```bash
mv messaging/addon/components/messaging/thread-summary.js messaging/addon/components/thread-summary.js
mv messaging/addon/components/messaging/message-item.js messaging/addon/components/message-item.js
```

You should also do a similar move the components templates.

```bash
mv messaging/addon/templates/components/messaging/thread-summary.hbs messaging/addon/templates/components/thread-summary.hbs
mv messaging/addon/templates/components/messaging/message-item.hbs messaging/addon/templates/components/message-item.hbs
```

With that said, we still want that namespace when we use the components in our application, so when we re-export those files we should leave them in their original paths. Here's what that looks like for `thread-summary`:

```js
// messaging/app/components/messaging/thread-summary.js
export { default } from 'messaging/components/thread-summary';
```

Do a similar thing for the `message-item` component and don't forget to import the component templates into their JS files (like we did in step 1).

Now that `components` are done, we can work on getting the `routes` working again. The same concepts from `components` apply here; the application is trying to find `mobile-app/routes/messaging` but we now have `messaging/routes/messaging`, so we should instead re-export it!

```js
// messaging/app/routes/messaging.js
export { default } from 'messaging/routes/messaging';
```

Do this for the other routes as well. At this point you'll get some errors about not being able to find some import. This is another namespacing issue. If we check the `index.js` and `thread.js` files for `messaging`, we'll see they have this import statement:

```js
import MessagingData from 'mobile-app/data/messaging';
```

We need to update these to this:

```js
import MessagingData from 'messaging/data/messaging';
```

The errors should be gone now, but nothing is showing up. This is because we've re-exported pretty much everything, except the route templates. Re-exporting route templates is not the same as for components, since `routes` don't have a `layout` property. Instead, we just re-export them like the `routes` files.

```js
// messaging/app/templates/messaging.js
export { default } from 'messaging/templates/messaging';
```

You might wonder how this works, since templates are `.hbs` files instead of `.js`. The magic is that HTMLBars templates are compiled to JS modules before being used in the browser, so we can leverage this to import and use them like we would normal JS. Pretty magical!

Do the above for all the route templates and then you should have the application back in working order!

## Step 3: Introducing Engines

To start working with engines we need to install the [ember-engines](git@github.com:dgeb/ember-engines.git) addon in both the application and the addon. Normally, this is as simple as running:

```bash
ember install ember-enginers
```

However, there is still one big feature that hasn't made its way into `ember-engines` quite yet: external linking (more on that later). So, for the time being we will install `ember-engines` from a branch.

In the `package.json` for `mobile-app` and `messaging`, include the following under `dependencies`:

```json
"ember-engines": "trentmwillis/ember-engines#links"
```

And then run `npm install` again. Serve the app to make sure everything is green before continuing on.

Routeable Engines (the kind we plan to use) really only require 2 new constructs, `engine.js` and `routes.js` which roughly parallel `app.js` and `router.js` from a normal Ember application. We can start by introducing `engine.js` like so:

```js
// messaging/addon/engine.js
import Engine from 'ember-engines/engine';
import Resolver from 'ember-engines/resolver';

export default Engine.extend({
  modulePrefix: 'messaging',
  Resolver
});
```

This file is essential the same as `app.js`, except that is doesn't configure any initializers. Note that it is important to define a `modulePrefix` as it will be used to resolve your engine and its modules.

Next, we introduce `routes.js`:

```js
// messaging/addon/routes.js
import buildRoutes from 'ember-engines/routes';

export default buildRoutes(function() {
});
```

The `routes.js` is a simple file that more-or-less just exports a function. That function behaves identically to `Router.map()`, so it means that we can then transfer our `messaging` routes from our application's `router.js`:

```js
// messaging/addon/routes.js
export default buildRoutes(function() {
  this.route('thread', { path: '/thread/:id' });
});
```

We then need to update `router.js` to replace the `messaging` route with a `mount` for our engine:

```js
// mobile-app/app/router.js
Router.map(function() {
  this.mount('messaging');
});
```

This tells our Ember application that when we try to use the `messaging` route we want to load the `messaging` Engine. This would be the "single entry-point" talked about before.

At this point, if you try to use the application you'll get an error. This is because Engines require a special resolver be used in their consuming application, so we can modify `mobile-app/app/resolver.js` to have the following:

```js
import Resolver from 'ember-engines/resolver';
```

Now the application should load just fine, but the `messaging` route is blank! That's because we need to "wire up" the existing addon code to work inside an Engine.

## Step 4: Wiring Up Engines

The first step to wiring up an engine is to understand that engines are _isolated_. This means that many concepts (such as routes, namespaces, links) are scoped to the engine and not the consuming application. This is kind of an abstract idea, so we'll look at how it plays out practically.

The first thing we need to do is rename the `messaging` route file to be `application`:

```bash
mv messaging/addon/routes/messaging.js messaging/addon/routes/application.js
```

Since we are now relative to the engine, our primary route becomes `application` instead of `messaging`. Simiarly, we can remove the `messaging` namespace from the other route files.

```bash
mv messaging/addon/routes/messaging/thread.js messaging/addon/routes/thread.js
mv messaging/addon/routes/messaging/index.js messaging/addon/routes/index.js
```

We then do the same thing for the route templates as well:

```bash
mv messaging/addon/templates/messaging.hbs messaging/addon/templates/application.hbs
mv messaging/addon/templates/messaging/thread.hbs messaging/addon/templates/thread.hbs
mv messaging/addon/templates/messaging/index.hbs messaging/addon/templates/index.hbs
```

At this point, if you try to load the messaging page in your application you should get an error like this:

```bash
Error: Assertion Failed: A helper named 'messaging/thread-summary' could not be found
```

This is because we are now scoped to the engine, this means we are looking up the component from the engine namespace and not the application namespace. So we need to switch to working with local components (e.g., remove the `messaging` namespace). The only locations you should need to update are in `index.hbs` and `thread.hbs`.

Similarly, once you fix those, you will now get an error like so:

```bash
Error: There is no route named messaging.messaging.thread
```

This is because our linking is now scoped as well; any route you try to look up will be relative to the engine's "mount point". So in `thread-summary.hbs` we link to `messaging.thread`, but since our engine is mounted at the `messaging` route we get the route `messaging.messaging.thread`. This is simple to fix, we need to remove the `messaging.` part of the `link-to`.

Do that and the messaging index should load just fine.

## Step 5: Working With Dependencies

At this stage you should have the Messaging index page loading fine, but there are two errors:

1. The "back" arrow doesn't take you to the home page any longer, and
2. The message "thread" page doesn't work.

These are both "dependency" issues, so we'll need to learn some new concepts again.

For the first problem, remember that links are now "scoped" to the Engine. This means that when we try to link to `index` from the Messaging page, we're actually linking to the `index` route of the Engine and not the overall application.

We refer to links outside the Engine as "external links" and there is currently an [RFC](https://github.com/emberjs/rfcs/pull/122) to standardize how those links are implemented. Here, we will use the current iteration of that RFC.

To get started, update the `link-to` in the `application.hbs` for `messaging` to use `link-to-external`

```hbs
{{#link-to-external "index" class="back-link"}}
  &laquo;
{{/link-to-external}}
```

This lets Ember know we are trying to link to an "external" route. Then, declare the `externalRoute` in your `engine.js` file:

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

The big takeaway here is that in order to have dependencies on things that are external to the application we have to explicitly declare them. However, this is currently limited to links and services. We'll talk about how to use external components in a little bit.

## Step 6: Cleaning Up

We now have everything working as it did originally, but with an engine instead! That said, there is still some work to be done. You can now remove the entire `messaging/app` directory, because it is no longer being used within the main application.

```bash
rm -rf messaging/app
```

In general, you should only leave exports in your `app` directory that you expect to be consumed by others. Otherwise, you are just adding extra files for nothing and exposing surface area which will make future refactors more difficult.

There are also some failing tests since the constructs no longer exist in `mobile-app` namespace, we can get rid of those with this:

```bash
rm -rf mobile-app/tests/integration/components/messaging/
rm -rf mobile-app/tests/unit/routes/
```

That about covers it for how to migrate an Ember application to use engines! Read on for some more information about related topics.

### Sidebar: Testing

We just deleted some tests which brings up a good question: _how do we do tests for an engine_?

Testing an Engine is (as to be expected) basically like testing an addon crossed with an application. I'm going to assume you know how to test an application and will instead focus on the addon portion of that statement.

Addon's are tested with a "dummy" application. This application can mock out an environment and inputs for the addon to use in order to verify its behavior in a real context. The setup is relatively straightforward: inside the `tests` directory for the addon there will be a `dummy` directory that has a structure just like an Ember application (with some things elided). From there you can use the addon and test it just like you would in a normal application.

Similarly, Engines are tested by mounting them into a dummy application and then testing them as you would a normal application. Then, obviously, any unit and integration tests will work as normal (since they are isolated to begin with). It's worth noting that any dependencies your engine has will need to be fulfilled in some capacity by the dummy app.

Other than that, there really isn't much unique to testing an engine.

_**TODO**: Add some testing examples/tutorials._

### Sidebar: Sharing Components

By far one of the most talked about issues for using Engines is: _how do we share components_?

The short answer is: addons.

The long answer is: extract components or other functionality you wish to share between engines and create an addon out of it. You can then export that functionality through the `app` directory. After that you have two options:

First, if you want to be picky about what your engine imports, you can define re-exports internal to your addon. This is exactly what you think it would be, something like:

```js
// messaging/addon/components/shared-component.js
export { default } from 'some-addon/components/shared-component';
```

Second, if you're not picky about what your engine imports, you can let Ember-CLI handle the re-exporting work and simply do the following in your module export:

```js
// messaging/index.js
var EngineAddon = require('ember-engines/lib/engine-addon');
module.exports = EngineAddon.extend({
  name: 'messaging'
});
```

In either situation you will need to add the addon to your engine's `dependencies`.

_**TODO**: Add some component sharing examples/tutorials._
