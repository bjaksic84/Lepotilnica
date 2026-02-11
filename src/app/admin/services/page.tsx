"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import Link from "next/link";

type Category = {
    id: number;
    name: string;
    description: string | null;
    createdAt: string;
};

type Service = {
    id: number;
    categoryId: number;
    name: string;
    description: string | null;
    price: number;
    duration: number;
    isPopular: boolean;
    createdAt: string;
};

export default function AdminServicesPage() {
    const [categories, setCategories] = useState<Category[]>([]);
    const [services, setServices] = useState<Service[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<"categories" | "services">("categories");

    // Category Form State
    const [categoryForm, setCategoryForm] = useState({ name: "", description: "" });
    const [editingCategoryId, setEditingCategoryId] = useState<number | null>(null);

    // Service Form State
    const [serviceForm, setServiceForm] = useState({
        categoryId: 0,
        name: "",
        description: "",
        price: 0,
        duration: 60,
        isPopular: false,
    });
    const [editingServiceId, setEditingServiceId] = useState<number | null>(null);

    const router = useRouter();

    const fetchCategories = async () => {
        try {
            const res = await fetch("/api/admin/categories");
            if (res.status === 401) {
                router.push("/admin/login");
                return;
            }
            const data = await res.json();
            setCategories(data);
        } catch (error) {
            console.error("Failed to fetch categories:", error);
        }
    };

    const fetchServices = async () => {
        try {
            const res = await fetch("/api/admin/services");
            if (res.status === 401) {
                router.push("/admin/login");
                return;
            }
            const data = await res.json();
            setServices(data);
        } catch (error) {
            console.error("Failed to fetch services:", error);
        }
    };

    useEffect(() => {
        Promise.all([fetchCategories(), fetchServices()]).finally(() => setLoading(false));
    }, []);

    // Category Handlers
    const handleCategorySubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingCategoryId) {
                await fetch(`/api/admin/categories/${editingCategoryId}`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(categoryForm),
                });
            } else {
                await fetch("/api/admin/categories", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(categoryForm),
                });
            }
            setCategoryForm({ name: "", description: "" });
            setEditingCategoryId(null);
            fetchCategories();
        } catch (error) {
            alert("Failed to save category");
        }
    };

    const handleCategoryEdit = (category: Category) => {
        setCategoryForm({ name: category.name, description: category.description || "" });
        setEditingCategoryId(category.id);
    };

    const handleCategoryDelete = async (id: number) => {
        if (!confirm("Are you sure? This will also delete all services in this category.")) return;
        try {
            await fetch(`/api/admin/categories/${id}`, { method: "DELETE" });
            fetchCategories();
            fetchServices();
        } catch (error) {
            alert("Failed to delete category");
        }
    };

    // Service Handlers
    const handleServiceSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingServiceId) {
                await fetch(`/api/admin/services/${editingServiceId}`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(serviceForm),
                });
            } else {
                await fetch("/api/admin/services", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(serviceForm),
                });
            }
            setServiceForm({ categoryId: 0, name: "", description: "", price: 0, duration: 60, isPopular: false });
            setEditingServiceId(null);
            fetchServices();
        } catch (error) {
            alert("Failed to save service");
        }
    };

    const handleServiceEdit = (service: Service) => {
        setServiceForm({
            ...service,
            description: service.description || "", // Convert null to empty string
        });
        setEditingServiceId(service.id);
        setActiveTab("services");
    };

    const handleServiceDelete = async (id: number) => {
        if (!confirm("Are you sure you want to delete this service?")) return;
        try {
            await fetch(`/api/admin/services/${id}`, { method: "DELETE" });
            fetchServices();
        } catch (error) {
            alert("Failed to delete service");
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-500" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 pt-24 pb-20">
            <div className="container mx-auto px-4 max-w-7xl">
                <div className="mb-8">
                    <Link href="/admin" className="text-yellow-600 text-sm font-bold hover:underline mb-4 inline-block">← Back to Dashboard</Link>
                    <h1 className="text-4xl font-playfair font-bold text-gray-900">Service Management</h1>
                    <p className="text-gray-500 mt-1">Manage categories and services for your website.</p>
                </div>

                {/* Dashboard Navigation */}
                <div className="flex gap-4 mb-8">
                    <Link href="/admin" className="px-6 py-3 rounded-xl font-bold bg-white text-gray-600 hover:bg-gray-100 transition-all">Bookings</Link>
                    <div className="px-6 py-3 rounded-xl font-bold bg-yellow-500 text-white shadow-lg cursor-default">Services</div>
                </div>

                {/* Tabs */}
                <div className="flex gap-4 mb-8">
                    <button
                        onClick={() => setActiveTab("categories")}
                        className={`px-6 py-3 rounded-xl font-bold transition-all ${activeTab === "categories"
                            ? "bg-yellow-500 text-white shadow-lg"
                            : "bg-white text-gray-600 hover:bg-gray-100"
                            }`}
                    >
                        Categories
                    </button>
                    <button
                        onClick={() => setActiveTab("services")}
                        className={`px-6 py-3 rounded-xl font-bold transition-all ${activeTab === "services"
                            ? "bg-yellow-500 text-white shadow-lg"
                            : "bg-white text-gray-600 hover:bg-gray-100"
                            }`}
                    >
                        Services
                    </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Form Section */}
                    <div className="lg:col-span-1">
                        {activeTab === "categories" ? (
                            <div className="glass-panel p-6 rounded-2xl sticky top-24">
                                <h2 className="text-2xl font-playfair font-bold text-gray-900 mb-4">
                                    {editingCategoryId ? "Edit Category" : "Add Category"}
                                </h2>
                                <form onSubmit={handleCategorySubmit} className="space-y-4">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Name</label>
                                        <input
                                            type="text"
                                            value={categoryForm.name}
                                            onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                                            className="w-full px-4 py-3 rounded-xl bg-white border border-gray-200 focus:ring-2 focus:ring-yellow-400 outline-none"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Description</label>
                                        <textarea
                                            value={categoryForm.description}
                                            onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
                                            className="w-full px-4 py-3 rounded-xl bg-white border border-gray-200 focus:ring-2 focus:ring-yellow-400 outline-none resize-none"
                                            rows={3}
                                        />
                                    </div>
                                    <div className="flex gap-2">
                                        <button type="submit" className="flex-1 btn-primary">
                                            {editingCategoryId ? "Update" : "Create"}
                                        </button>
                                        {editingCategoryId && (
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setCategoryForm({ name: "", description: "" });
                                                    setEditingCategoryId(null);
                                                }}
                                                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-xl font-bold hover:bg-gray-300"
                                            >
                                                Cancel
                                            </button>
                                        )}
                                    </div>
                                </form>
                            </div>
                        ) : (
                            <div className="glass-panel p-6 rounded-2xl sticky top-24">
                                <h2 className="text-2xl font-playfair font-bold text-gray-900 mb-4">
                                    {editingServiceId ? "Edit Service" : "Add Service"}
                                </h2>
                                <form onSubmit={handleServiceSubmit} className="space-y-4">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Category</label>
                                        <select
                                            value={serviceForm.categoryId}
                                            onChange={(e) => setServiceForm({ ...serviceForm, categoryId: parseInt(e.target.value) })}
                                            className="w-full px-4 py-3 rounded-xl bg-white border border-gray-200 focus:ring-2 focus:ring-yellow-400 outline-none"
                                            required
                                        >
                                            <option value={0}>Select Category</option>
                                            {categories.map((cat) => (
                                                <option key={cat.id} value={cat.id}>{cat.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Service Name</label>
                                        <input
                                            type="text"
                                            value={serviceForm.name}
                                            onChange={(e) => setServiceForm({ ...serviceForm, name: e.target.value })}
                                            className="w-full px-4 py-3 rounded-xl bg-white border border-gray-200 focus:ring-2 focus:ring-yellow-400 outline-none"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Description</label>
                                        <textarea
                                            value={serviceForm.description}
                                            onChange={(e) => setServiceForm({ ...serviceForm, description: e.target.value })}
                                            className="w-full px-4 py-3 rounded-xl bg-white border border-gray-200 focus:ring-2 focus:ring-yellow-400 outline-none resize-none"
                                            rows={3}
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Price (€)</label>
                                            <input
                                                type="number"
                                                value={serviceForm.price}
                                                onChange={(e) => setServiceForm({ ...serviceForm, price: parseInt(e.target.value) })}
                                                className="w-full px-4 py-3 rounded-xl bg-white border border-gray-200 focus:ring-2 focus:ring-yellow-400 outline-none"
                                                required
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Duration (min)</label>
                                            <input
                                                type="number"
                                                value={serviceForm.duration}
                                                onChange={(e) => setServiceForm({ ...serviceForm, duration: parseInt(e.target.value) })}
                                                className="w-full px-4 py-3 rounded-xl bg-white border border-gray-200 focus:ring-2 focus:ring-yellow-400 outline-none"
                                                required
                                            />
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <input
                                            type="checkbox"
                                            id="isPopular"
                                            checked={serviceForm.isPopular}
                                            onChange={(e) => setServiceForm({ ...serviceForm, isPopular: e.target.checked })}
                                            className="w-5 h-5 text-yellow-500 rounded focus:ring-yellow-400"
                                        />
                                        <label htmlFor="isPopular" className="text-sm font-medium text-gray-700">
                                            Mark as Popular (show on homepage)
                                        </label>
                                    </div>
                                    <div className="flex gap-2">
                                        <button type="submit" className="flex-1 btn-primary">
                                            {editingServiceId ? "Update" : "Create"}
                                        </button>
                                        {editingServiceId && (
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setServiceForm({ categoryId: 0, name: "", description: "", price: 0, duration: 60, isPopular: false });
                                                    setEditingServiceId(null);
                                                }}
                                                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-xl font-bold hover:bg-gray-300"
                                            >
                                                Cancel
                                            </button>
                                        )}
                                    </div>
                                </form>
                            </div>
                        )}
                    </div>

                    {/* List Section */}
                    <div className="lg:col-span-2 space-y-6">
                        {activeTab === "categories" ? (
                            <div className="space-y-4">
                                {categories.length === 0 ? (
                                    <div className="glass-card p-12 rounded-2xl text-center">
                                        <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                                        <h3 className="text-xl font-playfair font-bold text-gray-400 mb-2">No Categories Yet</h3>
                                        <p className="text-gray-400">Create your first category using the form on the left to start organizing your services.</p>
                                    </div>
                                ) : categories.map((category) => (
                                    <motion.div
                                        key={category.id}
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="glass-card p-6 rounded-2xl"
                                    >
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <h3 className="text-2xl font-playfair font-bold text-gray-900">{category.name}</h3>
                                                <p className="text-gray-600 mt-1">{category.description || "No description"}</p>
                                                <p className="text-xs text-gray-400 mt-2">
                                                    {services.filter((s) => s.categoryId === category.id).length} service(s)
                                                </p>
                                            </div>
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => handleCategoryEdit(category)}
                                                    className="p-2 text-yellow-600 hover:bg-yellow-50 rounded-full"
                                                    title="Edit"
                                                >
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                    </svg>
                                                </button>
                                                <button
                                                    onClick={() => handleCategoryDelete(category.id)}
                                                    className="p-2 text-red-500 hover:bg-red-50 rounded-full"
                                                    title="Delete"
                                                >
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                    </svg>
                                                </button>
                                            </div>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {services.length === 0 ? (
                                    <div className="glass-card p-12 rounded-2xl text-center">
                                        <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                                        <h3 className="text-xl font-playfair font-bold text-gray-400 mb-2">No Services Yet</h3>
                                        <p className="text-gray-400">{categories.length === 0 ? "First create a category, then add services to it." : "Add your first service using the form on the left."}</p>
                                    </div>
                                ) : services.map((service) => {
                                    const category = categories.find((c) => c.id === service.categoryId);
                                    return (
                                        <motion.div
                                            key={service.id}
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            className="glass-card p-6 rounded-2xl"
                                        >
                                            <div className="flex justify-between items-start">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-3 mb-2">
                                                        <h3 className="text-2xl font-playfair font-bold text-gray-900">{service.name}</h3>
                                                        {service.isPopular && (
                                                            <span className="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs font-bold rounded-full">
                                                                POPULAR
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="text-gray-600 mb-3">{service.description || "No description"}</p>
                                                    <div className="flex gap-4 text-sm text-gray-500">
                                                        <span className="font-medium">Category: {category?.name || "Unknown"}</span>
                                                        <span>•</span>
                                                        <span className="font-bold text-yellow-600">€{service.price}</span>
                                                        <span>•</span>
                                                        <span>{service.duration} min</span>
                                                    </div>
                                                </div>
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => handleServiceEdit(service)}
                                                        className="p-2 text-yellow-600 hover:bg-yellow-50 rounded-full"
                                                        title="Edit"
                                                    >
                                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                        </svg>
                                                    </button>
                                                    <button
                                                        onClick={() => handleServiceDelete(service.id)}
                                                        className="p-2 text-red-500 hover:bg-red-50 rounded-full"
                                                        title="Delete"
                                                    >
                                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                        </svg>
                                                    </button>
                                                </div>
                                            </div>
                                        </motion.div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
