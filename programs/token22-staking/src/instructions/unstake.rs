use {
    anchor_lang::prelude::*,
    crate::{state::*, errors::*, utils::*},
    anchor_spl::token_interface,
    spl_token_2022::instruction::{transfer_checked, mint_to},
    solana_program::{program::invoke_signed},
};

pub fn handler(ctx: Context<Unstake>) -> Result <()> {
    check_token_program(ctx.accounts.token_program.key());

    Ok(())
}

#[derive(Accounts)]
pub struct Unstake<'info> {
pub token_program: Interface<'info, token_interface::TokenInterface>,
}