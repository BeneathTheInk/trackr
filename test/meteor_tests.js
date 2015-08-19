var test = require("tape");
var Tracker = require("../");

test('tracker - run', function (t) {
	var d = new Tracker.Dependency;
	var x = 0;
	var handle = Tracker.autorun(function (handle) {
		d.depend();
		++x;
	});
	t.equal(x, 1);
	Tracker.flush();
	t.equal(x, 1);
	d.changed();
	t.equal(x, 1);
	Tracker.flush();
	t.equal(x, 2);
	d.changed();
	t.equal(x, 2);
	Tracker.flush();
	t.equal(x, 3);
	d.changed();
	// Prevent the function from running further.
	handle.stop();
	Tracker.flush();
	t.equal(x, 3);
	d.changed();
	Tracker.flush();
	t.equal(x, 3);

	Tracker.autorun(function (internalHandle) {
		d.depend();
		++x;
		if (x == 6)
			internalHandle.stop();
	});
	t.equal(x, 4);
	d.changed();
	Tracker.flush();
	t.equal(x, 5);
	d.changed();
	// Increment to 6 and stop.
	Tracker.flush();
	t.equal(x, 6);
	d.changed();
	Tracker.flush();
	// Still 6!
	t.equal(x, 6);

	t.throws(function () {
		Tracker.autorun();
	});
	t.throws(function () {
		Tracker.autorun({});
	});

	t.end();
});

test("tracker - nested run", function (t) {
	var a = new Tracker.Dependency;
	var b = new Tracker.Dependency;
	var c = new Tracker.Dependency;
	var d = new Tracker.Dependency;
	var e = new Tracker.Dependency;
	var f = new Tracker.Dependency;

	var buf = "";

	var c1 = Tracker.autorun(function () {
		a.depend();
		buf += 'a';
		Tracker.autorun(function () {
			b.depend();
			buf += 'b';
			Tracker.autorun(function () {
				c.depend();
				buf += 'c';
				var c2 = Tracker.autorun(function () {
					d.depend();
					buf += 'd';
					Tracker.autorun(function () {
						e.depend();
						buf += 'e';
						Tracker.autorun(function () {
							f.depend();
							buf += 'f';
						});
					});
					Tracker.onInvalidate(function () {
						// only run once
						c2.stop();
					});
				});
			});
		});
		Tracker.onInvalidate(function (c1) {
			c1.stop();
		});
	});

	var expect = function (str) {
		t.equal(buf, str);
		buf = "";
	};

	expect('abcdef');

	b.changed();
	expect(''); // didn't flush yet
	Tracker.flush();
	expect('bcdef');

	c.changed();
	Tracker.flush();
	expect('cdef');

	var changeAndExpect = function (v, str) {
		v.changed();
		Tracker.flush();
		expect(str);
	};

	// should cause running
	changeAndExpect(e, 'ef');
	changeAndExpect(f, 'f');
	// invalidate inner context
	changeAndExpect(d, '');
	// no more running!
	changeAndExpect(e, '');
	changeAndExpect(f, '');
	// rerun C
	changeAndExpect(c, 'cdef');
	changeAndExpect(e, 'ef');
	changeAndExpect(f, 'f');
	// rerun B
	changeAndExpect(b, 'bcdef');
	changeAndExpect(e, 'ef');
	changeAndExpect(f, 'f');
	// kill A
	a.changed();
	changeAndExpect(f, '');
	changeAndExpect(e, '');
	changeAndExpect(d, '');
	changeAndExpect(c, '');
	changeAndExpect(b, '');
	changeAndExpect(a, '');

	t.notOk(a.hasDependents());
	t.notOk(b.hasDependents());
	t.notOk(c.hasDependents());
	t.notOk(d.hasDependents());
	t.notOk(e.hasDependents());
	t.notOk(f.hasDependents());

	t.end();
});

