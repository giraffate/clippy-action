import * as path from "path";
import * as core from "@actions/core";
import * as tc from "@actions/tool-cache";
import * as http from "@actions/http-client";

export async function installReviewdog(tag: string, directory: string): Promise<string> {
  const owner = "reviewdog";
  const repo = "reviewdog";
  const version = await tagToVersion(tag, owner, repo);

  // get the os information
  let platform = process.platform.toString();
  let ext = "";
  switch (platform) {
    case "darwin":
      platform = "Darwin";
      break;
    case "linux":
      platform = "Linux";
      break;
    case "win32":
      platform = "Windows";
      ext = ".exe";
      break;
    default:
      throw new Error(`unsupported platform: ${platform}`);
  }

  // get the arch information
  let arch: string = process.arch;
  switch (arch) {
    case "x64":
      arch = "x86_64";
      break;
    case "arm64":
      break;
    case "x32":
      arch = "i386";
      break;
    default:
      throw new Error(`unsupported arch: ${arch}`);
  }

  const url = `https://github.com/${owner}/${repo}/releases/download/v${version}/reviewdog_${version}_${platform}_${arch}.tar.gz`;
  core.info(`downloading from ${url}`);
  const archivePath = await tc.downloadTool(url);

  core.info(`extracting`);
  const extractedDir = await tc.extractTar(archivePath, directory);
  return path.join(extractedDir, `reviewdog${ext}`);
}

async function tagToVersion(tag: string, owner: string, repo: string): Promise<string> {
    core.info(`finding a release for ${tag}`);
  
    interface Release {
      tag_name: string;
    }
    const url = `https://github.com/${owner}/${repo}/releases/${tag}`;
    const client = new http.HttpClient("clippy-action/v1");
    const headers = { [http.Headers.Accept]: "application/json" };
    const response = await client.getJson<Release>(url, headers);
  
    if (response.statusCode != http.HttpCodes.OK) {
      core.error(`${url} returns unexpected HTTP status code: ${response.statusCode}`);
    }
    if (!response.result) {
      throw new Error(
        `unable to find '${tag}' - use 'latest' or see https://github.com/${owner}/${repo}/releases for details`
      );
    }
    let realTag = response.result.tag_name;
  
    // if version starts with 'v', remove it
    realTag = realTag.replace(/^v/, "");
  
    return realTag;
  }