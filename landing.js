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
const forgotBtn = document.getElementById("forgotBtn");
const resetPanel = document.getElementById("resetPanel");
const resetPasswordInput = document.getElementById("resetPasswordInput");
const resetConfirmPasswordInput = document.getElementById("resetConfirmPasswordInput");
const resetSubmitBtn = document.getElementById("resetSubmitBtn");

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

function showMessage(message, type = "error") {
  authError.textContent = message;
  authError.classList.toggle("landing-success", type === "success");
  authError.classList.remove("hidden");
}

function clearError() {
  authError.textContent = "";
  authError.classList.remove("landing-success");
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
  forgotBtn.classList.toggle("hidden", isCreate);
  resetPanel.classList.add("hidden");
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
forgotBtn.addEventListener("click", () => {
  clearError();
  resetPanel.classList.toggle("hidden");
});
resetSubmitBtn.addEventListener("click", () => {
  clearError();
  const email = emailInput.value.trim().toLowerCase();
  const newPassword = resetPasswordInput.value.trim();
  const confirmNewPassword = resetConfirmPasswordInput.value.trim();

  if (!email.includes("@")) {
    showMessage("Enter your account email first, then reset password.");
    return;
  }
  if (newPassword.length < 4) {
    showMessage("New password must be at least 4 characters.");
    return;
  }
  if (newPassword !== confirmNewPassword) {
    showMessage("New passwords do not match.");
    return;
  }

  const users = loadUsers();
  const user = users[email];
  if (!user) {
    showMessage("No account found for this email.");
    return;
  }

  users[email].password = newPassword;
  users[email].updatedAt = new Date().toISOString();
  saveUsers(users);
  resetPanel.classList.add("hidden");
  resetPasswordInput.value = "";
  resetConfirmPasswordInput.value = "";
  showMessage("Password reset successful. You can now sign in.", "success");
});

form.addEventListener("submit", (event) => {
  event.preventDefault();
  clearError();

  const email = emailInput.value.trim();
  const password = passwordInput.value.trim();
  const confirmPassword = confirmPasswordInput.value.trim();
  const valid = email.includes("@") && password.length >= 4;
  if (!valid) {
    showMessage("Please enter a valid email and password (minimum 4 characters).");
    return;
  }

  const users = loadUsers();
  const normalizedEmail = email.toLowerCase();

  if (mode === "create") {
    if (users[normalizedEmail]) {
      showMessage("An account with this email already exists.");
      return;
    }
    if (password !== confirmPassword) {
      showMessage("Passwords do not match.");
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
    showMessage("Incorrect email or password.");
    return;
  }
  createSession(normalizedEmail);
  window.location.replace("./app.html");
});

setMode("signin");
