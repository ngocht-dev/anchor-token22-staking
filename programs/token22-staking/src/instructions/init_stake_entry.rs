use {
    anchor_lang::prelude::*,
    crate::{state::*, errors::*, utils::*},
    std::mem::size_of,
    anchor_spl::{
        token_interface,
        associated_token::AssociatedToken,
    },
};

pub fn handler(ctx: Context<InitializeStakeEntry>) -> Result<()> {
    check_token_program(ctx.accounts.token_program.key());

    Ok(())
}

#[derive(Accounts)]
pub struct InitializeStakeEntry<'info> {
    pub token_program: Interface<'info, token_interface::TokenInterface>,
}