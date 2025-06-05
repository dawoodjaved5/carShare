"use client";

import { account, databases } from "@/lib/appwrite";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ID, Query, OAuthProvider } from "appwrite";

export default function SignupPage() {
  const router = useRouter();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [username, setUsername] = useState("");
  const [dob, setDob] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [warning, setWarning] = useState("");
  const [loading, setLoading] = useState(false);
  const [isGoogleSignup, setIsGoogleSignup] = useState(false);
  const [googleUser, setGoogleUser] = useState<{ $id: string; email: string; name?: string } | null>(null);

  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
  const nameRegex = /^[a-zA-Z\s-]{1,50}$/;
  const disposableDomains = [
    "tempmail.com",
    "guerrillamail.com",
    "10minutemail.com",
    "mailinator.com",
    "yopmail.com",
  ];

  function isDisposableEmail(email: string): boolean {
    const domain = email.split("@")[1]?.toLowerCase();
    return disposableDomains.includes(domain);
  }

  async function validateEmail(email: string): Promise<{ isValid: boolean; useFallback: boolean }> {
    if (!emailRegex.test(email)) {
      return { isValid: false, useFallback: false };
    }
    if (isDisposableEmail(email)) {
      return { isValid: false, useFallback: false };
    }
    try {
      const response = await fetch(
        `https://emailvalidation.abstractapi.com/v1/?api_key=${process.env.NEXT_PUBLIC_EMAIL_VALIDATION_API_KEY}&email=${email}`
      );
      if (!response.ok) {
        console.warn("AbstractAPI request failed, using fallback validation", response.status);
        return { isValid: true, useFallback: true };
      }
      const data = await response.json();
      return {
        isValid: (
          data.is_valid_format?.value &&
          data.deliverability === "DELIVERABLE" &&
          !data.is_disposable_email?.value
        ),
        useFallback: false,
      };
    } catch (err) {
      console.error("Email validation failed:", err);
      return { isValid: true, useFallback: true };
    }
  }

  async function checkUsernameAvailability(username: string): Promise<boolean> {
    try {
      const response = await databases.listDocuments(
        "683c12240008dd99a491",
        "683c19d300135b2b7be0",
        [Query.equal("username", username)]
      );
      return response.documents.length === 0;
    } catch (err) {
      console.error("Username check failed:", err);
      return false;
    }
  }

  useEffect(() => {
    async function checkGoogleSession() {
      try {
        const user = await account.get();
        if (user) {
          console.log("Google OAuth session detected:", user);
          const response = await databases.listDocuments(
            "683c12240008dd99a491",
            "683c19d300135b2b7be0",
            [Query.equal("userId", user.$id)]
          );
          if (response.documents.length === 0) {
            setIsGoogleSignup(true);
            setGoogleUser({ $id: user.$id, email: user.email, name: user.name });
            setEmail(user.email);
            setFirstName(user.name?.split(" ")[0] || "");
            setLastName(user.name?.split(" ").slice(1).join(" ") || "");
          } else {
            console.log("Profile found, redirecting to dashboard");
            router.push("/dashboard");
          }
        }
      } catch (err: any) {
        console.log("No session or error checking session:", err.message || err);
      }
    }
    checkGoogleSession();
  }, [router]);

  async function handleManualSignup(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setWarning("");
    setLoading(true);

    if (!nameRegex.test(firstName)) {
      setError("First name must be 1-50 characters, using letters, spaces, or hyphens.");
      setLoading(false);
      return;
    }
    if (!nameRegex.test(lastName)) {
      setError("Last name must be 1-50 characters, using letters, spaces, or hyphens.");
      setLoading(false);
      return;
    }
    if (!usernameRegex.test(username)) {
      setError("Username must be 3-20 characters, using letters, numbers, or underscores.");
      setLoading(false);
      return;
    }
    if (!(await checkUsernameAvailability(username))) {
      setError("Username is already taken. Please choose another.");
      setLoading(false);
      return;
    }
    if (dob) {
      const dobDate = new Date(dob);
      if (isNaN(dobDate.getTime()) || dobDate > new Date()) {
        setError("Please enter a valid date of birth in the past.");
        setLoading(false);
        return;
      }
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters long.");
      setLoading(false);
      return;
    }

    const { isValid, useFallback } = await validateEmail(email);
    if (!isValid) {
      setError("This email address is invalid, does not exist, or is a temporary email.");
      setLoading(false);
      return;
    }
    if (useFallback) {
      setWarning("Email validation is limited due to API limits. Please use a valid email.");
    }

    try {
      const user = await account.create(ID.unique(), email, password, `${firstName} ${lastName}`);
      console.log("User created in auth:", user.$id);

      await account.createEmailPasswordSession(email, password);
      console.log("Session created, user logged in");

      await databases.createDocument(
        "683c12240008dd99a491",
        "683c19d300135b2b7be0",
        ID.unique(),
        {
          userId: user.$id,
          firstName,
          lastName,
          username,
          email,
          dob: dob || null,
        }
      );
      console.log("User data saved to database");

      console.log("Signup successful, redirecting to /dashboard");
      router.push("/dashboard");
    } catch (err: any) {
      console.error("Signup failed:", err, "Code:", err.code, "Type:", err.type);
      setError(err.message || "Signup failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleSignupForm(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (!nameRegex.test(firstName)) {
      setError("First name must be 1-50 characters, using letters, spaces, or hyphens.");
      setLoading(false);
      return;
    }
    if (!nameRegex.test(lastName)) {
      setError("Last name must be 1-50 characters, using letters, spaces, or hyphens.");
      setLoading(false);
      return;
    }
    if (!usernameRegex.test(username)) {
      setError("Username must be 3-20 characters, using letters, numbers, or underscores.");
      setLoading(false);
      return;
    }
    if (!(await checkUsernameAvailability(username))) {
      setError("Username is already taken. Please choose another.");
      setLoading(false);
      return;
    }
    if (dob) {
      const dobDate = new Date(dob);
      if (isNaN(dobDate.getTime()) || dobDate > new Date()) {
        setError("Please enter a valid date of birth in the past.");
        setLoading(false);
        return;
      }
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters long.");
      setLoading(false);
      return;
    }

    try {
      if (!googleUser) {
        throw new Error("No Google user session found.");
      }

      await account.updatePassword(password);
      console.log("Password set for Google user");

      await databases.createDocument(
        "683c12240008dd99a491",
        "683c19d300135b2b7be0",
        ID.unique(),
        {
          userId: googleUser.$id,
          firstName,
          lastName,
          username,
          email: googleUser.email,
          dob: dob || null,
        }
      );
      console.log("Google user profile saved to database");

      console.log("Google signup completed, redirecting to /dashboard");
      router.push("/dashboard");
    } catch (err: any) {
      console.error("Google signup form failed:", err, "Code:", err.code, "Type:", err.type);
      setError(err.message || "Failed to complete Google signup. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleSignup() {
    try {
      await account.createOAuth2Session(
        OAuthProvider.Google,
        "https://car-share-alpha.vercel.app/dashboard",
        "https://car-share-alpha.vercel.app/login"
      );
      console.log("Google signup initiated");
    } catch (error: any) {
      console.error("Google signup failed:", error);
      setError(error.message || "Google signup failed.");
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-500 to-purple-600">
      <div className="bg-white p-8 rounded-lg shadow-lg w-full max-w-md">
        <h1 className="text-3xl font-bold text-center text-gray-800 mb-6">
          {isGoogleSignup ? "Complete Google Signup" : "Sign Up"}
        </h1>
        {error && (
          <p className="text-red-500 text-sm mb-4 text-center">{error}</p>
        )}
        {warning && (
          <p className="text-yellow-500 text-sm mb-4 text-center">{warning}</p>
        )}
        <form onSubmit={isGoogleSignup ? handleGoogleSignupForm : handleManualSignup} className="space-y-4">
          <div>
            <label htmlFor="firstName" className="block text-sm font-medium text-gray-700">
              First Name
            </label>
            <input
              id="firstName"
              type="text"
              placeholder="Enter your first name"
              className="mt-1 w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-700"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              required
            />
          </div>
          <div>
            <label htmlFor="lastName" className="block text-sm font-medium text-gray-700">
              Last Name
            </label>
            <input
              id="lastName"
              type="text"
              placeholder="Enter your last name"
              className="mt-1 w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-700"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              required
            />
          </div>
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-gray-700">
              Username
            </label>
            <input
              id="username"
              type="text"
              placeholder="Enter your username"
              className="mt-1 w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-700"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>
          <div>
            <label htmlFor="dob" className="block text-sm font-medium text-gray-700">
              Date of Birth (Optional)
            </label>
            <input
              id="dob"
              type="date"
              className="mt-1 w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-700"
              value={dob}
              onChange={(e) => setDob(e.target.value)}
            />
          </div>
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
              disabled={isGoogleSignup}
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
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className={`w-full py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors ${
              loading ? "opacity-50 cursor-not-allowed" : ""
            }`}
          >
            {loading ? "Processing..." : isGoogleSignup ? "Complete Signup" : "Sign Up"}
          </button>
        </form>
        {!isGoogleSignup && (
          <div className="mt-4 text-center">
            <p className="text-sm text-gray-600">or</p>
            <button
              onClick={handleGoogleSignup}
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
              Sign up with Google
            </button>
          </div>
        )}
        <p className="mt-4 text-center text-sm text-gray-600">
          Already have an account?{" "}
          <a href="https://car-share-alpha.vercel.app/login" className="text-blue-600 hover:underline">
            Login
          </a>
        </p>
      </div>
    </div>
  );
}