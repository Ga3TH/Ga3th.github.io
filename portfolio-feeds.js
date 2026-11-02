const githubFeedList = document.querySelector("#github-feed-list");
const githubFeedStatus = document.querySelector("#github-feed-status");
const aiFeedList = document.querySelector("#ai-feed-list");
const aiFeedStatus = document.querySelector("#ai-feed-status");

const frenchDate = new Intl.DateTimeFormat("fr-FR", {
  dateStyle: "medium",
});

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

function renderGitHubEvents(events) {
  const pushes = events
    .filter((event) => event?.type === "PushEvent" && typeof event.repo?.name === "string")
    .slice(0, 8);

  if (pushes.length === 0) {
    githubFeedStatus.textContent = "Aucun push public récent détecté.";
    return;
  }

  const fragment = document.createDocumentFragment();
  for (const event of pushes) {
    const item = document.createElement("li");
    item.className = "feed-item";
    item.append(createLink(`https://github.com/${event.repo.name}`, event.repo.name));

    const meta = document.createElement("div");
    meta.className = "feed-meta";
    const commits = event.payload?.commits ?? [];
    const count = event.payload?.size ?? commits.length;
    const pushLabel = document.createElement("span");
    pushLabel.textContent = count > 0
      ? `${count} ${count > 1 ? "commits" : "commit"}`
      : "Push effectué";
    meta.append(pushLabel);

    const date = formatDate(event.created_at);
    if (date) {
      const dateLabel = document.createElement("span");
      dateLabel.textContent = date;
      meta.append(dateLabel);
    }
    item.append(meta);

    const latestSha = event.payload?.head;
    if (typeof latestSha === "string" && latestSha.length > 0) {
      const message = document.createElement("p");
      message.className = "feed-message";
      const commitUrl = `https://github.com/${event.repo.name}/commit/${encodeURIComponent(latestSha)}`;
      message.append(createLink(commitUrl, `Dernier commit · ${latestSha.slice(0, 7)}`));
      item.append(message);
    } else {
      for (const commit of commits.slice(0, 2)) {
        const message = document.createElement("p");
        message.className = "feed-message";
        const sha = commit.sha ?? "";
        const commitUrl = `https://github.com/${event.repo.name}/commit/${encodeURIComponent(sha)}`;
        message.append(createLink(commitUrl, commit.message?.split("\n")[0] || "Commit"));
        item.append(message);
      }
    }

    fragment.append(item);
  }

  githubFeedList.replaceChildren(fragment);
  githubFeedStatus.textContent = `${pushes.length} push(s) public(s) récent(s)`;
}

async function loadGitHubFeed() {
  try {
    const response = await fetch("https://api.github.com/users/Ga3TH/events/public?per_page=100", {
      headers: { Accept: "application/vnd.github+json" },
    });
    if (!response.ok) {
      throw new Error(`GitHub a répondu avec le statut ${response.status}`);
    }

    const events = await response.json();
    if (!Array.isArray(events)) {
      throw new Error("La réponse de GitHub n’est pas une liste d’événements");
    }
    renderGitHubEvents(events);
  } catch (error) {
    console.error("Impossible de charger l’activité GitHub.", error);
    githubFeedStatus.textContent = "Activité indisponible pour le moment. Consulte mon profil GitHub.";
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
