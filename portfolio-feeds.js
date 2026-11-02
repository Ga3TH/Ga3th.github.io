const githubFeedList = document.querySelector("#github-feed-list");
const githubFeedStatus = document.querySelector("#github-feed-status");
const aiFeedList = document.querySelector("#ai-feed-list");
const aiFeedStatus = document.querySelector("#ai-feed-status");
const githubFeedNote = document.querySelector("#github-feed-note");

const frenchDate = new Intl.DateTimeFormat("fr-FR", {
  dateStyle: "medium",
});
const GITHUB_EVENTS_URL = "https://api.github.com/users/Ga3TH/events/public";
const EVENTS_PER_PAGE = 100;
const MAX_EVENT_PAGES = 3;
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

function renderGitHubActivity(events, limited) {
  const cutoff = Date.now() - ACTIVITY_WINDOW_DAYS * 24 * 60 * 60 * 1000;
  const projects = new Map();
  let totalPushes = 0;

  for (const event of events) {
    if (event?.type !== "PushEvent" || typeof event.repo?.name !== "string") {
      continue;
    }

    const timestamp = Date.parse(event.created_at);
    if (!Number.isFinite(timestamp) || timestamp < cutoff) {
      continue;
    }

    totalPushes += 1;
    const project = projects.get(event.repo.name) ?? {
      name: event.repo.name,
      pushes: 0,
      latestPush: timestamp,
      latestCommit: event.payload?.head,
    };
    project.pushes += 1;
    if (timestamp > project.latestPush) {
      project.latestPush = timestamp;
      project.latestCommit = event.payload?.head;
    }
    projects.set(event.repo.name, project);
  }

  const rankedProjects = [...projects.values()]
    .sort((first, second) =>
      second.pushes - first.pushes
      || second.latestPush - first.latestPush
      || first.name.localeCompare(second.name))
    .slice(0, 3);
  const fragment = document.createDocumentFragment();
  for (const project of rankedProjects) {
    const item = document.createElement("li");
    item.className = "feed-item";
    item.append(createLink(`https://github.com/${project.name}`, project.name));

    const meta = document.createElement("div");
    meta.className = "feed-meta";
    const projectPushes = document.createElement("span");
    projectPushes.textContent = `${project.pushes} ${project.pushes > 1 ? "pushs" : "push"}`;
    meta.append(projectPushes);

    const date = formatDate(project.latestPush);
    if (date) {
      const dateLabel = document.createElement("span");
      dateLabel.textContent = `Dernier : ${date}`;
      meta.append(dateLabel);
    }
    item.append(meta);

    if (typeof project.latestCommit === "string" && project.latestCommit.length > 0) {
      const message = document.createElement("p");
      message.className = "feed-message";
      const commitUrl = `https://github.com/${project.name}/commit/${encodeURIComponent(project.latestCommit)}`;
      message.append(createLink(commitUrl, `Dernier commit · ${project.latestCommit.slice(0, 7)}`));
      item.append(message);
    }
    fragment.append(item);
  }

  githubFeedList.replaceChildren(fragment);
  githubFeedStatus.textContent = `${totalPushes} push${totalPushes > 1 ? "s" : ""} récent${totalPushes > 1 ? "s" : ""} sur les 14 derniers jours`;
  githubFeedNote.textContent = limited
    ? "Limite des 300 événements publics atteinte : le total des 14 derniers jours peut être incomplet."
    : "Dépôts publics uniquement. GitHub conserve environ 90 jours d’activité.";
}

async function loadGitHubFeed() {
  try {
    const cutoff = Date.now() - ACTIVITY_WINDOW_DAYS * 24 * 60 * 60 * 1000;
    const events = [];
    let limited = false;

    for (let page = 1; page <= MAX_EVENT_PAGES; page += 1) {
      const url = new URL(GITHUB_EVENTS_URL);
      url.searchParams.set("per_page", String(EVENTS_PER_PAGE));
      url.searchParams.set("page", String(page));

      const response = await fetch(url, {
        headers: { Accept: "application/vnd.github+json" },
      });
      if (!response.ok) {
        throw new Error(`GitHub a répondu avec le statut ${response.status}`);
      }

      const pageEvents = await response.json();
      if (!Array.isArray(pageEvents)) {
        throw new Error("La réponse de GitHub n’est pas une liste d’événements");
      }
      if (pageEvents.length === 0) {
        break;
      }

      events.push(...pageEvents);
      const oldestTimestamp = Date.parse(pageEvents.at(-1)?.created_at);
      if (!Number.isFinite(oldestTimestamp) || oldestTimestamp < cutoff) {
        break;
      }
      if (pageEvents.length < EVENTS_PER_PAGE) {
        break;
      }
      if (page === MAX_EVENT_PAGES) {
        limited = true;
      }
    }

    renderGitHubActivity(events, limited);
  } catch (error) {
    console.error("Impossible de charger l’activité GitHub.", error);
    githubFeedStatus.textContent = "Activité indisponible pour le moment. Consulte mon profil GitHub.";
    githubFeedNote.textContent = "Vérifie ta connexion, puis réessaie plus tard.";
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

loadGitHubFeed();
loadAiFeed();
