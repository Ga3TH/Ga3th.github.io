#!/usr/bin/env node

const fs = require("node:fs/promises");
const path = require("node:path");

const user = "Ga3TH";
const root = path.resolve(__dirname, "..");
const outputPath = path.join(root, "github-activity.json");
const api = "https://api.github.com";
const windowDays = 14;
const pageSize = 100;
const maxCommitPages = 5;

async function fetchJson(url, allowEmptyRepository = false) {
  const headers = {
    Accept: "application/vnd.github+json",
    "User-Agent": "Ga3TH-Portfolio-Activity/1.0",
  };
  if (process.env.GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  }

  const response = await fetch(url, { headers });
  if (allowEmptyRepository && response.status === 409) {
    return [];
  }
  if (!response.ok) {
    throw new Error(`GitHub API ${response.status} for ${new URL(url).pathname}`);
  }

  const data = await response.json();
  if (!Array.isArray(data)) {
    throw new Error(`Unexpected GitHub API response for ${new URL(url).pathname}`);
  }
  return data;
}

async function fetchRepositories() {
  const repositories = [];
  for (let page = 1; ; page += 1) {
    const url = new URL(`${api}/users/${user}/repos`);
    url.searchParams.set("type", "owner");
    url.searchParams.set("sort", "pushed");
    url.searchParams.set("per_page", String(pageSize));
    url.searchParams.set("page", String(page));

    const results = await fetchJson(url);
    repositories.push(...results);
    if (results.length < pageSize) {
      return repositories;
    }
  }
}

async function fetchRepositoryActivity(repository, since, until) {
  const commits = [];
  let limited = false;

  for (let page = 1; page <= maxCommitPages; page += 1) {
    const url = new URL(`${api}/repos/${repository.full_name}/commits`);
    url.searchParams.set("author", user);
    url.searchParams.set("sha", repository.default_branch);
    url.searchParams.set("since", since);
    url.searchParams.set("until", until);
    url.searchParams.set("per_page", String(pageSize));
    url.searchParams.set("page", String(page));

    const results = await fetchJson(url, true);
    commits.push(...results);
    if (results.length < pageSize) {
      break;
    }
    if (page === maxCommitPages) {
      limited = true;
    }
  }

  const latest = commits[0];
  return {
    name: repository.full_name,
    url: repository.html_url,
    description: repository.description ?? "",
    commits: commits.length,
    latest_commit_at: latest?.commit?.author?.date ?? latest?.commit?.committer?.date ?? "",
    latest_commit_url: latest?.html_url ?? "",
    limited,
  };
}

async function mapWithConcurrency(items, concurrency, callback) {
  const results = new Array(items.length);
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < items.length) {
      const index = nextIndex;
      nextIndex += 1;
      results[index] = await callback(items[index]);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, () => worker()),
  );
  return results;
}

async function main() {
  const now = new Date();
  const since = new Date(now.getTime() - windowDays * 24 * 60 * 60 * 1000);
  const repositories = await fetchRepositories();
  const activeRepositories = repositories.filter((repository) => {
    const pushedAt = Date.parse(repository.pushed_at ?? "");
    return !repository.private
      && Number.isFinite(pushedAt)
      && pushedAt >= since.getTime();
  });
  const projects = await mapWithConcurrency(activeRepositories, 4, (repository) =>
    fetchRepositoryActivity(repository, since.toISOString(), now.toISOString()));

  const activeProjects = projects
    .filter((project) => project.commits > 0)
    .sort((first, second) =>
      second.commits - first.commits
      || Date.parse(second.latest_commit_at) - Date.parse(first.latest_commit_at)
      || first.name.localeCompare(second.name));
  const data = {
    window_days: windowDays,
    total_commits: activeProjects.reduce((total, project) => total + project.commits, 0),
    limited: activeProjects.some((project) => project.limited),
    projects: activeProjects,
  };

  await fs.writeFile(outputPath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
  console.log(
    `Wrote ${data.total_commits} commits across ${activeProjects.length} public repositories.`,
  );
}

main().catch((error) => {
  console.error("Could not update the GitHub activity snapshot.", error);
  process.exitCode = 1;
});
