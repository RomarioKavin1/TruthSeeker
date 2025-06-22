# **TruthSeeker**

- **Track(s):**

  - Hyli + ZKPassport
  - Hyli
  - ZKPassport

- **Team/Contributors:**

  - Romario Kavin – Full-Stack + Crypto Blockchain Engineer

- **Repository:**
  [[Repo](https://github.com/RomarioKavin1/TruthSeeker)]

---

## Description

**TruthSeeker** is a privacy-first proof-of-video authenticity platform that embeds **cryptographic proof directly inside video files using steganography**. It combats deepfakes by offering three escalating tiers of identity verification:

- **Anonymity** (ZKPassport Proof of Humanity),
- **Pseudo-Anonymity** (Hyli Wallet Signature),
- **Full Identity** (Hyli Protocol Identity Verification).

It's especially useful for whistleblowers, citizen journalists, and **government officials** — anyone needing to prove **"I am a real human" or "I truly said this"** without relying on centralized platforms or trust.

---

## Problem

Deepfakes are undermining trust in audio-visual content. In an era of AI-generated misinformation, there's no easy way to verify that a video came from a **real person** — let alone prove it came from a **specific, trusted source** like a government official or agency — **without relying on centralized authority or watermarking**.

---

## Solution

TruthSeeker offers a **zero-trust**, decentralized way to **cryptographically bind the video to the identity of its creator**, based on their privacy preference:

1. **Anonymity** – Just proves the speaker is human (via ZKPassport nullifier).
2. **Pseudo-Anonymity** – Links the proof to a Hyli wallet address.
3. **Full Identity** – Connects the video to a **Hyli Protocol identity**, verifying that a real, verifiable identity made the statement.

This is especially powerful in:

- **Government contexts**, where officials can publish provably signed video announcements (e.g., public safety, legislation, emergency alerts), cryptographically proving their origin.
- **Decentralized journalism**, where sources may wish to remain anonymous or pseudonymous but still provide irrefutable proof of authenticity.

The proof is **embedded into the video** itself using **steganography**, making the video a **portable, self-verifiable artifact**.

---

## Technology Stack

- **Frontend**: Next.js, TailwindCSS, TypeScript
- **Crypto & Identity**:
  - ZKPassport (Proof of Humanity via Zero-Knowledge Proofs DID)
  - Hyli (Blockchain)
- **Steganography**: Custom LSB embedding with border encoding
- **Storage**: IPFS (via Pinata)
- **Verification Layer**: CID + signature + stego decoder pipeline
- **Backend**: Python Flask server for steganographic processing

---

## How it's made

The platform follows a 5-step verification flow:

1. **Hyli Wallet Login** - Connect your Hyli wallet to establish identity
2. **ZKPassport Verification** - Prove humanity using zero-knowledge proofs
3. **Onchain Proof Verification** - Submit and verify proof on Hyli network
4. **Video Recording** - Record content with integrated camera
5. **Steganographic Processing** - Embed IPFS CID invisibly into video

The steganographic process uses both border encoding and LSB (Least Significant Bit) techniques to embed cryptographic proofs directly into video frames, making the verification inseparable from the content itself.

## Privacy Impact

- Enables proof-of-humanity or proof-of-identity **without revealing unnecessary personal info**.
- Zero central authority required to "approve" or "verify" videos.
- Proof embedded inside the video — not as external metadata.
- Empowers both **anonymous truth-tellers** and **verifiable public officials**.
- ZKPassport provides zero-knowledge proof of humanity without revealing actual identity.

---

## Real-World Use Cases

- **Government/Public Officials**:

  - Public figures can use Hyli Protocol to link official identities to videos.
  - Example: A minister posts a climate policy video announcement; with TruthSeeker, it's provable that it came from their verified Hyli identity, not an AI-generated deepfake.

- **Whistleblowers & Activists**:

  - Record video evidence anonymously, but prove it's real & human-made via ZKPassport.
  - Example: A protestor in a conflict zone records war crimes but wants to stay safe.

- **Citizen Journalists**:

  - Authenticate field footage with pseudonymous or verified Hyli credentials.

- **Social Media Platforms**:
  - TruthSeeker videos shared across platforms carry embedded, verifiable trust — regardless of platform censorship or central validation.

---

## What's Next

- Direct Integration with Hyli network for real-time proof verification
- Mobile browser & cross-platform support (iOS/Android)
- ZKPassport expansion to other verification protocols
- API/SDK for media platforms to auto-verify video content
- Integration with Hyli storage for immutable archival
- Watermark-free tamper detection based on embedded hashes
- Real-time recording + proof streaming support

---

## Tracks

### Hyli + ZKPassport

TruthSeeker is a strong contender for the Hyli + ZKPassport track because it demonstrates a comprehensive integration of both technologies:

**Hyli Integration:**

- Deployed on Hyli testnet with full wallet integration
- Uses Hyli Protocol for decentralized identity management
- Leverages Hyli network for onchain proof verification
- Implements Hyli transaction handling and state management

**ZKPassport Integration:**

- Integrates ZKPassport SDK for zero-knowledge proof generation
- Uses ZKPassport for proof-of-humanity without revealing identity
- Implements ZKPassport contract for onchain verification
- Provides privacy-preserving identity verification

**Combined Value:**

- Shows how Hyli and ZKPassport can work together for privacy-first applications
- Demonstrates real-world use case for both technologies
- Provides complete end-to-end solution for verifiable content

### Hyli

TruthSeeker qualifies for the Hyli track through comprehensive Hyli network integration:

- **Deployed Application**: Fully functional application deployed on Hyli testnet
- **Wallet Integration**: Complete Hyli wallet integration with transaction handling
- **Smart Contract**: Custom ZKPassport contract deployed on Hyli network
- **Identity Management**: Uses Hyli Protocol for decentralized identity
- **State Management**: Implements Hyli state commitments and contract execution

### ZKPassport

TruthSeeker demonstrates advanced ZKPassport usage:

- **Private Identity Verification**: Uses ZKPassport for zero-knowledge proof of humanity
- **SDK Integration**: Full integration with ZKPassport SDK
- **Contract Deployment**: Custom contract for ZKPassport proof verification
- **Privacy Preservation**: Implements privacy-first verification without revealing personal data
- **Real-World Application**: Practical use case for ZKPassport in content verification
