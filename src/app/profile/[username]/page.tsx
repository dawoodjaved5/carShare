"use client";

import { databases, account } from "@/lib/appwrite";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
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

export default function ProfilePage({ params }: { params: Promise<{ username: string }> }) {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const calculateAge = (dob: string): number => {
    const dobDate = new Date(dob);
    const diffMs = Date.now() - dobDate.getTime();
    const ageDate = new Date(diffMs);
    return Math.abs(ageDate.getUTCFullYear() - 1970);
  };

  useEffect(() => {
    async function fetchProfile() {
      try {
        // Unwrap the params Promise
        const resolvedParams = await params;
        console.log("Resolved params:", resolvedParams); // Debug log
        console.log("Current URL:", window.location.href); // Debug log

        if (!resolvedParams.username) {
          console.error("No username provided in resolved params");
          setError("No username provided. Please select a user from the search page.");
          setLoading(false);
          return;
        }

        // Decode the username to handle special characters
        const decodedUsername = decodeURIComponent(resolvedParams.username);
        console.log("Fetching profile for username:", decodedUsername); // Debug log

        // Verify user session
        await account.get();
        console.log("User is authenticated"); // Debug log

        // Fetch profile data
        const response = await databases.listDocuments(
          "683c12240008dd99a491",
          "683c19d300135b2b7be0",
          [Query.equal("username", decodedUsername)]
        );
        console.log("Profile fetch response:", response); // Debug log

        if (response.documents.length === 0) {
          setError("Profile not found.");
          console.log("No profile found for username:", decodedUsername);
        } else {
          setProfile(response.documents[0] as unknown as Profile);
        }
      } catch (err: any) {
        console.error("Profile fetch failed:", err);
        if (err.code === 401) {
          setError("Please log in to Profile profiles.");
          router.push("/dashboard");
        } else {
          setError(err.message || "Failed to load profile. Please try again.");
        }
      } finally {
        setLoading(false);
      }
    }

    fetchProfile();
  }, [params, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-white">
        Loading...
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-500 to-purple-600 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg p-6">
        <h1 className="text-2xl font-bold text-center text-gray-800 mb-6">User Profile</h1>
        {error && <p className="text-red-500 text-sm mb-4 text-center">{error}</p>}
        {profile ? (
          <div className="space-y-4">
            <div className="flex justify-center">
              <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center text-2xl font-semibold text-gray-600">
                {profile.username?.[0]?.toUpperCase() || "?"}
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4">
              <div className="flex items-center gap-2">
                <UserIcon className="w-6 h-6 text-gray-500" />
                <div>
                  <p className="text-sm text-gray-500">Name</p>
                  <p className="text-gray-800">
                    {profile.firstName || "N/A"} {profile.lastName || ""}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <IdentificationIcon className="w-6 h-6 text-gray-500" />
                <div>
                  <p className="text-sm text-gray-500">Username</p>
                  <p className="text-gray-800">@{profile.username || "N/A"}</p>
                </div>
              </div>
              {profile.dob && (
                <div className="flex items-center gap-2">
                  <CakeIcon className="w-6 h-6 text-gray-500" />
                  <div>
                    <p className="text-sm text-gray-500">Age</p>
                    <p className="text-gray-800">{calculateAge(profile.dob)}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <p className="text-center text-gray-600">No profile data available.</p>
        )}
        <div className="flex gap-2 mt-6">
          <button
            onClick={() => router.push("/search")}
            className="flex-1 py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Back to Search
          </button>
          <button
            onClick={() => router.push("/dashboard")}
            className="flex-1 py-2 px-4 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}