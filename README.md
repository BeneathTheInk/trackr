# Trackr

This is a fork of [Meteor Tracker](https://github.com/meteor/meteor/tree/devel/packages/tracker), the library formerly known as Meteor Deps. It has been repackaged into a standalone library that is ready to use in Node.js and the browser.

Trackr's API is almost identical to Meteor's version. Check out their documentation on [Tracker](http://docs.meteor.com/#/full/tracker) and [Using Deps](http://manual.meteor.com/#deps) since they are both fully relevant.

The only change that has been made is the addition of function context. Method context (`this`) can be added as an optional argument to the end of methods that accept functions. For example, here is how you would use `autorun()` with context:

```javascript
var ctx = { foo: "bar" };

Trackr.autorun(function() {
    console.log(this.foo); // "bar"
}, ctx);
```

This also works for `onInvalidate()` and `afterFlush()` callbacks. `onInvalidate()` will fallback on the context provided to the computation if none is provided.