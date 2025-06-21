use anyhow::Context;
use client_sdk::transaction_builder::TxExecutorHandler;
use sdk::{utils::as_hyle_output, Blob, Calldata, RegisterContractEffect, ZkContract};

use crate::ZKPassport;

pub mod metadata {
    pub const ZKPASSPORT_ELF: &[u8] = include_bytes!("../../zkpassport.img");
    pub const PROGRAM_ID: [u8; 32] = sdk::str_to_u8(include_str!("../../zkpassport.txt"));
}

impl TxExecutorHandler for ZKPassport {
    fn build_commitment_metadata(&self, _blob: &Blob) -> anyhow::Result<Vec<u8>> {
        borsh::to_vec(self).context("Failed to encode ZKPassport")
    }

    fn handle(&mut self, calldata: &Calldata) -> anyhow::Result<sdk::HyleOutput> {
        let initial_state_commitment = <Self as ZkContract>::commit(self);
        let mut res = <Self as ZkContract>::execute(self, calldata);
        let next_state_commitment = <Self as ZkContract>::commit(self);
        Ok(as_hyle_output(
            initial_state_commitment,
            next_state_commitment,
            calldata,
            &mut res,
        ))
    }

    fn construct_state(
        _register_blob: &RegisterContractEffect,
        _metadata: &Option<Vec<u8>>,
    ) -> anyhow::Result<Self> {
        Ok(Self::default())
    }

    fn get_state_commitment(&self) -> sdk::StateCommitment {
        self.commit()
    }
} 