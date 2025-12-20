// Login Page Component
import { login } from "../auth.js";

class LoginPage {
  constructor() {
    this.email = "";
    this.password = "";
  }

  // Create the login form HTML
  render() {
    return `
      <div style="max-width: 400px; margin: 50px auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
        <h1>Merchant Login</h1>
        <p>Sign in to manage your chatbot</p>
        
        <form id="loginForm">
          <div style="margin-bottom: 15px;">
            <label style="display: block; margin-bottom: 5px;">Email:</label>
            <input 
              type="email" 
              id="emailInput" 
              placeholder="merchant@example.com" 
              style="width: 100%; padding: 10px; border: 1px solid #ccc; border-radius: 4px;"
              required
            />
          </div>

          <div style="margin-bottom: 15px;">
            <label style="display: block; margin-bottom: 5px;">Password:</label>
            <input 
              type="password" 
              id="passwordInput" 
              placeholder="••••••••" 
              style="width: 100%; padding: 10px; border: 1px solid #ccc; border-radius: 4px;"
              required
            />
          </div>

          <button 
            type="submit" 
            id="loginBtn"
            style="width: 100%; padding: 10px; background-color: #1a73e8; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 16px;"
          >
            Login
          </button>
        </form>

        <p id="statusMessage" style="text-align: center; margin-top: 15px; color: red;"></p>
        <p style="text-align: center; margin-top: 15px;">
          Don't have an account? <a href="#signup" style="color: #1a73e8;">Create one here</a>
        </p>
      </div>
    `;
  }

  // Handle login form submission
  async handleSubmit(event) {
    event.preventDefault();

    const email = document.getElementById("emailInput").value;
    const password = document.getElementById("passwordInput").value;
    const statusMessage = document.getElementById("statusMessage");

    // Validate inputs
    if (!email || !password) {
      statusMessage.textContent = "❌ Please fill in all fields";
      statusMessage.style.color = "red";
      return;
    }

    try {
      statusMessage.textContent = "⏳ Logging in...";
      statusMessage.style.color = "blue";

      // Call login function
      const session = await login(email, password);

      statusMessage.textContent = "✓ Login successful! Redirecting to dashboard...";
      statusMessage.style.color = "green";

      // Redirect to dashboard after 2 seconds
      setTimeout(() => {
        window.location.href = "#dashboard";
      }, 2000);

    } catch (error) {
      console.error("Login error:", error);
      statusMessage.textContent = `❌ ${error.message}`;
      statusMessage.style.color = "red";
    }
  }

  // Mount the page and attach event listeners
  mount(containerId) {
    const container = document.getElementById(containerId);
    container.innerHTML = this.render();

    const form = document.getElementById("loginForm");
    form.addEventListener("submit", (e) => this.handleSubmit(e));
  }
}

export default LoginPage;
