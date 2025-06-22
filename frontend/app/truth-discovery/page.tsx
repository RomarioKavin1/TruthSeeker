"use client";

import { useState, useEffect } from "react";
import { useWallet } from "../components/ClientWalletProvider";
import Link from "next/link";

interface ContentItem {
  id: string;
  title: string;
  content: string;
  author: string;
  timestamp: string;
  truthScore: number;
  verificationCount: number;
  status: "verified" | "pending" | "disputed";
  tags: string[];
}

export default function TruthDiscoveryPage() {
  const { wallet } = useWallet();
  const [contentItems, setContentItems] = useState<ContentItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [newContent, setNewContent] = useState({
    title: "",
    content: "",
    tags: "",
  });
  const [showSubmitForm, setShowSubmitForm] = useState(false);

  // Mock data for demonstration
  useEffect(() => {
    const mockContent: ContentItem[] = [
      {
        id: "1",
        title: "Climate Change Impact on Ocean Levels",
        content:
          "Recent studies show significant changes in global ocean levels due to climate change affecting coastal communities worldwide.",
        author: "0x1234...5678",
        timestamp: "2024-01-15T10:30:00Z",
        truthScore: 0.92,
        verificationCount: 15,
        status: "verified",
        tags: ["climate", "science", "research"],
      },
      {
        id: "2",
        title: "New Blockchain Consensus Algorithm",
        content:
          "A revolutionary consensus mechanism that reduces energy consumption by 90% while maintaining security and decentralization.",
        author: "0x9876...4321",
        timestamp: "2024-01-14T14:20:00Z",
        truthScore: 0.78,
        verificationCount: 8,
        status: "pending",
        tags: ["blockchain", "technology", "consensus"],
      },
      {
        id: "3",
        title: "Medical Breakthrough in Cancer Treatment",
        content:
          "Researchers claim to have discovered a new treatment method with 95% success rate in clinical trials.",
        author: "0xabcd...efgh",
        timestamp: "2024-01-13T09:15:00Z",
        truthScore: 0.65,
        verificationCount: 23,
        status: "disputed",
        tags: ["medical", "research", "healthcare"],
      },
    ];
    setContentItems(mockContent);
  }, []);

  const filteredContent = contentItems.filter((item) => {
    const matchesCategory =
      selectedCategory === "all" ||
      item.status === selectedCategory ||
      item.tags.includes(selectedCategory);
    const matchesSearch =
      searchQuery === "" ||
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.tags.some((tag) =>
        tag.toLowerCase().includes(searchQuery.toLowerCase())
      );
    return matchesCategory && matchesSearch;
  });

  const submitContent = async () => {
    if (!wallet?.address || !newContent.title || !newContent.content) {
      return;
    }

    setLoading(true);
    try {
      // In a real implementation, this would submit to the blockchain
      const newItem: ContentItem = {
        id: Date.now().toString(),
        title: newContent.title,
        content: newContent.content,
        author: wallet.address,
        timestamp: new Date().toISOString(),
        truthScore: 0.5, // Initial neutral score
        verificationCount: 0,
        status: "pending",
        tags: newContent.tags
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean),
      };

      setContentItems((prev) => [newItem, ...prev]);
      setNewContent({ title: "", content: "", tags: "" });
      setShowSubmitForm(false);
    } catch (error) {
      console.error("Error submitting content:", error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "verified":
        return "text-green-600 bg-green-50 border-green-200";
      case "pending":
        return "text-yellow-600 bg-yellow-50 border-yellow-200";
      case "disputed":
        return "text-red-600 bg-red-50 border-red-200";
      default:
        return "text-gray-600 bg-gray-50 border-gray-200";
    }
  };

  const getTruthScoreColor = (score: number) => {
    if (score >= 0.8) return "text-green-600";
    if (score >= 0.6) return "text-yellow-600";
    return "text-red-600";
  };

  if (!wallet) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Wallet Required
          </h2>
          <p className="text-gray-600 mb-4">
            Please connect your Hyli wallet to access truth discovery features
          </p>
          <Link
            href="/"
            className="inline-block bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 transition-colors"
          >
            Go to Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-100">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <Link
                href="/"
                className="text-2xl font-bold text-gray-900 hover:text-purple-600 transition-colors"
              >
                TruthSeeker
              </Link>
              <span className="text-gray-400">|</span>
              <h2 className="text-lg font-semibold text-gray-700">
                Truth Discovery
              </h2>
            </div>
            <div className="flex items-center space-x-4">
              <div className="inline-flex items-center px-4 py-2 bg-purple-50 border border-purple-200 rounded-full">
                <div className="w-3 h-3 bg-purple-500 rounded-full mr-3"></div>
                <span className="text-sm font-medium text-gray-700">
                  {wallet.address.slice(0, 6)}...{wallet.address.slice(-4)}
                </span>
              </div>
              <Link
                href="/dashboard"
                className="text-sm text-gray-600 hover:text-gray-900 px-3 py-1 rounded-md hover:bg-gray-100 transition-colors"
              >
                Dashboard
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Title Section */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            <span className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              Truth Discovery Hub
            </span>
          </h1>
          <p className="text-lg text-gray-600">
            Community-driven content verification and truth scoring
          </p>
        </div>

        {/* Controls */}
        <div className="max-w-6xl mx-auto mb-8">
          <div className="bg-white rounded-2xl shadow-xl p-6">
            <div className="flex flex-wrap gap-4 items-center justify-between">
              {/* Search */}
              <div className="flex-1 min-w-64">
                <input
                  type="text"
                  placeholder="Search content, tags, or authors..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>

              {/* Category Filter */}
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="all">All Content</option>
                <option value="verified">Verified</option>
                <option value="pending">Pending</option>
                <option value="disputed">Disputed</option>
                <option value="science">Science</option>
                <option value="technology">Technology</option>
                <option value="medical">Medical</option>
              </select>

              {/* Submit Button */}
              <button
                onClick={() => setShowSubmitForm(!showSubmitForm)}
                className="px-6 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:from-purple-600 hover:to-pink-600 transition-colors font-medium"
              >
                📝 Submit Content
              </button>
            </div>
          </div>
        </div>

        {/* Submit Form */}
        {showSubmitForm && (
          <div className="max-w-4xl mx-auto mb-8">
            <div className="bg-white rounded-2xl shadow-xl p-8">
              <h3 className="text-xl font-bold text-gray-900 mb-6">
                Submit New Content
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Title
                  </label>
                  <input
                    type="text"
                    value={newContent.title}
                    onChange={(e) =>
                      setNewContent((prev) => ({
                        ...prev,
                        title: e.target.value,
                      }))
                    }
                    placeholder="Enter content title..."
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Content
                  </label>
                  <textarea
                    value={newContent.content}
                    onChange={(e) =>
                      setNewContent((prev) => ({
                        ...prev,
                        content: e.target.value,
                      }))
                    }
                    placeholder="Enter your content for verification..."
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                    rows={4}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tags (comma-separated)
                  </label>
                  <input
                    type="text"
                    value={newContent.tags}
                    onChange={(e) =>
                      setNewContent((prev) => ({
                        ...prev,
                        tags: e.target.value,
                      }))
                    }
                    placeholder="science, research, technology..."
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
                <div className="flex gap-4">
                  <button
                    onClick={submitContent}
                    disabled={
                      loading || !newContent.title || !newContent.content
                    }
                    className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:from-purple-600 hover:to-pink-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                  >
                    {loading ? "Submitting..." : "📤 Submit for Verification"}
                  </button>
                  <button
                    onClick={() => setShowSubmitForm(false)}
                    className="px-6 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors font-medium"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Content Grid */}
        <div className="max-w-6xl mx-auto">
          <div className="grid gap-6">
            {filteredContent.map((item) => (
              <div
                key={item.id}
                className="bg-white rounded-2xl shadow-xl p-8 hover:shadow-2xl transition-shadow"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-gray-900 mb-2">
                      {item.title}
                    </h3>
                    <p className="text-gray-600 mb-4">{item.content}</p>

                    {/* Tags */}
                    <div className="flex flex-wrap gap-2 mb-4">
                      {item.tags.map((tag) => (
                        <span
                          key={tag}
                          className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-medium"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Status Badge */}
                  <div
                    className={`px-3 py-1 rounded-full border text-sm font-medium ${getStatusColor(
                      item.status
                    )}`}
                  >
                    {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                  </div>
                </div>

                {/* Metrics */}
                <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                  <div className="flex items-center space-x-6">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-gray-500">
                        Truth Score:
                      </span>
                      <span
                        className={`text-sm font-bold ${getTruthScoreColor(
                          item.truthScore
                        )}`}
                      >
                        {(item.truthScore * 100).toFixed(0)}%
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-gray-500">
                        Verifications:
                      </span>
                      <span className="text-sm font-medium text-gray-900">
                        {item.verificationCount}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-gray-500">Author:</span>
                      <span className="text-sm font-mono text-gray-700">
                        {item.author}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors text-sm font-medium">
                      ✅ Verify
                    </button>
                    <button className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-sm font-medium">
                      ❌ Dispute
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {filteredContent.length === 0 && (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-100 rounded-full mx-auto mb-4 flex items-center justify-center">
                <span className="text-gray-400 text-2xl">🔍</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                No Content Found
              </h3>
              <p className="text-gray-600">
                Try adjusting your search or filter criteria
              </p>
            </div>
          )}
        </div>

        {/* Info Section */}
        <div className="max-w-6xl mx-auto mt-12">
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <h3 className="text-xl font-bold text-gray-900 mb-6 text-center">
              How Truth Discovery Works
            </h3>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="w-12 h-12 bg-purple-100 rounded-full mx-auto mb-3 flex items-center justify-center">
                  <span className="text-purple-600 text-xl">📝</span>
                </div>
                <h4 className="font-semibold text-gray-900 mb-2">
                  Submit Content
                </h4>
                <p className="text-sm text-gray-600">
                  Share information for community verification
                </p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-blue-100 rounded-full mx-auto mb-3 flex items-center justify-center">
                  <span className="text-blue-600 text-xl">🔍</span>
                </div>
                <h4 className="font-semibold text-gray-900 mb-2">
                  Community Verification
                </h4>
                <p className="text-sm text-gray-600">
                  Experts and community members verify claims
                </p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-green-100 rounded-full mx-auto mb-3 flex items-center justify-center">
                  <span className="text-green-600 text-xl">📊</span>
                </div>
                <h4 className="font-semibold text-gray-900 mb-2">
                  Truth Scoring
                </h4>
                <p className="text-sm text-gray-600">
                  Blockchain-verified truth scores based on consensus
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
