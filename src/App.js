// Main App - Simple router for Login/Signup pages
import LoginPage from "./pages/Login.js";
import SignupPage from "./pages/Signup.js";
import { getCurrentUser } from "./auth.js";

class App {
  constructor() {
    this.currentPage = null;
    this.setupRouter();
  }

  // Simple router to handle page navigation
  setupRouter() {
    window.addEventListener("hashchange", () => this.render());
    this.render();
  }

  // Render the current page based on URL hash
  async render() {
    const app = document.getElementById("app");
    const hash = window.location.hash.substring(1) || "login";

    // Check if user is logged in
    const user = await getCurrentUser();

    // If user is logged in and trying to access login/signup, redirect to dashboard
    if (user && (hash === "login" || hash === "signup")) {
      window.location.hash = "#dashboard";
      return;
    }

    // If user is NOT logged in and trying to access dashboard, redirect to login
    if (!user && hash === "dashboard") {
      window.location.hash = "#login";
      return;
    }

    // Clear previous page
    app.innerHTML = "";

    // Render appropriate page
    if (hash === "login") {
      const loginPage = new LoginPage();
      loginPage.mount("app");
    } else if (hash === "signup") {
      const signupPage = new SignupPage();
      signupPage.mount("app");
    } else if (hash === "dashboard") {
      this.renderDashboard();
    } else {
      // Default to login
      window.location.hash = "#login";
    }
  }

  // Simple dashboard (placeholder for now)
  renderDashboard() {
    const app = document.getElementById("app");
    app.innerHTML = `
      <div style="max-width: 600px; margin: 50px auto; padding: 20px;">
        <h1>✓ Dashboard</h1>
        <p>✓ You are logged in!</p>
        <button 
          onclick="app.logout()"
          style="padding: 10px 20px; background-color: #dc3545; color: white; border: none; border-radius: 4px; cursor: pointer;"
        >
          Logout
        </button>
      </div>
    `;
  }

  // Logout function
  async logout() {
    try {
      const { logout } = await import("./auth.js");
      await logout();
      window.location.hash = "#login";
    } catch (error) {
      console.error("Logout failed:", error);
    }
  }
}

// Initialize app when page loads
window.app = new App();
