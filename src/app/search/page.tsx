"use client";

import { databases } from "@/lib/appwrite";
import { useRouter } from "next/navigation";
import { useState, useEffect, useCallback } from "react";
import { Query } from "appwrite";
import { UserIcon, IdentificationIcon, CakeIcon } from "@heroicons/react/24/outline";

interface Profile {
  $id: string;
  userId: string;
  email: string;
  firstName?: string;
  lastName?: string;
  username?: string;
  dob?: string;
}

export default function SearchPage() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<Profile[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const calculateAge = (dob: string): number => {
    const dobDate = new Date(dob);
    const diffMs = Date.now() - dobDate.getTime();
    const ageDate = new Date(diffMs);
    return Math.abs(ageDate.getUTCFullYear() - 1970);
  };

  const debounce = (func: (...args: any[]) => void, delay: number) => {
    let timeoutId: NodeJS.Timeout;
    return (...args: any[]) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => func(...args), delay);
    };
  };

  const handleSearch = useCallback(async (term: string) => {
    if (!term.trim()) {
      setSearchResults([]);
      setError("");
      return;
    }

    setError("");
    setLoading(true);

    try {
      const response = await databases.listDocuments(
        "683c12240008dd99a491",
        "683c19d300135b2b7be0",
        [Query.search("username", term)]
      );
      setSearchResults(response.documents as unknown as Profile[]);
    } catch (err: any) {
      console.error("Search failed:", err);
      setError(err.message || "Failed to search users. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  const debouncedSearch = useCallback(debounce(handleSearch, 300), [handleSearch]);

  useEffect(() => {
    debouncedSearch(searchTerm);
  }, [searchTerm, debouncedSearch]);

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSearch(searchTerm);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-500 to-purple-600 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl p-6">
        <h1 className="text-2xl font-bold text-center text-gray-800 mb-6">Search Users</h1>
        <form onSubmit={handleFormSubmit} className="mb-6">
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Search by username"
              className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-700"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <button
              type="submit"
              disabled={loading}
              className={`px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors ${
                loading ? "opacity-50 cursor-not-allowed" : ""
              }`}
            >
              {loading ? "Searching..." : "Search"}
            </button>
          </div>
        </form>
        {error && <p className="text-red-500 text-sm mb-4 text-center">{error}</p>}
        {searchResults.length > 0 ? (
          <div className="space-y-4">
            {searchResults.map((profile) => (
              <div
                key={profile.$id}
                className="p-4 border border-gray-200 rounded-md hover:bg-gray-100 cursor-pointer"
                onClick={() => {
                  console.log("Navigating to profile:", profile.username); // Debug log
                  if (profile.username) {
                    router.push(`/profile/${encodeURIComponent(profile.username)}`);
                  } else {
                    setError("Invalid username for this profile.");
                  }
                }}
              >
                <div className="flex items-center gap-2">
                  <UserIcon className="w-6 h-6 text-gray-500" />
                  <div>
                    <p className="text-sm text-gray-500">Name</p>
                    <p className="text-gray-800">
                      {profile.firstName || "N/A"} {profile.lastName || ""}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <IdentificationIcon className="w-6 h-6 text-gray-500" />
                  <div>
                    <p className="text-sm text-gray-500">Username</p>
                    <p className="text-gray-800">@{profile.username || "N/A"}</p>
                  </div>
                </div>
                {profile.dob && (
                  <div className="flex items-center gap-2 mt-2">
                    <CakeIcon className="w-6 h-6 text-gray-500" />
                    <div>
                      <p className="text-sm text-gray-500">Age</p>
                      <p className="text-gray-800">{calculateAge(profile.dob)}</p>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-center text-gray-600">
            {searchTerm ? "No users found." : "Start typing to search for users."}
          </p>
        )}
        <button
          onClick={() => router.push("/dashboard")}
          className="mt-6 w-full py-2 px-4 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
        >
          Back to Dashboard
        </button>
      </div>
    </div>
  );
}