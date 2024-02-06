use {
    anchor_lang::prelude::*,
    crate::{state::*, errors::*},
    anchor_spl::token_interface,
    spl_token_2022::instruction::transfer_checked,
    solana_program::{program::invoke_signed},
};

pub fn handler(ctx: Context<Unstake>, amount: u64) -> Result <()> {
    let user_entry = &mut ctx.accounts.user_stake_entry;

    msg!("User stake balance: {}", user_entry.balance);
    msg!("Requested withdraw amount: {}", amount);
    msg!("Total staked before withdrawal: {}", ctx.accounts.pool_state.amount);

    // verify user has >= amount of tokens staked
    if amount > user_entry.balance || amount > ctx.accounts.pool_state.amount {
        return Err(StakeError::OverdrawError.into())
    }

    // program signer seeds
    let auth_bump = ctx.accounts.pool_state.vault_auth_bump;
    let auth_seeds = &[VAULT_AUTH_SEED.as_bytes(), &[auth_bump]];
    let signer = &[&auth_seeds[..]];

    // transfer out_amount from stake vault to user
    let transfer_ix = transfer_checked(
        &ctx.accounts.token_program.key(),
        &ctx.accounts.token_vault.key(),
        &ctx.accounts.token_mint.key(),
        &ctx.accounts.user_token_account.key(),
        &ctx.accounts.pool_authority.key(),
        &[&ctx.accounts.pool_authority.key()],
        amount,
        6
    ).unwrap();

    invoke_signed(
        &transfer_ix,
        &[
            ctx.accounts.token_program.to_account_info(),
            ctx.accounts.token_vault.to_account_info(),
            ctx.accounts.token_mint.to_account_info(),
            ctx.accounts.user_token_account.to_account_info(),
            ctx.accounts.pool_authority.to_account_info()
        ],
        signer
    )?;

    // subtract transferred amount from pool total
    let pool_state = &mut ctx.accounts.pool_state;
    pool_state.amount = pool_state.amount.checked_sub(amount).unwrap();
    msg!("Total staked after withdrawal: {}", pool_state.amount);

    // update user stake entry
    user_entry.balance = user_entry.balance.checked_sub(amount).unwrap();
    user_entry.last_staked = Clock::get().unwrap().unix_timestamp;

    Ok(())
}

#[derive(Accounts)]
pub struct Unstake<'info> {
    // pool state account
    #[account(
        mut,
        seeds = [token_mint.key().as_ref(), STAKE_POOL_STATE_SEED.as_bytes()],
        bump = pool_state.bump,
    )]
    pub pool_state: Account<'info, PoolState>,
    // Mint of token
    #[account(mut)]
    pub token_mint: InterfaceAccount<'info, token_interface::Mint>,
    // PDA, auth over all token vaults
    /// CHECK: unsafe
    #[account(
        seeds = [VAULT_AUTH_SEED.as_bytes()],
        bump
    )]
    pub pool_authority: AccountInfo<'info>,
    // pool token account for Token Mint
    #[account(
        mut,
        // use token_mint, pool auth, and constant as seeds for token a vault
        seeds = [token_mint.key().as_ref(), pool_authority.key().as_ref(), VAULT_SEED.as_bytes()],
        bump = pool_state.vault_bump,
    )]
    pub token_vault: InterfaceAccount<'info, token_interface::TokenAccount>,
    // require a signature because only the user should be able to unstake their tokens
    #[account(
        mut,
        constraint = user.key() == user_stake_entry.user
        @ StakeError::InvalidUser
    )]
    pub user: Signer<'info>,
    #[account(
        mut,
        constraint = user_token_account.mint == pool_state.token_mint
        @ StakeError::InvalidMint
    )]
    pub user_token_account: InterfaceAccount<'info, token_interface::TokenAccount>,
    #[account(
        mut,
        seeds = [user.key().as_ref(), pool_state.token_mint.key().as_ref(), STAKE_ENTRY_SEED.as_bytes()],
        bump = user_stake_entry.bump,

    )]
    pub user_stake_entry: Account<'info, StakeEntry>,
    // token22 program
    pub token_program: Interface<'info, token_interface::TokenInterface>,
    pub system_program: Program<'info, System>
}