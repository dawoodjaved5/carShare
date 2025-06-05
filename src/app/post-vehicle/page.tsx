"use client";

import { databases, storage, account } from "@/lib/appwrite";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { ID } from "appwrite";
import Link from "next/link";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";

export default function PostVehiclePage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    make: "",
    model: "",
    rent: "",
    phoneNumber: "",
    available: true,
  });
  const [image, setImage] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [validationErrors, setValidationErrors] = useState({
    make: "",
    model: "",
    rent: "",
    phoneNumber: "",
  });

  // Check authentication on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        await account.get();
        setLoading(false);
      } catch (err: any) {
        console.error("Auth check error:", err);
        router.push("/login");
      }
    };
    checkAuth();
  }, [router]);

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
      errors.make = "Make is required, 1–50 characters, letters, numbers, or hyphens only";
      isValid = false;
    }
    if (!formData.model || formData.model.length < 1 || formData.model.length > 50 || !/^[a-zA-Z0-9\s-]+$/.test(formData.model)) {
      errors.model = "Model is required, 1–50 characters, letters, numbers, or hyphens only";
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

  // Handle input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    let sanitizedValue = value;

    if (name === "phoneNumber") {
      // Allow only digits and optional + at start
      sanitizedValue = value.replace(/[^\d+]/g, '');
      if (sanitizedValue.startsWith("+")) {
        sanitizedValue = "+" + sanitizedValue.slice(1).replace(/\+/g, '');
      } else {
        sanitizedValue = sanitizedValue.replace(/\+/g, '');
      }
    }

    setFormData({ ...formData, [name]: sanitizedValue });
    setValidationErrors({ ...validationErrors, [name]: "" });
  };

  // Handle image change
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setImage(e.target.files[0]);
    }
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setSubmitting(true);
    setError("");

    try {
      const user = await account.get();
      if (!user) {
        setError("Please log in to post a vehicle.");
        router.push("/login");
        return;
      }

      let imageId = null;
      if (image) {
        const uploadedImage = await storage.createFile(
          "683f17410024cac04c95",
          ID.unique(),
          image
        );
        imageId = uploadedImage.$id;
      }

      await databases.createDocument(
        "683c12240008dd99a491",
        "683f0ae40007ef135182",
        ID.unique(),
        {
          ownerId: user.$id,
          make: formData.make,
          model: formData.model,
          rent: parseFloat(formData.rent),
          phoneNumber: formData.phoneNumber,
          imageId,
          available: formData.available,
        }
      );

      alert("Car posted successfully!");
      router.push("/dashboard");
    } catch (err: any) {
      console.error("Post vehicle error:", err);
      if (err.code === 401) {
        setError("Session expired. Please log in again.");
        router.push("/login");
      } else {
        setError("Failed to post vehicle. Please try again later.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center py-16">
        <div className="bg-gray-900 p-6 rounded-xl w-full max-w-md shadow-sm animate-pulse">
          <div className="h-8 bg-gray-800 rounded w-3/4 mb-6 mx-auto"></div>
          <div className="space-y-4">
            <div className="h-10 bg-gray-800 rounded"></div>
            <div className="h-10 bg-gray-800 rounded"></div>
            <div className="h-10 bg-gray-800 rounded"></div>
            <div className="h-10 bg-gray-800 rounded"></div>
            <div className="h-10 bg-gray-800 rounded"></div>
            <div className="h-12 bg-gray-800 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center py-16">
      <div className="bg-gray-900 p-6 rounded-xl w-full max-w-md shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-white text-center flex-1">
            Post a Car
          </h1>
          <Link
            href="https://car-share-alpha/dashboard"
            className="flex items-center text-gray-400 hover:text-white transition-colors"
          >
            <ArrowLeftIcon className="w-5 h-5 mr-2" />
            Back
          </Link>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-500 text-white px-4 py-2 rounded-lg shadow-lg">
              {error}
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">
              Car Make
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
            <label className="block text-sm font-medium text-gray-400 mb-1">
              Car Model
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
            <label className="block text-sm font-medium text-gray-400 mb-1">
              Rent per Day ($)
            </label>
            <input
              type="number"
              name="rent"
              value={formData.rent}
              onChange={handleInputChange}
              className={`w-full px-4 py-2 bg-gray-800 border ${validationErrors.rent ? "border-red-500" : "border-gray-700"} rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white`}
              required
              min="1"
              step="0.01"
              max="10000"
            />
            {validationErrors.rent && (
              <p className="text-red-500 text-sm mt-1">{validationErrors.rent}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">
              Phone Number
            </label>
            <input
              type="tel"
              name="phoneNumber"
              value={formData.phoneNumber}
              onChange={handleInputChange}
              className={`w-full px-4 py-2 bg-gray-800 border ${validationErrors.phoneNumber ? "border-red-500" : "border-gray-700"} rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white`}
              required
              placeholder="+12345678901"
            />
            <p className="mt-1 text-sm text-gray-500">
              Enter a valid phone number (10–12 digits, optional country code)
            </p>
            {validationErrors.phoneNumber && (
              <p className="text-red-500 text-sm mt-1">{validationErrors.phoneNumber}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">
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
            <label className="block text-sm font-medium text-gray-400 mb-1">
              Car Image
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white"
            />
          </div>
          <button
            type="submit"
            disabled={submitting || Object.values(validationErrors).some(error => error)}
            className={`w-full py-3 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors ${
              submitting || Object.values(validationErrors).some(error => error) ? "opacity-50 cursor-not-allowed" : ""
            }`}
          >
            {submitting ? "Posting..." : "Post Car"}
          </button>
        </form>
      </div>
    </div>
  );
}
