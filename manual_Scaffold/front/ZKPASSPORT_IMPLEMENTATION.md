# ZKPassport Implementation in TruthSeeker Front

This document describes the implementation of ZKPassport verification in the TruthSeeker front folder, including zkproof generation, verification, and onchain verification on both Ethereum Sepolia and the Hyli network.

## Overview

The implementation provides:

1. **ZK Proof Generation** - Using ZKPassport SDK to generate zero-knowledge proofs
2. **Ethereum Verification** - On-chain verification using Ethereum Sepolia testnet
3. **Hyli Network Integration** - Custom zkpassport contract verification on Hyli blockchain
4. **User Interface** - React component for seamless user experience

## Architecture

### Frontend Components

#### 1. ZKPassportVerification Component (`src/components/ZKPassportVerification.tsx`)

- **Purpose**: Main React component for ZK passport verification
- **Features**:
  - QR code generation for mobile app scanning
  - Real-time status updates during proof generation
  - Ethereum Sepolia on-chain verification
  - Hyli network submission and verification
  - Proof data display and management

#### 2. Integration with HyliWallet

- Uses `useWallet` hook from hyli-wallet for user address
- Seamlessly integrates with existing wallet infrastructure
- Supports session key management for zkpassport transactions

#### 3. Styling (`src/ZKPassportStyles.css`)

- Modern gradient-based design
- Responsive layout for all screen sizes
- Real-time status indicators
- Smooth animations and transitions

### Backend Integration

#### 1. Server Endpoint (`app_scaffold/server/src/app.rs`)

- **Route**: `POST /api/zkpassport/verify`
- **Purpose**: Submit ZK verification results to Hyli network
- **Features**:
  - Accepts ZKPassport proof data
  - Creates blockchain transaction on Hyli
  - Returns transaction hash for tracking

#### 2. ZKPassport Contract (`app_scaffold/contracts/zkpassport/`)

- **Purpose**: Smart contract for identity verification on Hyli
- **Actions**:
  - `VerifyIdentity`: Store verified user data
  - `CheckVerification`: Query verification status
- **Data Structure**:
  ```rust
  struct ZKPassportProof {
      proof: String,
      vkey_hash: String,
      name: String,
      version: String,
      committed_inputs: CommittedInputs,
  }
  ```

## User Flow

1. **Connect Wallet**: User connects their Hyli wallet
2. **Initiate Verification**: Click "🔐 ZK Passport" button
3. **Scan QR Code**: Use ZKPassport mobile app to scan generated QR code
4. **Mobile Verification**: Complete identity verification on mobile device
5. **Proof Generation**: ZK proof is generated using zero-knowledge cryptography
6. **Ethereum Verification**: Proof is verified on Ethereum Sepolia testnet
7. **Hyli Submission**: If Ethereum verification succeeds, proof is submitted to Hyli network
8. **Confirmation**: User receives confirmation of successful verification

## Technical Details

### Dependencies Added

```json
{
  "@zkpassport/sdk": "^0.5.5",
  "react-qr-code": "^2.0.16",
  "viem": "^2.0.0"
}
```

### Environment Variables

```bash
VITE_SERVER_BASE_URL=http://localhost:4001
VITE_NODE_BASE_URL=http://localhost:4000
VITE_WALLET_SERVER_BASE_URL=http://localhost:4002
VITE_WALLET_WS_URL=ws://localhost:4003
```

### ZKPassport Configuration

- **Scope**: "adult" (age verification ≥18)
- **Mode**: "compressed-evm" for efficiency
- **Chain**: Ethereum Sepolia for initial verification
- **Dev Mode**: Enabled for development/testing

## Integration Points

### 1. Ethereum Sepolia Verification

```typescript
const params = zkPassportRef.current.getSolidityVerifierParameters({
  proof,
  scope: "adult",
  devMode: true,
});

const { address, abi, functionName } =
  zkPassportRef.current.getSolidityVerifierDetails("ethereum_sepolia");

const contractCallResult = await publicClient.readContract({
  address,
  abi,
  functionName,
  args: [params],
});
```

