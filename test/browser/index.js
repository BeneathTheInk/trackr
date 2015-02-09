var BUILD_TASK = "build-test",
	WATCH_TASK = "watch:test";

var http = require("http"),
	fs = require("fs"),
	path = require("path"),
	grunt = require("grunt");

var argv = require('minimist')(process.argv.slice(2));

function resolve(p) {
	return path.resolve(__dirname, "../..", p);
}

var mimes = {
	".js": "application/javascript",
	".css": "text/css",
	".html": "text/html"
};

var server = http.createServer(function(req, res) {
	res.statusCode = 200;

	grunt.log.debug("%s %s", req.method, req.url);

	var fpath = resolve("." + req.url),
		stat, mime;

	fs.stat(fpath, function(err, stat) {
		if (stat && stat.isFile()) {
			mime = mimes[path.extname(fpath)];
		} else {
			mime = mimes[".html"];
			fpath = resolve("test/browser/test.html");
		}

		res.setHeader("Content-Type", mime);
		fs.createReadStream(fpath, "utf-8").pipe(res);
	});
});

var options = { debug: argv.debug };

grunt.tasks([ BUILD_TASK ], options, function(err) {
	if (err) {
		console.error(err.stack || err.toString());
		return process.exit(1);
	}

	server.listen(8000, function() {
		grunt.log.ok("Test server listening on port 8000.");

		grunt.tasks([ WATCH_TASK ], options, function(err) {
			if (err) {
				console.error(err.stack || err.toString());
				return process.exit(1);
			}
		});
	});
});