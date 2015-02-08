# Trackr

This is a fork of Meteor Tracker, the library formerly known as Meteor Deps. It has been repackaged into a standalone library that is ready to use in Node.js and the browser.

Trackr's API is almost identical to Meteor's version. Check out their documentation on [Tracker](http://docs.meteor.com/#/full/tracker) and [Using Deps](http://manual.meteor.com/#deps) since they are both fully relevant.

The only change that has been made is the addition of context to functions run by Trackr. This is an optional argument added to the end of methods that accept functions. For example, here is how you would use `autorun()` with context:

```javascript
Trackr.autorun(function() {
    console.log(this.foo); // "bar"
}, {
    foo: "bar"
});
```

This also works for `onInvalidate()` and `afterFlush()` callbacks. `onInvalidate()` will fallback on the context provided to the computation if none is provided.