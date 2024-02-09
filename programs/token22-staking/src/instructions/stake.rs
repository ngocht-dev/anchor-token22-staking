use {
    anchor_lang::prelude::*,
    crate::{state::*, errors::*, utils::*},
    anchor_spl::{
        token_interface,
        token_2022::{TransferChecked, transfer_checked},
    },
};

pub fn handler(ctx: Context<Stake>, stake_amount: u64) -> Result <()> {
    check_token_program(ctx.accounts.token_program.key());

    Ok(())
}

#[derive(Accounts)]
pub struct Stake<'info> {
    pub token_program: Interface<'info, token_interface::TokenInterface>,
}