test("tracker - flush", function (t) {

	var buf = "";

	var c1 = Tracker.autorun(function (c) {
		buf += 'a';
		// invalidate first time
		if (c.firstRun)
			c.invalidate();
	});

	t.equal(buf, 'a');
	Tracker.flush();
	t.equal(buf, 'aa');
	Tracker.flush();
	t.equal(buf, 'aa');
	c1.stop();
	Tracker.flush();
	t.equal(buf, 'aa');

	//////

	buf = "";

	var c2 = Tracker.autorun(function (c) {
		buf += 'a';
		// invalidate first time
		if (c.firstRun)
			c.invalidate();

		Tracker.onInvalidate(function () {
			buf += "*";
		});
	});

	t.equal(buf, 'a*');
	Tracker.flush();
	t.equal(buf, 'a*a');
	c2.stop();
	t.equal(buf, 'a*a*');
	Tracker.flush();
	t.equal(buf, 'a*a*');

	/////
	// Can flush a diferent run from a run;
	// no current computation in afterFlush

	buf = "";

	var c3 = Tracker.autorun(function (c) {
		buf += 'a';
		// invalidate first time
		if (c.firstRun)
			c.invalidate();
		Tracker.afterFlush(function () {
			buf += (Tracker.active ? "1" : "0");
		});
	});

	Tracker.afterFlush(function () {
		buf += 'c';
	});

	var c4 = Tracker.autorun(function (c) {
		c4 = c;
		buf += 'b';
	});

	Tracker.flush();
	t.equal(buf, 'aba0c0');
	c3.stop();
	c4.stop();
	Tracker.flush();

	// cases where flush throws

	var ran = false;
	Tracker.afterFlush(function (arg) {
		ran = true;
		t.equal(typeof arg, 'undefined');
		t.throws(function () {
			Tracker.flush(); // illegal nested flush
		});
	});

	Tracker.flush();
	t.ok(ran);

	t.throws(function () {
		Tracker.autorun(function () {
			Tracker.flush(); // illegal to flush from a computation
		});
	});

	t.throws(function () {
		Tracker.autorun(function () {
			Tracker.autorun(function () {});
			Tracker.flush();
		});
	});

	t.end();
});

test("tracker - lifecycle", function (t) {

	t.notOk(Tracker.active);
	t.equal(null, Tracker.currentComputation);

	var runCount = 0;
	var firstRun = true;
	var buf = [];
	var cbId = 1;
	var makeCb = function () {
		var id = cbId++;
		return function () {
			buf.push(id);
		};
	};

	var shouldStop = false;

	var c1 = Tracker.autorun(function (c) {
		t.ok(Tracker.active);
		t.equal(c, Tracker.currentComputation);
		t.equal(c.stopped, false);
		t.equal(c.invalidated, false);
			t.equal(c.firstRun, firstRun);

		Tracker.onInvalidate(makeCb()); // 1, 6, ...
		Tracker.afterFlush(makeCb()); // 2, 7, ...

		Tracker.autorun(function (x) {
			x.stop();
			c.onInvalidate(makeCb()); // 3, 8, ...

			Tracker.onInvalidate(makeCb()); // 4, 9, ...
			Tracker.afterFlush(makeCb()); // 5, 10, ...
		});
		runCount++;

		if (shouldStop)
			c.stop();
	});

	firstRun = false;

	t.equal(runCount, 1);

	t.deepEqual(buf, [4]);
	c1.invalidate();
	t.equal(runCount, 1);
	t.equal(c1.invalidated, true);
	t.equal(c1.stopped, false);
	t.deepEqual(buf, [4, 1, 3]);

	Tracker.flush();

	t.equal(runCount, 2);
	t.equal(c1.invalidated, false);
	t.deepEqual(buf, [4, 1, 3, 9, 2, 5, 7, 10]);

	// test self-stop
	buf.length = 0;
	shouldStop = true;
	c1.invalidate();
	t.deepEqual(buf, [6, 8]);
	Tracker.flush();
	t.deepEqual(buf, [6, 8, 14, 11, 13, 12, 15]);

	t.end();
});

