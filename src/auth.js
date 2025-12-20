// Appwrite Authentication Service
import { Client, Account } from "appwrite";

const client = new Client()
  .setEndpoint("https://fra.cloud.appwrite.io/v1")
  .setProject("6946698400109020ea3f6");

const account = new Account(client);

// Signup - Create new merchant account
export const signUp = async (email, password, name) => {
  try {
    // Create user account
    const user = await account.create("unique()", email, password, name);
    console.log("✓ Account created:", user);

    // Auto-login after signup
    await account.createEmailSession(email, password);
    console.log("✓ Logged in automatically");

    return user;
  } catch (error) {
    console.error("❌ Signup failed:", error.message);
    throw error;
  }
};

// Login - Merchant login
export const login = async (email, password) => {
  try {
    const session = await account.createEmailSession(email, password);
    console.log("✓ Logged in successfully");
    return session;
  } catch (error) {
    console.error("❌ Login failed:", error.message);
    throw error;
  }
};

// Get current logged-in user
export const getCurrentUser = async () => {
  try {
    const user = await account.get();
    console.log("✓ Current user:", user);
    return user;
  } catch (error) {
    console.log("ℹ No user logged in");
    return null;
  }
};

// Logout - Sign out merchant
export const logout = async () => {
  try {
    await account.deleteSession("current");
    console.log("✓ Logged out successfully");
  } catch (error) {
    console.error("❌ Logout failed:", error.message);
    throw error;
  }
};

// Check if user is authenticated
export const isAuthenticated = async () => {
  const user = await getCurrentUser();
  return user !== null;
};
