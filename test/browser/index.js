var _ = require("underscore"),
	http = require("http"),
	fs = require("fs"),
	path = require("path"),
	grunt = require("grunt");

var pkg = require("../../package.json");
var argv = require('minimist')(process.argv.slice(2), {
	string: [ "port" ]
});

_.defaults(argv, require("./config.json"), {
	port: "8000",
	"build-task": "test"
});

var tpl = _.template(fs.readFileSync(resolve("test/browser/test.html"), "utf-8"), { variable: "$" });

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
			res.setHeader("Content-Type", mime);
			fs.createReadStream(fpath, "utf-8").pipe(res);
			return;
		}

		if (argv["bundle-path"]) {
			var html = tpl(_.extend({}, pkg, argv, { bundle: argv["bundle-path"] }));
			res.setHeader("Content-Type", "html");
			res.setHeader("Content-Length", html.length);
			res.end(html, "utf-8");
			return;
		}

		res.statusCode = 404;
		res.end();
	});
});

var gruntOptions = { debug: argv.debug };

grunt.tasks([ argv["build-task"] ], gruntOptions, function(err) {
	if (err) {
		console.error(err.stack || err.toString());
		return process.exit(1);
	}

	server.listen(argv.port, function() {
		grunt.log.ok("Test server listening on port " + argv.port + ".");

		if (argv["watch-task"]) grunt.tasks([ argv["watch-task"] ], gruntOptions, function(err) {
			if (err) {
				console.error(err.stack || err.toString());
				return process.exit(1);
			}
		});
	});
});