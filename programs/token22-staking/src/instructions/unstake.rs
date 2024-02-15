use {
    anchor_lang::prelude::*,
    crate::{state::*, errors::*, utils::*},
    anchor_spl::{
        token_interface,
        token_2022::{TransferChecked, transfer_checked, mint_to, MintTo},
    }
};

pub fn handler(ctx: Context<Unstake>) -> Result <()> {
    check_token_program(ctx.accounts.token_program.key());

    Ok(())
}

#[derive(Accounts)]
pub struct Unstake<'info> {
pub token_program: Interface<'info, token_interface::TokenInterface>,
}