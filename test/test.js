// Converted from https://raw.githubusercontent.com/meteor/meteor/d07ff8e99cfde21cf113da13d35d387b0ed309a3/packages/tracker/tracker_tests.js

var expect = require("chai").expect;

var Tracker = require("../");

describe("Meteor Tracker tests", function() {
	it('tracker - run', function () {
		var d = new Tracker.Dependency;
		var x = 0;
		var handle = Tracker.autorun(function (handle) {
			d.depend();
			++x;
		});
		expect(x).to.equal(1);
		Tracker.flush();
		expect(x).to.equal(1);
		d.changed();
		expect(x).to.equal(1);
		Tracker.flush();
		expect(x).to.equal(2);
		d.changed();
		expect(x).to.equal(2);
		Tracker.flush();
		expect(x).to.equal(3);
		d.changed();
		// Prevent the function from running further.
		handle.stop();
		Tracker.flush();
		expect(x).to.equal(3);
		d.changed();
		Tracker.flush();
		expect(x).to.equal(3);

		Tracker.autorun(function (internalHandle) {
			d.depend();
			++x;
			if (x == 6)
				internalHandle.stop();
		});
		expect(x).to.equal(4);
		d.changed();
		Tracker.flush();
		expect(x).to.equal(5);
		d.changed();
		// Increment to 6 and stop.
		Tracker.flush();
		expect(x).to.equal(6);
		d.changed();
		Tracker.flush();
		// Still 6!
		expect(x).to.equal(6);

		expect(function () {
			Tracker.autorun();
		}).to.throw(Error);
		expect(function () {
			Tracker.autorun({});
		}).to.throw(Error);
	});

	it("tracker - nested run", function () {
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

		var testEqual = function (str) {
			expect(buf).to.equal(str);
			buf = "";
		};

		testEqual('abcdef');

		b.changed();
		testEqual(''); // didn't flush yet
		Tracker.flush();
		testEqual('bcdef');

		c.changed();
		Tracker.flush();
		testEqual('cdef');

		var changeAndTestEqual = function (v, str) {
			v.changed();
			Tracker.flush();
			testEqual(str);
		};

		// should cause running
		changeAndTestEqual(e, 'ef');
		changeAndTestEqual(f, 'f');
		// invalidate inner context
		changeAndTestEqual(d, '');
		// no more running!
		changeAndTestEqual(e, '');
		changeAndTestEqual(f, '');
		// rerun C
		changeAndTestEqual(c, 'cdef');
		changeAndTestEqual(e, 'ef');
		changeAndTestEqual(f, 'f');
		// rerun B
		changeAndTestEqual(b, 'bcdef');
		changeAndTestEqual(e, 'ef');
		changeAndTestEqual(f, 'f');
		// kill A
		a.changed();
		changeAndTestEqual(f, '');
		changeAndTestEqual(e, '');
		changeAndTestEqual(d, '');
		changeAndTestEqual(c, '');
		changeAndTestEqual(b, '');
		changeAndTestEqual(a, '');

		expect(a.hasDependents()).to.not.be.ok;
		expect(b.hasDependents()).to.not.be.ok;
		expect(c.hasDependents()).to.not.be.ok;
		expect(d.hasDependents()).to.not.be.ok;
		expect(e.hasDependents()).to.not.be.ok;
		expect(f.hasDependents()).to.not.be.ok;
	});

	it("tracker - flush", function () {

		var buf = "";

		var c1 = Tracker.autorun(function (c) {
			buf += 'a';
			// invalidate first time
			if (c.firstRun)
				c.invalidate();
		});

		expect(buf).to.equal('a');
		Tracker.flush();
		expect(buf).to.equal('aa');
		Tracker.flush();
		expect(buf).to.equal('aa');
		c1.stop();
		Tracker.flush();
		expect(buf).to.equal('aa');

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

		expect(buf).to.equal('a*');
		Tracker.flush();
		expect(buf).to.equal('a*a');
		c2.stop();
		expect(buf).to.equal('a*a*');
		Tracker.flush();
		expect(buf).to.equal('a*a*');

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
		expect(buf).to.equal('aba0c0');
		c3.stop();
		c4.stop();
		Tracker.flush();

		// cases where flush throws

		var ran = false;
		Tracker.afterFlush(function (arg) {
			ran = true;
			expect(typeof arg).to.equal('undefined');
			expect(function () {
				Tracker.flush(); // illegal nested flush
			}).to.throw(Error);
		});

		Tracker.flush();
		expect(ran).to.be.ok;

		expect(function () {
			Tracker.autorun(function () {
				Tracker.flush(); // illegal to flush from a computation
			});
		}).to.throw(Error);

		expect(function () {
			Tracker.autorun(function () {
				Tracker.autorun(function () {});
				Tracker.flush();
			});
		}).to.throw(Error);
	});

	it("tracker - lifecycle", function () {

		expect(Tracker.active).to.not.be.ok;
		expect(null).to.equal(Tracker.currentComputation);

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
			expect(Tracker.active).to.be.ok;
			expect(c).to.equal(Tracker.currentComputation);
			expect(c.stopped).to.equal(false);
			expect(c.invalidated).to.equal(false);
				expect(c.firstRun).to.equal(firstRun);

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

		expect(runCount).to.equal(1);

		expect(buf).to.deep.equal([4]);
		c1.invalidate();
		expect(runCount).to.equal(1);
		expect(c1.invalidated).to.equal(true);
		expect(c1.stopped).to.equal(false);
		expect(buf).to.deep.equal([4, 1, 3]);

		Tracker.flush();

		expect(runCount).to.equal(2);
		expect(c1.invalidated).to.equal(false);
		expect(buf).to.deep.equal([4, 1, 3, 9, 2, 5, 7, 10]);

		// test self-stop
		buf.length = 0;
		shouldStop = true;
		c1.invalidate();
		expect(buf).to.deep.equal([6, 8]);
		Tracker.flush();
		expect(buf).to.deep.equal([6, 8, 14, 11, 13, 12, 15]);

	});

	it("tracker - onInvalidate", function () {
		var buf = "";

		var c1 = Tracker.autorun(function () {
			buf += "*";
		});

		var append = function (x) {
			return function () {
				expect(Tracker.active).to.not.be.ok;
				buf += x;
			};
		};

		c1.onInvalidate(append('a'));
		c1.onInvalidate(append('b'));
		expect(buf).to.equal('*');
		Tracker.autorun(function (me) {
			Tracker.onInvalidate(append('z'));
			me.stop();
			expect(buf).to.equal('*z');
			c1.invalidate();
		});
		expect(buf).to.equal('*zab');
		c1.onInvalidate(append('c'));
		c1.onInvalidate(append('d'));
		expect(buf).to.equal('*zabcd');
		Tracker.flush();
		expect(buf).to.equal('*zabcd*');

		// afterFlush ordering
		buf = '';
		c1.onInvalidate(append('a'));
		c1.onInvalidate(append('b'));
		Tracker.afterFlush(function () {
			append('x')();
			c1.onInvalidate(append('c'));
			c1.invalidate();
			Tracker.afterFlush(function () {
				append('y')();
				c1.onInvalidate(append('d'));
				c1.invalidate();
			});
		});
		Tracker.afterFlush(function () {
			append('z')();
			c1.onInvalidate(append('e'));
			c1.invalidate();
		});

		expect(buf).to.equal('');
		Tracker.flush();
		expect(buf).to.equal('xabc*ze*yd*');

		buf = "";
		c1.onInvalidate(append('m'));
		c1.stop();
		expect(buf).to.equal('m');
		Tracker.flush();
	});

	it('tracker - invalidate at flush time', function () {
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

		// Invalidate c1.  If all goes well, the re-running of
		// c2 should happen before the afterFlush.
		c1.invalidate();
		Tracker.flush();

		expect(buf.join('')).to.equal('ABC');

	});

	it('tracker - throwFirstError', function () {
		var d = new Tracker.Dependency;
		Tracker.autorun(function (c) {
			d.depend();

			if (!c.firstRun)
				throw new Error("foo");
		});

		d.changed();
		// doesn't throw; logs instead.
		// Meteor._suppress_log(1);
		Tracker.flush();

		d.changed();
		expect(function () {
			Tracker.flush({_throwFirstError: true});
		}).to.throw(/foo/);
	});
})