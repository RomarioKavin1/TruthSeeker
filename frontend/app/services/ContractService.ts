import { ProofResult } from "@zkpassport/sdk";

export interface ZKPassportAction {
  VerifyIdentity: {
    proof: {
      proof: string;
      vkey_hash: string;
      name: string;
      version: string;
      committed_inputs: {
        compare_age_evm: {
          current_date: string;
          min_age: number;
          max_age: number;
        };
        bind_evm: {
          data: {
            user_address: string;
            custom_data: string;
          };
        };
      };
    };
    hyli_identity: string;
  };
}

export interface ZKPassportVerifyRequest {
  blob: {
    contract_name: string;
    data: string;
  };
}

export class ContractService {
  private baseUrl: string;

  constructor() {
    this.baseUrl =
      process.env.NEXT_PUBLIC_SERVER_BASE_URL || "http://localhost:4002";
  }

  async submitZKPassportVerification(
    proof: ProofResult,
    userAddress: string
  ): Promise<{ tx_hash: string; status: string; message: string }> {
    try {
      // Prepare the zkpassport action for Hyli
      const zkPassportAction: ZKPassportAction = {
        VerifyIdentity: {
          proof: {
            proof: proof.proof || "",
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            vkey_hash: ((proof as any).vkeyHash || "") as string,
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

      // Create blob for Hyli transaction
      const blob = {
        contract_name: "zkpassport",
        data: zkPassportAction,
      };

      const headers = new Headers();
      headers.append("content-type", "application/json");
      headers.append("x-user", `${userAddress}@zkpassport`);
      headers.append("x-session-key", "zkpassport-session");
      headers.append("x-request-signature", "zkpassport-signature");

      const response = await fetch(`${this.baseUrl}/api/zkpassport/verify`, {
        method: "POST",
        headers: headers,
        body: JSON.stringify({ blob }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Hyli verification failed: ${errorText}`);
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error("Error submitting to Hyli network:", error);
      throw error;
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async getContractState(contractName: string): Promise<any> {
    try {
      const response = await fetch(
        `${this.baseUrl}/v1/indexer/contract/${contractName}/state`
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `HTTP error ${response.status}: ${errorText || response.statusText}`
        );
      }

      const text = await response.text();
      if (!text) {
        throw new Error("Empty response");
      }

      const data = JSON.parse(text);
      return data;
    } catch (error) {
      console.error(`Error fetching ${contractName} state:`, error);
      throw error;
    }
  }

  async pollTransactionStatus(txHash: string): Promise<string> {
    const maxAttempts = 30; // 30 seconds timeout
    let attempts = 0;

    while (attempts < maxAttempts) {
      try {
        const nodeUrl =
          process.env.NEXT_PUBLIC_NODE_BASE_URL || "http://localhost:4321";
        const response = await fetch(
          `${nodeUrl}/v1/indexer/transaction/hash/${txHash}`
        );

        if (!response.ok) {
          throw new Error(`HTTP error ${response.status}`);
        }

        const data = await response.json();
        if (data.transaction_status === "Success") {
          return "Success";
        }

        // Wait 1 second before next attempt
        await new Promise((resolve) => setTimeout(resolve, 1000));
        attempts++;
      } catch (error) {
        console.error("Error polling transaction:", error);
        // Continue polling even if there's an error
      }
    }

    throw new Error(
      `Transaction ${txHash} timed out after ${maxAttempts} seconds`
    );
  }
}

export const contractService = new ContractService();
