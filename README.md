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

* [Development version](http://cdn.tbonejs.org/tbone-v0.2.js) *Uncompressed with Comments Xkb*
* [Production version](http://cdn.tbonejs.org/tbone-v0.2.min.js) *Minified Xkb*

## CDN

```html
<script src="http://cdn.tbonejs.org/tbone-v0.2.js"></script>
<script src="http://cdn.tbonejs.org/tbone-v0.2.min.js"></script>
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

**createModel** tbone.createModel(name, baseModel, [options])

What it does!

```javascript
tbone...
```

**createView** tbone.createView(name, baseView, function, [options])

What it does!

```javascript
tbone...
```

## Models

## Views

## License

Copyright (c) 2012 Dan Tillberg, AppNeta

TBone is freely redistributable under the MIT License.  See LICENSE for details.
