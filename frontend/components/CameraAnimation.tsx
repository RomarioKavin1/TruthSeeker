"use client";

import React, { useEffect, useRef } from "react";

const CameraAnimation: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const shape1Ref = useRef<SVGRectElement>(null);
  const shape2Ref = useRef<SVGCircleElement>(null);
  const shape3Ref = useRef<SVGPolygonElement>(null);
  const shape4Ref = useRef<SVGRectElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    const shape1 = shape1Ref.current;
    const shape2 = shape2Ref.current;
    const shape3 = shape3Ref.current;
    const shape4 = shape4Ref.current;

    if (!container || !shape1 || !shape2 || !shape3 || !shape4) return;

    // Simple CSS animations without gsap dependency
    const animateShapes = () => {
      const shapes = [shape1, shape2, shape3, shape4];
      shapes.forEach((shape, index) => {
        if (shape) {
          shape.style.animation = `float${index + 1} ${
            4 + index
          }s ease-in-out infinite alternate`;
        }
      });
    };

    // Add CSS keyframes for animations
    const style = document.createElement("style");
    style.textContent = `
      @keyframes float1 {
        0% { transform: translate(0, 0) rotate(0deg); opacity: 0.6; }
        100% { transform: translate(10px, -20px) rotate(45deg); opacity: 0.3; }
      }
      @keyframes float2 {
        0% { transform: translate(0, 0) scale(1); opacity: 0.6; }
        100% { transform: translate(-15px, 15px) scale(1.1); opacity: 0.3; }
      }
      @keyframes float3 {
        0% { transform: translate(0, 0) rotate(0deg); opacity: 0.6; }
        100% { transform: translate(20px, -10px) rotate(-30deg); opacity: 0.3; }
      }
      @keyframes float4 {
        0% { transform: translate(0, 0) rotate(0deg) scale(1); opacity: 0.6; }
        100% { transform: translate(-10px, 25px) rotate(90deg) scale(0.9); opacity: 0.3; }
      }
    `;
    document.head.appendChild(style);

    animateShapes();

    return () => {
      document.head.removeChild(style);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 pointer-events-none z-0 overflow-hidden"
    >
      <svg
        viewBox="0 0 1200 800"
        className="w-full h-full"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <filter id="glow">
            <feGaussianBlur stdDeviation="2" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Floating geometric shapes */}
        <rect
          ref={shape1Ref}
          x="100"
          y="150"
          width="20"
          height="20"
          fill="none"
          stroke="white"
          strokeWidth="2"
          opacity="0.6"
          filter="url(#glow)"
        />

        <circle
          ref={shape2Ref}
          cx="300"
          cy="400"
          r="15"
          fill="none"
          stroke="white"
          strokeWidth="2"
          opacity="0.6"
          filter="url(#glow)"
        />

        <polygon
          ref={shape3Ref}
          points="800,200 820,230 780,230"
          fill="none"
          stroke="white"
          strokeWidth="2"
          opacity="0.6"
          filter="url(#glow)"
        />

        <rect
          ref={shape4Ref}
          x="1000"
          y="500"
          width="25"
          height="15"
          fill="none"
          stroke="white"
          strokeWidth="2"
          opacity="0.6"
          filter="url(#glow)"
        />

        {/* Additional decorative elements */}
        <line
          x1="50"
          y1="300"
          x2="200"
          y2="310"
          stroke="white"
          strokeWidth="1"
          opacity="0.2"
          className="animate-pulse"
        />

        <line
          x1="900"
          y1="150"
          x2="1100"
          y2="160"
          stroke="white"
          strokeWidth="1"
          opacity="0.2"
          className="animate-pulse"
        />
      </svg>
    </div>
  );
};

export default CameraAnimation;
