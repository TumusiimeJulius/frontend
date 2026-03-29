const AUTH_SESSION_KEY = "kanban_auth_session_v1";
const USERS_KEY = "kanban_users_v1";

const form = document.getElementById("authForm");
const signInModeBtn = document.getElementById("signInModeBtn");
const createModeBtn = document.getElementById("createModeBtn");
const emailInput = document.getElementById("emailInput");
const passwordInput = document.getElementById("passwordInput");
const confirmPasswordWrap = document.getElementById("confirmPasswordWrap");
const confirmPasswordInput = document.getElementById("confirmPasswordInput");
const authError = document.getElementById("authError");
const submitAuthBtn = document.getElementById("submitAuthBtn");
const authNote = document.getElementById("authNote");

let mode = "signin";

function isAuthenticated() {
  const token = localStorage.getItem(AUTH_SESSION_KEY);
  return Boolean(token);
}

function loadUsers() {
  try {
    const raw = localStorage.getItem(USERS_KEY);
    if (!raw) return {};
    const users = JSON.parse(raw);
    return users && typeof users === "object" ? users : {};
  } catch (error) {
    return {};
  }
}

function saveUsers(users) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

function showError(message) {
  authError.textContent = message;
  authError.classList.remove("hidden");
}

function clearError() {
  authError.textContent = "";
  authError.classList.add("hidden");
}

function setMode(nextMode) {
  mode = nextMode;
  const isCreate = mode === "create";
  signInModeBtn.classList.toggle("active", !isCreate);
  createModeBtn.classList.toggle("active", isCreate);
  confirmPasswordWrap.classList.toggle("hidden", !isCreate);
  submitAuthBtn.textContent = isCreate ? "Create Account" : "Sign In";
  authNote.textContent = isCreate
    ? "Already have an account? Switch to Sign In."
    : "No account? Switch to Create Account.";
  confirmPasswordInput.required = isCreate;
  clearError();
}

function createSession(email) {
  localStorage.setItem(
    AUTH_SESSION_KEY,
    JSON.stringify({
      email,
      signedInAt: new Date().toISOString(),
    }),
  );
}

if (isAuthenticated()) {
  window.location.replace("./app.html");
}

signInModeBtn.addEventListener("click", () => setMode("signin"));
createModeBtn.addEventListener("click", () => setMode("create"));

form.addEventListener("submit", (event) => {
  event.preventDefault();
  clearError();

  const email = emailInput.value.trim();
  const password = passwordInput.value.trim();
  const confirmPassword = confirmPasswordInput.value.trim();
  const valid = email.includes("@") && password.length >= 4;
  if (!valid) {
    showError("Please enter a valid email and password (minimum 4 characters).");
    return;
  }

  const users = loadUsers();
  const normalizedEmail = email.toLowerCase();

  if (mode === "create") {
    if (users[normalizedEmail]) {
      showError("An account with this email already exists.");
      return;
    }
    if (password !== confirmPassword) {
      showError("Passwords do not match.");
      return;
    }
    users[normalizedEmail] = {
      email: normalizedEmail,
      password,
      createdAt: new Date().toISOString(),
    };
    saveUsers(users);
    createSession(normalizedEmail);
    window.location.replace("./app.html");
    return;
  }

  const user = users[normalizedEmail];
  if (!user || user.password !== password) {
    showError("Incorrect email or password.");
    return;
  }
  createSession(normalizedEmail);
  window.location.replace("./app.html");
});

setMode("signin");
