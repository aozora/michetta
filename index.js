#!/usr/bin/env node

const chalk = require('chalk');
const semver = require('semver');
const requiredVersion = require('./package.json').engines.node;

if (!semver.satisfies(process.version, requiredVersion)) {
  console.log(chalk.red(
    '\n[michetta] minimum Node version not met:' +
    `\nYou are using Node ${process.version}, but Michetta ` +
    `requires Node ${requiredVersion}.\nPlease upgrade your Node version.\n`,
  ));
  process.exit(1);
}

const path = require('path');
const build = require('./lib/build');

exports.build = build;

// build(path.resolve('.'));
