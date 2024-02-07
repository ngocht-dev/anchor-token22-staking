use {
    anchor_lang::prelude::*,
    crate::{state::*, errors::*},
    std::mem::size_of,
    anchor_spl::token_interface,
};

pub fn handler(ctx: Context<InitializeStakeEntry>) -> Result<()> {
    // initialize user stake entry state
    let user_entry = &mut ctx.accounts.user_stake_entry;
    user_entry.user = ctx.accounts.user.key();
    // user_entry.user_stake_token_account = ctx.accounts.user_stake_token_account.key();
    user_entry.bump = ctx.bumps.user_stake_entry;
    user_entry.balance = 0;
    
    Ok(())
}

#[derive(Accounts)]
pub struct InitializeStakeEntry<'info> {
    #[account(mut)]
    pub user: Signer<'info>,
    #[account(
        init,
        seeds = [user.key().as_ref(), pool_state.token_mint.key().as_ref(), STAKE_ENTRY_SEED.as_bytes()],
        bump,
        payer = user,
        space = 8 + size_of::<StakeEntry>()
    )]
    pub user_stake_entry: Account<'info, StakeEntry>,
    // #[account(
    //     init,
    //     token::mint = staking_token_mint,
    //     token::authority = user,
    //     token::token_program = token_program,
    //     payer = user
    // )]
    // pub user_stake_token_account: InterfaceAccount<'info, token_interface::TokenAccount>,
    // #[account(
    //     constraint = staking_token_mint.key() == pool_state.staking_token_mint
    //     @ StakeError::InvalidStakingTokenMint
    // )]
    // pub staking_token_mint: InterfaceAccount<'info, token_interface::Mint>,
    #[account(
        seeds = [pool_state.token_mint.key().as_ref(), STAKE_POOL_STATE_SEED.as_bytes()],
        bump = pool_state.bump
    )]
    pub pool_state: Account<'info, PoolState>,
    // token22 program
    // pub token_program: Interface<'info, token_interface::TokenInterface>,
    pub system_program: Program<'info, System>
}