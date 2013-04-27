# TBone

Automagic event-binding for Backbone.

TBone removes the complexity of manually managing data dependencies in Backbone,
enabling "live" templates as well functions that automatically re-execute when
the data they reference changes.

TBone is designed to scale with your application, enabling simple re-use of
data throughout your application without you needing to tell the page what
to update when that data changes.

At AppNeta, we've used TBone to eliminate a set of custom page events
corresponding such as "refresh data" and "add filter"; with a large application,
it becomes difficult to manage what exactly needs to be refreshed when something
changes.  While Backbone is a critical step toward reducing this complexity,
TBone enables us to do so without even thinking about event binding; every view
and model stays in sync by design and without unnecessary work.

## Download

* [Development version, with comments](http://cdn.tbonejs.org/tbone-v0.3.0.js) *23kB gzipped*
* [Production version, minified](http://cdn.tbonejs.org/tbone-v0.3.0.min.js) *5.4kB gzipped*

## CDN

```html
<script src="http://cdn.tbonejs.org/tbone-v0.3.0.js"></script>
<script src="http://cdn.tbonejs.org/tbone-v0.3.0.min.js"></script>
```
## TBone

**set** tbone.set(object, value)

Sets a **object** (i.e. an attribute in a model) to a specified value.

```javascript
tbone.set('stapler.color', 'red');
=> sets stapler color attribute to red...

tbone.set('counter.value', 15);
=> sets counter value attribute to 15...
```

**lookup** tbone.lookup(object)

Returns a specified **object**.

```javascript
tbone.set('stapler.color');
=> returns 'red'...

tbone.set('counter.value');
=> returns 15...
```

**createModel** tbone.createModel(name, [baseModel or function], [options])

Creates your very own TBone **Model**. You can use chaining to both create and
instantiate the **Model** with the `singleton()` method.

```javascript
tbone.createModel('tweet');
=> creates a model for a tweet.

tbone.createModel('post').singleton();
=> create and instantiates a model for a blog post.
```

**createView** tbone.createView(name, baseView, function, [options])

Creates a TBone **View**, inheriting from another **View** (or the default **View** if
`baseView` is not specified. Please note that `this` will be scoped to this **View**,
thus you can access view specific elements via `this.$`.

```javascript
tbone.createView('widget', function () {
    this.$('span').text('42');
    this.$('a[href]').click(function () {
        tbone.set('selected.widget', $(this).attr('id'));
        return false;
    })
});
=> creates a view named widget and attaches a span and anchor to it.
```

**createCollection** tbone.createCollection(name, model)

Creates a TBone **Collection** of the specified `model`. You can use chaining to
both create and instantiate the **Collection** with the `singleton()` method.

```javascript
tbone.createCollection('tweets', tweet);
=> creates a collection of tweets.

tbone.createCollection('posts', post).singleton();
=> creates and instantiates a collection of blog posts.
```

**autorun** tbone.autorun(function, context, priority, name, onExecuteCb, onExecuteContext, detached)

Wrap a function call with automatic binding for any model properties accessed
during the function's execution.

Models and views update automatically by wrapping their reset functions with this.

Additionally, this can be used within postRender callbacks to section off a smaller
block of code to repeat when its own referenced properties are updated, without
needing to re-render the entire view.


```javascript
tbone.autorun(...)
```

**render** tbone.render(elements, [parent])

Render an array of HTML elements into **Views**.  This reads the TBone attribute
and generates a **View** for each element accordingly.

```javascript
tbone.render(jQuery('[tbone]'));
=> render all elements that contain a tbone attribute.
```

**data** tbone.data

Object that contains all instances of TBone **Models**.

```javascript
tbone.data
=> returns a javascript object all TBone model instances
```

## Models

**models** tbone.models

What it does!

```javascript
tbone...
```

**calc** model.calc()

Overridable method that executes everytime a model dependency changes.

```javascript
tbone.set('timer', {
    calc: function () {
        // Dependency
        var count = tbone.lookup('counter.value') || 0;

        var rval = {};

        // Calculate seconds and minutes.
        rval.seconds = count % 60;
        rval.minutes = Math.floor(count / 60);

        return rval;
    }
}).singleton();
=> overrides the calc method on the timer object
=> executes each time the counter model changes
```

## Views

**views** tbone.views

What it does!

```javascript
tbone...
```

## Templates

**templates** tbone.templates

What it does!

```javascript
tbone...
```

**tmpl**

Renders an externally-defined template, and executes the associated view.
You should load that template via tbone.addTemplate(id, templateHTML).

```html
<div tbone=""></div>
```

**inline**

Renders a template define inline, and executes the associated view.  (note:
This is not advised for complex applications, as there are some complications,
especially when using ERB-style delimeters, which are not valid HTML.)

```html
<div tbone=""></div>
```

**view**

Does not render any template for this node, but executes the associated view.

```html
<div tbone=""></div>
```

## License

Copyright (c) 2012 Dan Tillberg, AppNeta

TBone is freely redistributable under the MIT License.  See LICENSE for details.
