use anchor_lang::prelude::*;

#[error_code]
pub enum StakeError {
    #[msg("Token mint is invalid")]
    InvalidMint,
    #[msg("Mint authority is invalid")]
    InvalidMintAuthority,
    #[msg("Mathematical overflow occured")]
    MathematicalOverflowError,
    #[msg("Incorrect program authority")]
    InvalidProgramAuthority,
    #[msg("Attempted to withdraw more staking rewards than are available")]
    OverdrawError,
    #[msg("Invalid user provided")]
    InvalidUser,
    #[msg("Invalid staking token mint provider")]
    InvalidStakingTokenMint
}