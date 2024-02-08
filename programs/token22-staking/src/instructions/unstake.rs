use {
    anchor_lang::prelude::*,
    crate::{state::*, errors::*, utils::*},
    anchor_spl::token_interface,
    spl_token_2022::instruction::{transfer_checked, mint_to},
    solana_program::{program::invoke_signed},
};

pub fn handler(ctx: Context<Unstake>) -> Result <()> {
    check_token_program(ctx.accounts.token_program.key());
    
    let user_entry = &mut ctx.accounts.user_stake_entry;
    let amount = user_entry.balance;

    msg!("User stake balance: {}", user_entry.balance);
    msg!("Withdrawing all of users stake balance. Tokens to withdraw: {}", amount);
    msg!("Total staked before withdrawal: {}", ctx.accounts.pool_state.amount);

    // verify user and pool have >= requested amount of tokens staked
    if amount > ctx.accounts.pool_state.amount {
        return Err(StakeError::OverdrawError.into())
    }

    // program signer seeds
    let auth_bump = ctx.accounts.pool_state.vault_auth_bump;
    let auth_seeds = &[VAULT_AUTH_SEED.as_bytes(), &[auth_bump]];
    let signer = &[&auth_seeds[..]];

    // ***** Should re-think this sequence. Since doing in two separate tx's, one can fail. ***** //

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
            ctx.accounts.pool_authority.to_account_info(),
        ],
        signer
    )?;

    // mint users staking rewards, 10x amount of staked tokens
    let stake_rewards = amount.checked_mul(10).unwrap();

    let mint_ix = mint_to(
        &ctx.accounts.token_program.key(),
        &ctx.accounts.staking_token_mint.key(),
        &ctx.accounts.user_stake_token_account.key(),
        &ctx.accounts.pool_authority.key(),
        &[&ctx.accounts.pool_authority.key()],
        stake_rewards
    ).unwrap();
    invoke_signed(
        &mint_ix,
        &[
            ctx.accounts.token_program.to_account_info(),
            ctx.accounts.staking_token_mint.to_account_info(),
            ctx.accounts.user_stake_token_account.to_account_info(),
            ctx.accounts.user.to_account_info(),
            ctx.accounts.pool_authority.to_account_info(),
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
    #[account(
        mut,
        mint::token_program = token_program
    )]
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
        token::token_program = token_program
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
        @ StakeError::InvalidMint,
        token::token_program = token_program
    )]
    pub user_token_account: InterfaceAccount<'info, token_interface::TokenAccount>,
    #[account(
        mut,
        seeds = [user.key().as_ref(), pool_state.token_mint.key().as_ref(), STAKE_ENTRY_SEED.as_bytes()],
        bump = user_stake_entry.bump,

    )]
    pub user_stake_entry: Account<'info, StakeEntry>,
    // Mint of staking token
    #[account(
        mut,
        mint::authority = pool_authority,
        mint::token_program = token_program,
        constraint = staking_token_mint.key() == pool_state.staking_token_mint
        @ StakeError::InvalidStakingTokenMint
    )]
    pub staking_token_mint: InterfaceAccount<'info, token_interface::Mint>,
    #[account(
        mut,
        token::mint = staking_token_mint,
        token::authority = user,
        token::token_program = token_program,
        constraint = user_stake_token_account.key() == user_stake_entry.user_stake_token_account
        @ StakeError::InvalidUserStakeTokenAccount
    )]
    user_stake_token_account: InterfaceAccount<'info, token_interface::TokenAccount>,
    pub token_program: Interface<'info, token_interface::TokenInterface>,
    pub system_program: Program<'info, System>
}