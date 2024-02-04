use {
    anchor_lang::prelude::*,
    crate::{state::*, errors::*},
    anchor_spl::{token_interface, token::{Transfer, transfer}},
};

pub fn handler(ctx: Context<Stake>, stake_amount: u64) -> Result <()> {
    // transfer amount from user token acct to vault
    transfer(ctx.accounts.transfer_ctx(), stake_amount)?;

    msg!("Pool initial total: {}", ctx.accounts.pool_state.amount);
    msg!("User entry initial balance: {}", ctx.accounts.user_stake_entry.balance);

    // update pool state amount
    let pool_state = &mut ctx.accounts.pool_state;
    let user_entry = &mut ctx.accounts.user_stake_entry;
    pool_state.amount = pool_state.amount.checked_add(stake_amount).unwrap();
    msg!("Current pool stake total: {}", pool_state.amount);

    // update user stake entry
    user_entry.balance = user_entry.balance.checked_add(stake_amount).unwrap();
    msg!("User stake balance: {}", user_entry.balance);
    user_entry.last_staked = Clock::get().unwrap().unix_timestamp;

    Ok(())
}

#[derive(Accounts)]
pub struct Stake<'info> {
    // pool state account
    #[account(
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
        // use token_mint, pool auth, and constant as seeds for token a vault
        seeds = [token_mint.key().as_ref(), pool_authority.key().as_ref(), VAULT_SEED.as_bytes()],
        bump = pool_state.vault_bump,
    )]
    pub token_vault: InterfaceAccount<'info, token_interface::TokenAccount>,
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

impl<'info> Stake <'info> {
    pub fn transfer_ctx(&self) -> CpiContext<'_, '_, '_, 'info, Transfer<'info>> {
        let cpi_program = self.token_program.to_account_info();
        let cpi_accounts = Transfer {
            from: self.user_token_account.to_account_info(),
            to: self.token_vault.to_account_info(),
            authority: self.user.to_account_info()
        };

        CpiContext::new(cpi_program, cpi_accounts)
    }
}