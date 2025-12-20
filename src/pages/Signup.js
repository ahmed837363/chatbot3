// Signup Page Component
import { signUp } from "../auth.js";

class SignupPage {
  constructor() {
    this.email = "";
    this.password = "";
    this.name = "";
  }

  // Create the signup form HTML
  render() {
    return `
      <div style="max-width: 400px; margin: 50px auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
        <h1>Create Merchant Account</h1>
        <p>Join our chatbot platform and start automating customer support</p>
        
        <form id="signupForm">
          <div style="margin-bottom: 15px;">
            <label style="display: block; margin-bottom: 5px;">Business Name:</label>
            <input 
              type="text" 
              id="nameInput" 
              placeholder="My Store" 
              style="width: 100%; padding: 10px; border: 1px solid #ccc; border-radius: 4px;"
              required
            />
          </div>

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
            id="signupBtn"
            style="width: 100%; padding: 10px; background-color: #1a73e8; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 16px;"
          >
            Create Account
          </button>
        </form>

        <p id="statusMessage" style="text-align: center; margin-top: 15px; color: red;"></p>
        <p style="text-align: center; margin-top: 15px;">
          Already have an account? <a href="#login" style="color: #1a73e8;">Login here</a>
        </p>
      </div>
    `;
  }

  // Handle signup form submission
  async handleSubmit(event) {
    event.preventDefault();

    const name = document.getElementById("nameInput").value;
    const email = document.getElementById("emailInput").value;
    const password = document.getElementById("passwordInput").value;
    const statusMessage = document.getElementById("statusMessage");

    // Validate inputs
    if (!name || !email || !password) {
      statusMessage.textContent = "❌ Please fill in all fields";
      statusMessage.style.color = "red";
      return;
    }

    if (password.length < 8) {
      statusMessage.textContent = "❌ Password must be at least 8 characters";
      statusMessage.style.color = "red";
      return;
    }

    try {
      statusMessage.textContent = "⏳ Creating account...";
      statusMessage.style.color = "blue";

      // Call signup function
      const user = await signUp(email, password, name);

      statusMessage.textContent = "✓ Account created! Redirecting to dashboard...";
      statusMessage.style.color = "green";

      // Redirect to dashboard after 2 seconds
      setTimeout(() => {
        window.location.href = "#dashboard";
      }, 2000);

    } catch (error) {
      console.error("Signup error:", error);
      statusMessage.textContent = `❌ ${error.message}`;
      statusMessage.style.color = "red";
    }
  }

  // Mount the page and attach event listeners
  mount(containerId) {
    const container = document.getElementById(containerId);
    container.innerHTML = this.render();

    const form = document.getElementById("signupForm");
    form.addEventListener("submit", (e) => this.handleSubmit(e));
  }
}

export default SignupPage;
