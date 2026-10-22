import postTemplate from "./templates/post.hbs";
import commentsTemplate from "./templates/coomment.hbs";

const URL = "https://6aaed43f606bd915d111128b.mockapi.io/api";

const state = {
  posts: [],
  comments: [],
};

const refs = {
  postList: document.body.querySelector("#postsList"),
  loadingMessage: document.body.querySelector("#loadingMessage"),
  errorMessage: document.body.querySelector("#errorMessage"),
  retryButton: document.body.querySelector("#retryButton"),
  emptyState: document.body.querySelector("#emptyState"),
  postListEl: document.body.querySelector(".posts-list"),
};

async function fetchJson(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error("HTTP error");
  }
  return response.json();
}

function renderPosts(data) {
  refs.postListEl.innerHTML = "";
  if (data.length === 0) {
    refs.emptyState.hidden = false;
    return;
  }
  refs.emptyState.hidden = true;

  data.forEach((x) => {
    let html = postTemplate(x);
    refs.postListEl.insertAdjacentHTML("beforeend", html);
    let card = refs.postListEl.lastElementChild;

    const commentsCount = state.comments.filter((comment) => {
      return Number(comment.postId) === Number(x.id);
    }).length;

    const countEl = card.querySelector("[data-comment-count]");
    if (countEl) {
      countEl.textContent = commentsCount;
    }
  });
}

async function loadApp() {
  refs.loadingMessage.hidden = false;
  refs.errorMessage.hidden = true;
  refs.emptyState.hidden = true;
  try {
    const [postResponse, commentsResponse] = await Promise.all([
      fetchJson(`${URL}/posts`),
      fetchJson(`${URL}/comments`),
    ]);
    state.posts = postResponse;
    state.comments = commentsResponse;
    renderPosts(postResponse);
  } catch (error) {
    refs.postList.innerHTML = "";
    console.log(error);
    refs.errorMessage.hidden = false;
  } finally {
    refs.loadingMessage.hidden = true;
  }
}

refs.retryButton.addEventListener("click", loadApp);

refs.postList.addEventListener("click", (e) => {
  const toggleBtn = e.target.closest("[data-action='toggle-comments']");
  if (!toggleBtn) return;

  const postCard = toggleBtn.closest(".post-card");
  const commentsPanel = postCard.querySelector("[data-comments-panel]");
  const postId = postCard.dataset.postId;
  const isExpanded = toggleBtn.getAttribute("aria-expanded") === "true";

  commentsPanel.hidden = isExpanded;
  toggleBtn.setAttribute("aria-expanded", String(!isExpanded));

  if (!isExpanded) {
    renderComments(postId, postCard);
  }
});

refs.postList.addEventListener("submit", async (e) => {
  e.preventDefault();
  const commentForm = e.target.closest("[data-comment-form]");
  if (!commentForm) return;

  const postId = commentForm.dataset.postId;
  const formData = new FormData(commentForm);
  const name = formData.get("name").trim();
  const body = formData.get("body").trim();

  if (!name || !body) return;

  const newComment = {
    postId: Number(postId),
    name,
    body,
    initial: name.charAt(0).toUpperCase(),
    date: "Щойно",
  };

  try {
    const response = await fetch(`${URL}/comments`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(newComment),
    });

    if (!response.ok) throw new Error("Не вдалося додати коментар");

    const createdComment = await response.json();
    state.comments.push(createdComment);

    const postCard = commentForm.closest(".post-card");
    renderComments(postId, postCard);

    const commentsCount = state.comments.filter(
      (c) => Number(c.postId) === Number(postId),
    ).length;

    const countEl = postCard.querySelector("[data-comment-count]");
    if (countEl) countEl.textContent = commentsCount;

    commentForm.reset();
  } catch (error) {
    console.error("Помилка при додаванні коментаря:", error);
  }
});

function renderComments(id, card) {
  const commentsList = card.querySelector("[data-comments-list]");
  const postComments = state.comments.filter((comment) => {
    return Number(comment.postId) === Number(id);
  });

  commentsList.innerHTML = "";

  postComments.forEach((comment) => {
    const markup = commentsTemplate(comment);
    commentsList.insertAdjacentHTML("beforeend", markup);
  });
}

loadApp();
