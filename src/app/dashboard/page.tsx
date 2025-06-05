"use client";

import { databases, storage, account, CARS_COLLECTION_ID, CARS_BUCKET_ID } from "@/lib/appwrite";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { Query, ID } from "appwrite";
import { PlusIcon, PencilIcon, TrashIcon, TruckIcon, MagnifyingGlassIcon, ArrowLeftEndOnRectangleIcon, MoonIcon, SunIcon, UserIcon, ClipboardDocumentListIcon, Bars3Icon } from "@heroicons/react/24/outline";
import Link from "next/link";
import { Models } from "appwrite";

interface Car {
  $id: string;
  ownerId: string;
  make: string;
  model: string;
  rent: number;
  phoneNumber: string;
  imageId?: string;
  available: boolean;
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

interface UserProfile {
  $id: string;
  userId: string;
  firstName?: string;
  lastName?: string;
}

export default function Dashboard() {
  const router = useRouter();
  const [user, setUser] = useState<Models.User<Models.Preferences> | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [cars, setCars] = useState<Car[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingCar, setEditingCar] = useState<Car | null>(null);
  const [activeTab, setActiveTab] = useState("cars");
  const [formData, setFormData] = useState({
    make: "",
    model: "",
    rent: "",
    phoneNumber: "",
    available: true,
  });
  const [newImage, setNewImage] = useState<File | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [validationErrors, setValidationErrors] = useState({
    make: "",
    model: "",
    rent: "",
    phoneNumber: "",
  });

  // Check authentication and fetch user data
  useEffect(() => {
    const checkAuth = async () => {
      try {
        setLoading(true);
        const userData = await account.get();
        setUser(userData);
        await fetchUserProfile(userData.$id);
        await fetchCars(userData.$id);
        await fetchBookings(userData.$id);
      } catch (err) {
        router.push("/login");
      } finally {
        setLoading(false);
      }
    };
    checkAuth();
  }, [router]);

  // Fetch user profile
  const fetchUserProfile = async (userId: string) => {
    try {
      const response = await databases.listDocuments(
        "683c12240008dd99a491",
        "683c19d300135b2b7be0",
        [Query.equal("userId", userId)]
      );
      if (response.documents.length > 0) {
        setUserProfile(response.documents[0] as unknown as UserProfile);
      }
    } catch (err: any) {
      setError("Failed to fetch user profile. Please try again.");
    }
  };

  // Fetch user's posted cars
  const fetchCars = async (userId: string) => {
    setLoading(true);
    setError("");
    try {
      const response = await databases.listDocuments(
        "683c12240008dd99a491",
        "683f0ae40007ef135182",
        [Query.equal("ownerId", userId)]
      );
      setCars(response.documents.map(doc => ({
        $id: doc.$id,
        ownerId: doc.ownerId,
        make: doc.make,
        model: doc.model,
        rent: doc.rent,
        phoneNumber: doc.phoneNumber,
        imageId: doc.imageId,
        available: doc.available
      })) as Car[]);
    } catch (err: any) {
      setError("Failed to fetch your cars. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Fetch booking requests for the user's cars
  const fetchBookings = async (userId: string) => {
    try {
      const response = await databases.listDocuments(
        "683c12240008dd99a491",
        "683f0afc001eb8c10b1c",
        [Query.equal("ownerId", userId)]
      );
      const bookingsWithDetails = await Promise.all(
        response.documents.map(async (booking: any) => {
          try {
            const carResponse = await databases.getDocument(
              "683c12240008dd99a491",
              "683f0ae40007ef135182",
              booking.carId
            );
            return {
              ...booking,
              phoneNumber: carResponse.phoneNumber
            };
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

  // Toggle dark mode
  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
    document.documentElement.classList.toggle("dark");
  };

  // Validate form inputs
  const validateForm = () => {
    const errors = {
      make: "",
      model: "",
      rent: "",
      phoneNumber: "",
    };
    let isValid = true;

    if (!formData.make || formData.make.length < 1 || formData.make.length > 50 || !/^[a-zA-Z0-9\s-]+$/.test(formData.make)) {
      errors.make = "Make is required, 1–50 characters, letters, numbers, spaces, or hyphens only";
      isValid = false;
    }
    if (!formData.model || formData.model.length < 1 || formData.model.length > 50 || !/^[a-zA-Z0-9\s-]+$/.test(formData.model)) {
      errors.model = "Model is required, 1–50 characters, letters, numbers, spaces, or hyphens only";
      isValid = false;
    }
    if (!formData.rent || isNaN(Number(formData.rent)) || Number(formData.rent) <= 0 || Number(formData.rent) > 10000) {
      errors.rent = "Rent must be a number between 1 and 10000";
      isValid = false;
    }
    if (!formData.phoneNumber || !/^\+?\d{10,12}$/.test(formData.phoneNumber)) {
      errors.phoneNumber = "Phone number must be 10–12 digits (optional country code)";
      isValid = false;
    }

    setValidationErrors(errors);
    return isValid;
  };

  // Open edit modal with car data
  const openEditModal = (car: Car) => {
    setEditingCar(car);
    setFormData({
      make: car.make,
      model: car.model,
      rent: car.rent.toString(),
      phoneNumber: car.phoneNumber,
      available: car.available, // Preserve current availability status
    });
    setIsEditModalOpen(true);
  };

  // Handle form input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: name === "available" ? value === "true" : value });
    setValidationErrors({ ...validationErrors, [name]: "" });
  };

  // Handle image change
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setNewImage(e.target.files[0]);
    }
  };

  // Handle edit submission
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCar || !validateForm()) return;

    setLoading(true);
    setError("");

    try {
      let imageId = editingCar.imageId;
      if (newImage) {
        if (imageId) {
          await storage.deleteFile("683f17410024cac04c95", imageId);
        }
        const uploadedImage = await storage.createFile(
          "683f17410024cac04c95",
          ID.unique(),
          newImage
        );
        imageId = uploadedImage.$id;
      }

      await databases.updateDocument(
        "683c12240008dd99a491",
        "683f0ae40007ef135182",
        editingCar.$id,
        {
          make: formData.make,
          model: formData.model,
          rent: parseFloat(formData.rent),
          phoneNumber: formData.phoneNumber,
          imageId,
          available: formData.available, // Use the boolean value directly
        }
      );

      setIsEditModalOpen(false);
      setNewImage(null);
      setValidationErrors({ make: "", model: "", rent: "", phoneNumber: "" });
      if (!user) return;
      await fetchCars(user.$id);
      alert("Car updated successfully!");
    } catch (err: any) {
      setError("Failed to update car. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Handle delete car
  const handleDelete = async (carId: string, imageId?: string) => {
    if (!confirm("Are you sure you want to delete this car?")) return;

    setLoading(true);
    setError("");

    try {
      if (imageId) {
        await storage.deleteFile(CARS_BUCKET_ID, imageId);
      }
      await databases.deleteDocument("683c12240008dd99a491", CARS_COLLECTION_ID, carId);
      if (!user) return;
      await fetchCars(user.$id);
      alert("Car deleted successfully!");
    } catch (err: any) {
      setError("Failed to delete car. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Handle booking status update
  const handleBookingStatus = async (bookingId: string, status: "approved" | "rejected") => {
    setLoading(true);
    setError("");

    try {
      await databases.updateDocument(
        "683c12240008dd99a491",
        "683f0afc001eb8c10b1c",
        bookingId,
        { status }
      );
      setBookings(bookings.map(booking => 
        booking.$id === bookingId ? { ...booking, status } : booking
      ));
      alert(`Booking ${status} successfully!`);
    } catch (err: any) {
      setError(`Failed to ${status} booking. Please try again.`);
    } finally {
      setLoading(false);
    }
  };

  // Handle sign out
  const handleSignOut = async () => {
    try {
      await account.deleteSession("current");
      router.push("/login");
    } catch (err: any) {
      setError("Failed to sign out. Please try again.");
    }
  };

  // Get image URL from Appwrite storage
  const getImageUrl = (imageId: string) => {
    return `https://cloud.appwrite.io/v1/storage/buckets/683f17410024cac04c95/files/${imageId}/view?project=${process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID}`;
  };

  if (!user) return null;

  // Fallback image for cars without an image
  const fallbackImage = "https://via.placeholder.com/300x200?text=placeholder";

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Mobile Header */}
      <header className="lg:hidden bg-black border-b border-gray-800 p-4">
        <div className="flex justify-between items-center">
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="p-2 text-gray-400 hover:text-white"
          >
            <Bars3Icon className="w-6 h-6" />
          </button>
          <h1 className="text-xl font-bold text-white">Dashboard</h1>
          <button
            onClick={handleSignOut}
            className="p-2 text-gray-400 hover:text-white"
          >
            <ArrowLeftEndOnRectangleIcon className="w-6 h-6" />
          </button>
        </div>
      </header>

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 bg-black border-r border-gray-800 transform transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex flex-col h-full">
          <div className="p-6 border-b border-gray-800">
            <h2 className="text-2xl font-bold text-white">CarShare</h2>
          </div>
          <nav className="flex-1 p-4 space-y-2">
            <button
              onClick={() => {
                setActiveTab("cars");
                setIsSidebarOpen(false);
              }}
              className={`w-full flex items-center px-4 py-3 rounded-lg transition-colors ${
                activeTab === "cars"
                  ? "bg-gray-800 text-white"
                  : "text-gray-400 hover:bg-gray-800 hover:text-white"
              }`}
            >
              <TruckIcon className="w-6 h-6 mr-3" />
              My Cars
            </button>
            <button
              onClick={() => {
                setActiveTab("requests");
                setIsSidebarOpen(false);
              }}
              className={`w-full flex items-center px-4 py-3 rounded-lg transition-colors ${
                activeTab === "requests"
                  ? "bg-gray-800 text-white"
                  : "text-gray-400 hover:bg-gray-800 hover:text-white"
              }`}
            >
              <ClipboardDocumentListIcon className="w-6 h-6 mr-3" />
              Requests
            </button>
            <Link
              href="/user-profile"
              className="w-full flex items-center px-4 py-3 rounded-lg text-gray-400 hover:bg-gray-800 hover:text-white transition-colors"
            >
              <UserIcon className="w-6 h-6 mr-3" />
              Profile
            </Link>
            <Link
              href="/post-vehicle"
              className="w-full flex items-center px-4 py-3 rounded-lg text-gray-400 hover:bg-gray-800 hover:text-white transition-colors"
            >
              <PlusIcon className="w-6 h-6 mr-3" />
              Post Vehicle
            </Link>
            <Link
              href="/explore"
              className="w-full flex items-center px-4 py-3 rounded-lg text-gray-400 hover:bg-gray-800 hover:text-white transition-colors"
            >
              <MagnifyingGlassIcon className="w-6 h-6 mr-3" />
              Explore
            </Link>
          </nav>
          <div className="p-4 border-t border-gray-800">
            <button
              onClick={handleSignOut}
              className="w-full flex items-center px-4 py-3 rounded-lg text-gray-400 hover:bg-gray-800 hover:text-white transition-colors"
            >
              <ArrowLeftEndOnRectangleIcon className="w-6 h-6 mr-3" />
              Sign Out
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-4 lg:p-6 lg:ml-72">
        {/* Header */}
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 bg-gray-900 p-4 rounded-xl shadow-sm">
          <div>
            <h2 className="text-2xl font-bold text-white">
              Welcome back, {userProfile?.firstName || userProfile?.lastName
                ? `${userProfile.firstName || ""} ${userProfile.lastName || ""}`.trim()
                : user?.name || "User"}
            </h2>
            <p className="text-gray-400">
              {activeTab === "cars"
                ? "Manage your posted cars"
                : "View and manage booking requests"}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={toggleDarkMode}
              className="p-2 text-gray-400 hover:text-white transition-colors"
            >
              {isDarkMode ? (
                <SunIcon className="w-6 h-6" />
              ) : (
                <MoonIcon className="w-6 h-6" />
              )}
            </button>
          </div>
        </header>

        {/* Cars Tab */}
        {activeTab === "cars" && (
          <section>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
              <h3 className="text-xl sm:text-2xl font-semibold text-white">Your Posted Cars</h3>
              <Link
                href="/post-vehicle"
                className="w-full sm:w-auto flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
              >
                <PlusIcon className="w-5 h-5 mr-2" />
                New Post
              </Link>
            </div>

            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 animate-pulse">
                {[...Array(3)].map((_, index) => (
                  <div key={index} className="bg-gray-900 rounded-xl shadow-sm">
                    <div className="h-48 sm:h-56 bg-gray-800"></div>
                    <div className="p-4 sm:p-6">
                      <div className="h-6 bg-gray-800 rounded w-3/4 mb-2"></div>
                      <div className="h-4 bg-gray-800 rounded w-1/2 mb-2"></div>
                      <div className="h-4 bg-gray-800 rounded w-1/2"></div>
                      <div className="mt-4 flex gap-2">
                        <div className="h-10 bg-gray-800 rounded flex-1"></div>
                        <div className="h-10 bg-gray-800 rounded flex-1"></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : error ? (
              <div className="fixed top-4 right-4 bg-red-500 text-white px-4 py-2 rounded-lg shadow-lg transition-opacity duration-300">
                {error}
              </div>
            ) : cars.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-400">No cars posted yet.</p>
                <Link
                  href="/post-vehicle"
                  className="inline-flex items-center mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <PlusIcon className="w-5 h-5 mr-2" />
                  Post Your First Car
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                {cars.map((car) => (
                  <div
                    key={car.$id}
                    className="bg-gray-900 rounded-xl shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden"
                  >
                    <div className="relative h-48 sm:h-56">
                      <img
                        src={car.imageId ? getImageUrl(car.imageId) : fallbackImage}
                        alt={`${car.make} ${car.model}`}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute top-4 right-4">
                        <span
                          className={`px-3 py-1 rounded-full text-sm font-medium ${
                            car.available
                              ? "bg-green-900/50 text-green-400"
                              : "bg-red-900/50 text-red-400"
                          }`}
                        >
                          {car.available ? "Available" : "Unavailable"}
                        </span>
                      </div>
                    </div>
                    <div className="p-4 sm:p-6">
                      <h4 className="text-lg sm:text-xl font-semibold text-white mb-2">
                        {car.make} {car.model}
                      </h4>
                      <div className="space-y-2">
                        <p className="text-gray-400">Rent: ${car.rent}/day</p>
                        <p className="text-gray-400">Contact: {car.phoneNumber}</p>
                      </div>
                      <div className="mt-4 flex flex-col sm:flex-row gap-2">
                        <button
                          onClick={() => openEditModal(car)}
                          className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(car.$id, car.imageId)}
                          className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* Requests Tab */}
        {activeTab === "requests" && (
          <section>
            <h3 className="text-xl sm:text-2xl font-semibold text-white mb-6">Booking Requests</h3>
            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 animate-pulse">
                {[...Array(3)].map((_, index) => (
                  <div key={index} className="bg-gray-900 rounded-xl shadow-sm">
                    <div className="p-4 sm:p-6">
                      <div className="h-6 bg-gray-800 rounded w-3/4 mb-2"></div>
                      <div className="h-4 bg-gray-800 rounded w-1/2 mb-2"></div>
                      <div className="h-4 bg-gray-800 rounded w-1/2 mb-4"></div>
                      <div className="flex gap-2">
                        <div className="h-10 bg-gray-800 rounded flex-1"></div>
                        <div className="h-10 bg-gray-800 rounded flex-1"></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : error ? (
              <div className="fixed top-4 right-4 bg-red-500 text-white px-4 py-2 rounded-lg shadow-lg transition-opacity duration-300">
                {error}
              </div>
            ) : bookings.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-400">No booking requests yet.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                {bookings.map((booking) => (
                  <div
                    key={booking.$id}
                    className="bg-gray-900 rounded-xl shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden"
                  >
                    <div className="p-4 sm:p-6">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h4 className="text-lg font-semibold text-white">
                            {booking.make} {booking.model}
                          </h4>
                          <p className="text-gray-400">${booking.rent}/day</p>
                        </div>
                        <span
                          className={`px-3 py-1 rounded-full text-sm font-medium ${
                            booking.status === "pending"
                              ? "bg-yellow-900/50 text-yellow-400"
                              : booking.status === "approved"
                              ? "bg-green-900/50 text-green-400"
                              : "bg-red-900/50 text-red-400"
                          }`}
                        >
                          {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                        </span>
                      </div>
                      <div className="space-y-2 mb-4">
                        <p className="text-gray-400">
                          Booking Date: {new Date(booking.bookingDate).toLocaleDateString()}
                        </p>
                        <p className="text-gray-400">
                          Contact: {booking.phoneNumber || "Not available"}
                        </p>
                      </div>
                      {booking.status === "pending" && (
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleBookingStatus(booking.$id, "approved")}
                            className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                            disabled={loading}
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleBookingStatus(booking.$id, "rejected")}
                            className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                            disabled={loading}
                          >
                            Reject
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}
      </main>

      {/* Edit Modal */}
      {isEditModalOpen && editingCar && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-gray-900 rounded-xl p-6 max-w-md w-full">
            <h3 className="text-xl font-bold text-white mb-4">Edit Car Details</h3>
            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Make
                </label>
                <input
                  type="text"
                  name="make"
                  value={formData.make}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-2 bg-gray-800 border ${validationErrors.make ? "border-red-500" : "border-gray-700"} rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white`}
                  required
                />
                {validationErrors.make && (
                  <p className="text-red-500 text-sm mt-1">{validationErrors.make}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Model
                </label>
                <input
                  type="text"
                  name="model"
                  value={formData.model}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-2 bg-gray-800 border ${validationErrors.model ? "border-red-500" : "border-gray-700"} rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white`}
                  required
                />
                {validationErrors.model && (
                  <p className="text-red-500 text-sm mt-1">{validationErrors.model}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Rent per Day ($)
                </label>
                <input
                  type="number"
                  name="rent"
                  value={formData.rent}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-2 bg-gray-800 border ${validationErrors.rent ? "border-red-500" : "border-gray-700"} rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white`}
                  required
                />
                {validationErrors.rent && (
                  <p className="text-red-500 text-sm mt-1">{validationErrors.rent}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Phone Number
                </label>
                <input
                  type="tel"
                  name="phoneNumber"
                  value={formData.phoneNumber}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-2 bg-gray-800 border ${validationErrors.phoneNumber ? "border-red-500" : "border-gray-700"} rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white`}
                  required
                />
                {validationErrors.phoneNumber && (
                  <p className="text-red-500 text-sm mt-1">{validationErrors.phoneNumber}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Availability
                </label>
                <select
                  name="available"
                  value={formData.available.toString()}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white"
                >
                  <option value="true">Available</option>
                  <option value="false">Not Available</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Car Image
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white"
                />
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditModalOpen(false);
                    setEditingCar(null);
                    setValidationErrors({ make: "", model: "", rent: "", phoneNumber: "" });
                  }}
                  className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || Object.values(validationErrors).some(error => error)}
                  className={`px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors ${
                    loading || Object.values(validationErrors).some(error => error) ? "opacity-50 cursor-not-allowed" : ""
                  }`}
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
