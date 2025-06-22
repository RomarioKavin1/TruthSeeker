"use client";

import { useWallet } from "./ClientWalletProvider";
import Link from "next/link";

export default function WalletAwareHome() {
  const { wallet, logout } = useWallet();

  if (!wallet) {
    return (
      <div className="wallet-page-wrapper">
        <div className="landing-content-simple">
          <h1 className="hero-title">
            <span className="gradient-text">TruthSeeker</span>
          </h1>
          <p className="hero-subtitle">
            Discover truth through zero-knowledge proofs and blockchain
            verification on the Hyli network
          </p>
          {/* HyliWallet component will be rendered here by ClientWalletProvider */}
        </div>
        <div className="floating-shapes">
          <div className="shape shape-1"></div>
          <div className="shape shape-2"></div>
          <div className="shape shape-3"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="App">
      <button
        className="logout-button"
        onClick={logout}
        style={{ position: "absolute", top: "24px", right: "24px" }}
      >
        Logout
      </button>

      <div className="app-header">
        <h1 className="app-title">TruthSeeker</h1>
        <p className="app-subtitle">
          Discover truth through zero-knowledge proofs and blockchain
          verification
        </p>
      </div>

      <div className="wallet-info">
        <div className="wallet-address">
          <span className="wallet-label">Connected Wallet:</span>
          <span className="wallet-value">
            {wallet.address || "Not connected"}
          </span>
        </div>
      </div>

      <div className="action-buttons">
        <Link
          href="/dashboard"
          className="blob-button"
          style={{
            textDecoration: "none",
            textAlign: "center",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          📊 Dashboard
        </Link>
        <Link
          href="/zkpass-wallet"
          className="zkpassport-toggle-button"
          style={{
            textDecoration: "none",
            textAlign: "center",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          🔐 ZK Passport
        </Link>
      </div>

      <div className="action-buttons" style={{ marginTop: "20px" }}>
        <Link
          href="/zkpass"
          className="zkpassport-toggle-button"
          style={{
            textDecoration: "none",
            textAlign: "center",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          🔐 Basic ZK
        </Link>
        <Link
          href="/steganography"
          className="zkpassport-toggle-button"
          style={{
            textDecoration: "none",
            textAlign: "center",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          🖼️ Steganography
        </Link>
      </div>

      <div className="action-buttons" style={{ marginTop: "20px" }}>
        <Link
          href="/truth-discovery"
          className="zkpassport-toggle-button"
          style={{
            textDecoration: "none",
            textAlign: "center",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          🔍 Truth Discovery
        </Link>
        <Link
          href="/hyli-verify"
          className="zkpassport-toggle-button"
          style={{
            textDecoration: "none",
            textAlign: "center",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          ⚡ Manual Verify
        </Link>
      </div>
    </div>
  );
}
