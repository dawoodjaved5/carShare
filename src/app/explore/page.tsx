"use client";

import { databases, storage, account } from "@/lib/appwrite";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { Query, ID } from "appwrite";
import { Models } from "appwrite";
import Link from "next/link";
import { MagnifyingGlassIcon, FunnelIcon, ArrowLeftIcon } from "@heroicons/react/24/outline";

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

export default function Explore() {
  const router = useRouter();
  const [cars, setCars] = useState<Car[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [user, setUser] = useState<Models.User<Models.Preferences> | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState({
    make: "",
    model: "",
    priceSort: "", // "low-to-high" or "high-to-low"
    yearSort: "", // "newest" or "oldest"
  });

  // Check if user is logged in
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const userData = await account.get();
        setUser(userData);
      } catch (err) {
        // User is not logged in, but we don't redirect
        setUser(null);
      }
    };
    checkAuth();
  }, []);

  // Fetch all available cars
  useEffect(() => {
    const fetchCars = async () => {
      setLoading(true);
      setError("");
      try {
        const response = await databases.listDocuments(
          "683c12240008dd99a491",
          "683f0ae40007ef135182",
          [Query.equal("available", true)]
        );
        // Convert Appwrite documents to Car type
        const carsData = response.documents.map(doc => ({
          $id: doc.$id,
          ownerId: doc.ownerId,
          make: doc.make,
          model: doc.model,
          year: doc.year,
          color: doc.color,
          rent: doc.rent,
          phoneNumber: doc.phoneNumber,
          imageId: doc.imageId,
          available: doc.available
        }));
        setCars(carsData);
      } catch (err: any) {
        console.error("Fetch cars error:", err);
        setError("Failed to fetch cars. Please try again.");
      } finally {
        setLoading(false);
      }
    };
    fetchCars();
  }, []);

  // Handle booking
  const handleBook = async (car: Car) => {
    if (!user) {
      // If user is not logged in, redirect to login
      router.push("/login");
      return;
    }

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
          bookingDate: new Date().toISOString(),
          status: "pending",
        }
      );
      alert("Booking request sent successfully!");
      router.push("/dashboard");
    } catch (err: any) {
      console.error("Booking error:", err);
      setError("Failed to book car. Please try again.");
    }
  };

  // Get image URL from Appwrite storage
  const getImageUrl = (imageId?: string) => {
    if (!imageId) return "/placeholder-car.jpg";
    return `https://cloud.appwrite.io/v1/storage/buckets/683f17410024cac04c95/files/${imageId}/view?project=${process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID}`;
  };

  // Get unique makes and models for dropdowns
  const uniqueMakes = [...new Set(cars.map(car => car.make))].sort();
  const uniqueModels = [...new Set(cars.map(car => car.model))].sort();

  // Filter cars based on search and filters
  const filteredCars = cars.filter((car) => {
    const searchTerms = searchQuery.toLowerCase().trim();
    const carDetails = `${car.make} ${car.model} ${car.year} ${car.color}`.toLowerCase();
    
    const matchesSearch = searchTerms === "" || carDetails.includes(searchTerms);
    const matchesMake = filters.make === "" || car.make === filters.make;
    const matchesModel = filters.model === "" || car.model === filters.model;

    return matchesSearch && matchesMake && matchesModel;
  }).sort((a, b) => {
    // Sort by price
    if (filters.priceSort === "low-to-high") {
      return a.rent - b.rent;
    } else if (filters.priceSort === "high-to-low") {
      return b.rent - a.rent;
    }
    
    // Sort by year
    if (filters.yearSort === "newest") {
      return b.year - a.year;
    } else if (filters.yearSort === "oldest") {
      return a.year - b.year;
    }
    
    return 0;
  });

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Hero Section */}
      <div className="relative bg-gradient-to-r from-blue-900 to-black py-20">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-4xl md:text-5xl font-bold">
              Find Your Perfect Ride
            </h1>
            {user && (
              <Link
                href="/dashboard"
                className="px-6 py-3 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition-colors flex items-center"
              >
                <ArrowLeftIcon className="w-5 h-5 mr-2" />
                Back to Dashboard
              </Link>
            )}
          </div>
          <p className="text-xl dark:text-green-400 mb-8">
            Explore our collection of premium cars available for rent
          </p>
          <div className="relative max-w-2xl mx-auto">
            <input
              type="text"
              placeholder="Search cars by make, model, or year..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-6 py-4 bg-white/10 border border-gray-700 rounded-full text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <MagnifyingGlassIcon className="w-6 h-6 text-gray-400 absolute right-6 top-1/2 transform -translate-y-1/2" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="container mx-auto px-4 py-8">
        <div className="bg-gray-900 rounded-xl p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Filters</h2>
            <FunnelIcon className="w-6 h-6 text-gray-400" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <select
              value={filters.make}
              onChange={(e) => setFilters({ ...filters, make: e.target.value })}
              className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white"
            >
              <option value="">All Makes</option>
              {uniqueMakes.map((make) => (
                <option key={make} value={make}>
                  {make}
                </option>
              ))}
            </select>

            <select
              value={filters.model}
              onChange={(e) => setFilters({ ...filters, model: e.target.value })}
              className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white"
            >
              <option value="">All Models</option>
              {uniqueModels.map((model) => (
                <option key={model} value={model}>
                  {model}
                </option>
              ))}
            </select>

            <select
              value={filters.priceSort}
              onChange={(e) => setFilters({ ...filters, priceSort: e.target.value })}
              className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white"
            >
              <option value="">Price: Any</option>
              <option value="low-to-high">Price: Low to High</option>
              <option value="high-to-low">Price: High to Low</option>
            </select>

            <select
              value={filters.yearSort}
              onChange={(e) => setFilters({ ...filters, yearSort: e.target.value })}
              className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white"
            >
              <option value="">Year: Any</option>
              <option value="newest">Year: Newest First</option>
              <option value="oldest">Year: Oldest First</option>
            </select>
          </div>
        </div>

        {/* Cars Grid */}
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="loading-spinner" />
          </div>
        ) : error ? (
          <div className="bg-red-900/50 text-red-400 p-4 rounded-lg">
            {error}
          </div>
        ) : filteredCars.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-400">No cars found matching your criteria.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredCars.map((car) => (
              <div
                key={car.$id}
                className="bg-gray-900 rounded-xl shadow-sm hover:shadow-md transition-shadow overflow-hidden group cursor-pointer"
                onClick={() => router.push(`/car/${car.$id}`)}
              >
                <div className="relative h-48">
                  <img
                    src={getImageUrl(car.imageId)}
                    alt={`${car.make} ${car.model}`}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute top-4 right-4">
                    <span className="px-3 py-1 bg-green-900/50 text-green-400 rounded-full text-sm font-medium">
                      Available
                    </span>
                  </div>
                </div>
                <div className="p-6">
                  <h3 className="text-xl font-semibold text-white mb-2">
                    {car.make} {car.model}
                  </h3>
                  <div className="space-y-2 mb-4">
                    <p className="text-gray-400">Rent: PKR{car.rent}/day</p>
                  </div>
                  <div className="space-y-2">
                    {user && user.$id !== car.ownerId && (
                      <>
                        <a
                          href={`tel:${car.phoneNumber}`}
                          className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center"
                          onClick={(e) => e.stopPropagation()}
                        >
                          Call Owner
                        </a>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleBook(car);
                          }}
                          className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                        >
                          Book Now
                        </button>
                      </>
                    )}
                    {!user && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push('/login');
                        }}
                        className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
                      >
                        Login to Book
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
