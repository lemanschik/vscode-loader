var path;
var fs;
var control;
var loader;

var ROOT_DIR;

// Discover tests
var entries = [];
var okCnt = 0, totalCnt = entries.length;
(async () => {
	path = await import('path');
	fs = await import('fs');
	control = await import('./node-specific/_control.js').then((_) => _.default);
	loader = await import('./node-specific/_loader.js').then(async (_) => await _.default);

	ROOT_DIR = path.join(__dirname, 'node-specific');

	// Discover tests
	entries = entries.concat(fs.readdirSync(ROOT_DIR));
	console.log('Entries', { entries })
	entries = entries.filter(function (entry) {
		var fullPath = path.join(ROOT_DIR, entry);
		return fs.statSync(fullPath).isDirectory();
	});
	const runTest = async (err) => {
		if (currentTest) {
			if (err) {
				console.log(colors.red('[ERROR   ] ' + currentTest + ': \n'), err);
			} else {
				okCnt++;
				console.log(colors.green('[PASSED  ] ' + currentTest + '.'));
			}
		}

		if (entries.length > 0) {
			currentTest = entries.shift();
			var testModulePath = path.join(ROOT_DIR, currentTest, '_test');
			loader.reset();
			try {
				require(testModulePath);
			} catch (err) {
				runTest(err);
				return;
			}
		} else {
			var str = '[FINISHED] ' + okCnt + '/' + totalCnt + ' passed.';
			if (okCnt !== totalCnt) {
				str = colors.red(str);
			} else {
				str = colors.green(str);
			}
			console.log(str);
		}
	}

	Promise.resolve().then(async () => (await import('./node-specific/_control.js')).default.setContinuation(runTest)).then(() => runTest(null));
})();



var currentTest = null;
var _colors = {
	black: "30",
	red: "31",
	green: "32",
	yellow: "33",
	blue: "34",
	magenta: "35",
	cyan: "36",
	white: "37",
};


var colors = {};



Object.keys(_colors).forEach((colorName) => {
	colors[colorName] = (str) => '\x1b[' + _colors[colorName] + 'm' + str + '\x1b[0m';
});





