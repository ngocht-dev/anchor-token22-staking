use {
    anchor_lang::prelude::*,
    crate::{state::*},
    anchor_spl::{token_2022, token::{TokenAccount, Mint}},
};

pub fn handler(ctx: Context<CreateStakingToken>) -> Result <()> {
    msg!("Staking token created!")
    
    Ok(())
}

#[derive(Accounts)]
pub struct CreateStakingToken<'info> {
    // PDA, auth over all token vaults
    /// CHECK: unsafe
    #[account(
        seeds = [VAULT_AUTH_SEED.as_bytes()],
        bump
    )]
    pub pool_authority: AccountInfo<'info>,
    // Mint of token
    #[account(
        init,
        bump,
        payer = payer
    )]
    pub token_mint: Account<'info, Mint>,
    // payer, will pay for creation of pool vault
    #[account(mut)]
    pub payer: Signer<'info>,
    // token22 program
    pub token_program: Program<'info, token_2022::Token2022>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>
}