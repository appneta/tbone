# TBone

Simple TBone example.

## I believe you have my stapler

Let's create a model:

``` javascript
tbone.createModel('stapler').singleton();
```

This creates a new Backbone.Model with a .name of stapler as well as an instance
of that Model at tbone.data.stapler.

``` javascript
tbone.data.stapler.set('brand', 'Swingline');
```

Now, let's create a template:

``` javascript
tbone.addTemplate('onMyDesk', 'My <%=stapler.color%> <%=stapler.brand%> stapler.');
```

We can augment this with a view to add "document.ready" style JS after-processing.

``` javascript
tbone.createView('onMyDesk', function () {
	this.$el.css('background', tbone.lookup('stapler.color'));
});
var $el = jQuery('<div tmpl="onMyDesk"></div>').appendTo('body');
tbone.render($el);
```

What do we get?

```
My Swingline stapler.
```

Oh shoot!  We forgot to set the color.  No problem.  Just set it, and TBone rerenders
the template and view to keep in sync with its source data.

``` javascript
tbone.set('stapler.color', 'red');
```

[Try it out on JSFiddle](http://jsfiddle.net/notfunk/2Y8HX/)
