use borsh::{io::Error, BorshDeserialize, BorshSerialize};
use serde::{Deserialize, Serialize};
use sdk::RunResult;

#[cfg(feature = "client")]
pub mod client;

#[derive(Debug, Clone, Serialize, Deserialize, BorshSerialize, BorshDeserialize, PartialEq)]
pub struct ZKPassportProof {
    pub proof: String,
    pub vkey_hash: String,
    pub name: String,
    pub version: String,
    pub committed_inputs: CommittedInputs,
}

#[derive(Debug, Clone, Serialize, Deserialize, BorshSerialize, BorshDeserialize, PartialEq)]
pub struct CommittedInputs {
    pub compare_age_evm: CompareAgeEvm,
    pub bind_evm: BindEvm,
}

#[derive(Debug, Clone, Serialize, Deserialize, BorshSerialize, BorshDeserialize, PartialEq)]
pub struct CompareAgeEvm {
    pub current_date: String,
    pub min_age: u8,
    pub max_age: u8,
}

#[derive(Debug, Clone, Serialize, Deserialize, BorshSerialize, BorshDeserialize, PartialEq)]
pub struct BindEvm {
    pub data: BindEvmData,
}

#[derive(Debug, Clone, Serialize, Deserialize, BorshSerialize, BorshDeserialize, PartialEq)]
pub struct BindEvmData {
    pub user_address: String,
    pub custom_data: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, BorshSerialize, BorshDeserialize, PartialEq)]
pub struct VerifiedUser {
    pub unique_id: String,
    pub user_address: String,
    pub verified_at: String,
    pub age_verified: bool,
    pub custom_data: String,
}

#[derive(BorshSerialize, BorshDeserialize, Serialize, Deserialize, Debug, Clone, Default)]
pub struct ZKPassport {
    pub verified_users: Vec<VerifiedUser>,
}

#[derive(Serialize, Deserialize, BorshSerialize, BorshDeserialize, Debug, Clone, PartialEq)]
pub enum ZKPassportAction {
    VerifyIdentity {
        proof: ZKPassportProof,
        hyli_identity: String,
    },
    CheckVerification {
        user_address: String,
    },
}

impl sdk::ZkContract for ZKPassport {
    fn execute(&mut self, calldata: &sdk::Calldata) -> RunResult {
        // Parse contract inputs
        let (action, ctx) = sdk::utils::parse_raw_calldata::<ZKPassportAction>(calldata)?;

        // Execute the given action
        let res = match action {
            ZKPassportAction::VerifyIdentity { proof, hyli_identity } => {
                self.verify_identity(proof, hyli_identity)?
            }
            ZKPassportAction::CheckVerification { user_address } => {
                self.check_verification(user_address)?
            }
        };

        Ok((res, ctx, vec![]))
    }

    fn commit(&self) -> sdk::StateCommitment {
        sdk::StateCommitment(self.as_bytes().expect("Failed to encode ZKPassport"))
    }
}

impl ZKPassportAction {
    pub fn as_blob(&self, contract_name: sdk::ContractName) -> sdk::Blob {
        sdk::Blob {
            contract_name,
            data: sdk::BlobData(borsh::to_vec(self).expect("Failed to encode ZKPassportAction")),
        }
    }
}

impl ZKPassport {
    pub fn verify_identity(&mut self, proof: ZKPassportProof, _hyli_identity: String) -> Result<Vec<u8>, String> {
        // Basic validation
        if proof.name != "outer_evm_count_5" {
            return Err("Invalid proof name".to_string());
        }
        
        if proof.committed_inputs.compare_age_evm.min_age < 18 {
            return Err("Age requirement not met".to_string());
        }
        
        if !proof.committed_inputs.bind_evm.data.user_address.starts_with("0x") {
            return Err("Invalid user address format".to_string());
        }
        
        // Check if already verified
        let user_address = &proof.committed_inputs.bind_evm.data.user_address;
        if self.verified_users.iter().any(|u| u.user_address == *user_address) {
            return Ok("User already verified".to_string().into_bytes());
        }
        
        // Add verified user
        let unique_id = format!("zkp_{:016x}", user_address.len());
        let verified_user = VerifiedUser {
            unique_id: unique_id.clone(),
            user_address: user_address.clone(),
            verified_at: proof.committed_inputs.compare_age_evm.current_date.clone(),
            age_verified: true,
            custom_data: proof.committed_inputs.bind_evm.data.custom_data.clone(),
        };
        
        self.verified_users.push(verified_user);
        Ok(format!("Successfully verified user {} with ID {}", user_address, unique_id).into_bytes())
    }
    
    pub fn check_verification(&self, user_address: String) -> Result<Vec<u8>, String> {
        match self.get_verified_user(&user_address) {
            Some(user) => {
                let result = format!(
                    "User {} is verified. ID: {}, Verified at: {}", 
                    user.user_address, 
                    user.unique_id, 
                    user.verified_at
                );
                Ok(result.into_bytes())
            }
            None => Ok(format!("User {} is not verified", user_address).into_bytes())
        }
    }
    
    pub fn get_verified_user(&self, user_address: &str) -> Option<&VerifiedUser> {
        self.verified_users.iter().find(|u| u.user_address == user_address)
    }

    pub fn as_bytes(&self) -> Result<Vec<u8>, Error> {
        borsh::to_vec(self)
    }
}

impl From<sdk::StateCommitment> for ZKPassport {
    fn from(state: sdk::StateCommitment) -> Self {
        borsh::from_slice(&state.0)
            .map_err(|_| "Could not decode ZKPassport state".to_string())
            .unwrap()
    }
}