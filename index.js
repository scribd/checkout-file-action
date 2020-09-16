const core = require('@actions/core');
const request = require('sync-request');
const fse = require('fs-extra');

// extract inputs
const filePaths = core.getInput('file-path').split("\n");
const requestOptions = { headers: {'Authorization': "token " + core.getInput('github-token'), 'Accept': 'application/vnd.github.v3+json', 'User-Agent': 'checkout-file-action'} };
const repo = core.getInput('repo');
const branch = core.getInput('branch') ? ('refs/heads/' + core.getInput('branch')) : (repo == process.env.GITHUB_REPOSITORY ? process.env.GITHUB_REF : null)

// retrieve each file
retrieveFileInfos(filePaths).forEach(info => retrieveFile(info))

function retrieveFile(info) {
	try {
		const url = 'https://api.github.com/repos/' + repo + '/git/blobs/' + info.sha;
		const response = request('GET', url, requestOptions);
		if (response.statusCode != 200) {
			handleNon200(response, info.path);
			return;
		}

		const body = response.body.toString();
		const json = JSON.parse(body);
		const encodedContent = json.content;
		if (!encodedContent) {
			core.setFailed("JSON is missing expected key 'content'. Unable to continue.\n\n" + JSON.stringify(json));
			return;
		}

		// remove any newlines from the string and then decode the base64 contents
		const buffer = new Buffer.from(encodedContent.replace('\n', ''), 'base64');
		content = buffer.toString('ascii');

		// save the file to disk
		fse.outputFileSync(info.path, content);
		core.info('Successfully retrieved ' + info.path);
	} catch (error) {
		core.setFailed("Failed in retrieveFile(info). Error: " + error.message);
	}
}

function retrieveFileInfos(matching) {
	try {
		const url = 'https://api.github.com/repos/' + repo + '/git/trees/' + ((branch ? branch : 'master') + '?recursive=true');
		const response = request('GET', url, requestOptions);
		if (response.statusCode != 200) {
			handleNon200(response, filePath);
			return;
		}

		const body = response.body.toString();
		const json = JSON.parse(body);
		return json.tree.filter(info => info.type == "blob" && pathsContain(matching, info.path))
	} catch (error) {
		core.setFailed("Failed in retrieveAllFiles(matching). Error: " + error.message);
	}
}

function pathsContain(paths, subpath) {
	return paths.find(rootPath => rootPath == "./" || rootPath == subpath || subpath.startsWith(rootPath + '/')) != null
}

function handleNon200(response, filePath) {
	try {
		const body = response.body.toString();
		const json = JSON.parse(body);

		if (json.message == 'Not Found') {
			if (checkForAccessToRepo()) {
				core.setFailed('The file "' + filePath + '" does not exist. Exiting.');
			} else {
				core.setFailed('Unable to access ' + repo + ". Either the repository doesn't exist or the provided GitHub token doesn't have access. Exiting.");
			}
		} else if (json.message == 'Bad credentials') {
			core.setFailed("The provided GitHub token doesn't have access. Exiting.")
		} else {
			core.setFailed('Invalid response code: ' + response.statusCode + '\n\n' + body);
		}
	} catch (error) {
		core.setFailed('Invalid response code: ' + response.statusCode + '\n\n' + body);
	}
}

function checkForAccessToRepo() {
	try {
		const url = 'https://api.github.com/repos/' + repo;
		const response = request('GET', url, requestOptions);
		return response.statusCode == 200;
	} catch (error) {
		core.setFailed(error.message);
	}
}