test("tracker - onInvalidate", function (t) {
	var buf = "";

	var c1 = Tracker.autorun(function () {
		buf += "*";
	});

	var append = function (x, expectedComputation) {
		return function (givenComputation) {
			t.notOk(Tracker.active);
			t.equal(givenComputation, expectedComputation || c1);
			buf += x;
		};
	};

	c1.onStop(append('s'));

	c1.onInvalidate(append('a'));
	c1.onInvalidate(append('b'));
	t.equal(buf, '*');
	Tracker.autorun(function (me) {
		Tracker.onInvalidate(append('z', me));
		me.stop();
		t.equal(buf, '*z');
		c1.invalidate();
	});
	t.equal(buf, '*zab');
	c1.onInvalidate(append('c'));
	c1.onInvalidate(append('d'));
	t.equal(buf, '*zabcd');
	Tracker.flush();
	t.equal(buf, '*zabcd*');

	// afterFlush ordering
	buf = '';
	c1.onInvalidate(append('a'));
	c1.onInvalidate(append('b'));
	Tracker.afterFlush(function () {
		append('x')(c1);
		c1.onInvalidate(append('c'));
		c1.invalidate();
		Tracker.afterFlush(function () {
			append('y')(c1);
			c1.onInvalidate(append('d'));
			c1.invalidate();
		});
	});
	Tracker.afterFlush(function () {
		append('z')(c1);
		c1.onInvalidate(append('e'));
		c1.invalidate();
	});

	t.equal(buf, '');
	Tracker.flush();
	t.equal(buf, 'xabc*ze*yd*');

	buf = "";
	c1.onInvalidate(append('m'));
	Tracker.flush();
	t.equal(buf, '');
	c1.stop();
	t.equal(buf, 'ms');	// s is from onStop
	Tracker.flush();
	t.equal(buf, 'ms');
	c1.onStop(append('S'));
	t.equal(buf, 'msS');

	t.end();
});

test('tracker - invalidate at flush time', function (t) {
	// Test this sentence of the docs: Functions are guaranteed to be
	// called at a time when there are no invalidated computations that
	// need rerunning.

	var buf = [];

	Tracker.afterFlush(function () {
		buf.push('C');
	});

	// When c1 is invalidated, it invalidates c2, then stops.
	var c1 = Tracker.autorun(function (c) {
		if (! c.firstRun) {
			buf.push('A');
			c2.invalidate();
			c.stop();
		}
	});

	var c2 = Tracker.autorun(function (c) {
		if (! c.firstRun) {
			buf.push('B');
			c.stop();
		}
	});

	// Invalidate c1.	If all goes well, the re-running of
	// c2 should happen before the afterFlush.
	c1.invalidate();
	Tracker.flush();

	t.equal(buf.join(''), 'ABC');

	t.end();
});

test('tracker - throwFirstError', function (t) {
	var d = new Tracker.Dependency;
	Tracker.autorun(function (c) {
		d.depend();

		if (!c.firstRun)
			throw new Error("foo");
	});

	d.changed();
	Tracker.flush();

	d.changed();
	t.throws(function () {
		Tracker.flush({_throwFirstError: true});
	}, /foo/);

	t.end();
});

test('tracker - no infinite recomputation', function (t) {
	var reran = false;
	var c = Tracker.autorun(function (c) {
		if (! c.firstRun)
			reran = true;
		c.invalidate();
	});
	t.notOk(reran);
	setTimeout(function () {
		c.stop();
		Tracker.afterFlush(function () {
			t.ok(reran);
			t.ok(c.stopped);
			t.end();
		});
	}, 100);
});

test('tracker - Tracker.flush finishes', function (t) {
	// Currently, _runFlush will "yield" every 1000 computations... unless run in
	// Tracker.flush. So this test validates that Tracker.flush is capable of
	// running 2000 computations. Which isn't quite the same as infinity, but it's
	// getting there.
	var n = 0;
	var c = Tracker.autorun(function (c) {
		if (++n < 2000) {
			c.invalidate();
		}
	});
	t.equal(n, 1);
	Tracker.flush();
	t.equal(n, 2000);

	t.end();
});

test('tracker - Tracker.autorun, onError option', function (t) {
	t.plan(1);

	var d = new Tracker.Dependency;
	var c = Tracker.autorun(function (c) {
		d.depend();

		if (! c.firstRun)
			throw new Error("foo");
	}, {
		onError: function (err) {
			t.equal(err.message, "foo");
			t.end();
		}
	});

	d.changed();
	Tracker.flush();
});
