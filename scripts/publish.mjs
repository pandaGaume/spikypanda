#!/usr/bin/env node
import { execSync } from "child_process";
import { createInterface } from "readline";

const PKG_DIR = "packages/dev/core";

function ask(question) {
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    return new Promise((resolve) => {
        rl.question(question, (answer) => {
            rl.close();
            resolve(answer.trim());
        });
    });
}

function run(cmd, opts = {}) {
    return execSync(cmd, { stdio: "inherit", cwd: PKG_DIR, ...opts });
}

async function main() {
    // Show current version
    const pkg = JSON.parse(execSync(`cat ${PKG_DIR}/package.json`).toString());
    console.log(`\nPackage: ${pkg.name}@${pkg.version}\n`);

    // Ask version bump
    const bump = await ask("Version bump (patch / minor / major): ");
    if (!["patch", "minor", "major"].includes(bump)) {
        console.error("Invalid bump type. Use: patch, minor, or major.");
        process.exit(1);
    }

    // Ask npm token
    const token = await ask("npm token: ");
    if (!token) {
        console.error("Token required.");
        process.exit(1);
    }

    // Bump version
    console.log(`\nBumping ${bump}...`);
    run(`npm version ${bump} --no-git-tag-version`);

    const updated = JSON.parse(execSync(`cat ${PKG_DIR}/package.json`).toString());
    console.log(`New version: ${updated.version}`);

    // Set token, build & publish
    console.log("\nPublishing...");
    run(`npm config set //registry.npmjs.org/:_authToken=${token}`, { cwd: "." });

    try {
        run("npm publish --access public");
        console.log(`\n${updated.name}@${updated.version} published.`);
    } finally {
        // Clean up token
        execSync("npm config delete //registry.npmjs.org/:_authToken");
        console.log("Token cleaned up.");
    }
}

main().catch((err) => {
    console.error(err.message);
    process.exit(1);
});
