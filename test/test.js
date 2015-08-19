var test = require("tape");
var Trackr = require("../");

test("executes computation with context", function(t) {
	var ctx = {};
	var runCount = 0;
	var run = Trackr.autorun(function() {
		t.equal(this, ctx);
		runCount++;
	}, null, ctx);

	t.equal(runCount, 1);
	run.invalidate();
	Trackr.flush();
	t.equal(runCount, 2);

	t.end();
});

test("executes onInvalidate with computation context", function(t) {
	var ctx = {};
	var runCount = 0;
	var run = Trackr.autorun(function(c) {
		c.onInvalidate(function() {
			t.equal(this, ctx);
			runCount++;
		});
	}, null, ctx);

	t.equal(runCount, 0);
	run.invalidate();
	Trackr.flush();
	t.equal(runCount, 1);

	t.end();
});

test("executes onInvalidate with passed context", function(t) {
	var ctx = {};
	var runCount = 0;
	var run = Trackr.autorun(function(c) {
		c.onInvalidate(function() {
			t.equal(this, ctx);
			runCount++;
		}, ctx);
	});

	t.equal(runCount, 0);
	run.invalidate();
	Trackr.flush();
	t.equal(runCount, 1);

	t.end();
});

test("executes afterFlush with context", function(t) {
	var ctx = {};
	var runCount = 0;

	Trackr.afterFlush(function() {
		t.equal(this, ctx);
		runCount++;
	}, ctx);

	t.equal(runCount, 0);
	Trackr.flush();
	t.equal(runCount, 1);

	t.end();
});

test("executes nonreactive with context", function(t) {
	var ctx = {};
	var ret = 12345;
	var runCount = 0;

	var val = Trackr.nonreactive(function() {
		t.equal(this, ctx);
		runCount++;
		return ret;
	}, ctx);

	t.equal(val, ret);
	t.equal(runCount, 1);

	t.end();
});

test("executes nonreactable with bound context", function(t) {
	var ctx = {};
	var arg = "hello";
	var ret = 12345;
	var runCount = 0;

	var fn = Trackr.nonreactable(function(a) {
		t.equal(this, ctx);
		t.equal(a, arg);
		runCount++;
		return ret;
	}, ctx);

	t.equal(runCount, 0);
	var val = fn(arg);
	t.equal(val, ret);
	t.equal(runCount, 1);

	t.end();
});

test("executes nonreactable with unbound context", function(t) {
	var ctx = {};
	var ret = 12345;
	var runCount = 0;

	var fn = Trackr.nonreactable(function() {
		t.equal(this, ctx);
		runCount++;
		return ret;
	});

	t.equal(runCount, 0);
	var val = fn.call(ctx);
	t.equal(val, ret);
	t.equal(runCount, 1);

	t.end();
});
