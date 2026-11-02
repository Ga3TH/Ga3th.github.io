const githubFeedList = document.querySelector("#github-feed-list");
const githubFeedStatus = document.querySelector("#github-feed-status");
const githubCommitTotal = document.querySelector("#github-commit-total");
const aiFeedList = document.querySelector("#ai-feed-list");
const aiFeedStatus = document.querySelector("#ai-feed-status");
const githubFeedNote = document.querySelector("#github-feed-note");
const aiActivity = document.querySelector(".ai-activity");
const aiActivityButton = aiActivity.querySelector(".hamburger-label");

const frenchDate = new Intl.DateTimeFormat("fr-FR", {
  dateStyle: "medium",
});
const ACTIVITY_WINDOW_DAYS = 14;

function formatDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : frenchDate.format(date);
}

function createLink(url, text) {
  if (typeof url !== "string" || !url.startsWith("https://")) {
    throw new Error("Un lien de flux utilise une URL non sécurisée");
  }

  const link = document.createElement("a");
  link.href = url;
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  link.textContent = text;
  return link;
}

function renderGitHubActivity(data) {
  if (
    !data
    || !Array.isArray(data.projects)
    || !Number.isInteger(data.total_commits)
    || data.total_commits < 0
    || data.window_days !== ACTIVITY_WINDOW_DAYS
    || typeof data.limited !== "boolean"
  ) {
    throw new Error("Le résumé d’activité GitHub a un format invalide");
  }

  const rankedProjects = data.projects
    .filter((project) =>
      typeof project?.name === "string"
      && typeof project?.url === "string"
      && Number.isInteger(project.commits)
      && project.commits > 0)
    .sort((first, second) =>
      second.commits - first.commits
      || Date.parse(second.latest_commit_at) - Date.parse(first.latest_commit_at)
      || first.name.localeCompare(second.name))
    .slice(0, 3);
  const fragment = document.createDocumentFragment();
  const highestCount = rankedProjects[0]?.commits ?? 1;

  rankedProjects.forEach((project, index) => {
    const item = document.createElement("li");
    item.className = "github-project";

    const heading = document.createElement("div");
    heading.className = "github-project-heading";
    const rank = document.createElement("span");
    rank.className = "github-project-rank";
    rank.textContent = String(index + 1).padStart(2, "0");
    heading.append(rank);
    heading.append(createLink(project.url, project.name));

    const count = document.createElement("strong");
    count.className = "github-project-count";
    count.textContent = `${project.commits} ${project.commits === 1 ? "commit" : "commits"}`;
    heading.append(count);
    item.append(heading);

    if (typeof project.description === "string" && project.description) {
      const description = document.createElement("p");
      description.className = "github-project-description";
      description.textContent = project.description;
      item.append(description);
    }

    const progress = document.createElement("span");
    progress.className = "github-project-progress";
    progress.setAttribute("aria-hidden", "true");
    const progressFill = document.createElement("span");
    progressFill.style.width = `${Math.max(8, Math.round(project.commits / highestCount * 100))}%`;
    progress.append(progressFill);
    item.append(progress);

    const latestCommitTimestamp = Date.parse(project.latest_commit_at);
    if (Number.isFinite(latestCommitTimestamp)) {
      const latestCommit = document.createElement("div");
      latestCommit.className = "github-project-latest";
      latestCommit.textContent = `Dernier commit · ${formatDate(latestCommitTimestamp)}`;
      item.append(latestCommit);
    }

    if (typeof project.latest_commit_url === "string" && project.latest_commit_url) {
      item.append(createLink(project.latest_commit_url, "Voir le dernier commit ↗"));
    }

    fragment.append(item);
  });

  if (rankedProjects.length === 0) {
    const emptyState = document.createElement("li");
    emptyState.className = "github-empty";
    emptyState.textContent = "Aucun dépôt public actif sur cette période.";
    fragment.append(emptyState);
  }

  githubFeedList.replaceChildren(fragment);
  githubCommitTotal.textContent = String(data.total_commits);
  githubFeedStatus.textContent = data.total_commits === 0
    ? `commits sur les ${ACTIVITY_WINDOW_DAYS} derniers jours`
    : `${data.total_commits === 1 ? "commit" : "commits"} sur les ${ACTIVITY_WINDOW_DAYS} derniers jours`;
  githubFeedNote.textContent = data.limited
    ? "Comptage incomplet : la limite de pagination GitHub a été atteinte."
    : "Dépôts publics · commits de Ga3TH sur la branche principale, pas le nombre exact de pushs.";
}

async function loadGitHubFeed() {
  try {
    const response = await fetch("github-activity.json", { cache: "no-cache" });
    if (response.status === 404) {
      githubCommitTotal.textContent = "—";
      githubFeedStatus.textContent = "Résumé GitHub en cours de génération.";
      githubFeedNote.textContent = "GitHub Actions prépare le premier relevé. Réessaie dans quelques minutes.";
      return;
    }
    if (!response.ok) {
      throw new Error(`Le résumé GitHub a répondu avec le statut ${response.status}`);
    }
    renderGitHubActivity(await response.json());
  } catch (error) {
    console.error("Impossible de charger l’activité GitHub.", error);
    githubCommitTotal.textContent = "—";
    githubFeedStatus.textContent = "Activité GitHub indisponible pour le moment.";
    githubFeedNote.textContent = "Le résumé des dépôts n’a pas pu être chargé. Réessaie plus tard.";
  }
}

function renderAiFeed(items, updatedAt) {
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error("Le flux de veille IA ne contient aucun article");
  }

  const fragment = document.createDocumentFragment();
  for (const entry of items.slice(0, 16)) {
    const item = document.createElement("li");
    item.className = "feed-item";
    item.append(createLink(entry.url, entry.title));

    const meta = document.createElement("div");
    meta.className = "feed-meta";
    const source = document.createElement("span");
    source.className = "feed-source";
    source.textContent = entry.source;
    meta.append(source);

    const date = formatDate(entry.published_at);
    if (date) {
      const dateLabel = document.createElement("span");
      dateLabel.textContent = date;
      meta.append(dateLabel);
    }
    item.append(meta);
    fragment.append(item);
  }

  aiFeedList.replaceChildren(fragment);
  const date = formatDate(updatedAt);
  aiFeedStatus.textContent = date ? `Flux mis à jour le ${date}` : "Actualités IA";
}

async function loadAiFeed() {
  try {
    const response = await fetch("feeds.json", { cache: "no-cache" });
    if (!response.ok) {
      throw new Error(`Le flux IA a répondu avec le statut ${response.status}`);
    }

    const data = await response.json();
    renderAiFeed(data.items, data.updated_at);
  } catch (error) {
    console.error("Impossible de charger le flux de veille IA.", error);
    aiFeedStatus.textContent = "Veille indisponible pour le moment. Réessaie plus tard.";
  }
}

aiActivity.addEventListener("toggle", () => {
  aiActivityButton.setAttribute("aria-expanded", String(aiActivity.open));
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && aiActivity.open) {
    aiActivity.open = false;
    aiActivityButton.focus();
  }
});

loadGitHubFeed();
loadAiFeed();
