const AUTH_SESSION_KEY = "kanban_auth_session_v1";

const form = document.getElementById("signInForm");
const emailInput = document.getElementById("emailInput");
const passwordInput = document.getElementById("passwordInput");
const signInError = document.getElementById("signInError");

function isAuthenticated() {
  const token = localStorage.getItem(AUTH_SESSION_KEY);
  return Boolean(token);
}

if (isAuthenticated()) {
  window.location.replace("./app.html");
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const email = emailInput.value.trim();
  const password = passwordInput.value.trim();
  const valid = email.includes("@") && password.length >= 4;

  if (!valid) {
    signInError.classList.remove("hidden");
    return;
  }

  localStorage.setItem(
    AUTH_SESSION_KEY,
    JSON.stringify({
      email,
      signedInAt: new Date().toISOString(),
    }),
  );

  window.location.replace("./app.html");
});