### 2. Hyli Network Submission

```typescript
const zkPassportAction = {
  VerifyIdentity: {
    proof: {
      proof: proof.proof,
      vkey_hash: proof.vkeyHash || "",
      name: proof.name || "outer_evm_count_5",
      version: proof.version || "1.0.0",
      committed_inputs: {
        compare_age_evm: {
          current_date: new Date().toISOString().split("T")[0],
          min_age: 18,
          max_age: 120,
        },
        bind_evm: {
          data: {
            user_address: userAddress,
            custom_data: `verified_at:${new Date().toISOString()}`,
          },
        },
      },
    },
    hyli_identity: userAddress,
  },
};
```

## Security Features

1. **Zero-Knowledge Proofs**: User identity data never leaves their device
2. **Age Verification**: Cryptographic proof of being ≥18 without revealing exact age
3. **Unique Identifiers**: Each verification generates a unique, non-correlatable ID
4. **Dual Verification**: Both Ethereum and Hyli network verification for redundancy
5. **Session Management**: Secure session keys for transaction signing

## UI Features

1. **Real-time Status**: Live updates during each verification step
2. **QR Code Display**: Easy mobile app integration
3. **Multi-step Feedback**: Clear indication of verification progress
4. **Error Handling**: Comprehensive error messages and recovery options
5. **Responsive Design**: Works on all device sizes

## Testing

### Prerequisites

1. ZKPassport mobile app installed
2. Ethereum Sepolia testnet access
3. Hyli wallet with test tokens
4. Valid identity document for verification

### Test Flow

1. Start the development server: `npm run dev`
2. Connect your Hyli wallet
3. Click "🔐 ZK Passport" button
4. Scan QR code with ZKPassport mobile app
5. Complete identity verification on mobile
6. Verify all three verification statuses show "✅ Verified"

## Production Deployment

### Checklist

- [ ] Disable `devMode` in ZKPassport configuration
- [ ] Update RPC endpoints to mainnet
- [ ] Configure proper CORS policies
- [ ] Set up monitoring for verification endpoints
- [ ] Implement rate limiting for verification requests
- [ ] Add proper error logging and alerting

### Environment Variables for Production

```bash
VITE_SERVER_BASE_URL=https://your-api-domain.com
VITE_NODE_BASE_URL=https://your-hyli-node.com
VITE_WALLET_SERVER_BASE_URL=https://your-wallet-server.com
VITE_WALLET_WS_URL=wss://your-websocket-server.com
```

## Troubleshooting

### Common Issues

1. **QR Code Not Scanning**

   - Ensure mobile device has camera permissions
   - Check internet connectivity
   - Verify ZKPassport app is updated

2. **Ethereum Verification Fails**

   - Check Sepolia RPC endpoint status
   - Verify proof generation completed successfully
   - Ensure ZKPassport contract is deployed

3. **Hyli Submission Fails**

   - Verify wallet has sufficient gas
   - Check Hyli network connectivity
   - Ensure zkpassport contract is registered

4. **Build Errors**
   - Run `npm install` to ensure all dependencies are installed
   - Check TypeScript version compatibility
   - Verify environment variables are set

## Future Enhancements

1. **Multiple Identity Providers**: Support for different document types
2. **Batch Verification**: Process multiple users simultaneously
3. **Credential Storage**: Local encrypted storage of verification status
4. **Analytics Dashboard**: Verification metrics and monitoring
5. **Mobile SDK**: Direct integration without QR codes
6. **Cross-chain Support**: Additional blockchain network support

## Support

For technical support or questions about the ZKPassport implementation:

1. Check the troubleshooting section above
2. Review the ZKPassport SDK documentation
3. Contact the development team for specific integration issues

---

**Note**: This implementation is designed for the TruthSeeker platform and integrates specifically with the Hyli blockchain ecosystem. For other blockchain integrations, modification of the verification endpoints and contract interactions may be required.
