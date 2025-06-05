"use client";

import { databases, storage, account } from "@/lib/appwrite";
import { useRouter, useParams } from "next/navigation";
import { useState, useEffect } from "react";
import { Query, ID, Models } from "appwrite";
import Link from "next/link";
import {
  ArrowLeftIcon,
  PhoneIcon,
  CalendarIcon,
  UserIcon,
} from "@heroicons/react/24/outline";

interface Car {
  $id: string;
  ownerId: string;
  make: string;
  model: string;
  year: number;
  color: string;
  rent: number;
  phoneNumber: string;
  imageId?: string;
  available: boolean;
}

export default function CarDetails() {
  const router = useRouter();
  const params = useParams(); // 👈 Fixed usage
  const carId = params?.id as string;

  const [car, setCar] = useState<Car | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [user, setUser] = useState<Models.User<Models.Preferences> | null>(null);
  const [bookingDate, setBookingDate] = useState("");
  const [bookingStatus, setBookingStatus] = useState<"idle" | "loading" | "success" | "error">("idle");

  // Check if user is logged in
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const userData = await account.get();
        setUser(userData);
      } catch {
        setUser(null);
      }
    };
    checkAuth();
  }, []);

  // Fetch car details
  useEffect(() => {
    const fetchCarDetails = async () => {
      setLoading(true);
      setError("");
      try {
        const response = await databases.getDocument(
          "683c12240008dd99a491",
          "683f0ae40007ef135182",
          carId
        );
        setCar(response as unknown as Car);
      } catch (err) {
        console.error("Fetch car error:", err);
        setError("Failed to fetch car details. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    if (carId) fetchCarDetails();
  }, [carId]);

  // Handle booking
  const handleBook = async () => {
    if (!user || !car) return;

    setBookingStatus("loading");
    try {
      await databases.createDocument(
        "683c12240008dd99a491",
        "683f0afc001eb8c10b1c",
        ID.unique(),
        {
          carId: car.$id,
          userId: user.$id,
          ownerId: car.ownerId,
          make: car.make,
          model: car.model,
          rent: car.rent,
          bookingDate: bookingDate,
          status: "pending",
        }
      );
      setBookingStatus("success");
      setTimeout(() => router.push("/dashboard"), 2000);
    } catch (err) {
      console.error("Booking error:", err);
      setBookingStatus("error");
      setError("Failed to book car. Please try again.");
    }
  };

  const getImageUrl = (imageId?: string) => {
    if (!imageId) return "/placeholder-car.jpg";
    return `https://cloud.appwrite.io/v1/storage/buckets/683f17410024cac04c95/files/${imageId}/view?project=${process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="loading-spinner" />
      </div>
    );
  }

  if (error || !car) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="bg-red-900/50 text-red-400 p-8 rounded-xl max-w-md text-center">
          <p className="text-xl mb-4">{error || "Car not found"}</p>
          <button
            onClick={() => router.push("/explore")}
            className="px-6 py-3 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            Back to Explore
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Hero Section */}
      <div className="relative h-[70vh] min-h-[600px] max-h-[800px]">
        <img
          src={getImageUrl(car.imageId)}
          alt={`${car.make} ${car.model}`}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-8">
          <div className="container mx-auto">
            <div className="flex items-center gap-4 mb-4">
              <Link
                href="https://car-share-alpha/explore"
                className="px-4 py-2 bg-gray-800/80 text-white rounded-lg hover:bg-gray-700 transition-colors flex items-center"
              >
                <ArrowLeftIcon className="w-5 h-5 mr-2" />
                Back
              </Link>
              <span className="px-4 py-2 bg-green-900/80 text-green-400 rounded-full text-sm font-medium">
                Available
              </span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-2">
              {car.make} {car.model}
            </h1>
            <p className="text-2xl text-gray-300">${car.rent}/day</p>
          </div>
        </div>
      </div>

      {/* Details Section */}
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Car Details */}
          <div className="lg:col-span-2">
            <div className="bg-gray-900 rounded-xl p-8">
              <h2 className="text-2xl font-semibold mb-6">Car Details</h2>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <p className="text-gray-400 mb-1">Make</p>
                  <p className="text-xl">{car.make}</p>
                </div>
                <div>
                  <p className="text-gray-400 mb-1">Model</p>
                  <p className="text-xl">{car.model}</p>
                </div>
                <div>
                  <p className="text-gray-400 mb-1">Color</p>
                  <p className="text-xl">{car.color}</p>
                </div>
                <div>
                  <p className="text-gray-400 mb-1">Daily Rate</p>
                  <p className="text-xl">${car.rent}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Booking Section */}
          <div className="lg:col-span-1">
            <div className="bg-gray-900 rounded-xl p-8 sticky top-8">
              <h2 className="text-2xl font-semibold mb-6">Book This Car</h2>
              <div className="space-y-6">
                <div>
                  <label className="block text-gray-400 mb-2">Select Date</label>
                  <div className="relative">
                    <input
                      type="date"
                      value={bookingDate}
                      onChange={(e) => setBookingDate(e.target.value)}
                      min={new Date().toISOString().split("T")[0]}
                      className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white"
                    />
                    <CalendarIcon className="w-5 h-5 text-gray-400 absolute right-4 top-1/2 transform -translate-y-1/2" />
                  </div>
                </div>

                <div className="space-y-4">
                  {user && user.$id !== car.ownerId && (
                    <>
                      <a
                        href={`tel:${car.phoneNumber}`}
                        className="w-full px-6 py-4 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center"
                      >
                        <PhoneIcon className="w-5 h-5 mr-2" />
                        Call Owner
                      </a>
                      <button
                        onClick={handleBook}
                        disabled={!bookingDate || bookingStatus === "loading"}
                        className="w-full px-6 py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {bookingStatus === "loading" ? (
                          "Processing..."
                        ) : bookingStatus === "success" ? (
                          "Booking Successful!"
                        ) : (
                          <>
                            <UserIcon className="w-5 h-5 mr-2" />
                            Book Now
                          </>
                        )}
                      </button>
                    </>
                  )}
                  {!user && (
                    <button
                      onClick={() => router.push("/login")}
                      className="w-full px-6 py-4 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition-colors"
                    >
                      Login to Book
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
