"use client";

import { databases, account } from "@/lib/appwrite";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { Query, ID } from "appwrite";
import { PencilIcon } from "@heroicons/react/24/outline";
import Link from "next/link";

interface UserProfile {
  $id: string;
  userId: string;
  firstName?: string;
  lastName?: string;
  age?: number;
  phoneNumber?: string;
}

interface Booking {
  $id: string;
  carId: string;
  userId: string;
  ownerId: string;
  make: string;
  model: string;
  rent: number;
  bookingDate: string;
  status: "pending" | "approved" | "rejected";
  phoneNumber?: string;
}

export default function UserProfile() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [profileData, setProfileData] = useState({
    firstName: "",
    lastName: "",
    age: "",
    phoneNumber: "",
  });
  const [validationErrors, setValidationErrors] = useState({
    firstName: "",
    lastName: "",
    age: "",
    phoneNumber: "",
  });

  // Handle logout
  const handleLogout = async () => {
    try {
      await account.deleteSession("current");
      router.push("/login");
    } catch (err) {
      setError("Failed to logout. Please try again.");
    }
  };

  // Check authentication and fetch user profile
  useEffect(() => {
    const checkAuthAndFetchProfile = async () => {
      try {
        setLoading(true);
        const userData = await account.get();
        if (!userData) {
          router.push("/login");
          return;
        }
        setUser(userData);
        await fetchUserProfile(userData.$id);
        await fetchBookings(userData.$id);
      } catch (err: any) {
        if (err.code === 401 || err.type === "user_unauthorized") {
          router.push("/login");
        } else {
          setError("Failed to connect to the server. Please try again later.");
        }
      } finally {
        setLoading(false);
      }
    };
    checkAuthAndFetchProfile();
  }, [router]);

  // Fetch or create user profile
  const fetchUserProfile = async (userId: string) => {
    setLoading(true);
    setError("");
    try {
      const response = await databases.listDocuments(
        "683c12240008dd99a491",
        "683c19d300135b2b7be0",
        [Query.equal("userId", userId)]
      );

      if (response.documents.length > 0) {
        const profile = response.documents[0] as unknown as UserProfile;
        setUserProfile(profile);
        setProfileData({
          firstName: profile.firstName || "",
          lastName: profile.lastName || "",
          age: profile.age ? profile.age.toString() : "",
          phoneNumber: profile.phoneNumber || "",
        });
      } else {
        const newProfile = await databases.createDocument(
          "683c12240008dd99a491",
          "683c19d300135b2b7be0",
          ID.unique(),
          {
            userId,
            firstName: "",
            lastName: "",
            age: null,
            phoneNumber: "",
          }
        );
        setUserProfile(newProfile as unknown as UserProfile);
        setProfileData({
          firstName: "",
          lastName: "",
          age: "",
          phoneNumber: "",
        });
      }
    } catch (err: any) {
      setError(`Failed to load user profile: ${err.message || "Unknown error"}. Please try again.`);
    } finally {
      setLoading(false);
    }
  };

  // Fetch booking requests
  const fetchBookings = async (userId: string) => {
    try {
      const response = await databases.listDocuments(
        "683c12240008dd99a491",
        "683f0afc001eb8c10b1c",
        [Query.equal("userId", userId)]
      );
      const bookingsWithDetails = await Promise.all(
        response.documents.map(async (booking: any) => {
          try {
            const carResponse = await databases.getDocument(
              "683c12240008dd99a491",
              "683f0ae40007ef135182",
              booking.carId
            );
            return { ...booking, phoneNumber: carResponse.phoneNumber };
          } catch (err) {
            return booking;
          }
        })
      );
      setBookings(bookingsWithDetails as unknown as Booking[]);
    } catch (err: any) {
      setError("Failed to fetch bookings. Please try again.");
    }
  };

  // Validate form inputs
  const validateForm = () => {
    const errors = {
      firstName: "",
      lastName: "",
      age: "",
      phoneNumber: "",
    };
    let isValid = true;

    if (profileData.firstName.length > 50) {
      errors.firstName = "First name must be 50 characters or less";
      isValid = false;
    }
    if (profileData.lastName.length > 50) {
      errors.lastName = "Last name must be 50 characters or less";
      isValid = false;
    }
    if (profileData.age && (isNaN(Number(profileData.age)) || Number(profileData.age) < 0 || Number(profileData.age) > 120)) {
      errors.age = "Age must be a number between 0 and 120";
      isValid = false;
    }
    if (profileData.phoneNumber && !/^\+?\d{10,15}$/.test(profileData.phoneNumber)) {
      errors.phoneNumber = "Invalid phone number format";
      isValid = false;
    }

    setValidationErrors(errors);
    return isValid;
  };

  // Handle profile form input changes
  const handleProfileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setProfileData({ ...profileData, [e.target.name]: e.target.value });
    setValidationErrors({ ...validationErrors, [e.target.name]: "" });
  };

  // Handle profile edit submission
  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userProfile || !user || !validateForm()) return;

    setLoading(true);
    setError("");

    try {
      await databases.updateDocument(
        "683c12240008dd99a491",
        "683c19d300135b2b7be0",
        userProfile.$id,
        {
          userId: user.$id,
          firstName: profileData.firstName || "",
          lastName: profileData.lastName || "",
          age: profileData.age ? parseInt(profileData.age) : null,
          phoneNumber: profileData.phoneNumber || "",
        }
      );

      setIsEditing(false);
      await fetchUserProfile(user.$id);
      alert("Profile updated successfully!");
    } catch (err: any) {
      setError(`Failed to update profile: ${err.message || "Unknown error"}. Please try again.`);
    } finally {
      setLoading(false);
    }
  };

  // Toggle edit mode
  const toggleEditMode = () => {
    setIsEditing(!isEditing);
    setError("");
    if (!isEditing && userProfile) {
      setProfileData({
        firstName: userProfile.firstName || "",
        lastName: userProfile.lastName || "",
        age: userProfile.age ? userProfile.age.toString() : "",
        phoneNumber: userProfile.phoneNumber || "",
      });
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <nav className="bg-white dark:bg-gray-800 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <Link href="https://car-share-alpha" className="flex items-center">
                <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">CarShare</span>
              </Link>
            </div>
            <div className="flex items-center">
              <Link
                href="https://car-share-alpha/dashboard"
                className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white px-3 py-2 rounded-md text-sm font-medium"
              >
                Dashboard
              </Link>
              <Link
                href="https://car-share-alpha/explore"
                className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white px-3 py-2 rounded-md text-sm font-medium"
              >
                Explore
              </Link>
              <button
                onClick={handleLogout}
                className="ml-4 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors text-sm font-medium"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-pulse">
            <div className="lg:col-span-1">
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                <div className="h-20 w-20 rounded-full bg-gray-200 dark:bg-gray-600 mb-4"></div>
                <div className="h-6 bg-gray-200 dark:bg-gray-600 rounded w-3/4 mb-2"></div>
                <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-1/2"></div>
                <div className="space-y-4 mt-6">
                  <div className="h-10 bg-gray-200 dark:bg-gray-600 rounded"></div>
                  <div className="h-10 bg-gray-200 dark:bg-gray-600 rounded"></div>
                  <div className="h-10 bg-gray-200 dark:bg-gray-600 rounded"></div>
                </div>
              </div>
            </div>
            <div className="lg:col-span-2">
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                <div className="h-6 bg-gray-200 dark:bg-gray-600 rounded w-1/4 mb-6"></div>
                <div className="space-y-4">
                  <div className="h-20 bg-gray-200 dark:bg-gray-600 rounded"></div>
                  <div className="h-20 bg-gray-200 dark:bg-gray-600 rounded"></div>
                </div>
              </div>
            </div>
          </div>
        ) : error ? (
          <div className="fixed top-4 right-4 bg-red-500 text-white px-4 py-2 rounded-lg shadow-lg transition-opacity duration-300">
            {error}
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Profile Information Card */}
            <div className="lg:col-span-1">
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden transition-all duration-300">
                <div className="p-6">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center space-x-4">
                      <div className="h-20 w-20 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                        <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                          {userProfile?.firstName?.charAt(0).toUpperCase() || "U"}
                        </span>
                      </div>
                      <div>
                        <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">
                          {userProfile?.firstName || userProfile?.lastName
                            ? `${userProfile.firstName || ""} ${userProfile.lastName || ""}`.trim()
                            : "User"}
                        </h2>
                        <p className="text-gray-600 dark:text-gray-400">{user.email}</p>
                      </div>
                    </div>
                    <button
                      onClick={toggleEditMode}
                      className="p-2 text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                    >
                      <PencilIcon className="h-5 w-5" />
                    </button>
                  </div>
                  <form onSubmit={handleProfileSubmit}>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          First Name
                        </label>
                        <input
                          type="text"
                          value={profileData.firstName}
                          onChange={handleProfileInputChange}
                          name="firstName"
                          disabled={!isEditing}
                          className={`w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-colors ${
                            !isEditing ? "bg-gray-100 dark:bg-gray-600 cursor-not-allowed" : ""
                          }`}
                        />
                        {validationErrors.firstName && (
                          <p className="text-red-500 text-sm mt-1">{validationErrors.firstName}</p>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Last Name
                        </label>
                        <input
                          type="text"
                          value={profileData.lastName}
                          onChange={handleProfileInputChange}
                          name="lastName"
                          disabled={!isEditing}
                          className={`w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-colors ${
                            !isEditing ? "bg-gray-100 dark:bg-gray-600 cursor-not-allowed" : ""
                          }`}
                        />
                        {validationErrors.lastName && (
                          <p className="text-red-500 text-sm mt-1">{validationErrors.lastName}</p>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Age
                        </label>
                        <input
                          type="number"
                          value={profileData.age}
                          onChange={handleProfileInputChange}
                          name="age"
                          disabled={!isEditing}
                          className={`w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-colors ${
                            !isEditing ? "bg-gray-100 dark:bg-gray-600 cursor-not-allowed" : ""
                          }`}
                        />
                        {validationErrors.age && (
                          <p className="text-red-500 text-sm mt-1">{validationErrors.age}</p>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Phone Number
                        </label>
                        <input
                          type="tel"
                          value={profileData.phoneNumber}
                          onChange={handleProfileInputChange}
                          name="phoneNumber"
                          disabled={!isEditing}
                          className={`w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-colors ${
                            !isEditing ? "bg-gray-100 dark:bg-gray-600 cursor-not-allowed" : ""
                          }`}
                        />
                        {validationErrors.phoneNumber && (
                          <p className="text-red-500 text-sm mt-1">{validationErrors.phoneNumber}</p>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Email
                        </label>
                        <p className="w-full px-4 py-2 bg-gray-100 dark:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-lg">
                          {user.email}
                        </p>
                      </div>
                      {isEditing && (
                        <div className="flex space-x-2">
                          <button
                            type="submit"
                            disabled={loading}
                            className={`w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium ${
                              loading ? "opacity-50 cursor-not-allowed" : ""
                            }`}
                          >
                            Save Changes
                          </button>
                          <button
                            type="button"
                            onClick={toggleEditMode}
                            className="w-full px-4 py-2 bg-gray-300 text-gray-800 rounded-lg hover:bg-gray-400 transition-colors font-medium"
                          >
                            Cancel
                          </button>
                        </div>
                      )}
                    </div>
                  </form>
                </div>
              </div>
            </div>

            {/* Recent Bookings Card */}
            <div className="lg:col-span-2">
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden transition-all duration-300">
                <div className="p-6">
                  <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-6">
                    Recent Bookings
                  </h3>
                  {bookings.length === 0 ? (
                    <p className="text-gray-600 dark:text-gray-400 text-center py-4">
                      No bookings found.
                    </p>
                  ) : (
                    <div className="space-y-4">
                      {bookings.map((booking) => (
                        <div
                          key={booking.$id}
                          className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 hover:shadow-md transition-shadow duration-200"
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <h4 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-2">
                                {booking.make} {booking.model}
                              </h4>
                              <div className="space-y-1">
                                <p className="text-gray-600 dark:text-gray-400">
                                  Booking Date: {new Date(booking.bookingDate).toLocaleDateString()}
                                </p>
                                <p className="text-gray-600 dark:text-gray-400">
                                  Contact: {booking.phoneNumber || "Not available"}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center space-x-3">
                              <span
                                className={`px-3 py-1 rounded-full text-sm font-medium ${
                                  booking.status === "pending"
                                    ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
                                    : booking.status === "approved"
                                    ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                                    : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                                }`}
                              >
                                {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                              </span>
                              {booking.phoneNumber && (
                                <a
                                  href={`tel:${booking.phoneNumber}`}
                                  className="p-2 bg-blue-100 text-blue-600 rounded-full hover:bg-blue-200 transition-colors"
                                >
                                  <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    className="h-5 w-5"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                                    />
                                  </svg>
                                </a>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
