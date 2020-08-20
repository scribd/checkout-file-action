const core = require('@actions/core');
const request = require('sync-request');
const fse = require('fs-extra');

// extract inputs
const filePaths = core.getInput('file-path');
const requestOptions = { headers: {'Authorization': "token " + core.getInput('github-token'), 'Accept': 'application/vnd.github.v3+json', 'User-Agent': 'checkout-file-action'} };
const repo = core.getInput('repo');
const branch = core.getInput('branch') ? ('refs/heads/' + core.getInput('branch')) : (repo == process.env.GITHUB_REPOSITORY ? process.env.GITHUB_REF : null)

// retrieve each file
filePaths.split("\n").forEach(path => retrieveFile(path))

function retrieveFile(filePath) {
	try {
		// setup request
		const url = 'https://api.github.com/repos/' + repo + '/contents/' + filePath + (branch ? '?ref=' + branch : '');

		// execute the request
		const response = request('GET', url, requestOptions);
		if (response.statusCode != 200) {
			handleNon200(response, filePath);
			return;
		}

		// parse the JSON and extract the base64 encoded file contents
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
		fse.outputFileSync(filePath, content);
		core.info('Successfully retrieved ' + filePath);
	} catch (error) {
		core.setFailed(error.message);
	}
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
