"use client";

import { useEffect, useState } from "react";

interface BackendStatusProps {
  size?: "small" | "large";
  showLabel?: boolean;
  className?: string;
}

export default function BackendStatus({
  size = "small",
  showLabel = true,
  className = "",
}: BackendStatusProps) {
  const [backendStatus, setBackendStatus] = useState<
    "checking" | "online" | "offline"
  >("checking");

  useEffect(() => {
    const checkBackendHealth = async () => {
      try {
        const response = await fetch("http://localhost:5001/health", {
          method: "GET",
        });
        setBackendStatus(response.ok ? "online" : "offline");
      } catch {
        setBackendStatus("offline");
      }
    };

    checkBackendHealth();
    // Check every 30 seconds
    const interval = setInterval(checkBackendHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  const getStatusConfig = () => {
    switch (backendStatus) {
      case "online":
        return {
          color: "bg-green-500",
          text: "BACKEND ONLINE",
          textColor: "text-green-600",
          borderColor: "border-green-500",
          bgColor: "bg-green-50",
        };
      case "offline":
        return {
          color: "bg-red-500",
          text: "BACKEND OFFLINE",
          textColor: "text-red-600",
          borderColor: "border-red-500",
          bgColor: "bg-red-50",
        };
      default:
        return {
          color: "bg-yellow-500 animate-pulse",
          text: "CHECKING...",
          textColor: "text-yellow-600",
          borderColor: "border-yellow-500",
          bgColor: "bg-yellow-50",
        };
    }
  };

  const statusConfig = getStatusConfig();
  const dotSize = size === "large" ? "w-4 h-4" : "w-2 h-2";
  const textSize = size === "large" ? "text-base" : "text-xs";

  if (size === "large") {
    return (
      <div
        className={`${statusConfig.bgColor} ${statusConfig.borderColor} border-4 p-4 ${className}`}
      >
        <div className="flex items-center gap-3">
          <div
            className={`${dotSize} rounded-full ${statusConfig.color}`}
          ></div>
          <div>
            <div
              className={`font-bold uppercase ${textSize} ${statusConfig.textColor}`}
            >
              {statusConfig.text}
            </div>
            <div className="text-xs text-gray-600 font-mono">
              {backendStatus === "online"
                ? "All steganography services operational"
                : backendStatus === "offline"
                ? "Unable to connect to backend services"
                : "Establishing connection to backend..."}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className={`${dotSize} rounded-full ${statusConfig.color}`}></div>
      {showLabel && (
        <span className={`font-mono ${textSize} ${statusConfig.textColor}`}>
          {statusConfig.text}
        </span>
      )}
    </div>
  );
}
