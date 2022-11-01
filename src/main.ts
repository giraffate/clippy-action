import { promises as fs } from "fs";
import * as os from "os";
import * as path from "path";

import * as core from '@actions/core'
import * as exec from '@actions/exec';

import * as installer from "./installer"

async function run(): Promise<void> {
  const runnerTmpdir = process.env["RUNNER_TEMP"] || os.tmpdir();
  const tmpdir = await fs.mkdtemp(path.join(runnerTmpdir, "reviewdog-"));

  try {
    const reviewdogVersion = core.getInput("reviewdog_version") || "latest";
    const toolName = core.getInput("tool_name") || "clippy";
    const level = core.getInput("level") || "error";
    const reporter = core.getInput("reporter") || "github-pr-check";
    const filterMode = core.getInput("filter_mode") || "added";
    const failOnError = core.getInput("fail_on_error") || "false";
    const reviewdogFlags = core.getInput("reviewdog_flags");
    const workdir = core.getInput("workdir") || ".";
    const cwd = path.relative(process.env["GITHUB_WORKSPACE"] || process.cwd(), workdir);

    const reviewdog = await core.group(
      "🐶 Installing reviewdog ... https://github.com/reviewdog/reviewdog",
      async () => {
        return await installer.installReviewdog(reviewdogVersion, tmpdir);
      }
    );

    const code = await core.group("Running Clippy with reviewdog 🐶 ...", async (): Promise<number> => {
      const output = await exec.getExecOutput(
        "cargo",
        ["clippy", "--color", "never", "-q", "--message-format", "short"],
        {
          cwd,
          ignoreReturnCode: true,
        }
      );

      process.env["REVIEWDOG_GITHUB_API_TOKEN"] = core.getInput("github_token");
      return await exec.exec(
        reviewdog,
        [
          "-f=clippy",
          `-name=${toolName}`,
          `-reporter=${reporter}`,
          `-filter-mode=${filterMode}`,
          `-fail-on-error=${failOnError}`,
          `-level=${level}`,
          ...parse(reviewdogFlags),
        ],
        {
          cwd,
          input: Buffer.from(output.stderr, "utf-8"),
          ignoreReturnCode: true,
        }
      );
    });

    if (code != 0) {
      core.setFailed(`reviewdog exited with status code: ${code}`);
    }
  } catch (error) {
    if (error instanceof Error) core.setFailed(error.message)
  }
}

function parse(flags: string): string[] {
  flags = flags.trim();
  if (flags === "") {
    return [];
  }

  // TODO: need to simulate bash?
  return flags.split(/\s+/);
}

run()
