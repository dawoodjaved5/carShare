"use client";

import { account, databases } from "@/lib/appwrite";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { ID, Query, OAuthProvider } from "appwrite";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function checkSession() {
      try {
        const session = await account.get();
        if (session) {
          console.log("Active session found, checking profile...");
          const user = await account.get();
          const response = await databases.listDocuments(
            "683c12240008dd99a491", // Database ID
            "683c19d300135b2b7be0", // Users collection ID
            [Query.equal("userId", user.$id)]
          );
          if (response.documents.length === 0) {
            // Create partial profile for Google or new users
            await databases.createDocument(
              "683c12240008dd99a491",
              "683c19d300135b2b7be0",
              ID.unique(),
              {
                userId: user.$id,
                email: user.email,
                firstName: null,
                lastName: null,
                username: null,
                dob: null,
              }
            );
            console.log("Partial profile created for user:", user.$id);
          }
          console.log("Redirecting to dashboard");
          router.push("/dashboard");
        }
      } catch (err: any) {
        console.log("No active session or error checking session:", err.message || err);
      }
    }
    checkSession();
  }, [router]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await account.createEmailPasswordSession(email, password);
      console.log("Email login successful");
      const user = await account.get();
      const response = await databases.listDocuments(
        "683c12240008dd99a491",
        "683c19d300135b2b7be0",
        [Query.equal("userId", user.$id)]
      );
      if (response.documents.length === 0) {
        // Create partial profile (unlikely for email login, but for consistency)
        await databases.createDocument(
          "683c12240008dd99a491",
          "683c19d300135b2b7be0",
          ID.unique(),
          {
            userId: user.$id,
            email: user.email,
            firstName: null,
            lastName: null,
            username: null,
            dob: null,
          }
        );
        console.log("Partial profile created for email user:", user.$id);
      }
      console.log("Redirecting to dashboard");
      router.push("/dashboard");
    } catch (error: any) {
      console.error("Email login failed:", error);
      setError(
        error.code === 401
          ? "Invalid email or password. Please try again."
          : error.message || "Login failed. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleLogin() {
    try {
      setLoading(true);
      const redirectSuccess = process.env.NEXT_PUBLIC_REDIRECT_SUCCESS!;
      const redirectFail = process.env.NEXT_PUBLIC_REDIRECT_FAIL!;
      await account.createOAuth2Session(
        OAuthProvider.Google,
        redirectSuccess,
        redirectFail
      );
      console.log("Google login initiated");
    } catch (error: any) {
      console.error("Google login failed:", error);
      setError(error.message || "Google login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-500 to-purple-600">
      <div className="bg-white p-8 rounded-lg shadow-lg w-full max-w-md">
        <h1 className="text-3xl font-bold text-center text-gray-800 mb-6">Login</h1>
        {error && (
          <p className="text-red-500 text-sm mb-4 text-center">{error}</p>
        )}
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
              Email
            </label>
            <input
              id="email"
              type="email"
              placeholder="Enter your email"
              className="mt-1 w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-700"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
              Password
            </label>
            <input
              id="password"
              type="password"
              placeholder="Enter your password"
              className="mt-1 w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-700"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className={`w-full py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors ${
              loading ? "opacity-50 cursor-not-allowed" : ""
            }`}
          >
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>
        <div className="mt-4 text-center">
          <p className="text-sm text-gray-600">or</p>
          <button
            onClick={handleGoogleLogin}
            disabled={loading}
            className={`mt-2 w-full py-2 px-4 bg-white border border-gray-300 text-gray-800 rounded-md hover:bg-gray-100 transition-colors flex items-center justify-center gap-2 ${
              loading ? "opacity-50 cursor-not-allowed" : ""
            }`}
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-1.02.68-2.31 1.08-3.71 1.08-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.l.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Sign in with Google
          </button>
        </div>
        <p className="mt-4 text-center text-sm text-gray-600">
          Don't have an account?{" "}
          <a href="/signup" className="text-blue-600 hover:underline">
            Sign up
          </a>
        </p>
      </div>
    </div>
  );
}